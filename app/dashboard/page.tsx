
'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '@/components/AuthGuard';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';
import AgentProductivityDashboard from '@/components/AgentProductivityDashboard';
import ClientObjectionsReport from '@/components/ClientObjectionsReport';

export default function Dashboard() {
  // DEFAULT: Start with productivity dashboard as the default view
  const [activeView, setActiveView] = useState<'productivity' | 'objections'>('productivity');
  const [defaultViewLoaded, setDefaultViewLoaded] = useState(false);

  // Initialize default view for Dashboard page
  useEffect(() => {
    if (!defaultViewLoaded) {
      // Ensure we're showing the productivity dashboard by default
      setActiveView('productivity');
      setDefaultViewLoaded(true);
    }
  }, [defaultViewLoaded]);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-900 pb-20">
        <Header />

        <div className="max-w-md mx-auto px-4 py-6">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">Analytics Dashboard</h1>
            <p className="text-gray-400">Track your performance and client insights</p>
          </div>

          {/* View Toggle - DEFAULT: Productivity is active */}
          <div className="flex bg-gray-800 rounded-lg p-1 mb-6">
            <button
              onClick={() => setActiveView('productivity')}
              className={`flex-1 px-1 py-1 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap rounded-full ${
                activeView === 'productivity'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-dashboard-line"></i>
                </div>
                <span>Productivity</span>
              </div>
            </button>
            <button
              onClick={() => setActiveView('objections')}
              className={`flex-1 px-1 py-1 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap rounded-full ${
                activeView === 'objections'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-question-answer-line"></i>
                </div>
                <span>Objections</span>
              </div>
            </button>
          </div>

          {/* Content - DEFAULT: Show productivity dashboard */}
          {activeView === 'productivity' && (
            <AgentProductivityDashboard />
          )}

          {activeView === 'objections' && (
            <ClientObjectionsReport />
          )}
        </div>

        <Navigation />
      </div>
    </AuthGuard>
  );
}
