
'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, deleteDoc, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useFeatureFlags } from '@/lib/feature-flags';
import AuthGuard from '@/components/AuthGuard';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';

interface AdminRecording {
  id: string;
  uid: string;
  clientName: string;
  propertyAddress?: string;
  transcript?: string;
  status: string;
  createdAt: any;
  aiFollowUpDraft?: any;
  buyerPersona?: any;
  errorMessage?: string;
  transcriptionMethod?: string;
}

interface ErrorLog {
  id: string;
  type: 'transcription' | 'ai-generation' | 'storage' | 'general';
  message: string;
  userId?: string;
  recordingId?: string;
  timestamp: any;
  resolved: boolean;
}

interface UserActivity {
  id: string;
  email: string;
  lastActive: any;
  recordingsCount: number;
  aiGenerationsCount: number;
  errorCount: number;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'recordings' | 'flags' | 'errors' | 'users'>('overview');
  const [recordings, setRecordings] = useState<AdminRecording[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [users, setUsers] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecording, setSelectedRecording] = useState<AdminRecording | null>(null);
  const [rerunning, setRerunning] = useState<string | null>(null);

  const { user } = useAuth();
  const { flags, updateFlag, loading: flagsLoading } = useFeatureFlags();

  // Check if user is admin (in real app, implement proper admin authentication)
  const isAdmin = user?.email?.includes('admin') || process.env.NODE_ENV === 'development';

