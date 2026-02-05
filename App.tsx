
import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import HazardScanner from './components/HazardScanner';
import LiveSafetyAdvisor from './components/LiveSafetyAdvisor';
import SafetyStandards from './components/SafetyStandards';
import HygieneMonitor from './components/HygieneMonitor';
import AttendanceMonitor from './components/AttendanceMonitor';
import SafetyChatbot from './components/SafetyChatbot';
import GroundFitness from './components/GroundFitness';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'scanner':
        return <HazardScanner />;
      case 'fitness':
        return <GroundFitness />;
      case 'hygiene':
        return <HygieneMonitor />;
      case 'attendance':
        return <AttendanceMonitor />;
      case 'advisor':
        return <LiveSafetyAdvisor />;
      case 'standards':
        return <SafetyStandards />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="animate-in fade-in duration-700">
        {renderContent()}
      </div>
      <SafetyChatbot />
    </Layout>
  );
};

export default App;
