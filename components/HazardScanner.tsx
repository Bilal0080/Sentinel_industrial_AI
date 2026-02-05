
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { analyzeImageForHazards } from '../services/geminiService';
import { AnalysisResult, HazardSeverity } from '../types';

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
  { code: 'G', label: 'General', icon: '⚠️' }
];

const SEVERITIES = Object.values(HazardSeverity);

const HazardScanner: React.FC = () => {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  
  // Filter states
  const [filterCodes, setFilterCodes] = useState<string[]>([]);
  const [filterSeverities, setFilterSeverities] = useState<HazardSeverity[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('hazard_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setHistory(parsed.map((item: any) => ({ ...item, timestamp: new Date(item.timestamp) })));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('hazard_history', JSON.stringify(history));
  }, [history]);

  const getHazardUI = (codeOrCat: string) => {
    const val = codeOrCat.toUpperCase();
    
    if (val === 'A' || val.includes('PINCH')) {
      return { code: 'A', icon: '🦾', bg: 'bg-orange-100', text: 'text-orange-700', label: 'PINCH/CRUSH' };
    }
    if (val === 'E' || val.includes('ELECTRICAL')) {
      return { code: 'E', icon: '⚡', bg: 'bg-amber-100', text: 'text-amber-700', label: 'ELECTRICAL' };
    }
    if (val === 'F' || val.includes('FALL')) {
      return { code: 'F', icon: '🪜', bg: 'bg-blue-100', text: 'text-blue-700', label: 'FALL/HEIGHT' };
    }
    if (val === 'C' || val.includes('CAR') || val.includes('TRAFFIC') || val.includes('VEHICLE')) {
      return { code: 'C', icon: '🚜', bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'VEHICLE/HEAVY' };
    }
    
    return { code: 'G', icon: '⚠️', bg: 'bg-slate-100', text: 'text-slate-700', label: 'GENERAL' };
  };

  const toggleCodeFilter = (code: string) => {
    setFilterCodes(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const toggleSeverityFilter = (sev: HazardSeverity) => {
    setFilterSeverities(prev => 
      prev.includes(sev) ? prev.filter(s => s !== sev) : [...prev, sev]
    );
  };

  const clearFilters = () => {
    setFilterCodes([]);
    setFilterSeverities([]);
  };

  const filteredCurrentHazards = useMemo(() => {
    if (!result) return [];
    return result.hazards.filter(h => {
      const ui = getHazardUI(h.category);
      const codeMatch = filterCodes.length === 0 || filterCodes.includes(ui.code);
      const sevMatch = filterSeverities.length === 0 || filterSeverities.includes(result.severity);
      return codeMatch && sevMatch;
    });
  }, [result, filterCodes, filterSeverities]);

  const filteredHistory = useMemo(() => {
    return history.filter(h => {
      const ui = getHazardUI(h.category);
      const codeMatch = filterCodes.length === 0 || filterCodes.includes(ui.code);
      const sevMatch = filterSeverities.length === 0 || filterSeverities.includes(h.severity);
      return codeMatch && sevMatch;
    });
  }, [history, filterCodes, filterSeverities]);

  const triggerFeedback = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch (e) { console.warn("Audio feedback failed:", e); }

    if ('vibrate' in navigator) { navigator.vibrate([100, 50, 100]); }
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 400);
    setAlertVisible(true);
    setTimeout(() => setAlertVisible(false), 3000);
  };

  const processImage = async (base64: string) => {
    const cleanBase64 = base64.split(',')[1];
    setImagePreview(base64);
    setAnalyzing(true);
    setResult(null);
    try {
      const analysis = await analyzeImageForHazards(cleanBase64);
      setResult(analysis);
      
      if (analysis.hazards && analysis.hazards.length > 0) {
        triggerFeedback();
        
        const newEntries: HistoryEntry[] = analysis.hazards.map((h, i) => ({
          id: `${Date.now()}-${i}`,
          timestamp: new Date(),
          title: h.title,
          category: h.category,
          severity: analysis.severity
        }));
        
        setHistory(prev => [...newEntries, ...prev].slice(0, 50));
      }
    } catch (err) { console.error(err); } finally { setAnalyzing(false); }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => processImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) { videoRef.current.srcObject = stream; setIsCameraActive(true); }
    } catch (err) { console.error("Error accessing camera:", err); alert("Camera access required."); }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) { (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop()); videoRef.current.srcObject = null; }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg');
      stopCamera();
      processImage(base64);
    }
  };

  const getSeverityColor = (sev: HazardSeverity) => {
    switch (sev) {
      case HazardSeverity.LOW: return 'bg-blue-100 text-blue-700 border-blue-200';
      case HazardSeverity.MEDIUM: return 'bg-amber-100 text-amber-700 border-amber-200';
      case HazardSeverity.HIGH: return 'bg-orange-100 text-orange-700 border-orange-200';
      case HazardSeverity.CRITICAL: return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const clearHistory = () => {
    if (confirm("Clear all recorded hazard history?")) {
      setHistory([]);
      localStorage.removeItem('hazard_history');
    }
  };

  return (
    <div className="space-y-6 relative">
      {isFlashing && (
        <div className="fixed inset-0 bg-red-500/20 z-[200] pointer-events-none transition-opacity duration-300 ease-out animate-pulse" />
      )}

      {alertVisible && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 duration-300">
          <div className="bg-red-600 text-white px-8 py-4 rounded-[2rem] shadow-[0_0_50px_rgba(220,38,38,0.5)] flex items-center gap-4 border-2 border-red-400">
            <span className="text-3xl animate-bounce">🚨</span>
            <div>
              <span className="font-black tracking-widest uppercase text-xs block opacity-80">Stop 6 Alert</span>
              <span className="font-bold text-lg">Critical Safety Code Breach!</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Scanner Section */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-20 h-20 bg-amber-50 rounded-[2rem] flex items-center justify-center text-4xl shadow-inner">📸</div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Stop 6 Tactical Scanner</h2>
            <p className="text-slate-500 max-w-md mx-auto mt-2 font-medium">
              Mapping A (Pinch), E (Electrical), F (Fall), and C (Vehicles) risks using industrial vision.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            {!isCameraActive ? (
              <>
                <button
                  onClick={startCamera}
                  className="bg-amber-500 text-slate-950 px-10 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-amber-400 transition-all shadow-xl shadow-amber-500/20 active:scale-95 flex items-center gap-3"
                  disabled={analyzing}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Scan Area
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-95 flex items-center gap-3"
                  disabled={analyzing}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  {analyzing ? 'Processing...' : 'Upload Incident'}
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-4 w-full">
                <div className="relative w-full max-w-2xl bg-slate-950 rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(245,158,11,0.2)] border-8 border-slate-900">
                  <video ref={videoRef} autoPlay playsInline className="w-full aspect-video object-cover" />
                  <div className="absolute top-6 left-6 flex items-center gap-3 bg-black/60 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10">
                    <span className="w-3 h-3 bg-red-600 rounded-full animate-ping"></span>
                    <span className="text-white text-[11px] font-black tracking-[0.2em] uppercase">Tactical Feed</span>
                  </div>
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4">
                    <button onClick={capturePhoto} className="bg-white text-slate-950 px-10 py-3 rounded-2xl font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all">Capture</button>
                    <button onClick={stopCamera} className="bg-red-600 text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all">Abort</button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </div>

      {/* Filter Dashboard */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <span className="text-lg">🎯</span> Stop 6 Filter Logic
          </h3>
          {(filterCodes.length > 0 || filterSeverities.length > 0) && (
            <button 
              onClick={clearFilters}
              className="text-[10px] font-black text-amber-600 hover:text-amber-700 uppercase tracking-widest"
            >
              Reset Filters
            </button>
          )}
        </div>
        
        <div className="space-y-4">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Stop 6 Classification</p>
            <div className="flex flex-wrap gap-2">
              {STOP6_CATEGORIES.map(cat => (
                <button
                  key={cat.code}
                  onClick={() => toggleCodeFilter(cat.code)}
                  className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-tight border transition-all flex items-center gap-2 ${
                    filterCodes.includes(cat.code) 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-105' 
                    : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xs">{cat.icon}</span>
                  Code {cat.code}: {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Severity Impact</p>
            <div className="flex flex-wrap gap-2">
              {SEVERITIES.map(sev => {
                const isActive = filterSeverities.includes(sev);
                const colorClass = getSeverityColor(sev);
                return (
                  <button
                    key={sev}
                    onClick={() => toggleSeverityFilter(sev)}
                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tight border transition-all ${
                      isActive 
                      ? `${colorClass} shadow-md scale-105 ring-2 ring-offset-1 ring-slate-200` 
                      : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {sev}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
        <div className="xl:col-span-3 space-y-8">
          {imagePreview && (
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm animate-in fade-in duration-500">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Inspection Visual</h3>
              <img src={imagePreview} alt="Captured" className="w-full h-auto rounded-2xl object-cover max-h-[400px]" />
            </div>
          )}

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm min-h-[400px]">
            {analyzing ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] space-y-6">
                <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-900 font-black text-lg uppercase tracking-tight">Stop 6 Logic Analysis...</p>
              </div>
            ) : result ? (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                  <div>
                    <h3 className="text-2xl font-black tracking-tight text-slate-900 uppercase italic">Stop 6 Audit Log</h3>
                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Target Area Assessment</p>
                  </div>
                  <span className={`px-5 py-2.5 rounded-full text-xs font-black border uppercase tracking-widest shadow-sm ${getSeverityColor(result.severity)}`}>
                    {result.severity} Risk
                  </span>
                </div>

                {filteredCurrentHazards.length === 0 ? (
                  <div className="py-20 text-center opacity-40">
                    <p className="text-sm font-bold uppercase tracking-widest italic">No matches for current filters.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredCurrentHazards.map((hazard, i) => {
                      const ui = getHazardUI(hazard.category);
                      return (
                        <div 
                          key={`${i}-${hazard.title}`} 
                          className="group bg-slate-50 border border-slate-200 rounded-3xl overflow-hidden hover:border-amber-400 transition-all animate-new-detection"
                          style={{ animationDelay: `${i * 150}ms` }}
                        >
                          <div className="bg-white p-5 border-b border-slate-200 flex items-center gap-4">
                            <span className={`w-14 h-14 rounded-2xl ${ui.bg} ${ui.text} flex flex-col items-center justify-center shadow-sm transition-transform group-hover:scale-110`}>
                              <span className="text-2xl">{ui.icon}</span>
                              <span className="text-[10px] font-black -mt-1">CODE {ui.code}</span>
                            </span>
                            <div className="flex-1">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">{ui.label}</span>
                              <h5 className="font-black text-slate-900 text-lg tracking-tight uppercase">{hazard.title}</h5>
                            </div>
                          </div>
                          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                              <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Impact Detail</p>
                              <p className="text-sm text-slate-600 font-medium">{hazard.potentialRisk}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Standard Mitigation</p>
                              <p className="text-sm text-slate-600 font-medium">{hazard.preventativeMeasure}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-slate-400 text-center">
                <div className="text-7xl mb-6 opacity-10">🛡️</div>
                <p className="italic font-bold text-slate-500 max-w-xs">Initialize a scan to map Stop 6 hazards across the facility.</p>
              </div>
            )}
          </div>
        </div>

        {/* Audit History Column */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col h-full max-h-[850px]">
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase italic">Stop 6 Archives</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Incident Detection Log</p>
              </div>
              {history.length > 0 && (
                <button 
                  onClick={clearHistory}
                  className="text-[9px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors"
                >
                  Clear Log
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
              {filteredHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-20 grayscale">
                  <span className="text-5xl mb-4">{history.length === 0 ? '📜' : '🔍'}</span>
                  <p className="text-[10px] font-black uppercase tracking-widest">
                    {history.length === 0 ? 'Archive Empty' : 'Filtered Out'}
                  </p>
                </div>
              ) : (
                filteredHistory.map((entry) => {
                  const ui = getHazardUI(entry.category);
                  return (
                    <div key={entry.id} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl group hover:border-slate-300 transition-all animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl ${ui.bg} ${ui.text} flex flex-col items-center justify-center shadow-sm`}>
                          <span className="text-xl leading-none">{ui.icon}</span>
                          <span className="text-[8px] font-black">CODE {ui.code}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{ui.label}</span>
                             <span className="text-[9px] font-black text-slate-400 uppercase">{entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <h5 className="font-black text-slate-900 text-sm truncate uppercase tracking-tight mt-0.5">{entry.title}</h5>
                          <div className="flex items-center justify-between mt-2">
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black border uppercase tracking-widest ${getSeverityColor(entry.severity)}`}>
                              {entry.severity}
                            </span>
                            <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">
                              {entry.timestamp.toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes new-detection {
          0% { transform: translateY(20px) scale(0.95); opacity: 0; border-color: transparent; }
          60% { border-color: #f59e0b; }
          100% { transform: translateY(0) scale(1); opacity: 1; border-color: #e2e8f0; }
        }
        .animate-new-detection {
          animation: new-detection 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          opacity: 0;
        }
      `}} />
    </div>
  );
};

export default HazardScanner;
