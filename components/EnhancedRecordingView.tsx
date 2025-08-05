
'use client';

import { useState, useEffect } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import TranscriptDisplay from './TranscriptDisplay';
import FollowUpDisplay from './FollowUpDisplay';
import BuyerPersonaDisplay from './BuyerPersonaDisplay';
import SessionEngagementReport from './SessionEngagementReport';
import { regenerateFollowUpWithTone } from '@/lib/openai';

interface Recording {
  id: string;
  uid: string;
  audioPath: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  tags: string[];
  propertyId?: string;
  propertyAddress?: string;
  transcript?: string;
  summary?: string;
  smsText?: string;
  emailText?: string;
  status: 'uploaded' | 'transcribed' | 'follow-up-ready';
  createdAt: any;

  // Enhanced analysis fields
  transcriptSegments?: any[];
  sentimentMap?: any[];
  keywordAnalysis?: any[];
  speakers?: string[];
  overallSentiment?: 'positive' | 'neutral' | 'negative';
  followUpTone?: 'friendly' | 'professional' | 'direct' | 'action-oriented';
  aiFollowUpDraft?: any;
  aiFollowUpFinal?: any;
  editedByAgent?: boolean;

  // NEW: Enhanced features
  buyerPersona?: any;
  voiceSummaries?: {
    followUpSummary?: { audioUrl: string; duration: number; text: string; };
    personaSummary?: { audioUrl: string; duration: number; text: string; };
  };
  scheduledFollowUp?: {
    method: 'email' | 'sms' | 'both';
    sendAt: any;
    status: 'pending' | 'sent' | 'failed' | 'cancelled';
  };
}

interface EnhancedRecordingViewProps {
  recording: Recording;
  onBack: () => void;
}

