
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import AuthGuard from '@/components/AuthGuard';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  
  const { user, logout } = useAuth();

  useEffect(() => {
    // Simulate loading for consistency
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-900 pb-20">
          <Header />
          <div className="max-w-md mx-auto px-4 py-6">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          </div>
          <Navigation />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-900 pb-20">
        <Header />
        
        <div className="max-w-md mx-auto px-4 py-6 space-y-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">Settings</h1>
            <p className="text-gray-400">Configure your ShowAI preferences</p>
          </div>

          {/* 🤖 Secure AI Integration Section */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-5 h-5 flex items-center justify-center">
                <i className="ri-robot-line text-blue-500"></i>
              </div>
              <h3 className="text-lg font-semibold text-white">AI Follow-up Generation</h3>
              <div className="w-4 h-4 flex items-center justify-center">
                <i className="ri-shield-check-line text-green-500" title="Secure backend integration"></i>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-check-line text-green-500"></i>
                  </div>
                  <span className="text-green-300 font-medium text-sm">Active & Secure</span>
                </div>
                <p className="text-green-200 text-sm">
                  Your AI follow-up generation is powered by secure backend integration. 
                  All API keys and sensitive data are managed server-side for maximum security.
                </p>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">AI Model</span>
                  <div className="flex items-center space-x-1 text-blue-400">
                    <div className="w-3 h-3 flex items-center justify-center">
                      <i className="ri-brain-line"></i>
                    </div>
                    <span>GPT-4</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Security</span>
                  <div className="flex items-center space-x-1 text-green-400">
                    <div className="w-3 h-3 flex items-center justify-center">
                      <i className="ri-lock-line"></i>
                    </div>
                    <span>Server-side Protected</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Response Time</span>
                  <div className="flex items-center space-x-1 text-blue-400">
                    <div className="w-3 h-3 flex items-center justify-center">
                      <i className="ri-time-line"></i>
                    </div>
                    <span>~3-5 seconds</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-information-line text-blue-500"></i>
                  </div>
                  <span className="text-blue-300 font-medium text-sm">How it works</span>
                </div>
                <ul className="text-blue-200 text-sm space-y-1">
                  <li>• Recording transcripts are analyzed by AI</li>
                  <li>• Personalized follow-up messages are generated</li>
                  <li>• All processing happens on secure servers</li>
                  <li>• No API keys stored on your device</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Data Storage Information */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-5 h-5 flex items-center justify-center">
                <i className="ri-database-line text-blue-500"></i>
              </div>
              <h3 className="text-lg font-semibold text-white">Data Storage</h3>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Recordings Storage</span>
                <div className="flex items-center space-x-1 text-green-400">
                  <div className="w-3 h-3 flex items-center justify-center">
                    <i className="ri-cloud-line"></i>
                  </div>
                  <span>Firebase Cloud</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Metadata & AI Results</span>
                <div className="flex items-center space-x-1 text-green-400">
                  <div className="w-3 h-3 flex items-center justify-center">
                    <i className="ri-database-line"></i>
                  </div>
                  <span>Firestore</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">AI Processing</span>
                <div className="flex items-center space-x-1 text-green-400">
                  <div className="w-3 h-3 flex items-center justify-center">
                    <i className="ri-server-line"></i>
                  </div>
                  <span>Cloud Functions</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">API Keys</span>
                <div className="flex items-center space-x-1 text-green-400">
                  <div className="w-3 h-3 flex items-center justify-center">
                    <i className="ri-shield-check-line"></i>
                  </div>
                  <span>Server-side Only</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recording Quality Section */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-5 h-5 flex items-center justify-center">
                <i className="ri-mic-line text-blue-500"></i>
              </div>
              <h3 className="text-lg font-semibold text-white">Recording Quality</h3>
            </div>
            
            <p className="text-gray-400 text-sm mb-4">
              For best AI analysis results, ensure clear audio quality during property showings.
            </p>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-check-line text-green-500"></i>
                </div>
                <span className="text-gray-300">Use external microphone when possible</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-check-line text-green-500"></i>
                </div>
                <span className="text-gray-300">Record in quiet environments</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-check-line text-green-500"></i>
                </div>
                <span className="text-gray-300">Keep device close to conversation</span>
              </div>
            </div>
            
            <a
              href="https://www.amazon.com/s?k=wireless+microphone+recording"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors text-sm cursor-pointer mt-4"
            >
              <div className="w-4 h-4 flex items-center justify-center">
                <i className="ri-external-link-line"></i>
              </div>
              <span>Browse Microphones</span>
            </a>
          </div>

          {/* Account Section */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-5 h-5 flex items-center justify-center">
                <i className="ri-user-line text-blue-500"></i>
              </div>
              <h3 className="text-lg font-semibold text-white">Account</h3>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400">Email</label>
                <p className="text-white">{user?.email}</p>
              </div>
              
              <button
                onClick={handleLogout}
                className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-logout-box-line"></i>
                  </div>
                  <span>Sign Out</span>
                </div>
              </button>
            </div>
          </div>

          <div className="text-center text-gray-500 text-sm">
            ShowAI v1.0.0 • Cloud-Powered Real Estate Assistant
          </div>
        </div>

        <Navigation />
      </div>
    </AuthGuard>
  );
}
