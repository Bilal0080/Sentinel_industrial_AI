
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'scanner', label: 'Hazard Scanner', icon: '📸' },
    { id: 'washroom', label: 'Washroom Audit', icon: '🚽' },
    { id: 'fitness', label: 'Ground Fitness', icon: '👟' },
    { id: 'hygiene', label: 'Hygiene & Sanitation', icon: '🧼' },
    { id: 'attendance', label: 'Workforce Health', icon: '👤' },
    { id: 'advisor', label: 'Live Advisor', icon: '🎙️' },
    { id: 'standards', label: 'Safety Search', icon: '🔍' },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white p-6 sticky top-0 h-screen">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center font-bold text-slate-900">SI</div>
          <h1 className="text-xl font-bold tracking-tight">Sentinel <span className="text-amber-500">Industrial</span></h1>
        </div>
        
        <nav className="flex-1 space-y-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === tab.id 
                  ? 'bg-amber-500 text-slate-900 font-semibold' 
                  : 'hover:bg-slate-800 text-slate-400'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800">
          <div className="bg-slate-800 p-4 rounded-lg">
            <p className="text-xs text-slate-400 mb-1">Command Status</p>
            <p className="text-sm font-medium flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Sentinel Sensors Active
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-slate-900 text-white p-4 sticky top-0 z-50 flex items-center justify-between overflow-x-auto">
        <h1 className="text-lg font-bold pr-4 whitespace-nowrap">Sentinel Industrial AI</h1>
        <div className="flex gap-4">
          {tabs.map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)}
              className={`text-xl ${activeTab === tab.id ? 'grayscale-0' : 'grayscale'}`}
            >
              {tab.icon}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
