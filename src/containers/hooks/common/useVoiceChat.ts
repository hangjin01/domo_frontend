/**
 * [파일 안내] frontend/src/containers/hooks/common/useVoiceChat.ts
 * 마이크 스트림·참여자·WebRTC peer·시그널링 소켓을 관리하는 음성 채팅 훅입니다.
 * 소켓은 offer/answer/ICE 등 연결 협상 정보를 전달하며 실제 음성은 WebRTC 트랙으로 전달됩니다.
 * 입장 시 장치 권한이 필요하고 퇴장/언마운트 시 트랙·peer·소켓을 닫아야 마이크가 계속 켜져 있지 않습니다.
 * 현재 STUN만 설정되어 있고 TURN은 없습니다. mock의 입장 상태는 실제 음성 연결 성공을 뜻하지 않습니다.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { API_CONFIG, getWebSocketUrl } from '@/src/models/api/config';
import type { SignalData, VoiceChatError, VoiceChatErrorType } from '@/src/models/types';

// ============================================
// Configuration
// ============================================

const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

// 디버그 로그 활성화
const DEBUG = true;

function log(tag: string, message: string, data?: unknown) {
    if (DEBUG) {
        const time = new Date().toISOString().slice(11, 23);
        if (data !== undefined) {
            console.log(`[${time}] [Voice:${tag}]`, message, data);
        } else {
            console.log(`[${time}] [Voice:${tag}]`, message);
        }
    }
}

// ============================================
// Types
// ============================================

interface UseVoiceChatReturn {
    isConnected: boolean;
    isMuted: boolean;
    isDeafened: boolean;
    activePeerIds: number[];
    localStream: MediaStream | null;
    error: VoiceChatError | null;
    isConnecting: boolean;
    joinVoiceChannel: () => Promise<void>;
    leaveVoiceChannel: () => void;
    toggleMute: () => void;
    toggleDeafen: () => void;
    clearError: () => void;
}

// ============================================
// Hook
// ============================================

export function useVoiceChat(projectId: number, userId: number): UseVoiceChatReturn {
    const [isConnected, setIsConnected] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isDeafened, setIsDeafened] = useState(false);
    const [activePeerIds, setActivePeerIds] = useState<number[]>([]);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<VoiceChatError | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);

    const isDeafenedRef = useRef(false);
    const socketRef = useRef<WebSocket | null>(null);
    const pcsRef = useRef<{ [key: number]: RTCPeerConnection }>({});
    const remoteAudiosRef = useRef<{ [key: number]: HTMLAudioElement }>({});
    const localStreamRef = useRef<MediaStream | null>(null);

    // ICE candidate 큐 (remoteDescription 전에 도착한 candidate 저장)
    const iceQueues = useRef<{ [key: number]: RTCIceCandidateInit[] }>({});

    // -------------------------------------------------------------------------
    // Error Handling
    // -------------------------------------------------------------------------

    const setVoiceChatError = useCallback((type: VoiceChatErrorType, message: string) => {
        log('Error', `${type}: ${message}`);
        setError({ type, message });
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // -------------------------------------------------------------------------
    // ICE Queue Processing
    // -------------------------------------------------------------------------

    const flushIceQueue = useCallback(async (peerId: number) => {
        const pc = pcsRef.current[peerId];
        const queue = iceQueues.current[peerId] || [];

        if (!pc || queue.length === 0) return;

        log('ICE', `Flushing ${queue.length} queued candidates for peer ${peerId}`);

        for (const candidate of queue) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
                console.error('Failed to add queued ICE:', e);
            }
        }

        iceQueues.current[peerId] = [];
    }, []);

    // -------------------------------------------------------------------------
    // Peer Connection Management
    // -------------------------------------------------------------------------

    const closePeerConnection = useCallback((peerId: number) => {
        log('Peer', `Closing connection to peer ${peerId}`);

        if (pcsRef.current[peerId]) {
            pcsRef.current[peerId].close();
            delete pcsRef.current[peerId];
        }
        if (remoteAudiosRef.current[peerId]) {
            remoteAudiosRef.current[peerId].pause();
            remoteAudiosRef.current[peerId].srcObject = null;
            delete remoteAudiosRef.current[peerId];
        }
        delete iceQueues.current[peerId];

        setActivePeerIds(prev => prev.filter(id => id !== peerId));
    }, []);

    const createPeerConnection = useCallback((peerId: number, stream: MediaStream): RTCPeerConnection => {
        // 이미 존재하면 반환
        if (pcsRef.current[peerId]) {
            log('Peer', `Connection already exists for peer ${peerId}`);
            return pcsRef.current[peerId];
        }

        log('Peer', `Creating new PeerConnection for peer ${peerId}`);

        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcsRef.current[peerId] = pc;
        iceQueues.current[peerId] = [];

        // 피어 목록에 추가
        setActivePeerIds(prev => {
            if (prev.includes(peerId)) return prev;
            log('State', `Adding peer ${peerId} to active list`);
            return [...prev, peerId];
        });

        // 로컬 트랙 추가
        stream.getTracks().forEach(track => {
            pc.addTrack(track, stream);
            log('Track', `Added local ${track.kind} track`);
        });

        // 원격 트랙 수신
        pc.ontrack = (event) => {
            log('Track', `Received remote track from peer ${peerId}`);

            if (!remoteAudiosRef.current[peerId]) {
                const audio = new Audio();
                audio.srcObject = event.streams[0];
                audio.autoplay = true;
                audio.muted = isDeafenedRef.current;
                remoteAudiosRef.current[peerId] = audio;

                audio.play().catch(() => {
                    log('Audio', 'Autoplay blocked, waiting for user interaction');
                    document.addEventListener('click', () => audio.play(), { once: true });
                });
            }
        };

        // ICE Candidate 생성 -> targeted delivery (to field 포함)
        pc.onicecandidate = (event) => {
            if (event.candidate && socketRef.current?.readyState === WebSocket.OPEN) {
                log('ICE', `Sending ICE candidate to peer ${peerId}`);
                socketRef.current.send(JSON.stringify({
                    type: 'ice',
                    senderId: userId,
                    targetId: peerId,
                    to: peerId,
                    candidate: event.candidate.toJSON(),
                }));
            }
        };

        // 연결 상태 변경
        pc.oniceconnectionstatechange = () => {
            log('ICE', `Connection state: ${pc.iceConnectionState} (peer ${peerId})`);
            if (pc.iceConnectionState === 'failed') {
                log('ICE', 'Connection failed, restarting ICE');
                pc.restartIce();
            }
        };

        pc.onconnectionstatechange = () => {
            log('Peer', `Connection state: ${pc.connectionState} (peer ${peerId})`);
            if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                closePeerConnection(peerId);
            }
        };

        return pc;
    }, [userId, closePeerConnection]);

    // -------------------------------------------------------------------------
    // Signaling Handlers
    // -------------------------------------------------------------------------

    /**
     * 기존 참여자가 신규 참여자에게 offer를 보내는 로직.
     * user_joined 수신 시 또는 하위 호환용 join broadcast 수신 시 호출.
     */
    const handleUserJoined = useCallback(async (peerId: number, stream: MediaStream) => {
        log('Signal', `Peer ${peerId} joined, I will create offer`);

        const pc = createPeerConnection(peerId, stream);

        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            log('Signal', `Sending OFFER to peer ${peerId}`);
            socketRef.current?.send(JSON.stringify({
                type: 'offer',
                senderId: userId,
                targetId: peerId,
                to: peerId,
                sdp: pc.localDescription,
            }));
        } catch (e) {
            console.error('Failed to create offer:', e);
        }
    }, [userId, createPeerConnection]);

    /**
     * 신규 입장자가 existing_users 목록을 수신했을 때의 처리.
     *
     * Offer Collision 방지:
     *   - 신규 입장자는 Offer를 보내지 않는다.
     *   - 기존 참여자가 user_joined를 수신하여 Offer를 생성하므로,
     *     여기서는 activePeerIds에만 등록하고 Offer 수신을 대기한다.
     */
    const handleExistingUsers = useCallback(async (userIds: number[], _stream: MediaStream) => {
        log('Signal', `Received existing users list: [${userIds.join(', ')}] (waiting for their offers)`);

        for (const peerId of userIds) {
            if (peerId === userId) continue;

            // activePeerIds에 등록만 해두고 Offer는 보내지 않는다.
            // 기존 참여자가 user_joined를 받아 Offer를 보내면
            // handleOffer에서 PeerConnection 생성 및 Answer 전송이 처리된다.
            setActivePeerIds(prev => {
                if (prev.includes(peerId)) return prev;
                log('State', `Registering existing peer ${peerId} (awaiting offer)`);
                return [...prev, peerId];
            });
        }
    }, [userId]);

    const handleOffer = useCallback(async (senderId: number, sdp: RTCSessionDescriptionInit, stream: MediaStream) => {
        log('Signal', `Received OFFER from peer ${senderId}`);

        const pc = createPeerConnection(senderId, stream);

        try {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            log('Signal', `Set remote description (offer) for peer ${senderId}`);

            // 큐에 있던 ICE candidate 처리
            await flushIceQueue(senderId);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            log('Signal', `Sending ANSWER to peer ${senderId}`);
            socketRef.current?.send(JSON.stringify({
                type: 'answer',
                senderId: userId,
                targetId: senderId,
                to: senderId,
                sdp: pc.localDescription,
            }));
        } catch (e) {
            console.error('Failed to handle offer:', e);
        }
    }, [userId, createPeerConnection, flushIceQueue]);

    const handleAnswer = useCallback(async (senderId: number, sdp: RTCSessionDescriptionInit) => {
        log('Signal', `Received ANSWER from peer ${senderId}`);

        const pc = pcsRef.current[senderId];
        if (!pc) {
            log('Signal', `No PeerConnection for peer ${senderId}, ignoring answer`);
            return;
        }

        try {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            log('Signal', `Set remote description (answer) for peer ${senderId}`);

            // 큐에 있던 ICE candidate 처리
            await flushIceQueue(senderId);
        } catch (e) {
            console.error('Failed to handle answer:', e);
        }
    }, [flushIceQueue]);

    const handleIce = useCallback(async (senderId: number, candidate: RTCIceCandidateInit) => {
        log('ICE', `Received ICE candidate from peer ${senderId}`);

        const pc = pcsRef.current[senderId];

        // PeerConnection이 없거나 remoteDescription이 없으면 큐에 저장
        if (!pc || !pc.remoteDescription) {
            log('ICE', `Queuing ICE candidate for peer ${senderId} (no remote description yet)`);
            if (!iceQueues.current[senderId]) {
                iceQueues.current[senderId] = [];
            }
            iceQueues.current[senderId].push(candidate);
            return;
        }

        try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
            log('ICE', `Added ICE candidate for peer ${senderId}`);
        } catch (e) {
            console.error('Failed to add ICE candidate:', e);
        }
    }, []);

    // -------------------------------------------------------------------------
    // Cleanup
    // -------------------------------------------------------------------------

    const cleanup = useCallback(() => {
        log('Cleanup', 'Cleaning up voice chat...');

        setIsConnected(false);
        setIsMuted(false);
        setIsDeafened(false);
        setActivePeerIds([]);
        setLocalStream(null);
        setIsConnecting(false);
        isDeafenedRef.current = false;

        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }

        Object.keys(pcsRef.current).forEach(key => {
            const peerId = parseInt(key);
            pcsRef.current[peerId]?.close();
            delete pcsRef.current[peerId];
        });

        Object.keys(remoteAudiosRef.current).forEach(key => {
            const peerId = parseInt(key);
            remoteAudiosRef.current[peerId]?.pause();
            delete remoteAudiosRef.current[peerId];
        });

        iceQueues.current = {};

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }

        log('Cleanup', 'Done');
    }, []);

    // -------------------------------------------------------------------------
    // Join Voice Channel
    // -------------------------------------------------------------------------

    const joinVoiceChannel = useCallback(async () => {
        if (isConnected || socketRef.current || isConnecting) {
            log('Join', 'Already connected or connecting');
            return;
        }

        log('Join', `Starting... projectId=${projectId}, userId=${userId}`);
        setIsConnecting(true);
        clearError();

        // Mock Mode
        if (API_CONFIG.USE_MOCK) {
            log('Join', 'Mock mode enabled');
            setIsConnected(true);
            setActivePeerIds([userId, 999]);
            setIsConnecting(false);
            return;
        }

        // 브라우저 체크
        if (!navigator.mediaDevices?.getUserMedia) {
            setVoiceChatError('not_supported', '이 브라우저에서는 음성 채팅을 지원하지 않습니다.');
            setIsConnecting(false);
            return;
        }

        try {
            // 마이크 권한 요청
            log('Media', 'Requesting microphone access...');
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                video: false,
            });
            log('Media', 'Microphone access granted');

            localStreamRef.current = stream;
            setLocalStream(stream);

            // WebSocket 연결
            const wsUrl = getWebSocketUrl(`/api/ws/projects/${projectId}/voice`);
            log('WebSocket', `Connecting to ${wsUrl}`);

            const ws = new WebSocket(wsUrl);
            socketRef.current = ws;

            ws.onopen = () => {
                log('WebSocket', 'Connected!');
                setIsConnected(true);
                setActivePeerIds([userId]);
                setIsConnecting(false);

                // Join 메시지 전송
                const msg = { type: 'join', senderId: userId };
                ws.send(JSON.stringify(msg));
                log('WebSocket', 'Sent JOIN message', msg);
            };

            ws.onmessage = async (event) => {
                const data: SignalData = JSON.parse(event.data);
                log('WebSocket', `Received: ${data.type}`, {
                    from: data.senderId ?? data.userId,
                    to: data.targetId ?? data.to,
                    users: data.users,
                });

                // 자신에게 온 메시지가 아니면 무시 (targetId 또는 to 기반)
                const intendedTarget = data.targetId ?? data.to;
                if (intendedTarget && intendedTarget !== userId) {
                    log('WebSocket', `Not for me (target=${intendedTarget}), ignoring`);
                    return;
                }

                // 발신자 ID 결정 (senderId 우선, 없으면 userId)
                const peerId = data.senderId ?? data.userId;

                switch (data.type) {
                    // 백엔드 신규 프로토콜: 기존 참여자 목록 수신 (신규 입장자만 받음)
                    case 'existing_users':
                        if (data.users && data.users.length > 0) {
                            await handleExistingUsers(data.users, stream);
                        }
                        break;

                    // 백엔드 신규 프로토콜: 새 참여자 입장 알림 (기존 참여자가 받음)
                    case 'user_joined':
                        if (peerId && peerId !== userId) {
                            await handleUserJoined(peerId, stream);
                        }
                        break;

                    // 하위 호환: 기존 broadcast 방식 join
                    case 'join':
                        if (peerId && peerId !== userId) {
                            await handleUserJoined(peerId, stream);
                        }
                        break;

                    case 'offer':
                        if (peerId && data.sdp) {
                            await handleOffer(peerId, data.sdp, stream);
                        }
                        break;

                    case 'answer':
                        if (peerId && data.sdp) {
                            await handleAnswer(peerId, data.sdp);
                        }
                        break;

                    case 'ice':
                        if (peerId && data.candidate) {
                            await handleIce(peerId, data.candidate);
                        }
                        break;

                    case 'user_left':
                        log('Signal', `Peer ${peerId} left`);
                        if (peerId) closePeerConnection(peerId);
                        break;
                }
            };

            ws.onerror = (e) => {
                log('WebSocket', 'Error', e);
                setVoiceChatError('connection_failed', '서버 연결에 실패했습니다.');
                cleanup();
            };

            ws.onclose = (e) => {
                log('WebSocket', `Closed: code=${e.code}`);
                cleanup();
            };

        } catch (err) {
            console.error('Failed to join:', err);

            if (err instanceof DOMException) {
                if (err.name === 'NotAllowedError') {
                    setVoiceChatError('permission_denied', '마이크 권한이 거부되었습니다.');
                } else if (err.name === 'NotFoundError') {
                    setVoiceChatError('not_supported', '마이크를 찾을 수 없습니다.');
                } else {
                    setVoiceChatError('unknown', '마이크 연결 중 오류가 발생했습니다.');
                }
            } else {
                setVoiceChatError('unknown', '알 수 없는 오류가 발생했습니다.');
            }
            cleanup();
        }
    }, [
        projectId, userId, isConnected, isConnecting,
        cleanup, clearError, setVoiceChatError,
        handleUserJoined, handleExistingUsers, handleOffer, handleAnswer, handleIce, closePeerConnection
    ]);

    // -------------------------------------------------------------------------
    // Toggle Functions
    // -------------------------------------------------------------------------

    const toggleMute = useCallback(() => {
        if (localStreamRef.current) {
            const track = localStreamRef.current.getAudioTracks()[0];
            if (track) {
                track.enabled = !track.enabled;
                setIsMuted(!track.enabled);
                log('Audio', `Mute: ${!track.enabled}`);
            }
        }
    }, []);

    const toggleDeafen = useCallback(() => {
        const newState = !isDeafenedRef.current;
        isDeafenedRef.current = newState;
        setIsDeafened(newState);

        Object.values(remoteAudiosRef.current).forEach(audio => {
            audio.muted = newState;
        });
        log('Audio', `Deafen: ${newState}`);
    }, []);

    // -------------------------------------------------------------------------
    // Cleanup on Unmount
    // -------------------------------------------------------------------------

    useEffect(() => {
        return () => cleanup();
    }, [cleanup]);

    return {
        isConnected,
        isMuted,
        isDeafened,
        activePeerIds,
        localStream,
        error,
        isConnecting,
        joinVoiceChannel,
        leaveVoiceChannel: cleanup,
        toggleMute,
        toggleDeafen,
        clearError,
    };
}
