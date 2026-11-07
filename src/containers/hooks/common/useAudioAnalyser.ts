/**
 * [파일 안내] frontend/src/containers/hooks/common/useAudioAnalyser.ts
 * Web Audio 분석기로 입력 스트림의 음량을 읽어 발화 여부/시각화에 사용할 값을 만듭니다.
 * MediaStream과 분석 노드, 반복 프레임의 수명을 구분합니다. 분석을 멈출 때 프레임과 오디오 자원 정리가 필요합니다.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseAudioAnalyserOptions {
    /** speaking 판정 임계값 (0-255, 기본값: 30) */
    threshold?: number;
    /** 분석 간격 (ms, 기본값: 100) */
    interval?: number;
    /** speaking 상태 유지 시간 (ms, 기본값: 300) */
    holdTime?: number;
}

interface UseAudioAnalyserReturn {
    /** 현재 speaking 상태 */
    isSpeaking: boolean;
    /** 현재 오디오 레벨 (0-255) */
    audioLevel: number;
    /** 분석 시작 */
    startAnalysis: (stream: MediaStream) => void;
    /** 분석 중지 */
    stopAnalysis: () => void;
}

/**
 * MediaStream의 오디오 레벨을 분석하여 speaking 상태를 감지하는 hook
 * Web Audio API의 AnalyserNode를 사용하여 실시간 볼륨 레벨 측정
 */
export function useAudioAnalyser(options: UseAudioAnalyserOptions = {}): UseAudioAnalyserReturn {
    const {
        threshold = 30,
        interval = 100,
        holdTime = 300,
    } = options;

    const [isSpeaking, setIsSpeaking] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const intervalIdRef = useRef<number | null>(null);
    const holdTimeoutRef = useRef<number | null>(null);
    const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

    // 클린업 함수
    const cleanup = useCallback(() => {
        if (intervalIdRef.current !== null) {
            window.clearInterval(intervalIdRef.current);
            intervalIdRef.current = null;
        }

        if (holdTimeoutRef.current !== null) {
            window.clearTimeout(holdTimeoutRef.current);
            holdTimeoutRef.current = null;
        }

        if (sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current = null;
        }

        if (analyserRef.current) {
            analyserRef.current.disconnect();
            analyserRef.current = null;
        }

        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(() => {
                // AudioContext close 실패는 무시
            });
            audioContextRef.current = null;
        }

        dataArrayRef.current = null;
        setIsSpeaking(false);
        setAudioLevel(0);
    }, []);

    // 분석 시작
    const startAnalysis = useCallback((stream: MediaStream) => {
        // 기존 분석 중지
        cleanup();

        try {
            // AudioContext 생성 (Safari 호환)
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) {
                console.error('Web Audio API not supported');
                return;
            }

            const audioContext = new AudioContextClass();
            audioContextRef.current = audioContext;

            // AnalyserNode 설정
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.8;
            analyserRef.current = analyser;

            // MediaStream 연결
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);
            sourceRef.current = source;

            // 데이터 배열 초기화
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            dataArrayRef.current = dataArray;

            // 주기적으로 오디오 레벨 분석
            intervalIdRef.current = window.setInterval(() => {
                if (!analyserRef.current || !dataArrayRef.current) return;

                analyserRef.current.getByteFrequencyData(dataArrayRef.current);

                // 평균 볼륨 계산
                let sum = 0;
                for (let i = 0; i < dataArrayRef.current.length; i++) {
                    sum += dataArrayRef.current[i];
                }
                const average = sum / dataArrayRef.current.length;
                setAudioLevel(Math.round(average));

                // speaking 상태 판정
                if (average > threshold) {
                    // 임계값 초과 시 speaking
                    if (holdTimeoutRef.current !== null) {
                        window.clearTimeout(holdTimeoutRef.current);
                        holdTimeoutRef.current = null;
                    }
                    setIsSpeaking(true);
                } else {
                    // 임계값 미만 시 holdTime 후 speaking 해제
                    if (holdTimeoutRef.current === null) {
                        holdTimeoutRef.current = window.setTimeout(() => {
                            setIsSpeaking(false);
                            holdTimeoutRef.current = null;
                        }, holdTime);
                    }
                }
            }, interval);

        } catch (error) {
            console.error('Failed to start audio analysis:', error);
            cleanup();
        }
    }, [cleanup, threshold, interval, holdTime]);

    // 분석 중지
    const stopAnalysis = useCallback(() => {
        cleanup();
    }, [cleanup]);

    // 컴포넌트 언마운트 시 클린업
    useEffect(() => {
        return () => {
            cleanup();
        };
    }, [cleanup]);

    return {
        isSpeaking,
        audioLevel,
        startAnalysis,
        stopAnalysis,
    };
}
