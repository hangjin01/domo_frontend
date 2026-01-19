
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { Mic, Send, X, Sparkles, Loader2, StopCircle } from 'lucide-react';
import { createPcmBlob } from '../../../lib/utils/audio.ts';

interface GeminiHubProps {
  onClose: () => void;
}

const MODEL_ID = 'gemini-2.5-flash-native-audio-preview-12-2025';

export const GeminiHub: React.FC<GeminiHubProps> = ({ onClose }) => {
  const [mode, setMode] = useState<'chat' | 'live'>('live');
  const [isConnected, setIsConnected] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Live API Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);

  // Initialize GenAI
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  // --- Live Mode Logic ---
  const startLiveSession = async () => {
    try {
      setIsConnected(true);
      
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
        } 
      });
      streamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: MODEL_ID,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: { parts: [{ text: "You are a helpful AI assistant for the DOMO workspace. Be concise and friendly." }] },
        },
        callbacks: {
          onopen: () => {
            console.log('Gemini Live Connected');
            setIsTalking(true);
            
            // Setup Audio Input
            if (!audioContextRef.current) return;
            const source = audioContextRef.current.createMediaStreamSource(stream);
            sourceRef.current = source;
            
            const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const blob = createPcmBlob(inputData);
              
              sessionPromise.then(session => {
                  session.sendRealtimeInput({
                      media: blob
                  });
              });
            };
            
            source.connect(processor);
            processor.connect(audioContextRef.current.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
               playAudioChunk(audioData);
            }
          },
          onclose: () => {
            console.log('Gemini Live Closed');
            stopLiveSession();
          },
          onerror: (err) => {
            console.error('Gemini Live Error', err);
            stopLiveSession();
          }
        }
      });
      sessionPromiseRef.current = sessionPromise;

    } catch (err) {
      console.error("Failed to start live session", err);
      setIsConnected(false);
    }
  };

  const playAudioChunk = async (base64Audio: string) => {
      try {
        if (!audioContextRef.current) return;
        
        const playbackCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        
        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        const float32Array = new Float32Array(bytes.length / 2);
        const dataView = new DataView(bytes.buffer);
        
        for (let i = 0; i < bytes.length / 2; i++) {
            const int16 = dataView.getInt16(i * 2, true); // Little endian
            float32Array[i] = int16 / 32768;
        }
        
        const buffer = playbackCtx.createBuffer(1, float32Array.length, 24000);
        buffer.getChannelData(0).set(float32Array);
        
        const source = playbackCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(playbackCtx.destination);
        source.start(0);
        
      } catch (e) {
          console.error("Audio playback error", e);
      }
  };

  const stopLiveSession = () => {
    setIsConnected(false);
    setIsTalking(false);
    
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
    }
    if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
    }
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }
    sessionPromiseRef.current = null;
  };

  // --- Chat Mode Logic ---
  const sendChatMessage = async () => {
    if (!inputText.trim()) return;
    
    const userMsg = { role: 'user' as const, text: inputText };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: inputText,
        });
        
        const text = result.text;
        if (text) {
            setMessages(prev => [...prev, { role: 'model', text }]);
        }
    } catch (e) {
        setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error." }]);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
      return () => stopLiveSession();
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
      <div className="w-[500px] h-[600px] glass-panel rounded-[2.5rem] flex flex-col overflow-hidden relative shadow-2xl border border-white/20 dark:border-white/10 bg-white/80 dark:bg-black/80">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-white/10">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl bg-gradient-to-tr from-blue-500 to-purple-600 shadow-lg`}>
                    <Sparkles className="text-white" size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">Gemini Live</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Multimodal Assistant</p>
                </div>
            </div>
            <button onClick={() => { stopLiveSession(); onClose(); }} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                <X size={20} />
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
            {mode === 'live' ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8 relative">
                    {/* Visualizer Placeholder */}
                    <div className={`w-48 h-48 rounded-full flex items-center justify-center transition-all duration-1000 ${isConnected ? 'bg-blue-500/10 dark:bg-blue-500/20 scale-110' : 'bg-gray-100 dark:bg-white/5'}`}>
                        <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-700 ${isConnected ? 'bg-blue-500/20 dark:bg-blue-500/30 scale-110 animate-pulse' : 'bg-gray-200 dark:bg-white/10'}`}>
                             <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${isConnected ? 'bg-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.6)] scale-110' : 'bg-gray-300 dark:bg-white/20'}`}>
                                 <Mic size={32} className={`text-white ${isConnected ? 'animate-bounce' : ''}`} />
                             </div>
                        </div>
                    </div>
                    
                    <div className="text-center space-y-2">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            {isConnected ? "Listening..." : "Ready to chat"}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[200px] mx-auto">
                            {isConnected ? "Speak naturally. Gemini is listening." : "Start a voice conversation with Gemini."}
                        </p>
                    </div>

                    <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4">
                        {!isConnected ? (
                            <button onClick={startLiveSession} className="btn-primary px-8 py-3 rounded-2xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2">
                                <Mic size={18} />
                                Start Conversation
                            </button>
                        ) : (
                            <button onClick={stopLiveSession} className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2">
                                <StopCircle size={18} />
                                End Session
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {messages.length === 0 && (
                            <div className="h-full flex items-center justify-center text-gray-400 text-sm italic">
                                Ask Gemini anything...
                            </div>
                        )}
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3.5 rounded-2xl text-sm leading-relaxed ${
                                    m.role === 'user' 
                                    ? 'bg-blue-500 text-white rounded-tr-sm' 
                                    : 'bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200 rounded-tl-sm'
                                }`}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-gray-100 dark:bg-white/10 p-3 rounded-2xl rounded-tl-sm">
                                    <Loader2 className="animate-spin text-gray-500" size={16} />
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="p-4 bg-white/50 dark:bg-black/20 border-t border-gray-200 dark:border-white/5">
                        <div className="relative">
                            <input 
                                className="w-full bg-gray-100 dark:bg-white/5 border-none rounded-xl py-3 pl-4 pr-12 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                                placeholder="Type a message..."
                                value={inputText}
                                onChange={e => setInputText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                            />
                            <button 
                                onClick={sendChatMessage}
                                disabled={!inputText.trim() || isLoading}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg transition-colors"
                            >
                                <Send size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Tab Switcher */}
        <div className="p-2 bg-gray-50 dark:bg-white/5 flex gap-1 border-t border-gray-200 dark:border-white/5">
            <button 
                onClick={() => setMode('live')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${mode === 'live' ? 'bg-white dark:bg-white/10 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
                Live Voice
            </button>
            <button 
                onClick={() => setMode('chat')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${mode === 'chat' ? 'bg-white dark:bg-white/10 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
                Text Chat
            </button>
        </div>
      </div>
    </div>
  );
};
