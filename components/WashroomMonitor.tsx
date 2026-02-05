
import React, { useState, useRef } from 'react';
import { analyzeWashroomSanitation } from '../services/geminiService';
import { AnalysisResult, HazardSeverity } from '../types';

const WashroomMonitor: React.FC = () => {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [ambientTemp, setAmbientTemp] = useState(30);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const processImage = async (base64: string) => {
    const cleanBase64 = base64.split(',')[1];
    setImagePreview(base64);
    setAnalyzing(true);
    setResult(null);
    try {
      const analysis = await analyzeWashroomSanitation(cleanBase64, ambientTemp);
      setResult(analysis);
    } catch (err) { 
      console.error(err); 
    } finally { 
      setAnalyzing(false); 
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) { 
        videoRef.current.srcObject = stream; 
        setIsCameraActive(true); 
      }
    } catch (err) { 
      alert("Camera access required for Tactical Sanitation Audit."); 
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) { 
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop()); 
      videoRef.current.srcObject = null; 
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg');
      stopCamera();
      processImage(base64);
    }
  };

  return (
    <div className="space-y-6">
      {/* Temperature Control Module */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
               <span className="text-xl">🌡️</span> Washroom Ambient Temp
            </h3>
            <span className={`text-2xl font-black italic tracking-tighter ${ambientTemp > 35 ? 'text-red-600' : 'text-teal-600'}`}>
              {ambientTemp}°C
            </span>
          </div>
          <input 
            type="range" min="15" max="50" step="1" 
            value={ambientTemp} 
            onChange={(e) => setAmbientTemp(parseInt(e.target.value))}
            className="w-full h-3 bg-slate-100 rounded-full appearance-none cursor-pointer accent-teal-600"
          />
          <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            <span>Cool (15°C)</span>
            <span>Extreme (50°C)</span>
          </div>
        </div>

        <div className={`p-6 rounded-3xl border transition-all duration-500 flex items-center gap-5 ${
          ambientTemp > 35 ? 'bg-red-50 border-red-200 ring-4 ring-red-500/10' : 'bg-teal-50 border-teal-200'
        }`}>
           <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm ${
             ambientTemp > 35 ? 'bg-red-600 text-white animate-pulse' : 'bg-teal-600 text-white'
           }`}>
             {ambientTemp > 35 ? '⚠️' : '🛡️'}
           </div>
           <div>
             <p className="text-sm font-black text-slate-900 uppercase italic tracking-tight">
               {ambientTemp > 35 ? 'Critical Bacterial Load Alert' : 'Sanitation Link Normal'}
             </p>
             <p className="text-[10px] text-slate-500 font-bold uppercase leading-tight mt-1">
               {ambientTemp > 35 
                 ? 'High heat accelerates microbial growth. Prioritize 1L water protocol & station sterilization.' 
                 : 'Monitoring for standard slip and leakage vectors.'}
             </p>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-xl relative overflow-hidden text-center">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="w-20 h-20 bg-teal-50 rounded-[2rem] flex items-center justify-center text-4xl shadow-inner border border-teal-100">🚿</div>
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Washroom Sanitation Audit</h2>
            <p className="text-slate-500 font-medium max-w-lg mx-auto mt-2 text-sm leading-relaxed uppercase tracking-tight">
              Detecting puddles, bacterial growth hotspots, and ensuring <span className="text-blue-600 font-bold">1L Water Protocol</span> station integrity.
            </p>
          </div>
          
          <div className="flex gap-4">
            {!isCameraActive ? (
              <button onClick={startCamera} className="bg-teal-600 text-white px-12 py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl hover:bg-teal-500 transition-all flex items-center gap-4 active:scale-95">
                <span className="text-2xl">📸</span> Start Environment Audit
              </button>
            ) : (
              <div className="flex flex-col items-center gap-6 w-full max-w-2xl animate-in zoom-in-95 duration-500">
                <div className="relative rounded-[3rem] overflow-hidden border-[12px] border-slate-950 shadow-2xl aspect-video w-full bg-slate-950 group">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <div className="absolute inset-0 border-2 border-teal-500/30 pointer-events-none"></div>
                  {/* Tactical HUD Overlay */}
                  <div className="absolute top-8 left-8 bg-black/60 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/10 flex items-center gap-3">
                    <span className="w-2 h-2 bg-teal-500 rounded-full animate-ping"></span>
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Bio-Link Active</span>
                  </div>
                  {ambientTemp > 35 && (
                    <div className="absolute bottom-8 left-8 right-8 bg-red-600/20 backdrop-blur-xl p-4 rounded-2xl border border-red-500/30">
                       <p className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                         <span className="text-xl animate-pulse">🦠</span> Bio-Proliferation Threshold Exceeded
                       </p>
                    </div>
                  )}
                </div>
                <div className="flex gap-4 w-full max-w-md">
                   <button onClick={capturePhoto} className="flex-1 bg-white text-slate-950 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl border-b-4 border-slate-200 active:scale-95">Capture</button>
                   <button onClick={stopCamera} className="flex-1 bg-slate-900 text-slate-400 py-4 rounded-2xl font-black uppercase tracking-widest hover:text-white transition-all active:scale-95">Abort Link</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
           <div className="lg:col-span-2 space-y-4">
             <div className="bg-white p-4 rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden h-fit">
                <img src={imagePreview!} alt="Audit" className="w-full h-auto rounded-[2.2rem] shadow-inner contrast-110 saturate-125" />
             </div>
             {ambientTemp > 35 && (
               <div className="bg-red-900 p-8 rounded-[2.5rem] border border-red-800 text-white shadow-2xl">
                  <h4 className="text-[10px] font-black text-red-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                    Thermal Sanitation Protocol
                  </h4>
                  <p className="text-xs font-bold leading-relaxed italic uppercase tracking-tight opacity-80">
                    "Ambient heat of {ambientTemp}°C necessitates a 200% increase in sterilization frequency. Bio-hazards are now classified as Critical."
                  </p>
               </div>
             )}
           </div>

           <div className="lg:col-span-3 space-y-8">
              <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                 <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-8">
                   <div>
                     <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Audit Diagnostic</h3>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Environmentally Grounded Analysis</p>
                   </div>
                   <span className={`px-6 py-3 rounded-full text-[10px] font-black border uppercase tracking-widest shadow-sm ${
                     result.severity === 'LOW' ? 'bg-emerald-100 text-emerald-700' : 
                     result.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                   }`}>
                     {result.severity} Priority
                   </span>
                 </div>
                 
                 <div className="space-y-6">
                    {result.hazards.map((h, i) => (
                      <div key={i} className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200 hover:border-teal-500 transition-all group shadow-sm">
                         <div className="flex items-center gap-4 mb-4">
                            <span className="text-2xl bg-white w-12 h-12 rounded-xl flex items-center justify-center shadow-sm">🚿</span>
                            <h5 className="font-black text-slate-900 uppercase text-xl italic tracking-tight group-hover:text-teal-700 transition-colors">{h.title}</h5>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-inner">
                            <div className="space-y-2">
                               <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Biological Risk</p>
                               <p className="text-sm font-bold text-slate-600 leading-relaxed uppercase tracking-tight">{h.potentialRisk}</p>
                            </div>
                            <div className="space-y-2">
                               <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Corrective Mandate</p>
                               <p className="text-sm font-bold text-slate-600 leading-relaxed uppercase tracking-tight italic">"{h.preventativeMeasure}"</p>
                            </div>
                         </div>
                      </div>
                    ))}
                    {result.hazards.length === 0 && (
                      <div className="py-20 text-center opacity-20 flex flex-col items-center">
                        <span className="text-6xl mb-4">🧼</span>
                        <p className="font-black uppercase tracking-widest text-xs">Awaiting Sensor Data</p>
                      </div>
                    )}
                 </div>

                 {result.recommendations.length > 0 && (
                   <div className="mt-10 bg-slate-900 p-10 rounded-[2.5rem] border border-slate-800 text-white shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-5 text-4xl font-black uppercase tracking-[0.4em] select-none">MANDATE</div>
                      <h4 className="text-[11px] font-black text-teal-400 uppercase tracking-[0.4em] mb-8 flex items-center gap-3">
                         <span className="w-2.5 h-2.5 bg-teal-500 rounded-full animate-ping"></span>
                         Command Recommendations
                      </h4>
                      <div className="grid grid-cols-1 gap-4">
                         {result.recommendations.map((r, i) => (
                           <div key={i} className="flex items-start gap-5 p-5 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-all">
                              <span className="text-teal-500 font-black text-2xl leading-none">»</span>
                              <span className="text-xs font-black leading-tight uppercase tracking-tight text-slate-300 italic">"{r}"</span>
                           </div>
                         ))}
                      </div>
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default WashroomMonitor;