  useEffect(() => {
    if (!isAdmin) return;

    const unsubscribes: (() => void)[] = [];

    // Load recent recordings
    const recordingsQuery = query(
      collection(db, 'recordings'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const recordingsUnsub = onSnapshot(recordingsQuery, (snapshot) => {
      const recordingsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AdminRecording[];
      setRecordings(recordingsData);
    });

    unsubscribes.push(recordingsUnsub);

    // Load error logs
    const errorsQuery = query(
      collection(db, 'errorLogs'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const errorsUnsub = onSnapshot(errorsQuery, (snapshot) => {
      const errorsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ErrorLog[];
      setErrorLogs(errorsData);
    });

    unsubscribes.push(errorsUnsub);

    setLoading(false);

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [isAdmin]);

  const handleRerunAnalysis = async (recordingId: string) => {
    if (!recordingId) return;

    setRerunning(recordingId);
    try {
      // In a real implementation, this would call a Cloud Function
      console.log(` Rerunning AI analysis for recording: ${recordingId}`);

      // Mock: Update status to trigger re-analysis
      const recordingRef = doc(db, 'recordings', recordingId);
      await updateDoc(recordingRef, {
        status: 'uploaded',
        rerunRequested: true,
        rerunBy: user?.email,
        rerunAt: new Date(),
      });

      console.log(' Analysis rerun requested');
    } catch (error) {
      console.error(' Error requesting rerun:', error);
      alert('Failed to rerun analysis');
    } finally {
      setRerunning(null);
    }
  };

  const handleDeleteRecording = async (recordingId: string) => {
    if (!confirm('Are you sure you want to delete this recording? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'recordings', recordingId));
      console.log(' Recording deleted');
    } catch (error) {
      console.error(' Error deleting recording:', error);
      alert('Failed to delete recording');
    }
  };

  const handleResolveError = async (errorId: string) => {
    try {
      await updateDoc(doc(db, 'errorLogs', errorId), {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: user?.email,
      });
    } catch (error) {
      console.error(' Error resolving error:', error);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'follow-up-ready':
        return 'text-green-400 bg-green-900/30';
      case 'transcribed':
        return 'text-blue-400 bg-blue-900/30';
      case 'uploaded':
        return 'text-yellow-400 bg-yellow-900/30';
      case 'error':
        return 'text-red-400 bg-red-900/30';
      default:
        return 'text-gray-400 bg-gray-900/30';
    }
  };

  const getErrorTypeColor = (type: string) => {
    switch (type) {
      case 'transcription':
        return 'text-red-400 bg-red-900/30';
      case 'ai-generation':
        return 'text-orange-400 bg-orange-900/30';
      case 'storage':
        return 'text-yellow-400 bg-yellow-900/30';
      default:
        return 'text-gray-400 bg-gray-900/30';
    }
  };

  if (!isAdmin) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <i className="ri-shield-line text-4xl text-red-500"></i>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
            <p className="text-gray-400">You don't have permission to access the admin panel.</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-900 pb-20">
        <Header />

        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-6 h-6 flex items-center justify-center">
                <i className="ri-admin-line text-red-500 text-xl"></i>
              </div>
              <h1 className="text-2xl font-bold text-white">Admin Console</h1>
              <span className="px-2 py-1 bg-red-900/30 text-red-300 rounded-full text-xs">
                Admin Only
              </span>
            </div>
            <p className="text-gray-400">System monitoring, QA tools, and feature management</p>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-2 mb-6 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: 'ri-dashboard-line' },
              { id: 'recordings', label: 'Recordings', icon: 'ri-mic-line' },
              { id: 'flags', label: 'Feature Flags', icon: 'ri-flag-line' },
              { id: 'errors', label: 'Error Logs', icon: 'ri-error-warning-line' },
              { id: 'users', label: 'Users', icon: 'ri-user-line' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className={tab.icon}></i>
                </div>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-4 h-4 flex items-center justify-center">
                      <i className="ri-mic-line text-blue-500"></i>
                    </div>
                    <span className="text-gray-400 text-sm">Total Recordings</span>
                  </div>
                  <span className="text-2xl font-bold text-white">{recordings.length}</span>
                </div>

                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-4 h-4 flex items-center justify-center">
                      <i className="ri-error-warning-line text-red-500"></i>
                    </div>
                    <span className="text-gray-400 text-sm">Unresolved Errors</span>
                  </div>
                  <span className="text-2xl font-bold text-white">
                    {errorLogs.filter(e => !e.resolved).length}
                  </span>
                </div>

                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-4 h-4 flex items-center justify-center">
                      <i className="ri-check-line text-green-500"></i>
                    </div>
                    <span className="text-gray-400 text-sm">Success Rate</span>
                  </div>
                  <span className="text-2xl font-bold text-white">
                    {recordings.length > 0
                      ? Math.round((recordings.filter(r => r.status === 'follow-up-ready').length / recordings.length) * 100)
                      : 0}
                    %
                  </span>
                </div>

                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-4 h-4 flex items-center justify-center">
                      <i className="ri-flag-line text-purple-500"></i>
                    </div>
                    <span className="text-gray-400 text-sm">Active Features</span>
                  </div>
                  <span className="text-2xl font-bold text-white">
                    {Object.values(flags).filter(Boolean).length}
                  </span>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Recent Recordings</h3>
                <div className="space-y-3">
                  {recordings.slice(0, 5).map(recording => (
                    <div key={recording.id} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                      <div>
                        <span className="font-medium text-white">{recording.clientName}</span>
                        <p className="text-sm text-gray-400">{recording.propertyAddress || 'No address'}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(recording.status)}`}>
                          {recording.status}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(recording.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Recordings Tab */}
          {activeTab === 'recordings' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">All Recordings</h3>
                <div className="text-sm text-gray-400">
                  {recordings.length} total recordings
                </div>
              </div>

              <div className="space-y-3">
                {recordings.map(recording => (
                  <div key={recording.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-white">{recording.clientName}</h4>
                        <p className="text-sm text-gray-400">{recording.propertyAddress || 'No address'}</p>
                        <p className="text-xs text-gray-500">ID: {recording.id}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(recording.status)}`}>
                          {recording.status}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(recording.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Recording Details */}
                    {recording.errorMessage && (
                      <div className="mb-3 p-2 bg-red-900/20 border border-red-700 rounded">
                        <p className="text-red-300 text-sm">Error: {recording.errorMessage}</p>
                      </div>
                    )}

                    {recording.transcriptionMethod && (
                      <div className="mb-3 text-sm text-gray-400">
                        Transcription: {recording.transcriptionMethod}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleRerunAnalysis(recording.id)}
                        disabled={rerunning === recording.id}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded text-sm transition-colors cursor-pointer whitespace-nowrap flex items-center space-x-1"
                      >
                        {rerunning === recording.id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                            <span>Rerunning...</span>
                          </>
                        ) : (
                          <>
                            <div className="w-3 h-3 flex items-center justify-center">
                              <i className="ri-refresh-line"></i>
                            </div>
                            <span>Rerun AI</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => setSelectedRecording(recording)}
                        className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm transition-colors cursor-pointer whitespace-nowrap"
                      >
                        View Details
                      </button>

                      <button
                        onClick={() => handleDeleteRecording(recording.id)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feature Flags Tab */}
          {activeTab === 'flags' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Feature Flags</h3>
                <div className="text-sm text-gray-400">
                  {Object.values(flags).filter(Boolean).length} / {Object.keys(flags).length} enabled
                </div>
              </div>

              <div className="grid gap-4">
                {Object.entries(flags).map(([key, value]) => (
                  <div key={key} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-white capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </h4>
                        <p className="text-sm text-gray-400">
                          {getFeatureDescription(key)}
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => updateFlag(key as any, e.target.checked)}
                          disabled={flagsLoading}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Logs Tab */}
          {activeTab === 'errors' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Error Logs</h3>
                <div className="text-sm text-gray-400">
                  {errorLogs.filter(e => !e.resolved).length} unresolved
                </div>
              </div>

              <div className="space-y-3">
                {errorLogs.map(error => (
                  <div key={error.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getErrorTypeColor(error.type)}`}>
                          {error.type}
                        </span>
                        {error.resolved && (
                          <span className="ml-2 px-2 py-1 bg-green-900/30 text-green-300 rounded-full text-xs">
                            Resolved
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {formatDate(error.timestamp)}
                      </p>
                    </div>

                    <p className="text-white mb-2">{error.message}</p>

                    {error.recordingId && (
                      <p className="text-sm text-gray-400 mb-2">
                        Recording: {error.recordingId}
                      </p>
                    )}

                    {!error.resolved && (
                      <button
                        onClick={() => handleResolveError(error.id)}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Mark Resolved
                      </button>
                    )}
                  </div>
                ))}

                {errorLogs.length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <i className="ri-check-double-line text-4xl text-green-500"></i>
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">No Errors Found</h3>
                    <p className="text-gray-400">System is running smoothly!</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <Navigation />
      </div>
    </AuthGuard>
  );
}

function getFeatureDescription(key: string): string {
  const descriptions: Record<string, string> = {
    autoTranscription: 'Automatic audio transcription for recordings',
    sentimentAnalysis: 'AI-powered sentiment analysis of conversations',
    speakerSeparation: 'Identify different speakers in recordings',
    buyerPersonaGeneration: 'Generate detailed buyer personas from conversations',
    aiFollowUps: 'AI-generated follow-up messages',
    smartAlerts: 'Intelligent property matching alerts',
    scheduledDelivery: 'Schedule follow-up message delivery',
    voiceSummaries: 'Text-to-speech summaries (Beta)',
    sessionEngagementReports: 'Detailed engagement analytics per session',
    productivityDashboard: 'Agent productivity tracking and metrics',
    clientObjectionsReport: 'Analysis of common client objections',
    advancedAnalytics: 'Enhanced analytics and reporting features',
    emailIntegration: 'Direct email sending capabilities (Coming Soon)',
    crmSyncing: 'CRM integration and data synchronization (Coming Soon)',
    agentLeaderboards: 'Performance rankings and gamification (Coming Soon)',
    clientIntakeForms: 'Pre-showing client preference forms (Coming Soon)',
    aiSmartSummaryPanel: 'Unified AI insights dashboard (Coming Soon)',
    mobileOptimization: 'Enhanced mobile experience',
    abTestingFramework: 'A/B testing for AI prompts and features (Beta)',
    testRecordingSimulator: 'Development tool for testing AI features',
    adminAuditTools: 'Administrative monitoring and audit capabilities',
    debugMode: 'Enhanced logging and debugging information',
    qaUtilities: 'Quality assurance and testing utilities',
    enhancedErrorLogging: 'Detailed error tracking and reporting',
    performanceMonitoring: 'System performance tracking and optimization',
    userFeedbackCollection: 'In-app feedback collection system',
    automaticQualityChecks: 'Automated quality assurance checks',
  };

  return descriptions[key] || 'Feature configuration option';
}
