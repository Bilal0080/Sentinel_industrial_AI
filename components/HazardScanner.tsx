import React, { useState, useRef, useEffect, useMemo } from 'react';
import { analyzeImageForHazards } from '../services/geminiService';
import { AnalysisResult, HazardSeverity, HazardDetail } from '../types';

interface HistoryEntry {
  id: string;
  timestamp: Date;
  title: string;
  category: string;
  severity: HazardSeverity;
}

const STOP6_CATEGORIES = [
  { code: 'A', label: 'Pinch Point', icon: '🦾' },
  { code: 'E', label: 'Electrical', icon: '⚡' },
  { code: 'F', label: 'Fall Height', icon: '🪜' },
  { code: 'C', label: 'Car/Heavy', icon: '🚜' },
  { code: 'G', label: 'Footwear/Gen', icon: '🥾' }
];

const FOOTWEAR_CAUSES = [
  { id: 'Impact', label: 'Crush/Impact', icon: '🔨', desc: 'Falling load protection.' },
  { id: 'Puncture', label: 'Sharp Debris', icon: '📌', desc: 'Prevents metal penetration.' },
  { id: 'Slip', label: 'Liquid/Oil', icon: '🌊', desc: 'Maintains grip on slicks.' },
  { id: 'Electrical', label: 'Static/Shock', icon: '🔌', desc: 'Discharge/Shock insulation.' },
  { id: 'Thermal', label: 'Extreme Temp', icon: '🔥', desc: 'Heat/Chemical resistance.' }
];

