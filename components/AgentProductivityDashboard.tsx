'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';

interface AgentStats {
  totalRecordings: number;
  avgEngagementScore: number;
  followUpsSent: number;
  clientsConverted: number;
  notesWritten: number;
  objectionsHandled: { [objection: string]: number };
  propertiesByStatus: {
    active: number;
    comingSoon: number;
    sold: number;
  };
  last30Days: {
    recordings: number;
    followUps: number;
    clients: number;
  };
  last90Days: {
    recordings: number;
    followUps: number;
    clients: number;
  };
}

interface ProductivityMetric {
  title: string;
  value: number | string;
  change?: number;
  icon: string;
  color: string;
  format?: 'number' | 'percentage' | 'decimal';
}

export default function AgentProductivityDashboard() {
  const { user } = useAuth();
  const [agentStats, setAgentStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'30' | '90' | 'all'>('30');

  useEffect(() => {
    if (!user?.uid) return;

    const calculateStats = async () => {
      setLoading(true);
      try {
        console.log('📊 Calculating agent productivity stats...');

        // Get current date boundaries
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));

        // Query recordings
        const recordingsQuery = query(
          collection(db, 'recordings'),
          where('uid', '==', user.uid),
          orderBy('createdAt', 'desc')
        );

        // Query properties  
        const propertiesQuery = query(
          collection(db, 'properties'),
          where('userId', '==', user.uid)
        );

        // Query clients
        const clientsQuery = query(
          collection(db, 'clients'),
          where('userId', '==', user.uid)
        );

        const unsubscribeRecordings = onSnapshot(recordingsQuery, (recordingsSnapshot) => {
          const recordings = recordingsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          const unsubscribeProperties = onSnapshot(propertiesQuery, (propertiesSnapshot) => {
            const properties = propertiesSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));

            const unsubscribeClients = onSnapshot(clientsQuery, (clientsSnapshot) => {
              const clients = clientsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }));

              // Calculate comprehensive stats
              const stats = calculateAgentStats(recordings, properties, clients, thirtyDaysAgo, ninetyDaysAgo);
              setAgentStats(stats);
              setLoading(false);
            });

            return () => {
              unsubscribeClients();
            };
          });

          return () => {
            unsubscribeProperties();
          };
        });

        return () => {
          unsubscribeRecordings();
        };

      } catch (error) {
        console.error('❌ Error calculating agent stats:', error);
        setLoading(false);
      }
    };

    calculateStats();
  }, [user?.uid]);

  const calculateAgentStats = (recordings: any[], properties: any[], clients: any[], thirtyDaysAgo: Date, ninetyDaysAgo: Date): AgentStats => {
    // Filter by date ranges
    const last30DaysRecordings = recordings.filter(r => {
      const createdAt = r.createdAt?.toDate?.() || new Date(r.createdAt);
      return createdAt >= thirtyDaysAgo;
    });

    const last90DaysRecordings = recordings.filter(r => {
      const createdAt = r.createdAt?.toDate?.() || new Date(r.createdAt);
      return createdAt >= ninetyDaysAgo;
    });

    const last30DaysClients = clients.filter(c => {
      const createdAt = c.createdAt?.toDate?.() || new Date(c.createdAt);
      return createdAt >= thirtyDaysAgo;
    });

    const last90DaysClients = clients.filter(c => {
      const createdAt = c.createdAt?.toDate?.() || new Date(c.createdAt);
      return createdAt >= ninetyDaysAgo;
    });

    // Calculate engagement scores
    const recordingsWithEngagement = recordings.filter(r => r.engagementReport?.analysisScore);
    const avgEngagementScore = recordingsWithEngagement.length > 0
      ? Math.round(recordingsWithEngagement.reduce((sum, r) => sum + r.engagementReport.analysisScore, 0) / recordingsWithEngagement.length)
      : 0;

    // Count follow-ups sent
    const followUpsSent = recordings.filter(r => r.scheduledFollowUp?.status === 'sent').length;

    // Count converted clients (Hot Leads or those with multiple interactions)
    const clientsConverted = clients.filter(c => 
      c.status === 'Hot Lead' || c.totalInteractions >= 3
    ).length;

    // Count notes written
    const notesWritten = clients.reduce((total, c) => total + (c.notes?.length || 0), 0) + 
                        recordings.reduce((total, r) => total + (r.agentNotes?.length || 0), 0);

    // Extract and count objections
    const objectionsHandled: { [key: string]: number } = {};
    recordings.forEach(r => {
      if (r.aiFollowUpFinal?.objections || r.objections) {
        const objections = extractObjections(r.aiFollowUpFinal?.objections || r.objections || '');
        objections.forEach(obj => {
          objectionsHandled[obj] = (objectionsHandled[obj] || 0) + 1;
        });
      }
    });

    // Properties by status
    const propertiesByStatus = {
      active: properties.filter(p => p.status === 'Active').length,
      comingSoon: properties.filter(p => p.status === 'Coming Soon').length,
      sold: properties.filter(p => p.status === 'Sold').length
    };

    return {
      totalRecordings: recordings.length,
      avgEngagementScore,
      followUpsSent,
      clientsConverted,
      notesWritten,
      objectionsHandled,
      propertiesByStatus,
      last30Days: {
        recordings: last30DaysRecordings.length,
        followUps: last30DaysRecordings.filter(r => r.scheduledFollowUp).length,
        clients: last30DaysClients.length
      },
      last90Days: {
        recordings: last90DaysRecordings.length,
        followUps: last90DaysRecordings.filter(r => r.scheduledFollowUp).length,
        clients: last90DaysClients.length
      }
    };
  };

  const extractObjections = (text: string): string[] => {
    // Simple objection extraction - in production, use OpenAI for better accuracy
    const objectionKeywords = [
      'price', 'expensive', 'budget', 'cost',
      'location', 'neighborhood', 'area', 'commute',
      'size', 'small', 'big', 'space', 'room',
      'condition', 'renovation', 'repair', 'old',
      'market', 'timing', 'interest rate', 'mortgage'
    ];

    const objections: string[] = [];
    const lowerText = text.toLowerCase();

    objectionKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        // Categorize objections
        if (['price', 'expensive', 'budget', 'cost'].includes(keyword)) {
          if (!objections.includes('Price Concerns')) objections.push('Price Concerns');
        } else if (['location', 'neighborhood', 'area', 'commute'].includes(keyword)) {
          if (!objections.includes('Location Issues')) objections.push('Location Issues');
        } else if (['size', 'small', 'big', 'space', 'room'].includes(keyword)) {
          if (!objections.includes('Size Concerns')) objections.push('Size Concerns');
        } else if (['condition', 'renovation', 'repair', 'old'].includes(keyword)) {
          if (!objections.includes('Property Condition')) objections.push('Property Condition');
        } else if (['market', 'timing', 'interest rate', 'mortgage'].includes(keyword)) {
          if (!objections.includes('Market Timing')) objections.push('Market Timing');
        }
      }
    });

    return objections;
  };

  const formatValue = (value: number | string, format?: string) => {
    if (typeof value === 'string') return value;
    
    switch (format) {
      case 'percentage':
        return `${value}%`;
      case 'decimal':
        return value.toFixed(1);
      default:
        return value.toLocaleString();
    }
  };

  const getCurrentStats = () => {
    if (!agentStats) return null;
    
    switch (timeframe) {
      case '30':
        return agentStats.last30Days;
      case '90':
        return agentStats.last90Days;
      default:
        return {
          recordings: agentStats.totalRecordings,
          followUps: agentStats.followUpsSent,
          clients: Object.values(agentStats.propertiesByStatus).reduce((a, b) => a + b, 0)
        };
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <h2 className="text-xl font-bold text-white">Loading Dashboard...</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-gray-800 rounded-lg p-4 border border-gray-700 animate-pulse">
              <div className="h-4 bg-gray-700 rounded mb-2"></div>
              <div className="h-6 bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!agentStats) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <i className="ri-bar-chart-line text-4xl text-gray-600"></i>
        </div>
        <h3 className="text-lg font-medium text-gray-400 mb-2">No Data Available</h3>
        <p className="text-gray-500">Start recording sessions to see your productivity metrics</p>
      </div>
    );
  }

  const currentStats = getCurrentStats();

  const mainMetrics: ProductivityMetric[] = [
    {
      title: 'Showings Recorded',
      value: currentStats?.recordings || 0,
      icon: 'ri-mic-line',
      color: 'text-blue-400',
      format: 'number'
    },
    {
      title: 'Avg. Engagement',
      value: agentStats.avgEngagementScore,
      icon: 'ri-heart-line',
      color: 'text-red-400',
      format: 'percentage'
    },
    {
      title: 'Follow-ups Sent',
      value: currentStats?.followUps || 0,
      icon: 'ri-send-plane-line',
      color: 'text-green-400',
      format: 'number'
    },
    {
      title: 'Clients Converted',
      value: agentStats.clientsConverted,
      icon: 'ri-user-star-line',
      color: 'text-purple-400',
      format: 'number'
    }
  ];

  const secondaryMetrics: ProductivityMetric[] = [
    {
      title: 'Notes Added',
      value: agentStats.notesWritten,
      icon: 'ri-sticky-note-line',
      color: 'text-yellow-400',
      format: 'number'
    },
    {
      title: 'Active Properties',
      value: agentStats.propertiesByStatus.active,
      icon: 'ri-home-line',
      color: 'text-green-400',
      format: 'number'
    },
    {
      title: 'Sold Properties',
      value: agentStats.propertiesByStatus.sold,
      icon: 'ri-check-line',
      color: 'text-blue-400',
      format: 'number'
    },
    {
      title: 'Objections Handled',
      value: Object.values(agentStats.objectionsHandled).reduce((a, b) => a + b, 0),
      icon: 'ri-question-answer-line',
      color: 'text-orange-400',
      format: 'number'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header with Timeframe Toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Agent Productivity</h2>
        <div className="flex bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setTimeframe('30')}
            className={`px-1 py-1 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap rounded-full ${
              timeframe === '30'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            30 Days
          </button>
          <button
            onClick={() => setTimeframe('90')}
            className={`px-1 py-1 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap rounded-full ${
              timeframe === '90'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            90 Days
          </button>
          <button
            onClick={() => setTimeframe('all')}
            className={`px-1 py-1 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap rounded-full ${
              timeframe === 'all'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-2 gap-4">
        {mainMetrics.map((metric, index) => (
          <div key={index} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className={`w-8 h-8 ${metric.color.replace('text-', 'bg-').replace('400', '600')} rounded-full flex items-center justify-center`}>
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className={`${metric.icon} text-white`}></i>
                </div>
              </div>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {formatValue(metric.value, metric.format)}
            </div>
            <div className="text-sm text-gray-400">{metric.title}</div>
          </div>
        ))}
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 gap-4">
        {secondaryMetrics.map((metric, index) => (
          <div key={index} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
            <div className="flex items-center space-x-3">
              <div className={`w-6 h-6 ${metric.color.replace('text-', 'bg-').replace('400', '600')} rounded-full flex items-center justify-center`}>
                <div className="w-3 h-3 flex items-center justify-center">
                  <i className={`${metric.icon} text-white text-xs`}></i>
                </div>
              </div>
              <div>
                <div className="text-lg font-bold text-white">
                  {formatValue(metric.value, metric.format)}
                </div>
                <div className="text-xs text-gray-400">{metric.title}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Property Status Breakdown */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h3 className="font-medium text-white mb-3 flex items-center space-x-2">
          <div className="w-5 h-5 flex items-center justify-center">
            <i className="ri-home-line text-blue-500"></i>
          </div>
          <span>Properties by Status</span>
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-300 text-sm">Active</span>
            </div>
            <span className="text-white font-medium">{agentStats.propertiesByStatus.active}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-gray-300 text-sm">Coming Soon</span>
            </div>
            <span className="text-white font-medium">{agentStats.propertiesByStatus.comingSoon}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-gray-300 text-sm">Sold</span>
            </div>
            <span className="text-white font-medium">{agentStats.propertiesByStatus.sold}</span>
          </div>
        </div>
      </div>

      {/* Top Objections */}
      {Object.keys(agentStats.objectionsHandled).length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="font-medium text-white mb-3 flex items-center space-x-2">
            <div className="w-5 h-5 flex items-center justify-center">
              <i className="ri-question-answer-line text-red-500"></i>
            </div>
            <span>Top Objections Handled</span>
          </h3>
          <div className="space-y-2">
            {Object.entries(agentStats.objectionsHandled)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 5)
              .map(([objection, count], index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">{objection}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full" 
                        style={{ 
                          width: `${Math.max(20, (count / Math.max(...Object.values(agentStats.objectionsHandled))) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-white font-medium w-6 text-right">{count}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}