
import React, { useState, useEffect, useRef } from 'react';
import { generateGroundFitnessRoutine } from '../services/geminiService';
import { FitnessRoutine } from '../types';

const GroundFitness: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [routine, setRoutine] = useState<FitnessRoutine | null>(null);
  const [workerIssues, setWorkerIssues] = useState('');
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const fetchRoutine = async () => {
    setLoading(true);
    try {
      const res = await generateGroundFitnessRoutine(workerIssues || "General back pain and leg fatigue");
      setRoutine(res);
      setActiveStepIndex(0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCamera = async () => {
    if (isCameraActive) {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
      setIsCameraActive(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsCameraActive(true);
        }
      } catch (err) {
        alert("Camera access required for Tactical HUD.");
      }
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
          <div className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center text-5xl shadow-[0_0_50px_rgba(37,99,235,0.4)] border-2 border-blue-400">
            👟
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-4xl font-black tracking-tighter uppercase italic text-blue-400">Ground Tactical Fitness</h2>
            <p className="text-slate-400 font-medium max-w-xl mt-2 leading-relaxed">
              Initialize a 30-minute metabolic and mobility session designed for the plant floor. Addresses stiffness, fatigue, and early morning dehydration.
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full md:w-auto">
             <input 
               type="text" 
               placeholder="Enter specific pain or fatigue issues..." 
               value={workerIssues}
               onChange={(e) => setWorkerIssues(e.target.value)}
               className="bg-slate-800 border border-slate-700 px-6 py-4 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-500"
             />
             <button 
               onClick={fetchRoutine}
               disabled={loading}
               className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
             >
               {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "Start 30-Min Drill"}
             </button>
          </div>
        </div>
      </div>

      {routine && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-10 duration-700">
          
          {/* Tactical HUD / Camera Preview */}
          <div className="lg:col-span-7 space-y-6">
             <div className="bg-slate-950 rounded-[2.5rem] border-4 border-slate-900 shadow-2xl overflow-hidden relative aspect-video flex items-center justify-center">
                {isCameraActive ? (
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover brightness-75 contrast-125" />
                ) : (
                  <div className="flex flex-col items-center gap-4 text-slate-600 opacity-40 group">
                    <span className="text-7xl group-hover:scale-110 transition-transform">👤</span>
                    <p className="font-black uppercase tracking-[0.4em] text-[10px]">Tactical Link Offline</p>
                  </div>
                )}

                {/* HUD Overlay */}
                <div className="absolute inset-0 pointer-events-none p-8 flex flex-col justify-between">
                   <div className="flex justify-between items-start">
                      <div className="bg-black/40 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10">
                         <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Active Step</p>
                         <h4 className="text-lg font-black text-white uppercase italic">{routine.steps[activeStepIndex].title}</h4>
                      </div>
                      <div className="bg-red-600/20 backdrop-blur-md px-6 py-3 rounded-2xl border border-red-500/30 flex items-center gap-3">
                         <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                         <p className="text-xs font-black text-white uppercase tracking-widest">Live Coaching Link</p>
                      </div>
                   </div>

                   <div className="flex justify-center">
                      <div className="bg-blue-600/20 backdrop-blur-xl p-8 rounded-[3rem] border border-blue-500/30 text-center max-w-sm">
                         <p className="text-[11px] font-black text-blue-200 uppercase tracking-[0.3em] mb-2">Instructions</p>
                         <p className="text-sm font-bold text-white leading-relaxed italic">
                           "{routine.steps[activeStepIndex].instruction}"
                         </p>
                      </div>
                   </div>

                   <div className="flex justify-between items-end">
                      <div className="bg-black/40 backdrop-blur-md px-5 py-3 rounded-xl border border-white/10">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Duration</p>
                         <p className="text-xl font-mono text-white font-bold">{routine.steps[activeStepIndex].duration}</p>
                      </div>
                      <div className="flex gap-2">
                         <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                         <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                         <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                      </div>
                   </div>
                </div>
             </div>

             <div className="flex justify-center gap-4">
                <button 
                  onClick={toggleCamera}
                  className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl border border-slate-800 hover:bg-slate-800 transition-all flex items-center gap-3"
                >
                  {isCameraActive ? "Disable Camera HUD" : "Initialize Camera HUD"}
                </button>
             </div>
          </div>

          {/* Routine Steps Checklist */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col h-full max-h-[600px]">
              <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase italic">Drill Sequence</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">30 Minutes Total Mobility</p>
                </div>
                <div className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl font-black text-[10px] uppercase tracking-widest border border-blue-200">
                  Ready: {routine.steps.length} Steps
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide">
                {routine.steps.map((step, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setActiveStepIndex(idx)}
                    className={`w-full text-left p-6 rounded-[2rem] border transition-all relative overflow-hidden group ${
                      activeStepIndex === idx 
                        ? 'bg-blue-600 border-blue-500 text-white shadow-xl shadow-blue-900/20 scale-[1.02]' 
                        : 'bg-slate-50 border-slate-100 hover:border-slate-300 text-slate-900'
                    }`}
                  >
                    <div className="flex items-start justify-between relative z-10">
                      <div className="flex items-start gap-4">
                        <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-sm ${
                          activeStepIndex === idx ? 'bg-white/20 text-white' : 'bg-white text-slate-400'
                        }`}>
                          {idx + 1}
                        </span>
                        <div>
                          <h5 className="font-black uppercase tracking-tight text-lg leading-tight">{step.title}</h5>
                          <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${activeStepIndex === idx ? 'text-blue-200' : 'text-slate-400'}`}>
                            {step.duration} • Focus: {step.focusArea}
                          </p>
                        </div>
                      </div>
                      {activeStepIndex > idx && <span className="text-emerald-500 text-xl">✅</span>}
                    </div>
                    {activeStepIndex === idx && (
                      <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl font-black select-none uppercase">Next</div>
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-8 pt-8 border-t border-slate-100">
                 <div className="bg-amber-50 p-6 rounded-3xl border border-amber-200 flex items-start gap-4">
                    <span className="text-2xl">🚧</span>
                    <div>
                       <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">Safety Override</p>
                       <p className="text-xs text-amber-900 font-medium italic leading-snug">"{routine.warningNote}"</p>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Benefits Summary Section */}
      {routine && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-5 duration-1000">
           <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Therapeutic Focus</h4>
              <p className="text-sm text-slate-700 font-medium leading-relaxed">
                Routine sequence addresses <span className="text-blue-600 font-bold">{workerIssues || "General Load Management"}</span> through targeted eccentric muscle control.
              </p>
           </div>
           <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Metabolic Benefit</h4>
              <p className="text-sm text-slate-700 font-medium leading-relaxed">
                By starting with hydration integration, we stabilize core temperature before increasing metabolic heart rate in the drill steps.
              </p>
           </div>
           <div className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800 shadow-xl flex items-center gap-6">
              <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-4xl">⏱️</div>
              <div>
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Drill Duration</p>
                <p className="text-3xl font-black text-white italic tracking-tighter uppercase">30 Minutes</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default GroundFitness;
