
import React, { useState, useRef } from 'react';
import { analyzeHygieneSafety } from '../services/geminiService';
import { AnalysisResult, HazardSeverity, HazardDetail } from '../types';

const HygieneMonitor: React.FC = () => {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [selectedContext, setSelectedContext] = useState('Tetra Pak Milk');
  const [ambientTemp, setAmbientTemp] = useState(30);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const processImage = async (base64: string) => {
    const cleanBase64 = base64.split(',')[1];
    setImagePreview(base64);
    setAnalyzing(true);
    setResult(null);

    try {
      const analysis = await analyzeHygieneSafety(cleanBase64, selectedContext, ambientTemp);
      setResult(analysis);
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      alert("Camera access required for Tactical Hygiene Monitoring.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
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
      case HazardSeverity.LOW: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case HazardSeverity.MEDIUM: return 'bg-orange-100 text-orange-700 border-orange-200';
      case HazardSeverity.HIGH: return 'bg-red-100 text-red-700 border-red-200';
      case HazardSeverity.CRITICAL: return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const isDairyScan = selectedContext.includes('Milk') || selectedContext.includes('Biryani');

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
               <span className="text-xl">🌡️</span> Ambient Plant Temperature
            </h3>
            <span className={`text-xl font-black ${ambientTemp > 35 ? 'text-red-600' : 'text-blue-600'}`}>
              {ambientTemp}°C
            </span>
          </div>
          <input 
            type="range" min="15" max="50" step="1" 
            value={ambientTemp} 
            onChange={(e) => setAmbientTemp(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between mt-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span>Normal (15°C)</span>
            <span>Critical (50°C)</span>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border flex items-center gap-4 transition-all ${
          ambientTemp > 35 ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
        }`}>
           <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
             ambientTemp > 35 ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-600 text-white'
           }`}>
             {ambientTemp > 35 ? '🥵' : '🌡️'}
           </div>
           <div>
             <p className="text-xs font-black text-slate-900 uppercase">Thermal Load Advisory</p>
             <p className="text-[10px] text-slate-500 font-bold leading-tight uppercase">
               {ambientTemp > 35 
                 ? 'Dairy Alert: High protein intake in this heat requires mandatory 1L water buffer.' 
                 : 'Monitoring: Standard metabolic audit active.'}
             </p>
           </div>
        </div>
      </div>

      <div className={`rounded-3xl p-8 text-white shadow-xl relative overflow-hidden transition-all duration-500 ${
        isDairyScan ? 'bg-slate-900 border-2 border-blue-500/30' : 'bg-emerald-950'
      }`}>
        <div className="flex flex-col items-center justify-center text-center space-y-4 relative z-10">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-inner ${
            isDairyScan ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-emerald-500/20 text-emerald-400'
          }`}>
            {selectedContext.includes('Milk') ? '🥛' : '🍱'}
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tighter uppercase italic">
              {selectedContext} Audit
            </h2>
            <p className="text-white/60 max-w-md mx-auto mt-1 text-[11px] font-bold uppercase tracking-widest">
               Analyzing packaging integrity & metabolic "Protein Surge" impact.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 p-1 bg-black/40 backdrop-blur-md rounded-2xl mt-2 border border-white/5">
            {['Tetra Pak Milk', 'Chicken Biryani', 'Beef Curry', 'General Hygiene'].map((ctx) => (
              <button
                key={ctx}
                onClick={() => setSelectedContext(ctx)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${
                  selectedContext === ctx 
                    ? 'bg-blue-600 text-white shadow-lg scale-105 border border-blue-400' 
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                {ctx}
              </button>
            ))}
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
            {!isCameraActive ? (
              <button
                onClick={startCamera}
                className="bg-white text-slate-900 px-10 py-4 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center gap-3 shadow-2xl active:scale-95"
                disabled={analyzing}
              >
                📸 Initialize {selectedContext} Scan
              </button>
            ) : (
              <div className="flex flex-col items-center gap-4 w-full max-w-lg">
                <div className="relative w-full rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white/10 aspect-video">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <div className="absolute inset-0 border border-blue-500/20 pointer-events-none"></div>
                </div>
                <div className="flex gap-4">
                  <button onClick={capturePhoto} className="bg-blue-600 text-white px-10 py-3 rounded-xl font-black uppercase tracking-widest shadow-lg active:scale-95">Analyze Package</button>
                  <button onClick={stopCamera} className="bg-slate-800 text-slate-400 px-6 py-3 rounded-xl font-black uppercase tracking-widest border border-slate-700">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {imagePreview && (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
          <div className="xl:col-span-2 space-y-4">
            <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm h-fit">
               <img src={imagePreview} alt="Inspection" className="w-full h-auto rounded-2xl object-cover shadow-inner" />
            </div>

            {result && (
              <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Metabolic Heat Load HUD</h4>
                  <span className="text-xs font-black text-white">{result.metabolicHeatIndex}/10</span>
                </div>
                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                   <div 
                     className={`h-full transition-all duration-1000 ${result.metabolicHeatIndex && result.metabolicHeatIndex > 7 ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-blue-500'}`} 
                     style={{ width: `${(result.metabolicHeatIndex || 0) * 10}%` }}
                   />
                </div>
                <div className="mt-6 p-4 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-[10px] text-slate-400 leading-relaxed font-bold uppercase tracking-tight">
                    Consumption of dairy in {ambientTemp}°C requires a blood-volume buffer. Ensure the 1L Sentinel Water Protocol was completed exactly 15 minutes before this intake.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="xl:col-span-3 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm min-h-[400px]">
            {analyzing ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] space-y-4">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-black uppercase tracking-widest animate-pulse">Auditing Packaging & Heat Impact...</p>
              </div>
            ) : result ? (
              <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Integrity Report</h3>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-black">Context: {selectedContext} | Env: {ambientTemp}°C</p>
                  </div>
                  <span className={`px-5 py-2.5 rounded-full text-[10px] font-black border uppercase tracking-widest shadow-sm ${getSeverityColor(result.severity)}`}>
                    {result.severity} RISK
                  </span>
                </div>

                <div className="space-y-6">
                  {result.hazards.map((hazard: HazardDetail, i: number) => (
                    <div key={i} className="bg-slate-50 border border-slate-200 rounded-3xl p-6 group hover:border-blue-400 transition-all shadow-sm">
                      <div className="flex items-center gap-4 mb-4">
                        <span className="text-2xl w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">⚠️</span>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{hazard.category}</p>
                          <h5 className="font-black text-slate-900 uppercase italic text-base leading-none">{hazard.title}</h5>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-inner">
                        <div className="space-y-2">
                          <p className="text-[9px] font-black text-red-600 uppercase tracking-widest">Biological/Thermal Risk</p>
                          <p className="text-xs text-slate-600 font-bold leading-relaxed">{hazard.thermalImpact || hazard.potentialRisk}</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Sentinel Corrective</p>
                          <p className="text-xs text-slate-600 font-bold leading-relaxed">{hazard.preventativeMeasure}</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800 text-white shadow-xl">
                    <h4 className="text-[11px] font-black text-blue-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></span>
                      Consumption Directives
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                      {result.recommendations.map((r, i) => (
                        <div key={i} className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-colors">
                           <span className="text-blue-500 font-black text-lg">→</span>
                           <span className="text-xs font-bold leading-tight uppercase tracking-tight text-slate-300">{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-slate-300 text-center">
                <div className="text-7xl mb-6 opacity-20 grayscale-0">📦</div>
                <p className="font-black uppercase tracking-widest text-xs max-w-[200px]">Awaiting package integrity visual data</p>
              </div>
            )}
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default HygieneMonitor;