export default function EnhancedRecordingView({ recording, onBack }: EnhancedRecordingViewProps) {
  const [activeView, setActiveView] = useState<'transcript' | 'followup' | 'persona'>('transcript');
  const [followUpData, setFollowUpData] = useState<any>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    // Initialize follow-up data from recording with complete field coverage
    let preparedData: any;
    
    if (recording.aiFollowUpFinal) {
      preparedData = recording.aiFollowUpFinal;
    } else if (recording.aiFollowUpDraft) {
      preparedData = recording.aiFollowUpDraft;
    } else {
      // Legacy format fallback - include all fields for full tab display
      preparedData = {
        preferences: recording.summary || 'No preferences found.',
        objections: 'No objections found.',
        sms: recording.smsText || 'No SMS content available',
        email: recording.emailText || 'No email content available',
        urgencyLevel: 'medium',
        keyTopics: ['No topics found.'],
        recommendedActions: ['No recommended actions.'],
        tone: recording.followUpTone || 'professional'
      };
    }

    // Ensure all required fields are present with defaults
    const completeData = {
      preferences: preparedData.preferences || preparedData.summary || 'No preferences found.',
      objections: preparedData.objections || 'No objections found.',
      sms: preparedData.sms || preparedData.smsText || 'No SMS content available',
      email: preparedData.email || preparedData.emailText || 'No email content available',
      urgencyLevel: preparedData.urgencyLevel || 'medium',
      keyTopics: preparedData.keyTopics || ['No topics found.'],
      recommendedActions: preparedData.recommendedActions || ['No recommended actions.'],
      tone: preparedData.tone || 'professional'
    };

    console.log('🧠 Final AI Follow-up data:', completeData);
    console.log('🔍 Original recording data:', {
      aiFollowUpFinal: recording.aiFollowUpFinal,
      aiFollowUpDraft: recording.aiFollowUpDraft,
      summary: recording.summary,
      smsText: recording.smsText,
      emailText: recording.emailText
    });
    setFollowUpData(completeData);
  }, [recording]);

  const handleToneChange = async (newTone: 'friendly' | 'professional' | 'direct' | 'action-oriented') => {
    if (!followUpData || regenerating) return;

    setRegenerating(true);
    try {
      console.log(` Regenerating follow-up with ${newTone} tone...`);

      // Use the enhanced regeneration function
      const regeneratedContent = await regenerateFollowUpWithTone(
        followUpData,
        newTone,
        recording.clientName,
        null // Property context would be loaded separately
      );

      // Update local state
      setFollowUpData({
        ...regeneratedContent,
        tone: newTone
      });

      // Save to Firestore
      const recordingRef = doc(db, 'recordings', recording.id);
      await updateDoc(recordingRef, {
        followUpTone: newTone,
        aiFollowUpFinal: {
          ...regeneratedContent,
          tone: newTone,
          generatedAt: serverTimestamp()
        },
        editedByAgent: true,
        updatedAt: serverTimestamp()
      });

      console.log(` Successfully regenerated and saved follow-up with ${newTone} tone`);

    } catch (error) {
      console.error(' Error regenerating follow-up:', error);
      alert('Failed to regenerate follow-up content. Please try again.');
    } finally {
      setRegenerating(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown date';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const StatusIndicator = ({ status }: { status: string }) => {
    const getStatusConfig = () => {
      switch (status) {
        case 'uploaded':
          return { color: 'text-yellow-400', icon: 'ri-upload-line', text: 'Uploaded' };
        case 'transcribed':
          return { color: 'text-blue-400', icon: 'ri-file-text-line', text: 'Transcribed' };
        case 'follow-up-ready':
          return { color: 'text-green-400', icon: 'ri-check-line', text: 'Analysis Complete' };
        default:
          return { color: 'text-gray-400', icon: 'ri-time-line', text: 'Processing' };
      }
    };

    const config = getStatusConfig();

    return (
      <div className={`flex items-center space-x-1 ${config.color}`}>
        <div className="w-3 h-3 flex items-center justify-center">
          <i className={`${config.icon} text-xs`}></i>
        </div>
        <span className="text-xs">{config.text}</span>
      </div>
    );
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 pb-20">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center space-x-3 mb-3">
            <button
              onClick={onBack}
              className="text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <i className="ri-arrow-left-line text-xl"></i>
              </div>
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white">{recording.clientName}</h1>
              <p className="text-gray-400 text-sm">{formatDate(recording.createdAt)}</p>
            </div>
            <StatusIndicator status={recording.status} />
          </div>

          {/* Recording Details */}
          <div className="bg-gray-900/50 rounded-lg p-3 space-y-2">
            {recording.propertyAddress && (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-home-line text-blue-500"></i>
                </div>
                <span className="text-gray-300 text-sm">{recording.propertyAddress}</span>
              </div>
            )}

            {recording.clientEmail && (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-mail-line text-green-500"></i>
                </div>
                <span className="text-gray-300 text-sm">{recording.clientEmail}</span>
                <button
                  onClick={() => copyToClipboard(recording.clientEmail!, 'email-header')}
                  className="text-gray-500 hover:text-white transition-colors cursor-pointer"
                >
                  <div className="w-3 h-3 flex items-center justify-center">
                    <i className={`ri-${copiedField === 'email-header' ? 'check' : 'file-copy'}-line text-xs`}></i>
                  </div>
                </button>
              </div>
            )}

            {recording.clientPhone && (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-phone-line text-purple-500"></i>
                </div>
                <span className="text-gray-300 text-sm">{recording.clientPhone}</span>
                <button
                  onClick={() => copyToClipboard(recording.clientPhone!, 'phone-header')}
                  className="text-gray-500 hover:text-white transition-colors cursor-pointer"
                >
                  <div className="w-3 h-3 flex items-center justify-center">
                    <i className={`ri-${copiedField === 'phone-header' ? 'check' : 'file-copy'}-line text-xs`}></i>
                  </div>
                </button>
              </div>
            )}

            {recording.tags && recording.tags.length > 0 && (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-price-tag-line text-blue-500"></i>
                </div>
                <div className="flex flex-wrap gap-1">
                  {recording.tags.map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-900/30 text-blue-300 rounded-full text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {recording.editedByAgent && (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-edit-line text-orange-500"></i>
                </div>
                <span className="text-orange-300 text-sm">Modified by agent</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-md mx-auto px-4">
          <div className="flex">
            <button
              onClick={() => setActiveView('transcript')}
              className={`flex-1 px-1 py-3 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeView === 'transcript'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-file-text-line"></i>
                </div>
                <span>Analysis</span>
              </div>
            </button>
            <button
              onClick={() => setActiveView('followup')}
              className={`flex-1 px-1 py-3 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeView === 'followup'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-robot-line"></i>
                </div>
                <span>Follow-up</span>
                {regenerating && (
                  <div className="w-3 h-3 flex items-center justify-center">
                    <div className="animate-spin rounded-full border border-blue-400 border-t-transparent"></div>
                  </div>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveView('persona')}
              className={`flex-1 px-1 py-3 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeView === 'persona'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-user-star-line"></i>
                </div>
                <span>Persona</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-6">
        {activeView === 'transcript' && (
          <div className="space-y-6">
            <TranscriptDisplay
              transcript={recording.transcript || 'No transcript available'}
              loading={false}
              transcriptSegments={recording.transcriptSegments || []}
              sentimentMap={recording.sentimentMap || []}
              keywordAnalysis={recording.keywordAnalysis || []}
              speakers={recording.speakers || []}
              overallSentiment={recording.overallSentiment || 'neutral'}
            />

            <SessionEngagementReport recording={recording} />
          </div>
        )}

        {activeView === 'followup' && followUpData && (
          <FollowUpDisplay
            data={followUpData}
            loading={regenerating}
            clientEmail={recording.clientEmail}
            clientPhone={recording.clientPhone}
            recordingId={recording.id}
            onToneChange={handleToneChange}
            scheduledFollowUp={recording.scheduledFollowUp}
            userId={recording.uid}
            clientName={recording.clientName}
            voiceSummaryUrl={recording.voiceSummaries?.followUpSummary?.audioUrl}
          />
        )}

        {activeView === 'persona' && (
          <BuyerPersonaDisplay
            persona={recording.buyerPersona}
            loading={false}
            clientName={recording.clientName}
            voiceSummaryUrl={recording.voiceSummaries?.personaSummary?.audioUrl}
          />
        )}
      </div>
    </div>
  );
}
