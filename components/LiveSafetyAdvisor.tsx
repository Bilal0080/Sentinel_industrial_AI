
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';

const FRAME_RATE = 1; // 1 frame per second is enough for hazard detection
const JPEG_QUALITY = 0.6;

interface TacticalHazard {
  id: string;
  x: number;
  y: number;
  radius: number;
  type: 'Fire' | 'Leak' | 'Electrical' | 'Obstruction' | 'General';
  severity: 'MEDIUM' | 'HIGH' | 'CRITICAL';
  label: string;
}

const LiveSafetyAdvisor: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [transcription, setTranscription] = useState<string[]>([]);
  const [status, setStatus] = useState<string>('Ready for tactical link');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [evacuationAlert, setEvacuationAlert] = useState<string | null>(null);
  const [proximityWarning, setProximityWarning] = useState<{ label: string; direction: string; severity: string } | null>(null);
  
  // Tactical Hazards state - could be updated by AI tool calls or proximity triggers
  const [hazardZones, setHazardZones] = useState<TacticalHazard[]>([
    { id: 'h1', x: 25, y: 75, radius: 12, type: 'Leak', severity: 'CRITICAL', label: 'WING B GAS LEAK' },
    { id: 'h2', x: 75, y: 25, radius: 8, type: 'Electrical', severity: 'HIGH', label: 'EXPOSED WIRING' },
    { id: 'h3', x: 50, y: 45, radius: 10, type: 'Fire', severity: 'CRITICAL', label: 'ACTIVE THERMAL EVENT' },
  ]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastAlertTimeRef = useRef<number>(0);

  useEffect(() => {
    if ("geolocation" in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(newLoc);
        },
        (err) => console.error("Location error:", err),
        { enableHighAccuracy: true }
      );
    }
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  const getMapPos = useCallback(() => {
    if (!location) return { x: 50, y: 50 };
    // Simulated tactical projection mapping GPS to a 100x100 grid for demonstration
    const x = (Math.abs(location.lng) % 0.001) * 100000;
    const y = (Math.abs(location.lat) % 0.001) * 100000;
    return { x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) };
  }, [location]);

  const getDirection = (ux: number, uy: number, hx: number, hy: number) => {
    const dx = hx - ux;
    const dy = hy - uy; // SVG Y is down
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    if (angle >= -22.5 && angle < 22.5) return "EAST";
    if (angle >= 22.5 && angle < 67.5) return "SOUTH-EAST";
    if (angle >= 67.5 && angle < 112.5) return "SOUTH";
    if (angle >= 112.5 && angle < 157.5) return "SOUTH-WEST";
    if (angle >= 157.5 || angle < -157.5) return "WEST";
    if (angle >= -157.5 && angle < -112.5) return "NORTH-WEST";
    if (angle >= -112.5 && angle < -67.5) return "NORTH";
    if (angle >= -67.5 && angle < -22.5) return "NORTH-EAST";
    return "UNKNOWN";
  };

  const playWarningChime = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
  }, []);

  // Proximity detection logic
  useEffect(() => {
    if (!location || !hazardZones.length) return;

    const userPos = getMapPos();
    let closestHazard: TacticalHazard | null = null;
    let minDistance = Infinity;

    hazardZones.forEach(hazard => {
      const dist = Math.sqrt(Math.pow(userPos.x - hazard.x, 2) + Math.pow(userPos.y - hazard.y, 2));
      // Trigger warning if within hazard radius + safety buffer
      if (dist < hazard.radius + 5) {
        if (dist < minDistance) {
          minDistance = dist;
          closestHazard = hazard;
        }
      }
    });

    if (closestHazard) {
      const hazard = closestHazard as TacticalHazard;
      const direction = getDirection(userPos.x, userPos.y, hazard.x, hazard.y);
      
      setProximityWarning({
        label: hazard.label,
        direction: direction,
        severity: hazard.severity
      });

      // Throttled alerts (audio/haptic)
      const now = Date.now();
      if (now - lastAlertTimeRef.current > 2000) {
        lastAlertTimeRef.current = now;
        playWarningChime();
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
      }
    } else {
      setProximityWarning(null);
    }
  }, [location, hazardZones, getMapPos, playWarningChime]);

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number) => {
    const dataInt16 = new Int16Array(data.buffer);
    const buffer = ctx.createBuffer(1, dataInt16.length, sampleRate);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
  };

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.readAsDataURL(blob);
    });
  };

  const startSession = async () => {
    try {
      setStatus('Syncing Telemetry...');
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const inputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true,
        video: { facingMode: 'environment' }
      });

      if (videoRef.current) videoRef.current.srcObject = stream;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setStatus('Tactical Link Active');
            
            const source = inputContext.createMediaStreamSource(stream);
            const scriptProcessor = inputContext.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000'
              };
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputContext.destination);

            frameIntervalRef.current = window.setInterval(() => {
              if (videoRef.current && canvasRef.current) {
                const video = videoRef.current;
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  canvas.width = video.videoWidth;
                  canvas.height = video.videoHeight;
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  canvas.toBlob(async (blob) => {
                    if (blob) {
                      const base64Data = await blobToBase64(blob);
                      sessionPromise.then((session) => {
                        session.sendRealtimeInput({
                          media: { data: base64Data, mimeType: 'image/jpeg' }
                        });
                      });
                    }
                  }, 'image/jpeg', JPEG_QUALITY);
                }
              }
            }, 1000 / FRAME_RATE);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              setTranscription(prev => [...prev.slice(-6), `AI: ${text}`]);
              if (text.toLowerCase().includes('evacuate') || text.toLowerCase().includes('danger') || text.toLowerCase().includes('exit')) {
                setEvacuationAlert(text);
              }
            } else if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              setTranscription(prev => [...prev.slice(-6), `You: ${text}`]);
            }

            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && audioContextRef.current) {
              const ctx = audioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), ctx, 24000);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch (err) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => { console.error('Error:', e); setStatus('Link Failed'); },
          onclose: () => { setStatus('Offline'); setIsActive(false); }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          systemInstruction: `You are Sentinel Industrial AI Tactical Command.
          
          CAPABILITIES:
          - Monitor worker via real-time GPS (${location ? `Lat: ${location.lat}, Lng: ${location.lng}` : 'Waiting for GPS'}), Audio, and Video.
          - Identify hazards in video: fire, leaks, exposed wires, structural failure.
          - Access a Tactical Map Overlay of the plant.
          
          MISSION:
          1. DIRECT MOVEMENT: Use directional cues relative to the user's position.
          2. COORDINATE EVACUATION: In an emergency, direct the user to the nearest safe exit.
          3. HAZARD WARNING: Alert the user immediately if they approach a hazard zone marked on the tactical map.
          
          COMMUNICATION:
          - Be brief, loud, and clear.
          - Use cardinal directions and "O'clock" references.`
        }
      });

      sessionPromiseRef.current = sessionPromise;
      setIsActive(true);
    } catch (err) {
      console.error('Failed to establish link:', err);
      setStatus('Telemetry Error');
    }
  };

  const stopSession = () => {
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    sessionPromiseRef.current?.then(session => { try { session.close(); } catch (err) {} });
    setIsActive(false);
    setStatus('Link Cut');
    setEvacuationAlert(null);
  };

  const getHazardColor = (severity: string) => {
    switch(severity) {
      case 'CRITICAL': return '#ef4444'; // Red
      case 'HIGH': return '#f97316';     // Orange
      case 'MEDIUM': return '#eab308';   // Yellow
      default: return '#64748b';
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Evacuation Alert (Fullscreen priority) */}
      {evacuationAlert && (
        <div className="bg-red-600 text-white p-6 rounded-[2rem] shadow-2xl animate-pulse border-4 border-red-400 flex items-center gap-6 z-[60] relative">
          <div className="text-5xl">🚨</div>
          <div className="flex-1">
            <h3 className="text-xl font-black uppercase tracking-widest">Immediate Life-Safety Directive</h3>
            <p className="font-bold text-lg">{evacuationAlert}</p>
          </div>
          <button onClick={() => setEvacuationAlert(null)} className="bg-white/20 hover:bg-white/30 px-6 py-3 rounded-2xl font-black uppercase text-sm">Roger</button>
        </div>
      )}

      {/* Proximity Warning (Dynamic Tactical Overlay) */}
      {proximityWarning && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[55] w-full max-w-md px-4 animate-in slide-in-from-top-4 duration-300">
          <div className={`p-6 rounded-[2rem] shadow-2xl border-4 flex flex-col items-center text-center gap-2 ${
            proximityWarning.severity === 'CRITICAL' ? 'bg-red-950/90 border-red-600 text-white' : 'bg-orange-950/90 border-orange-600 text-white'
          } backdrop-blur-xl`}>
             <div className="flex items-center gap-3">
               <span className="text-4xl animate-bounce">⚠️</span>
               <h3 className="text-lg font-black uppercase tracking-widest">Tactical Alert</h3>
             </div>
             <p className="font-bold text-xl uppercase italic tracking-tight">{proximityWarning.label}</p>
             <div className="mt-2 py-2 px-6 bg-white/10 rounded-full border border-white/20">
               <span className="text-xs font-black tracking-[0.2em] uppercase">Vector:</span>
               <span className="ml-2 font-black text-amber-400">{proximityWarning.direction}</span>
             </div>
             <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-2 opacity-60">Maintain safe distance immediately</p>
          </div>
        </div>
      )}

      <div className="bg-slate-950 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden border border-slate-800">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
          
          {/* Tactical Video Feed */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl transition-all ${isActive ? 'bg-amber-500 text-slate-950 shadow-[0_0_40px_rgba(245,158,11,0.5)]' : 'bg-slate-800 text-slate-500'}`}>
                  👁️
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tighter uppercase italic text-amber-500">Visual Command</h2>
                  <p className="text-slate-500 text-[10px] font-black tracking-[0.3em] uppercase">Live Sensory Uplink</p>
                </div>
              </div>
            </div>

            <div className={`aspect-video rounded-[2.5rem] overflow-hidden border-4 bg-slate-900 transition-all relative ${isActive ? 'border-amber-500 shadow-[0_0_60px_rgba(245,158,11,0.1)]' : 'border-slate-800'}`}>
              <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover transition-all ${isActive ? 'brightness-110 contrast-125 saturate-150' : 'grayscale opacity-20'}`} />
              <div className="absolute inset-0 pointer-events-none border border-white/5">
                <div className="absolute top-8 left-8 p-4 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 space-y-1">
                  <p className="text-[9px] font-black text-amber-400/70 tracking-widest uppercase">Telemetry</p>
                  <p className="text-[11px] font-mono text-white/90">X-AXIS: +0.22</p>
                  <p className="text-[11px] font-mono text-white/90">Y-AXIS: -1.04</p>
                  <p className="text-[11px] font-mono text-white/90">HUMID: 42%</p>
                </div>
                <div className="w-full h-full grid grid-cols-4 grid-rows-4 opacity-10">
                  {Array.from({length: 16}).map((_, i) => <div key={i} className="border border-white/20"></div>)}
                </div>
              </div>
              {/* Visual screen flash on proximity */}
              {proximityWarning && (
                <div className="absolute inset-0 bg-red-600/20 animate-pulse pointer-events-none border-4 border-red-600/50" />
              )}
            </div>

            <div className="flex items-center gap-6 justify-center">
              <button
                onClick={isActive ? stopSession : startSession}
                className={`flex items-center gap-4 px-12 py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] transition-all active:scale-95 ${
                  isActive 
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-2xl shadow-red-900/40' 
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-2xl shadow-amber-900/40'
                }`}
              >
                {isActive ? 'Cut Uplink' : 'Initialize Command'}
              </button>
              <div className="text-center bg-slate-900 px-6 py-3 rounded-2xl border border-slate-800 shadow-inner">
                <span className={`text-[10px] font-black uppercase tracking-[0.3em] block mb-1 ${isActive ? 'text-amber-500' : 'text-slate-600'}`}>
                  Link Integrity
                </span>
                <span className="text-sm font-black text-white">{status}</span>
              </div>
            </div>
          </div>

          {/* Tactical Map Overlay */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            <div className="bg-slate-900/90 rounded-[3rem] border border-slate-800 p-8 relative flex-1 min-h-[400px]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-blue-400 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></span>
                  Tactical Map Overlay
                </h3>
              </div>

              <div className="absolute inset-x-8 bottom-8 top-20 border border-white/10 rounded-[2rem] overflow-hidden bg-slate-950 shadow-inner">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <defs>
                    <pattern id="tactical-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5"/>
                    </pattern>
                    <pattern id="hazard-pattern" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                      <rect width="2" height="4" fill="rgba(255,255,255,0.1)" />
                    </pattern>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  
                  <rect width="100" height="100" fill="url(#tactical-grid)" />
                  
                  {/* Structural lines */}
                  <path d="M10,10 L40,10 L40,40 L10,40 Z" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                  <path d="M60,10 L90,10 L90,40 L60,40 Z" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                  <path d="M10,60 L90,60 L90,90 L10,90 Z" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />

                  {/* Hazard Zones */}
                  {hazardZones.map((hazard) => (
                    <g key={hazard.id}>
                      <circle cx={hazard.x} cy={hazard.y} r={hazard.radius} fill={getHazardColor(hazard.severity)} opacity="0.1">
                        <animate attributeName="r" values={`${hazard.radius};${hazard.radius * 1.5};${hazard.radius}`} dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.1;0.02;0.1" dur="2s" repeatCount="indefinite" />
                      </circle>
                      <circle cx={hazard.x} cy={hazard.y} r={hazard.radius} fill={getHazardColor(hazard.severity)} opacity="0.2" filter="url(#glow)" />
                      <circle cx={hazard.x} cy={hazard.y} r={hazard.radius} fill="url(#hazard-pattern)" />
                      <text x={hazard.x} y={hazard.y + 1} textAnchor="middle" fontSize="3" fill="white" fontWeight="900" style={{ pointerEvents: 'none' }}>
                        {hazard.type.toUpperCase()}
                      </text>
                    </g>
                  ))}

                  {/* Player Position */}
                  {location && (
                    <g filter="url(#glow)">
                      <circle cx={getMapPos().x} cy={getMapPos().y} r="3" fill="rgba(59,130,246,0.2)">
                        <animate attributeName="r" values="3;5;3" dur="3s" repeatCount="indefinite" />
                      </circle>
                      <circle cx={getMapPos().x} cy={getMapPos().y} r="1.5" fill="#3b82f6" />
                      <line x1={getMapPos().x} y1={getMapPos().y} x2={getMapPos().x} y2={getMapPos().y - 10} stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="1,1" opacity="0.5" />
                    </g>
                  )}
                </svg>
              </div>
            </div>

            {/* Comms Log */}
            <div className="h-[200px] bg-slate-900 rounded-[2rem] border border-slate-800 flex flex-col overflow-hidden">
               <div className="px-6 py-3 border-b border-slate-800 flex justify-between items-center">
                  <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase">Comms History</span>
               </div>
               <div className="flex-1 p-4 space-y-3 overflow-y-auto scrollbar-hide">
                 {transcription.length === 0 ? (
                   <div className="h-full flex items-center justify-center opacity-10">
                      <p className="text-[10px] font-black uppercase tracking-[0.4em]">Listening...</p>
                   </div>
                 ) : (
                   transcription.map((t, i) => (
                    <div key={i} className={`flex ${t.startsWith('You:') ? 'justify-end' : 'justify-start'}`}>
                      <div className={`px-4 py-2 rounded-2xl text-[11px] max-w-[90%] font-bold ${
                        t.startsWith('You:') ? 'bg-slate-800 text-slate-300 rounded-tr-none' : 'bg-amber-500 text-slate-950 rounded-tl-none'
                      }`}>
                        {t.replace(/^You: |^AI: /, '')}
                      </div>
                    </div>
                   ))
                 )}
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Footer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Escape Vectors</h4>
          <div className="space-y-3">
             <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-emerald-900">NORTH EXIT - ALPHA</p>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase">Path Integrity: 98%</p>
                </div>
                <div className="text-xl">🟢</div>
             </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Active Telemetry</h4>
          <div className="space-y-4">
            {hazardZones.map(h => {
              const userPos = getMapPos();
              const dist = Math.sqrt(Math.pow(userPos.x - h.x, 2) + Math.pow(userPos.y - h.y, 2));
              return (
                <div key={h.id} className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs" style={{ backgroundColor: `${getHazardColor(h.severity)}22`, color: getHazardColor(h.severity) }}>
                      {h.type[0]}
                   </div>
                   <div className="flex-1">
                      <p className="text-xs font-black text-slate-900 uppercase">{h.label}</p>
                      <p className="text-[10px] font-bold text-slate-400">Distance: {dist.toFixed(1)}m</p>
                   </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-950 p-8 rounded-[2rem] shadow-2xl relative flex flex-col justify-between border border-slate-800">
           <div className="space-y-2">
              <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em]">Commander HUD</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-bold italic">
                Uplink established. AI currently cross-referencing visual stream with plant-wide hazard telemetry. 
              </p>
           </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default LiveSafetyAdvisor;
