'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { generateSessionAnalytics } from '@/lib/openai';

interface EngagementReport {
  totalDuration: number;
  distinctSpeakers: number;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  engagementRating: 'low' | 'medium' | 'high';
  keywordsDetected: string[];
  questionsAsked: string[];
  actionItems: string[];
  analysisScore: number;
  generatedAt: any;
}

interface Recording {
  id: string;
  transcript?: string;
  transcriptSegments?: any[];
  sentimentMap?: any[];
  keywordAnalysis?: any[];
  speakers?: string[];
  createdAt: any;
  engagementReport?: EngagementReport;
}

interface SessionEngagementReportProps {
  recording: Recording;
}

export default function SessionEngagementReport({ recording }: SessionEngagementReportProps) {
  const [engagementReport, setEngagementReport] = useState<EngagementReport | null>(recording.engagementReport || null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Generate engagement report if not exists
  useEffect(() => {
    if (!engagementReport && recording.transcript && !loading) {
      generateEngagementReport();
    }
  }, [recording, engagementReport]);

  const generateEngagementReport = async () => {
    if (!recording.transcript || loading) return;

    setLoading(true);
    try {
      console.log('📊 Generating session engagement report...');

      // Use existing analysis data or generate new
      const analyticsData = await generateSessionAnalytics(
        recording.transcript,
        recording.transcriptSegments || [],
        recording.sentimentMap || [],
        recording.keywordAnalysis || [],
        recording.speakers || []
      );

      const newReport: EngagementReport = {
        totalDuration: Math.floor(Math.random() * 1800) + 300, // 5-35 minutes (mock for now)
        distinctSpeakers: recording.speakers?.length || 2,
        sentimentBreakdown: analyticsData.sentimentBreakdown,
        engagementRating: analyticsData.engagementRating,
        keywordsDetected: analyticsData.keywordsDetected,
        questionsAsked: analyticsData.questionsAsked,
        actionItems: analyticsData.actionItems,
        analysisScore: analyticsData.analysisScore,
        generatedAt: new Date()
      };

      // Save to Firestore
      const recordingRef = doc(db, 'recordings', recording.id);
      await updateDoc(recordingRef, {
        engagementReport: newReport,
        updatedAt: serverTimestamp()
      });

      setEngagementReport(newReport);
      console.log('✅ Engagement report generated and saved');

    } catch (error) {
      console.error('❌ Error generating engagement report:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getEngagementColor = (rating: string) => {
    switch (rating) {
      case 'high': return 'text-green-400 bg-green-900/30';
      case 'medium': return 'text-yellow-400 bg-yellow-900/30';
      case 'low': return 'text-red-400 bg-red-900/30';
      default: return 'text-gray-400 bg-gray-900/30';
    }
  };

  const getSentimentPercentage = (count: number, total: number) => {
    return total > 0 ? Math.round((count / total) * 100) : 0;
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          <div>
            <h3 className="font-medium text-white">Analyzing Session Engagement</h3>
            <p className="text-gray-400 text-sm">Generating comprehensive analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!engagementReport) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 flex items-center justify-center">
              <i className="ri-bar-chart-line text-blue-500"></i>
            </div>
            <h3 className="font-medium text-white">Session Analytics</h3>
          </div>
          <button
            onClick={generateEngagementReport}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            Generate Report
          </button>
        </div>
        <p className="text-gray-400 text-sm mt-2">Click to analyze session engagement metrics</p>
      </div>
    );
  }

  const totalSentiments = engagementReport.sentimentBreakdown.positive + 
                         engagementReport.sentimentBreakdown.neutral + 
                         engagementReport.sentimentBreakdown.negative;

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 flex items-center justify-center">
              <i className="ri-bar-chart-line text-blue-500"></i>
            </div>
            <h3 className="font-medium text-white">Session Analytics</h3>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${getEngagementColor(engagementReport.engagementRating)}`}>
              {engagementReport.engagementRating.toUpperCase()} Engagement
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <div className="w-5 h-5 flex items-center justify-center">
              <i className={`ri-${expanded ? 'arrow-up' : 'arrow-down'}-s-line`}></i>
            </div>
          </button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-400">{formatDuration(engagementReport.totalDuration)}</div>
            <div className="text-xs text-gray-400">Session Duration</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-400">{engagementReport.distinctSpeakers}</div>
            <div className="text-xs text-gray-400">Speakers</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-purple-400">{engagementReport.analysisScore}%</div>
            <div className="text-xs text-gray-400">Analysis Score</div>
          </div>
        </div>
      </div>

      {/* Detailed Analytics */}
      {expanded && (
        <div className="p-4 space-y-4">
          {/* Sentiment Breakdown */}
          <div>
            <h4 className="font-medium text-white mb-3 flex items-center space-x-2">
              <div className="w-4 h-4 flex items-center justify-center">
                <i className="ri-emotion-line text-yellow-500"></i>
              </div>
              <span>Sentiment Analysis</span>
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-green-400 text-sm">Positive</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${getSentimentPercentage(engagementReport.sentimentBreakdown.positive, totalSentiments)}%` }}
                    ></div>
                  </div>
                  <span className="text-gray-300 text-sm w-10 text-right">
                    {getSentimentPercentage(engagementReport.sentimentBreakdown.positive, totalSentiments)}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Neutral</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gray-500 h-2 rounded-full" 
                      style={{ width: `${getSentimentPercentage(engagementReport.sentimentBreakdown.neutral, totalSentiments)}%` }}
                    ></div>
                  </div>
                  <span className="text-gray-300 text-sm w-10 text-right">
                    {getSentimentPercentage(engagementReport.sentimentBreakdown.neutral, totalSentiments)}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-red-400 text-sm">Negative</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full" 
                      style={{ width: `${getSentimentPercentage(engagementReport.sentimentBreakdown.negative, totalSentiments)}%` }}
                    ></div>
                  </div>
                  <span className="text-gray-300 text-sm w-10 text-right">
                    {getSentimentPercentage(engagementReport.sentimentBreakdown.negative, totalSentiments)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Keywords Detected */}
          {engagementReport.keywordsDetected.length > 0 && (
            <div>
              <h4 className="font-medium text-white mb-3 flex items-center space-x-2">
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-key-2-line text-blue-500"></i>
                </div>
                <span>Key Topics</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {engagementReport.keywordsDetected.slice(0, 8).map((keyword, index) => (
                  <span key={index} className="px-3 py-1 bg-blue-900/30 text-blue-300 rounded-full text-sm">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Questions Asked */}
          {engagementReport.questionsAsked.length > 0 && (
            <div>
              <h4 className="font-medium text-white mb-3 flex items-center space-x-2">
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-question-line text-purple-500"></i>
                </div>
                <span>Client Questions ({engagementReport.questionsAsked.length})</span>
              </h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {engagementReport.questionsAsked.slice(0, 5).map((question, index) => (
                  <div key={index} className="flex items-start space-x-2 text-sm">
                    <div className="w-4 h-4 flex items-center justify-center mt-0.5">
                      <i className="ri-question-mark text-purple-400 text-xs"></i>
                    </div>
                    <span className="text-gray-300">{question}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Items */}
          {engagementReport.actionItems.length > 0 && (
            <div>
              <h4 className="font-medium text-white mb-3 flex items-center space-x-2">
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-task-line text-green-500"></i>
                </div>
                <span>Action Items ({engagementReport.actionItems.length})</span>
              </h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {engagementReport.actionItems.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-start space-x-2 text-sm">
                    <div className="w-4 h-4 flex items-center justify-center mt-0.5">
                      <i className="ri-checkbox-circle-line text-green-400 text-xs"></i>
                    </div>
                    <span className="text-gray-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generated Date */}
          <div className="pt-2 border-t border-gray-700">
            <p className="text-xs text-gray-500">
              Report generated on {new Date(engagementReport.generatedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}