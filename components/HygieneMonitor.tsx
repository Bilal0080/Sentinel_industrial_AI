
import React, { useState, useRef } from 'react';
import { analyzeHygieneSafety } from '../services/geminiService';
import { AnalysisResult, HazardSeverity } from '../types';

const HygieneMonitor: React.FC = () => {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [selectedContext, setSelectedContext] = useState('Chicken Biryani');
  const [ambientTemp, setAmbientTemp] = useState(30);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Hygiene monitoring requires camera permissions.");
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

  const isFoodScan = selectedContext === 'Chicken Biryani' || selectedContext === 'Beef Curry';

  return (
    <div className="space-y-6">
      {/* Temperature & Scale Control Panel */}
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
            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span>Cool (15°C)</span>
            <span>Critical (50°C)</span>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
           <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${ambientTemp > 35 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-blue-100 text-blue-600'}`}>
             {ambientTemp > 35 ? '🥵' : '🌡️'}
           </div>
           <div>
             <p className="text-xs font-black text-slate-900 uppercase">Thermal Safety Mode</p>
             <p className="text-[10px] text-slate-500 font-medium">
               {ambientTemp > 35 
                 ? 'CRITICAL HEAT: High metabolic load meals (oily/spicy) are extremely high-risk.' 
                 : 'NORMAL HEAT: Standard dietary monitoring active.'}
             </p>
           </div>
        </div>
      </div>

      <div className={`rounded-3xl p-8 text-white shadow-xl relative overflow-hidden transition-all duration-500 ${
        isFoodScan ? 'bg-amber-900 border-2 border-red-500/30' : 'bg-emerald-900'
      }`}>
        <div className="flex flex-col items-center justify-center text-center space-y-4 relative z-10">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-inner ${
            isFoodScan ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400'
          }`}>
            {isFoodScan ? '🌶️' : '🧼'}
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              {isFoodScan ? 'Canteen Health Audit' : 'Hygiene & Sanitation Monitor'}
            </h2>
            <p className="text-white/70 max-w-md mx-auto mt-2 text-sm">
               Analyzing {selectedContext} in {ambientTemp}°C environment. Detecting how oil and mirchi affect employee core temperatures.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 p-1 bg-black/30 backdrop-blur-md rounded-2xl mt-2 border border-white/5">
            {['Chicken Biryani', 'Beef Curry', 'Washroom', 'General Hygiene'].map((ctx) => (
              <button
                key={ctx}
                onClick={() => setSelectedContext(ctx)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${
                  selectedContext === ctx 
                    ? 'bg-amber-500 text-slate-900 shadow-lg scale-105' 
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
                className="bg-white text-slate-900 px-10 py-3.5 rounded-2xl font-bold transition-all flex items-center gap-2 shadow-2xl active:scale-95"
                disabled={analyzing}
              >
                📸 Capture {selectedContext}
              </button>
            ) : (
              <div className="flex flex-col items-center gap-4 w-full max-w-lg">
                <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20">
                  <video ref={videoRef} autoPlay playsInline className="w-full aspect-video object-cover" />
                </div>
                <div className="flex gap-4">
                  <button onClick={capturePhoto} className="bg-amber-500 text-slate-900 px-8 py-3 rounded-xl font-bold shadow-lg active:scale-95">Analyze</button>
                  <button onClick={stopCamera} className="bg-slate-800 text-slate-300 px-6 py-3 rounded-xl font-semibold border border-slate-700">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {imagePreview && (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
          <div className="xl:col-span-2 space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm h-fit">
               <img src={imagePreview} alt="Inspection" className="w-full h-auto rounded-xl object-cover max-h-[500px]" />
            </div>

            {result && (
              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Metabolic Heat Load</h4>
                  <span className="text-xs font-black text-white">{result.metabolicHeatIndex}/10</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                   <div 
                     className={`h-full transition-all duration-1000 ${result.metabolicHeatIndex && result.metabolicHeatIndex > 7 ? 'bg-red-500' : 'bg-amber-500'}`} 
                     style={{ width: `${(result.metabolicHeatIndex || 0) * 10}%` }}
                   />
                </div>
                <p className="text-[10px] text-slate-500 mt-4 leading-relaxed font-bold">
                  High metabolic heat load from fat/protein digestion synergizes with ambient {ambientTemp}°C to increase core thermal exhaustion risk.
                </p>
              </div>
            )}
          </div>

          <div className="xl:col-span-3 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm min-h-[400px]">
            {analyzing ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] space-y-4">
                <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 animate-pulse font-medium">Analyzing Thermal Synergy...</p>
              </div>
            ) : result ? (
              <div className="space-y-8">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">Thermal-Metabolic Audit</h3>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-bold">Ambient: {ambientTemp}°C | Metabolic Load: {result.metabolicHeatIndex}/10</p>
                  </div>
                  <span className={`px-4 py-2 rounded-full text-[10px] font-bold border uppercase tracking-widest shadow-sm ${getSeverityColor(result.severity)}`}>
                    {result.severity} RISK
                  </span>
                </div>

                <div className="space-y-6">
                  {result.hazards.map((hazard, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 group hover:border-amber-400 transition-all">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xl">⚠️</span>
                        <h5 className="font-black text-slate-900 uppercase italic text-sm">{hazard.title}</h5>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-red-500 uppercase tracking-widest">Thermal Impact</p>
                          <p className="text-xs text-slate-600 font-bold">{hazard.thermalImpact}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Corrective Measure</p>
                          <p className="text-xs text-slate-600">{hazard.preventativeMeasure}</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="bg-amber-900 p-6 rounded-3xl border border-amber-800 text-white">
                    <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></span>
                      Commander Recommendations for {ambientTemp}°C
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {result.recommendations.map((r, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-black/20 rounded-xl border border-white/5">
                           <span className="text-amber-500 font-black">→</span>
                           <span className="text-xs font-bold leading-tight">{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-slate-400 text-center">
                <div className="text-6xl mb-4 opacity-10">🍱</div>
                <p className="italic font-medium text-sm">Analyze food impact at {ambientTemp}°C.</p>
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