const SEVERITIES = [
  { id: HazardSeverity.LOW, label: 'Low', color: 'bg-emerald-500', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { id: HazardSeverity.MEDIUM, label: 'Medium', color: 'bg-amber-500', bg: 'bg-amber-100', text: 'text-amber-700' },
  { id: HazardSeverity.HIGH, label: 'High', color: 'bg-orange-600', bg: 'bg-orange-100', text: 'text-orange-700' },
  { id: HazardSeverity.CRITICAL, label: 'Critical', color: 'bg-red-600', bg: 'bg-red-100', text: 'text-red-700' }
];

const HazardScanner: React.FC = () => {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  
  // Filter states
  const [activeCategory, setActiveCategory] = useState<string | 'ALL'>('ALL');
  const [activeSeverity, setActiveSeverity] = useState<HazardSeverity | 'ALL'>('ALL');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const getHazardUI = (codeOrCat: string) => {
    const val = codeOrCat.toUpperCase();
    if (val === 'A' || val.includes('PINCH')) return { code: 'A', icon: '🦾', bg: 'bg-orange-100', text: 'text-orange-700', label: 'Pinch Point' };
    if (val === 'E' || val.includes('ELECTRICAL')) return { code: 'E', icon: '⚡', bg: 'bg-amber-100', text: 'text-amber-700', label: 'Electrical' };
    if (val === 'F' || val.includes('FALL')) return { code: 'F', icon: '🪜', bg: 'bg-blue-100', text: 'text-blue-700', label: 'Fall Height' };
    if (val === 'C' || val.includes('CAR') || val.includes('VEHICLE')) return { code: 'C', icon: '🚜', bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Car/Heavy' };
    return { code: 'G', icon: '🥾', bg: 'bg-slate-900', text: 'text-white', label: 'Footwear/Gen' };
  };

  const playChirp = (type: 'info' | 'alert') => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const audioCtx = new AudioContext();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(type === 'alert' ? 880 : 440, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
      }
    } catch (e) {}
  };

  const triggerFeedback = () => {
    playChirp('alert');
    if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
    setAlertVisible(true);
    setTimeout(() => setAlertVisible(false), 3000);
  };

  const processImage = async (base64: string) => {
    const cleanBase64 = base64.split(',')[1];
    setAnalyzing(true);
    setResult(null);
    try {
      const analysis = await analyzeImageForHazards(cleanBase64);
      setResult(analysis);
      if (analysis.hazards.length > 0) {
        triggerFeedback();
        setHistory(prev => [...analysis.hazards.map((h, i) => ({
          id: `${Date.now()}-${i}`,
          timestamp: new Date(),
          title: h.title,
          category: h.category,
          severity: h.severity
        })), ...prev].slice(0, 50));
      }
    } catch (err) { console.error(err); } finally { setAnalyzing(false); }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      if (videoRef.current) { 
        videoRef.current.srcObject = stream; 
        setIsCameraActive(true); 
      }
    } catch (err) { 
      alert("Camera access denied or unavailable. Please enable permissions to scan your surroundings."); 
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      processImage(canvas.toDataURL('image/jpeg'));
      stopCamera();
    }
  };

  // Filter Logic
  const filteredHazards = useMemo(() => {
    if (!result) return [];
    return result.hazards.filter(h => {
      const catMatch = activeCategory === 'ALL' || h.category.toUpperCase().includes(activeCategory);
      const sevMatch = activeSeverity === 'ALL' || h.severity === activeSeverity;
      return catMatch && sevMatch;
    });
  }, [result, activeCategory, activeSeverity]);

  const filteredHistory = useMemo(() => {
    return history.filter(h => {
      const catMatch = activeCategory === 'ALL' || h.category.toUpperCase().includes(activeCategory);
      const sevMatch = activeSeverity === 'ALL' || h.severity === activeSeverity;
      return catMatch && sevMatch;
    });
  }, [history, activeCategory, activeSeverity]);

  const clearHistory = () => {
    if (window.confirm("Purge all recorded incident history?")) {
      setHistory([]);
      playChirp('info');
    }
  };

  return (
    <div className="space-y-6">
      {alertVisible && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4">
          <div className="bg-red-600 text-white px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-4 border-2 border-red-400">
            <span className="text-3xl animate-pulse">📢</span>
            <div className="flex flex-col">
              <span className="font-black text-xs uppercase tracking-widest opacity-80">Sentinel Warning</span>
              <span className="font-black text-lg uppercase tracking-tight">Active Hazard Detected</span>
            </div>
          </div>
        </div>
      )}

      {/* Surroundings Scanner HUD */}
      <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl text-center space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="w-24 h-24 bg-amber-50 rounded-[2.5rem] flex items-center justify-center text-5xl mx-auto shadow-inner border border-amber-100">🛡️</div>
        <div>
          <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">Tactical Surroundings Scanner</h2>
          <p className="text-slate-500 max-w-lg mx-auto mt-2 font-medium">
            Scan for silent hazards where employees might move others into danger and verify <span className="text-blue-600 font-bold">1L Water Mandate</span> indicators.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4">
          {!isCameraActive ? (
            <button 
              onClick={startCamera}
              className="bg-amber-500 text-slate-900 px-10 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-amber-400 transition-all flex items-center gap-3 shadow-2xl active:scale-95"
              disabled={analyzing}
            >
              {analyzing ? <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div> : "📸"}
              {analyzing ? "Analyzing Environment..." : "Start Tactical Scan"}
            </button>
          ) : (
            <div className="flex flex-col items-center gap-4 w-full max-w-lg">
              <div className="relative w-full rounded-[2rem] overflow-hidden border-8 border-slate-900 shadow-2xl aspect-video bg-slate-950">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div className="absolute inset-0 border border-white/10 pointer-events-none"></div>
                <div className="absolute top-6 left-6 flex items-center gap-2 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></span>
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Uplink Active</span>
                </div>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={capturePhoto} 
                  className="bg-amber-500 text-slate-900 px-10 py-3 rounded-xl font-black uppercase tracking-widest shadow-lg active:scale-95"
                >
                  Capture & Analyze
                </button>
                <button 
                  onClick={stopCamera} 
                  className="bg-slate-800 text-slate-400 px-6 py-3 rounded-xl font-black uppercase tracking-widest border border-slate-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white p-4 rounded-[3rem] border border-slate-200 shadow-sm">
              <div className="bg-slate-100 aspect-video rounded-2xl flex items-center justify-center text-slate-400 font-bold uppercase text-xs">
                Visual Capture Processed
              </div>
            </div>
            
            <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 text-white shadow-2xl">
               <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-4">Metabolic Load Diagnostic</h4>
               <div className="flex items-center justify-between mb-2">
                 <span className="text-xs font-bold text-slate-400">Heat Index</span>
                 <span className="text-lg font-black text-white">{result.metabolicHeatIndex}/10</span>
               </div>
               <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                 <div 
                   className="h-full bg-amber-500 transition-all duration-1000" 
                   style={{ width: `${(result.metabolicHeatIndex || 0) * 10}%` }}
                 />
               </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <h3 className="text-2xl font-black text-slate-900 uppercase italic mb-6">Detected Hazards</h3>
              <div className="space-y-4">
                {filteredHazards.map((hazard, i) => (
                  <div key={i} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${getHazardUI(hazard.category).bg} ${getHazardUI(hazard.category).text}`}>
                      {getHazardUI(hazard.category).icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h5 className="font-black text-slate-900 uppercase text-sm">{hazard.title}</h5>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase ${
                          SEVERITIES.find(s => s.id === hazard.severity)?.bg || 'bg-slate-100'
                        } ${
                          SEVERITIES.find(s => s.id === hazard.severity)?.text || 'text-slate-600'
                        }`}>
                          {hazard.severity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">{hazard.potentialRisk}</p>
                      <div className="mt-2 text-[10px] font-bold text-emerald-600 uppercase">
                        Action: {hazard.preventativeMeasure}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black text-slate-900 uppercase italic">Incident History</h3>
          <button onClick={clearHistory} className="text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors">
            Purge Logs
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</th>
                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Severity</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((entry) => (
                <tr key={entry.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-4 text-xs font-bold text-slate-400">{entry.timestamp.toLocaleTimeString()}</td>
                  <td className="py-4">
                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${getHazardUI(entry.category).bg} ${getHazardUI(entry.category).text}`}>
                      {getHazardUI(entry.category).label}
                    </span>
                  </td>
                  <td className="py-4 text-xs font-black text-slate-900 uppercase tracking-tight">{entry.title}</td>
                  <td className="py-4">
                    <span className={`text-[9px] font-black uppercase ${SEVERITIES.find(s => s.id === entry.severity)?.text}`}>
                      {entry.severity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default HazardScanner;