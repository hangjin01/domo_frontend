import { useEffect, useRef, useState, useCallback } from 'react';
import { API_CONFIG, getWebSocketUrl } from '../lib/api/config';
import type { SignalData } from '../types';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
    ],
};

export function useVoiceChat(projectId: number, userId: number) {
    const [isConnected, setIsConnected] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isDeafened, setIsDeafened] = useState(false);
    const [activePeerIds, setActivePeerIds] = useState<number[]>([]);

    const isDeafenedRef = useRef(false);
    const socketRef = useRef<WebSocket | null>(null);
    const pcsRef = useRef<{ [key: number]: RTCPeerConnection }>({});
    const remoteAudiosRef = useRef<{ [key: number]: HTMLAudioElement }>({});
    const localStreamRef = useRef<MediaStream | null>(null);

    // -------------------------------------------------------------------------
    // 1. Helper Functions (useCallback으로 감싸서 메모이제이션 보존)
    // -------------------------------------------------------------------------

    // [Helper] 연결 종료 처리
    const closePeerConnection = useCallback((peerId: number) => {
        if (pcsRef.current[peerId]) {
            pcsRef.current[peerId].close();
            delete pcsRef.current[peerId];
            setActivePeerIds((prev) => prev.filter((id) => id !== peerId));
        }
        if (remoteAudiosRef.current[peerId]) {
            remoteAudiosRef.current[peerId].pause();
            delete remoteAudiosRef.current[peerId];
        }
    }, []);

    // [Helper] ICE Candidate 처리
    const handleIce = useCallback(async (senderId: number, candidate: RTCIceCandidateInit) => {
        const pc = pcsRef.current[senderId];
        if (pc) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
                console.error(`Error adding ICE candidate from ${senderId}`, e);
            }
        }
    }, []);

    // [Helper] Answer 처리
    const handleAnswer = useCallback(async (senderId: number, sdp: RTCSessionDescriptionInit) => {
        const pc = pcsRef.current[senderId];
        if (pc) {
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            } catch (e) {
                console.error(`Error handling answer from ${senderId}`, e);
            }
        }
    }, []);

    // [Helper] Peer Connection 생성 (중요: userId 의존성)
    const createPeerConnection = useCallback(async (peerId: number, stream: MediaStream, isOfferer: boolean) => {
        if (pcsRef.current[peerId]) return;

        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcsRef.current[peerId] = pc;

        setActivePeerIds((prev) => {
            if (prev.includes(peerId)) return prev;
            return [...prev, peerId];
        });

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
            if (!remoteAudiosRef.current[peerId]) {
                const remoteAudio = new Audio();
                remoteAudio.srcObject = event.streams[0];
                remoteAudio.autoplay = true;
                remoteAudio.muted = isDeafenedRef.current;
                remoteAudiosRef.current[peerId] = remoteAudio;
            }
        };

        pc.onicecandidate = (event) => {
            if (event.candidate && socketRef.current?.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify({
                    type: 'ice',
                    senderId: userId,
                    targetId: peerId,
                    candidate: event.candidate,
                }));
            }
        };

        if (isOfferer) {
            try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socketRef.current?.send(JSON.stringify({
                    type: 'offer',
                    senderId: userId,
                    targetId: peerId,
                    sdp: offer,
                }));
            } catch (e) {
                console.error(`Error creating offer for peer ${peerId}`, e);
            }
        }
    }, [userId]);

    // [Helper] Offer 처리 (createPeerConnection, userId 의존성)
    const handleOffer = useCallback(async (senderId: number, sdp: RTCSessionDescriptionInit, stream: MediaStream) => {
        await createPeerConnection(senderId, stream, false);
        const pc = pcsRef.current[senderId];
        if (!pc) return;

        try {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socketRef.current?.send(JSON.stringify({
                type: 'answer',
                senderId: userId,
                targetId: senderId,
                sdp: answer,
            }));
        } catch (e) {
            console.error(`Error handling offer from ${senderId}`, e);
        }
    }, [createPeerConnection, userId]);

    // -------------------------------------------------------------------------
    // 2. Main Logic Functions
    // -------------------------------------------------------------------------

    // [Cleanup] 전체 정리 (isConnected 의존성)
    const cleanup = useCallback(() => {
        if (!isConnected && !socketRef.current) return;

        console.log('🧹 Cleaning up voice chat...');
        setIsConnected(false);
        setIsMuted(false);
        setIsDeafened(false);
        setActivePeerIds([]);
        isDeafenedRef.current = false;

        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }

        Object.keys(pcsRef.current).forEach((key) => {
            const peerId = parseInt(key);
            if (pcsRef.current[peerId]) {
                pcsRef.current[peerId].close();
            }
            delete pcsRef.current[peerId];
        });

        Object.keys(remoteAudiosRef.current).forEach((key) => {
            const peerId = parseInt(key);
            if (remoteAudiosRef.current[peerId]) {
                remoteAudiosRef.current[peerId].pause();
                delete remoteAudiosRef.current[peerId];
            }
        });

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop());
            localStreamRef.current = null;
        }
    }, [isConnected]);

    // [Action] 채널 입장
    const joinVoiceChannel = useCallback(async () => {
        if (isConnected || socketRef.current) return;

        // Mock Mode
        if (API_CONFIG.USE_MOCK) {
            console.log('🎧 [Mock] Joining voice channel...');
            setIsConnected(true);
            setActivePeerIds([userId, 999]); // 나 + 가상 유저
            return;
        }

        if (typeof navigator !== 'undefined' && (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)) {
            alert("브라우저 보안 정책으로 마이크를 켤 수 없습니다.\n(HTTPS 또는 localhost 필요)");
            return;
        }

        try {
            console.log('🎤 Requesting microphone access...');
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
                video: false,
            });

            localStreamRef.current = stream;

            const wsUrl = getWebSocketUrl(`ws/projects/${projectId}/voice`);
            console.log(`🔗 Connecting to WebSocket: ${wsUrl}`);

            const ws = new WebSocket(wsUrl);
            socketRef.current = ws;

            ws.onopen = () => {
                console.log('🟢 WebSocket Connected!');
                setIsConnected(true);
                setActivePeerIds([userId]);
                ws.send(JSON.stringify({ type: 'join', senderId: userId }));
            };

            ws.onmessage = async (event) => {
                const data: SignalData = JSON.parse(event.data);
                if (data.targetId && data.targetId !== userId) return;

                switch (data.type) {
                    case 'join':
                        createPeerConnection(data.senderId, stream, true);
                        break;
                    case 'offer':
                        if (data.sdp) await handleOffer(data.senderId, data.sdp, stream);
                        break;
                    case 'answer':
                        if (data.sdp) await handleAnswer(data.senderId, data.sdp);
                        break;
                    case 'ice':
                        if (data.candidate) await handleIce(data.senderId, data.candidate);
                        break;
                    case 'user_left':
                        closePeerConnection(data.senderId);
                        break;
                }
            };

            ws.onerror = (error) => {
                console.error('🔴 WebSocket Error:', error);
                cleanup();
            };

            ws.onclose = () => {
                console.log('🔴 WebSocket Closed');
                cleanup();
            };

        } catch (err) {
            console.error('❌ Failed to join voice chat:', err);
            cleanup();
        }
    }, [
        projectId,
        userId,
        isConnected,
        cleanup,
        createPeerConnection,
        handleOffer,
        handleAnswer,
        handleIce,
        closePeerConnection
    ]);

    // [Action] Mute Toggle
    const toggleMute = useCallback(() => {
        if (API_CONFIG.USE_MOCK) {
            setIsMuted(prev => !prev);
            return;
        }

        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    }, []);

    // [Action] Deafen Toggle
    const toggleDeafen = useCallback(() => {
        if (API_CONFIG.USE_MOCK) {
            setIsDeafened(prev => !prev);
            return;
        }

        const newState = !isDeafenedRef.current;
        isDeafenedRef.current = newState;
        setIsDeafened(newState);

        Object.values(remoteAudiosRef.current).forEach((audio) => {
            audio.muted = newState;
        });
    }, []);

    // Unmount Cleanup
    useEffect(() => {
        return () => {
            cleanup();
        };
    }, [cleanup]);

    return {
        isConnected,
        isMuted,
        isDeafened,
        activePeerIds,
        joinVoiceChannel,
        leaveVoiceChannel: cleanup,
        toggleMute,
        toggleDeafen,
    };
}