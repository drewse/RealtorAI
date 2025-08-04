'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';

interface ObjectionData {
  category: string;
  count: number;
  percentage: number;
  examples: string[];
  trend: 'up' | 'down' | 'stable';
  color: string;
}

interface ObjectionAnalysis {
  totalObjections: number;
  categories: ObjectionData[];
  topConcerns: string[];
  recentTrends: {
    increasing: string[];
    decreasing: string[];
  };
  byTimeframe: {
    last30Days: ObjectionData[];
    last90Days: ObjectionData[];
    allTime: ObjectionData[];
  };
}

export default function ClientObjectionsReport() {
  const { user } = useAuth();
  const [objectionAnalysis, setObjectionAnalysis] = useState<ObjectionAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [timeframe, setTimeframe] = useState<'30' | '90' | 'all'>('all');

  useEffect(() => {
    if (!user?.uid) return;

    const analyzeObjections = async () => {
      setLoading(true);
      try {
        console.log('📊 Analyzing client objections across all sessions...');

        // Query all recordings and clients
        const recordingsQuery = query(
          collection(db, 'recordings'),
          where('uid', '==', user.uid)
        );

        const clientsQuery = query(
          collection(db, 'clients'),
          where('userId', '==', user.uid)
        );

        const unsubscribeRecordings = onSnapshot(recordingsQuery, (recordingsSnapshot) => {
          const recordings = recordingsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          const unsubscribeClients = onSnapshot(clientsQuery, (clientsSnapshot) => {
            const clients = clientsSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));

            // Analyze objections from all sources
            const analysis = performObjectionAnalysis(recordings, clients);
            setObjectionAnalysis(analysis);
            setLoading(false);
          });

          return () => {
            unsubscribeClients();
          };
        });

        return () => {
          unsubscribeRecordings();
        };

      } catch (error) {
        console.error('❌ Error analyzing objections:', error);
        setLoading(false);
      }
    };

    analyzeObjections();
  }, [user?.uid]);

  const performObjectionAnalysis = (recordings: any[], clients: any[]): ObjectionAnalysis => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));

    // Extract objections from various sources
    const allObjections: { text: string; date: Date; source: string }[] = [];

    // From recording follow-ups
    recordings.forEach(recording => {
      const createdAt = recording.createdAt?.toDate?.() || new Date(recording.createdAt);
      
      if (recording.aiFollowUpFinal?.objections) {
        const objections = extractObjectionsFromText(recording.aiFollowUpFinal.objections);
        objections.forEach(obj => {
          allObjections.push({
            text: obj.text,
            date: createdAt,
            source: 'ai_followup'
          });
        });
      }

      if (recording.summary) {
        const objections = extractObjectionsFromText(recording.summary);
        objections.forEach(obj => {
          allObjections.push({
            text: obj.text,
            date: createdAt,
            source: 'summary'
          });
        });
      }
    });

    // From client notes
    clients.forEach(client => {
      if (client.notes) {
        client.notes.forEach((note: any) => {
          if (note.type === 'objection') {
            const createdAt = note.createdAt?.toDate?.() || new Date(note.createdAt);
            const objections = extractObjectionsFromText(note.content);
            objections.forEach(obj => {
              allObjections.push({
                text: obj.text,
                date: createdAt,
                source: 'client_note'
              });
            });
          }
        });
      }
    });

    // Categorize and count objections
    const categories = categorizeObjections(allObjections);
    const totalObjections = allObjections.length;

    // Calculate percentages
    const categoriesWithPercentage = categories.map(cat => ({
      ...cat,
      percentage: totalObjections > 0 ? Math.round((cat.count / totalObjections) * 100) : 0
    }));

    // Filter by timeframes
    const last30DaysObjections = allObjections.filter(obj => obj.date >= thirtyDaysAgo);
    const last90DaysObjections = allObjections.filter(obj => obj.date >= ninetyDaysAgo);

    const last30DaysCategories = categorizeObjections(last30DaysObjections);
    const last90DaysCategories = categorizeObjections(last90DaysObjections);

    // Calculate trends
    const recentTrends = calculateTrends(last30DaysCategories, last90DaysCategories);

    return {
      totalObjections,
      categories: categoriesWithPercentage,
      topConcerns: categoriesWithPercentage
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(cat => cat.category),
      recentTrends,
      byTimeframe: {
        last30Days: last30DaysCategories.map(cat => ({
          ...cat,
          percentage: last30DaysObjections.length > 0 ? Math.round((cat.count / last30DaysObjections.length) * 100) : 0
        })),
        last90Days: last90DaysCategories.map(cat => ({
          ...cat,
          percentage: last90DaysObjections.length > 0 ? Math.round((cat.count / last90DaysObjections.length) * 100) : 0
        })),
        allTime: categoriesWithPercentage
      }
    };
  };

  const extractObjectionsFromText = (text: string): { text: string; category: string }[] => {
    if (!text) return [];

    const objections: { text: string; category: string }[] = [];
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);

    // Keywords that indicate objections
    const objectionPatterns = {
      'Price Concerns': [
        'expensive', 'cost', 'price', 'budget', 'afford', 'money', 'financial', 'cheap',
        'overpriced', 'pricing', 'fee', 'fees', 'payment', 'mortgage'
      ],
      'Location Issues': [
        'location', 'neighborhood', 'area', 'commute', 'traffic', 'distance', 'drive',
        'schools', 'safety', 'crime', 'noise', 'busy', 'remote', 'far'
      ],
      'Size Concerns': [
        'small', 'big', 'large', 'tiny', 'cramped', 'spacious', 'room', 'space',
        'bedroom', 'bathroom', 'kitchen', 'living room', 'square feet', 'sqft'
      ],
      'Property Condition': [
        'old', 'new', 'condition', 'repair', 'renovation', 'update', 'maintenance',
        'worn', 'dated', 'modern', 'fix', 'replace', 'upgrade'
      ],
      'Market Timing': [
        'market', 'timing', 'interest rate', 'rates', 'economy', 'recession',
        'bubble', 'crash', 'wait', 'rush', 'hurry', 'patience'
      ],
      'Features Missing': [
        'missing', 'lack', 'need', 'want', 'prefer', 'garage', 'parking',
        'yard', 'garden', 'pool', 'basement', 'fireplace', 'balcony'
      ]
    };

    sentences.forEach(sentence => {
      const lowerSentence = sentence.toLowerCase();
      
      // Check if sentence contains negative sentiment indicators
      const negativeIndicators = ['but', 'however', 'concern', 'worry', 'problem', 'issue', 'not', 'dont', "don't", 'cant', "can't", 'wish', 'if only'];
      const hasNegativeIndicator = negativeIndicators.some(indicator => lowerSentence.includes(indicator));

      if (hasNegativeIndicator || lowerSentence.includes('objection') || lowerSentence.includes('concern')) {
        Object.entries(objectionPatterns).forEach(([category, keywords]) => {
          if (keywords.some(keyword => lowerSentence.includes(keyword))) {
            objections.push({
              text: sentence,
              category: category
            });
          }
        });
      }
    });

    return objections;
  };

  const categorizeObjections = (objections: { text: string; date: Date; source: string }[]): ObjectionData[] => {
    const categoryColors = {
      'Price Concerns': '#ef4444',
      'Location Issues': '#f59e0b',  
      'Size Concerns': '#8b5cf6',
      'Property Condition': '#06b6d4',
      'Market Timing': '#10b981',
      'Features Missing': '#f97316',
      'Other': '#6b7280'
    };

    const categoryMap = new Map<string, { count: number; examples: Set<string> }>();

    objections.forEach(objection => {
      const extracted = extractObjectionsFromText(objection.text);
      
      if (extracted.length === 0) {
        // Fallback to 'Other' category
        if (!categoryMap.has('Other')) {
          categoryMap.set('Other', { count: 0, examples: new Set() });
        }
        const category = categoryMap.get('Other')!;
        category.count++;
        category.examples.add(objection.text.substring(0, 100) + '...');
      } else {
        extracted.forEach(ext => {
          if (!categoryMap.has(ext.category)) {
            categoryMap.set(ext.category, { count: 0, examples: new Set() });
          }
          const category = categoryMap.get(ext.category)!;
          category.count++;
          category.examples.add(ext.text.substring(0, 100) + '...');
        });
      }
    });

    return Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      count: data.count,
      percentage: 0, // Will be calculated later
      examples: Array.from(data.examples).slice(0, 3),
      trend: 'stable' as const,
      color: categoryColors[category as keyof typeof categoryColors] || categoryColors['Other']
    })).sort((a, b) => b.count - a.count);
  };

  const calculateTrends = (recent: ObjectionData[], older: ObjectionData[]) => {
    const increasing: string[] = [];
    const decreasing: string[] = [];

    recent.forEach(recentCat => {
      const olderCat = older.find(cat => cat.category === recentCat.category);
      if (olderCat) {
        const recentRate = recentCat.count / 30; // Daily rate for last 30 days
        const olderRate = olderCat.count / 90; // Daily rate for last 90 days
        
        if (recentRate > olderRate * 1.2) {
          increasing.push(recentCat.category);
        } else if (recentRate < olderRate * 0.8) {
          decreasing.push(recentCat.category);
        }
      }
    });

    return { increasing, decreasing };
  };

  const getCurrentData = () => {
    if (!objectionAnalysis) return [];
    
    switch (timeframe) {
      case '30':
        return objectionAnalysis.byTimeframe.last30Days;
      case '90':
        return objectionAnalysis.byTimeframe.last90Days;
      default:
        return objectionAnalysis.byTimeframe.allTime;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500"></div>
          <h2 className="text-xl font-bold text-white">Analyzing Client Objections...</h2>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-700 rounded w-1/4"></div>
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-3 bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!objectionAnalysis || objectionAnalysis.totalObjections === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <i className="ri-question-answer-line text-4xl text-gray-600"></i>
        </div>
        <h3 className="text-lg font-medium text-gray-400 mb-2">No Objections Data</h3>
        <p className="text-gray-500">Start recording client interactions to analyze common objections</p>
      </div>
    );
  }

  const currentData = getCurrentData();

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Client Objections Report</h2>
          <p className="text-gray-400 text-sm">{objectionAnalysis.totalObjections} total objections analyzed</p>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('chart')}
              className={`px-1 py-1 text-sm transition-colors cursor-pointer whitespace-nowrap rounded-full ${
                viewMode === 'chart'
                  ? 'bg-red-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <div className="w-4 h-4 flex items-center justify-center">
                <i className="ri-bar-chart-line"></i>
              </div>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-1 py-1 text-sm transition-colors cursor-pointer whitespace-nowrap rounded-full ${
                viewMode === 'table'
                  ? 'bg-red-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <div className="w-4 h-4 flex items-center justify-center">
                <i className="ri-table-line"></i>
              </div>
            </button>
          </div>

          {/* Timeframe Toggle */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setTimeframe('30')}
              className={`px-1 py-1 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap rounded-full ${
                timeframe === '30'
                  ? 'bg-red-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              30D
            </button>
            <button
              onClick={() => setTimeframe('90')}
              className={`px-1 py-1 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap rounded-full ${
                timeframe === '90'
                  ? 'bg-red-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              90D
            </button>
            <button
              onClick={() => setTimeframe('all')}
              className={`px-1 py-1 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap rounded-full ${
                timeframe === 'all'
                  ? 'bg-red-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              All
            </button>
          </div>
        </div>
      </div>

      {/* Top Concerns Summary */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h3 className="font-medium text-white mb-3 flex items-center space-x-2">
          <div className="w-5 h-5 flex items-center justify-center">
            <i className="ri-alert-line text-red-500"></i>
          </div>
          <span>Top Client Concerns</span>
        </h3>
        <div className="flex flex-wrap gap-2">
          {objectionAnalysis.topConcerns.map((concern, index) => (
            <span key={index} className="px-3 py-1 bg-red-900/30 text-red-300 rounded-full text-sm">
              #{index + 1} {concern}
            </span>
          ))}
        </div>
      </div>

      {/* Trending Analysis */}
      {(objectionAnalysis.recentTrends.increasing.length > 0 || objectionAnalysis.recentTrends.decreasing.length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          {objectionAnalysis.recentTrends.increasing.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-4 border border-red-700/50">
              <h3 className="font-medium text-red-400 mb-3 flex items-center space-x-2">
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-arrow-up-line"></i>
                </div>
                <span>Increasing Concerns</span>
              </h3>
              <div className="space-y-2">
                {objectionAnalysis.recentTrends.increasing.map((concern, index) => (
                  <div key={index} className="text-sm text-red-300">
                    • {concern}
                  </div>
                ))}
              </div>
            </div>
          )}

          {objectionAnalysis.recentTrends.decreasing.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-4 border border-green-700/50">
              <h3 className="font-medium text-green-400 mb-3 flex items-center space-x-2">
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-arrow-down-line"></i>
                </div>
                <span>Decreasing Concerns</span>
              </h3>
              <div className="space-y-2">
                {objectionAnalysis.recentTrends.decreasing.map((concern, index) => (
                  <div key={index} className="text-sm text-green-300">
                    • {concern}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Chart/Table View */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h3 className="font-medium text-white mb-4 flex items-center space-x-2">
          <div className="w-5 h-5 flex items-center justify-center">
            <i className={`ri-${viewMode === 'chart' ? 'bar-chart' : 'table'}-line text-red-500`}></i>
          </div>
          <span>Objections by Category</span>
        </h3>

        {viewMode === 'chart' ? (
          <div className="space-y-4">
            {currentData.map((category, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300 text-sm font-medium">{category.category}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-bold">{category.count}</span>
                    <span className="text-gray-400 text-sm">({category.percentage}%)</span>
                  </div>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div 
                    className="h-3 rounded-full transition-all duration-300" 
                    style={{ 
                      width: `${Math.max(5, category.percentage)}%`,
                      backgroundColor: category.color
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {currentData.map((category, index) => (
              <div key={index} className="bg-gray-900 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    ></div>
                    <span className="text-white font-medium">{category.category}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-white font-bold">{category.count}</span>
                    <span className="text-gray-400 text-sm">({category.percentage}%)</span>
                  </div>
                </div>
                {category.examples.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs text-gray-500">Examples:</span>
                    {category.examples.slice(0, 2).map((example, exIndex) => (
                      <p key={exIndex} className="text-xs text-gray-400 italic">
                        "{example}"
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}