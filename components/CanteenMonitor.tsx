
import React, { useState, useRef } from 'react';
import { analyzeCanteenSafety } from '../services/geminiService';
import { AnalysisResult, HazardSeverity } from '../types';

const CanteenMonitor: React.FC = () => {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [selectedDish, setSelectedDish] = useState('Chicken Biryani');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const processImage = async (base64: string) => {
    const cleanBase64 = base64.split(',')[1];
    setImagePreview(base64);
    setAnalyzing(true);
    setResult(null);

    try {
      const analysis = await analyzeCanteenSafety(cleanBase64, selectedDish);
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
      alert("Could not access camera. Kitchen monitoring requires camera permissions.");
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

  return (
    <div className="space-y-6">
      <div className="bg-amber-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden border-2 border-red-500/20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        
        <div className="flex flex-col items-center justify-center text-center space-y-4 relative z-10">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center text-3xl border border-red-500/30">🌶️</div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Canteen Nutritional Audit</h2>
            <p className="text-amber-200 max-w-md mx-auto mt-2 text-sm">
              Monitoring excessive oil (sheen) and high chili (mirchi) levels to ensure workforce health and alertness.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 p-1 bg-black/30 backdrop-blur-md rounded-2xl mt-2 border border-white/5">
            {['Chicken Biryani', 'Beef Curry', 'General Inspection'].map((dish) => (
              <button
                key={dish}
                onClick={() => setSelectedDish(dish)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${
                  selectedDish === dish ? 'bg-red-500 text-white shadow-lg' : 'text-white/40 hover:text-white'
                }`}
              >
                {dish}
              </button>
            ))}
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
            {!isCameraActive ? (
              <button
                onClick={startCamera}
                className="bg-white text-red-900 px-10 py-3.5 rounded-2xl font-bold hover:bg-amber-50 transition-all flex items-center gap-2 shadow-2xl active:scale-95"
                disabled={analyzing}
              >
                📸 Audit {selectedDish} Prep
              </button>
            ) : (
              <div className="flex flex-col items-center gap-4 w-full max-w-lg">
                <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl border-4 border-red-500/40">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full aspect-video object-cover"
                  />
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-950/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-red-500/30">
                    <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></span>
                    <span className="text-[10px] font-bold text-white uppercase tracking-tighter">Nutritional Audit Live</span>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={capturePhoto}
                    className="bg-red-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:brightness-110 transition-all active:scale-95"
                  >
                    Analyze Health Impact
                  </button>
                  <button
                    onClick={stopCamera}
                    className="bg-slate-800 text-slate-300 px-6 py-3 rounded-xl font-semibold border border-slate-700 hover:bg-slate-700"
                  >
                    Cancel
                  </button>
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
              <h3 className="text-sm font-bold mb-4 text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                Analysis Focus: {selectedDish}
              </h3>
              <div className="relative group overflow-hidden rounded-xl">
                <img src={imagePreview} alt="Canteen" className="w-full h-auto rounded-xl object-cover max-h-[500px] border border-slate-100 shadow-inner saturate-150" />
                <div className="absolute inset-0 bg-red-500/5 mix-blend-multiply opacity-20"></div>
              </div>
            </div>

            <div className="bg-red-950 border-red-800 p-6 rounded-2xl text-white shadow-xl border">
              <h4 className="font-bold text-sm mb-2 flex items-center gap-2 text-red-400">
                <span>🥣</span> Nutritional Policy Note
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                High oil and mirchi levels correlate with post-meal lethargy and increased worker absenteeism. These are classified as "silent metabolic hazards" in industrial safety protocols.
              </p>
            </div>
          </div>

          <div className="xl:col-span-3 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm min-h-[400px]">
            {analyzing ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] space-y-4">
                <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 animate-pulse font-medium text-center">
                  Auditing ingredient proportions and physiological markers...<br/>
                  <span className="text-[10px] opacity-60 uppercase font-bold tracking-widest mt-2 block text-red-500">
                    Target: Excessive Oil Pooling & Chili Concentration
                  </span>
                </p>
              </div>
            ) : result ? (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">Food Safety & Health Report</h3>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-bold">Protocol: Nutritional Integrity Audit</p>
                  </div>
                  <span className={`px-4 py-2 rounded-full text-[10px] font-bold border uppercase tracking-widest shadow-sm ${getSeverityColor(result.severity)}`}>
                    {result.severity} RISK
                  </span>
                </div>

                <div className="space-y-8">
                  {/* Preparation Hazards */}
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Detected Physiological Hazards</h4>
                    <div className="grid grid-cols-1 gap-4">
                      {result.hazards.map((hazard, i) => (
                        <div key={i} className="bg-red-50 border border-red-200 rounded-2xl overflow-hidden shadow-sm">
                          <div className="p-4 bg-white border-b border-red-50 flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-[10px] font-bold">!</div>
                            <h5 className="font-bold text-slate-900 text-sm tracking-tight">{hazard.title}</h5>
                          </div>
                          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <p className="text-[9px] font-bold text-red-600 uppercase tracking-wider mb-1">Health Consequence</p>
                              <p className="text-xs text-slate-600 leading-relaxed font-medium">{hazard.potentialRisk}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Preventative Action</p>
                              <p className="text-xs text-slate-600 leading-relaxed font-medium">{hazard.preventativeMeasure}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Watchlist */}
                  {result.watchlist && result.watchlist.length > 0 && (
                    <div className="bg-red-50/50 border border-red-200/50 p-6 rounded-3xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-5 select-none text-4xl font-black">WATCH</div>
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg text-lg">🤢</div>
                        <div>
                          <h4 className="text-[10px] font-bold text-red-900 uppercase tracking-widest">Worker Health Watchlist</h4>
                          <p className="text-[9px] text-red-700 font-medium">Post-Consumption Metabolic Symptoms</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {result.watchlist.map((watch, i) => (
                          <div key={i} className="bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-red-300 transition-colors">
                            <div className="flex-1">
                              <p className="text-sm font-bold text-slate-900 group-hover:text-red-900">{watch.symptom}</p>
                              <p className="text-[10px] text-slate-500 mt-1 font-medium italic">Monitoring Window: {watch.timeframe}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1.5">
                              <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                watch.severity === HazardSeverity.HIGH || watch.severity === HazardSeverity.CRITICAL 
                                  ? 'bg-red-500 text-white shadow-sm' 
                                  : 'bg-orange-100 text-orange-700'
                              }`}>
                                {watch.severity} ALERT
                              </span>
                              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Protocol: {watch.actionRequired}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-red-900 p-6 rounded-3xl border border-red-800">
                    <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
                      Nutritional Corrective Steps
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {result.recommendations.map((r, i) => (
                        <div key={i} className="flex items-start gap-3 p-4 rounded-2xl border bg-slate-800 border-red-500/20 text-white shadow-sm hover:shadow-md transition-all">
                          <span className="text-red-500 font-bold">✨</span>
                          <span className="text-xs font-bold leading-tight">{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-slate-400 text-center px-4">
                <div className="text-6xl mb-6 opacity-20 transition-all duration-500 grayscale-0 saturate-150">🍛</div>
                <p className="italic font-medium text-sm">Audit dish preparation for excessive oil, chili (mirchi), and nutritional safety indicators.</p>
              </div>
            )}
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CanteenMonitor;
