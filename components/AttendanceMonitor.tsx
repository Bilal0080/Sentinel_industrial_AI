
import React, { useState, useRef } from 'react';
import { analyzeAttendanceHealth, analyzeEmployeeFitness } from '../services/geminiService';
import { AttendanceHealthAudit, EmployeeFitnessResult, HazardSeverity } from '../types';

const AttendanceMonitor: React.FC = () => {
  const [mode, setMode] = useState<'LOGS' | 'SCAN'>('LOGS');
  const [analyzing, setAnalyzing] = useState(false);
  
  // Log Mode State
  const [logResult, setLogResult] = useState<AttendanceHealthAudit | null>(null);
  
  // Scan Mode State
  const [scanResult, setScanResult] = useState<EmployeeFitnessResult | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Stats for the current session (simulated)
  const [stats, setStats] = useState({ fit: 142, unfit: 3, atRisk: 1 });

  const processLog = async (base64: string) => {
    const cleanBase64 = base64.split(',')[1];
    setAnalyzing(true);
    setLogResult(null);
    try {
      const analysis = await analyzeAttendanceHealth(cleanBase64);
      setLogResult(analysis);
    } catch (err) { console.error(err); } finally { setAnalyzing(false); }
  };

  const processFitnessScan = async (base64: string) => {
    const cleanBase64 = base64.split(',')[1];
    setAnalyzing(true);
    setScanResult(null);
    try {
      const result = await analyzeEmployeeFitness(cleanBase64);
      setScanResult(result);
      
      // Update local session stats
      if (result.status === 'FIT') setStats(s => ({ ...s, fit: s.fit + 1 }));
      else if (result.status === 'UNFIT') setStats(s => ({ ...s, unfit: s.unfit + 1 }));
      else setStats(s => ({ ...s, atRisk: s.atRisk + 1 }));
      
    } catch (err) { console.error(err); } finally { setAnalyzing(false); }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) { videoRef.current.srcObject = stream; setIsCameraActive(true); }
    } catch (err) { alert("Camera access required for Biometric Check-in."); }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) { (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop()); videoRef.current.srcObject = null; }
    setIsCameraActive(false);
  };

  const captureAndScan = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg');
      processFitnessScan(base64);
    }
  };

  const getSeverityColor = (sev: HazardSeverity) => {
    switch (sev) {
      case HazardSeverity.LOW: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case HazardSeverity.MEDIUM: return 'bg-amber-100 text-amber-700 border-amber-200';
      case HazardSeverity.HIGH: return 'bg-orange-100 text-orange-700 border-orange-200';
      case HazardSeverity.CRITICAL: return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex bg-slate-200 p-1.5 rounded-2xl w-fit mx-auto shadow-inner">
        <button 
          onClick={() => { setMode('LOGS'); stopCamera(); }}
          className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'LOGS' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Shift Health Logs
        </button>
        <button 
          onClick={() => setMode('SCAN')}
          className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'SCAN' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Biometric Check-in
        </button>
      </div>

      {mode === 'LOGS' ? (
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <div className="flex flex-col items-center justify-center text-center space-y-6 relative z-10">
              <div className="w-20 h-20 bg-blue-500/20 rounded-3xl flex items-center justify-center text-4xl shadow-inner border border-white/10">📊</div>
              <div>
                <h2 className="text-4xl font-black tracking-tighter uppercase italic">Workforce Vitality Audit</h2>
                <p className="text-slate-400 max-w-md mx-auto mt-3 font-medium text-sm leading-relaxed">
                  Bulk analyze shift attendance and health logs to identify metabolic and environmental hazard correlations.
                </p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 text-white px-12 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-2xl active:scale-95 flex items-center gap-3"
                disabled={analyzing}
              >
                {analyzing ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : '📁'} 
                {analyzing ? 'Processing Data...' : 'Upload Health Logs'}
              </button>
              <input type="file" ref={fileInputRef} onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const r = new FileReader();
                  r.onloadend = () => processLog(r.result as string);
                  r.readAsDataURL(file);
                }
              }} className="hidden" accept="image/*" />
            </div>
          </div>

          {logResult && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="xl:col-span-1 space-y-8">
                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm text-center">
                  <h3 className="text-[10px] font-black text-slate-400 mb-8 uppercase tracking-[0.3em]">Shift Vitality Score</h3>
                  <div className="relative w-48 h-48 mx-auto">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="16" fill="none" className="text-slate-100 stroke-current" strokeWidth="3" />
                      <circle cx="18" cy="18" r="16" fill="none" className={`${logResult.workforceVitalityScore > 80 ? 'text-emerald-500' : 'text-orange-500'} stroke-current`} strokeWidth="3" strokeDasharray={`${logResult.workforceVitalityScore}, 100`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-5xl font-black text-slate-900 tracking-tighter">{logResult.workforceVitalityScore}%</span>
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Ready for duty</span>
                    </div>
                  </div>
                  <div className="mt-10 grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-2xl font-black text-slate-900">{logResult.attendanceRate}%</p>
                      <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Attendance</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-2xl font-black text-red-500">{logResult.activeSickLeaves}</p>
                      <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Sick Leaves</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="xl:col-span-2 space-y-8">
                <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-6">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-2xl shadow-inner">🧠</div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">AI Correlation insight</h3>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Cross-Referencing Shift Telemetry</p>
                    </div>
                  </div>
                  <div className="bg-slate-900 p-8 rounded-[2rem] text-slate-200 relative overflow-hidden group">
                    <p className="text-lg leading-relaxed italic relative z-10 font-medium">"{logResult.correlationFindings}"</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Scan UI */}
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden relative">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic mb-2">Biometric Scan HUD</h3>
                <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                  Real-time fitness audit. Detecting fatigue, PPE compliance, and <span className="text-red-600 font-bold underline">Morning Hydration Integrity</span>.
                </p>
                
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-center">
                    <p className="text-2xl font-black text-emerald-600">{stats.fit}</p>
                    <p className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Fit</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-2xl border border-red-100 text-center">
                    <p className="text-2xl font-black text-red-600">{stats.unfit}</p>
                    <p className="text-[9px] font-black text-red-700 uppercase tracking-widest">Unfit</p>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-center">
                    <p className="text-2xl font-black text-amber-600">{stats.atRisk}</p>
                    <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest">At-Risk</p>
                  </div>
                </div>

                {!isCameraActive ? (
                  <button onClick={startCamera} className="w-full bg-blue-600 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl hover:bg-blue-500 transition-all flex items-center justify-center gap-3">
                    <span className="text-2xl">⚡</span> Initialize Biometric HUD
                  </button>
                ) : (
                  <div className="space-y-4">
                    <button onClick={captureAndScan} className="w-full bg-emerald-500 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl hover:bg-emerald-400 transition-all flex items-center justify-center gap-3">
                       {analyzing ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <span className="text-xl">🔍</span>}
                       {analyzing ? 'Scanning Employee...' : 'Mark Attendance & Vitality Audit'}
                    </button>
                    <button onClick={stopCamera} className="w-full bg-slate-100 text-slate-500 py-4 rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Close Scanner</button>
                  </div>
                )}
              </div>

              <div className="relative group">
                {isCameraActive ? (
                  <div className="relative rounded-[2rem] overflow-hidden border-8 border-slate-900 shadow-2xl bg-slate-950 aspect-[4/3]">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    {/* HUD Overlay */}
                    <div className="absolute inset-0 pointer-events-none">
                       <div className="absolute top-6 left-6 flex items-center gap-2 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                          <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                          <span className="text-[10px] font-black text-white uppercase tracking-widest">Uplink Active</span>
                       </div>
                       {/* Hydration Reminder HUD */}
                       <div className="absolute bottom-6 left-6 right-6 bg-red-600/20 backdrop-blur-md p-3 rounded-2xl border border-red-500/30">
                          <p className="text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                             <span className="text-lg">💧</span> Critical: AI Scanning for morning hydration markers
                          </p>
                       </div>
                       <div className="absolute inset-10 border-2 border-white/20 rounded-3xl flex items-center justify-center">
                         <div className="w-full h-0.5 bg-blue-500/50 absolute top-0 animate-[scan_3s_infinite]" />
                       </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[2rem] bg-slate-50 aspect-[4/3] flex flex-col items-center justify-center border-4 border-dashed border-slate-200 text-slate-300 group-hover:border-slate-300 transition-all">
                    <span className="text-6xl mb-4 grayscale opacity-40">👤</span>
                    <p className="font-black uppercase tracking-widest text-[10px]">Stand in front of lens for scan</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Scan Results Card */}
          {scanResult && (
            <div className={`p-10 rounded-[2.5rem] shadow-2xl border-4 animate-in slide-in-from-right-10 duration-500 ${
              scanResult.status === 'FIT' ? 'bg-emerald-50 border-emerald-200' : 
              scanResult.status === 'UNFIT' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex flex-col md:flex-row gap-10">
                 <div className="md:w-1/3 flex flex-col items-center text-center gap-6">
                    <div className={`w-32 h-32 rounded-full flex items-center justify-center text-5xl shadow-xl ${
                      scanResult.status === 'FIT' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                      {scanResult.status === 'FIT' ? '✅' : '❌'}
                    </div>
                    <div>
                      <h4 className={`text-4xl font-black tracking-tighter uppercase italic ${
                         scanResult.status === 'FIT' ? 'text-emerald-700' : 'text-red-700'
                      }`}>
                        {scanResult.status}
                      </h4>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Shift Readiness</p>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                       <div className={`h-full transition-all duration-1000 ${scanResult.vitalityScore > 70 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${scanResult.vitalityScore}%` }} />
                    </div>
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Vitality: {scanResult.vitalityScore}%</p>
                 </div>

                 <div className="md:w-2/3 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Health Markers</p>
                         <ul className="space-y-2">
                            {scanResult.observations.map((obs, i) => (
                              <li key={i} className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span> {obs}
                              </li>
                            ))}
                         </ul>
                       </div>
                       <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Vital Compliance</p>
                         <div className="space-y-2">
                            <div className={`px-4 py-2 rounded-xl font-black text-[10px] inline-flex items-center gap-2 border ${scanResult.ppeCompliant ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                {scanResult.ppeCompliant ? '✓ PPE COMPLIANT' : '✗ PPE VIOLATION'}
                            </div>
                            {scanResult.detectedSymptoms.some(s => s.toLowerCase().includes('hydration') || s.toLowerCase().includes('water')) && (
                               <div className="px-4 py-2 rounded-xl font-black text-[10px] inline-flex items-center gap-2 border bg-red-600 text-white animate-pulse">
                                  💧 CRITICAL: DEHYDRATION ALERT
                               </div>
                            )}
                         </div>
                       </div>
                    </div>

                    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-4 opacity-5 text-4xl font-black uppercase tracking-widest select-none">RECO</div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tactical Command Advice</p>
                       <p className="text-lg font-black text-slate-900 leading-tight italic uppercase">"{scanResult.recommendation}"</p>
                    </div>
                 </div>
              </div>
            </div>
          )}
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}} />
    </div>
  );
};

export default AttendanceMonitor;
