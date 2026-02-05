
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { HazardSeverity } from '../types';

const data = [
  { name: 'Mon', count: 12, severity: 'Low' },
  { name: 'Tue', count: 19, severity: 'Medium' },
  { name: 'Wed', count: 3, severity: 'High' },
  { name: 'Thu', count: 5, severity: 'Medium' },
  { name: 'Fri', count: 2, severity: 'Critical' },
  { name: 'Sat', count: 0, severity: 'None' },
  { name: 'Sun', count: 0, severity: 'None' },
];

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">Plant Command Overview</h2>
          <p className="text-slate-500 font-medium">Tactical safety monitoring and metabolic hazard tracking.</p>
        </div>
        <div className="bg-blue-600 px-6 py-3 rounded-2xl text-white shadow-xl shadow-blue-900/20 animate-pulse flex items-center gap-3 border-2 border-blue-400">
          <span className="text-2xl">💧</span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Sentinel Mandate</p>
            <p className="font-bold text-xs uppercase">1L Water Protocol Active</p>
          </div>
        </div>
      </header>

      {/* Critical "Big Hazard" Callout */}
      <div className="bg-white p-8 rounded-[2.5rem] border-4 border-blue-500 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32 blur-3xl transition-all group-hover:bg-blue-500/10"></div>
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="w-24 h-24 bg-blue-100 rounded-[2rem] flex items-center justify-center text-5xl shadow-inner border-2 border-blue-200 relative">
            🥛
            <span className="absolute -bottom-2 -right-2 bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded-lg">UHT</span>
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic mb-2">Dairy & Tetra Pak Protocol</h3>
            <p className="text-slate-600 font-medium leading-relaxed max-w-3xl uppercase text-xs tracking-tight">
              Drinking milk <span className="text-blue-600 font-black">before</span> the 1L water mandate in high heat triggers a <span className="text-red-600 font-black">core heat surge</span>. Audit Tetra Pak integrity for leakers before consumption.
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
             <div className="text-blue-600 font-black text-3xl italic tracking-tighter">15m WAIT</div>
             <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Water-to-Milk Gap</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Hazards', value: '41', color: 'text-slate-900', icon: '🚨' },
          { label: 'Integrity Audits', value: '18', color: 'text-blue-600', icon: '📦' },
          { label: '1L Compliance', value: '82%', color: 'text-emerald-600', icon: '💧' },
          { label: 'Metabolic Load', value: 'NOMINAL', color: 'text-blue-600', icon: '🥛' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className={`text-2xl font-black mt-1 ${stat.color}`}>{stat.value}</p>
            </div>
            <span className="text-3xl grayscale group-hover:grayscale-0 transition-all">{stat.icon}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <h3 className="text-xl font-black text-slate-900 uppercase italic mb-6">Metabolic Reporting Trends</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.count > 10 ? '#3b82f6' : '#0f172a'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <h3 className="text-xl font-black text-slate-900 uppercase italic mb-6">Live Health Logs</h3>
          <div className="space-y-4">
            {[
              { type: 'Sequence', time: '2m ago', level: HazardSeverity.CRITICAL, loc: 'Main Entry - Milk Priority Violation' },
              { type: 'Integrity', time: '5m ago', level: HazardSeverity.HIGH, loc: 'Section D - Tetra Pak Swell' },
              { type: 'Hydration', time: '1h ago', level: HazardSeverity.CRITICAL, loc: 'Canteen Checkpoint' },
              { type: 'Thermal', time: '3h ago', level: HazardSeverity.LOW, loc: 'Audit Nominal' },
            ].map((alert, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black shadow-sm ${
                  alert.level === HazardSeverity.CRITICAL ? 'bg-red-600 text-white animate-pulse' :
                  alert.level === HazardSeverity.HIGH ? 'bg-orange-500 text-white' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {alert.level[0]}
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-slate-900 text-sm uppercase tracking-tight">{alert.type}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{alert.loc}</p>
                  <p className="text-[9px] text-slate-300 font-bold mt-0.5">{alert.time}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-4 text-[10px] font-black text-slate-400 hover:text-slate-900 border-t border-slate-100 uppercase tracking-widest transition-colors">
            Access Command Archive
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
