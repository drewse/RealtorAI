
'use client';

import { useState, useEffect } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ScheduleFollowUpModal from './ScheduleFollowUpModal';
import VoicePlayer from './VoicePlayer';

interface FollowUpData {
  preferences: string;
  objections: string;
  sms: string;
  email: string;
  urgencyLevel: 'low' | 'medium' | 'high';
  keyTopics: string[];
  recommendedActions: string[];
  tone: 'friendly' | 'professional' | 'direct' | 'action-oriented';
}

interface ScheduledFollowUp {
  method: 'email' | 'sms' | 'both';
  sendAt: any;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
}

interface FollowUpDisplayProps {
  data: Partial<FollowUpData>;
  loading?: boolean;
  clientEmail?: string;
  clientPhone?: string;
  recordingId?: string;
  onToneChange?: (tone: 'friendly' | 'professional' | 'direct' | 'action-oriented') => void;
  scheduledFollowUp?: ScheduledFollowUp;
  userId?: string;
  clientName?: string;
  voiceSummaryUrl?: string;
}

const FOLLOW_UP_TONES = {
  friendly: {
    label: 'Friendly',
    description: 'Warm, conversational, and approachable tone',
    icon: 'ri-emotion-happy-line',
    color: 'bg-green-600'
  },
  professional: {
    label: 'Professional', 
    description: 'Business-focused, formal, and comprehensive tone',
    icon: 'ri-briefcase-line',
    color: 'bg-blue-600'
  },
  direct: {
    label: 'Direct',
    description: 'Straight-forward, concise, and action-focused tone',
    icon: 'ri-arrow-right-line',
    color: 'bg-purple-600'
  },
  'action-oriented': {
    label: 'Action-Oriented',
    description: 'Urgency-driven with clear calls-to-action',
    icon: 'ri-alarm-line',
    color: 'bg-red-600'
  }
} as const;

export default function FollowUpDisplay({ 
  data, 
  loading, 
  clientEmail, 
  clientPhone, 
  recordingId,
  onToneChange,
  scheduledFollowUp,
  userId,
  clientName,
  voiceSummaryUrl
}: FollowUpDisplayProps) {
  // Ensure data has all required fields with defaults
  const completeData: FollowUpData = {
    preferences: data.preferences || 'No preferences found.',
    objections: data.objections || 'No objections found.',
    sms: data.sms || 'No SMS content available',
    email: data.email || 'No email content available',
    urgencyLevel: data.urgencyLevel || 'medium',
    keyTopics: data.keyTopics || ['No topics found.'],
    recommendedActions: data.recommendedActions || ['No recommended actions.'],
    tone: data.tone || 'professional'
  };

  console.log('🧠 Final AI Follow-up data:', completeData);

  const [activeTab, setActiveTab] = useState<'summary' | 'sms' | 'email' | 'actions'>('summary');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedTone, setSelectedTone] = useState<'friendly' | 'professional' | 'direct' | 'action-oriented'>(completeData.tone);
  const [editMode, setEditMode] = useState<{ [key: string]: boolean }>({});
  const [editedContent, setEditedContent] = useState<{ [key: string]: string }>({
    preferences: completeData.preferences,
    objections: completeData.objections,
    sms: completeData.sms,
    email: completeData.email
  });
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  useEffect(() => {
    setEditedContent({
      preferences: completeData.preferences,
      objections: completeData.objections,
      sms: completeData.sms,
      email: completeData.email
    });
  }, [completeData]);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleToneChange = (tone: 'friendly' | 'professional' | 'direct' | 'action-oriented') => {
    setSelectedTone(tone);
    if (onToneChange) {
      onToneChange(tone);
    }
  };

  const handleEdit = (field: string) => {
    setEditMode({ ...editMode, [field]: true });
  };

  const handleSave = async (field: string) => {
    if (!recordingId) {
      setEditMode({ ...editMode, [field]: false });
      setHasChanges(true);
      return;
    }

    setSaving(true);
    try {
      const recordingRef = doc(db, 'recordings', recordingId);
      const updateData: any = {
        editedByAgent: true,
        updatedAt: serverTimestamp()
      };

      // Update specific field in aiFollowUpFinal
      updateData[`aiFollowUpFinal.${field}`] = editedContent[field];
      updateData[`aiFollowUpFinal.tone`] = selectedTone;

      await updateDoc(recordingRef, updateData);
      
      setEditMode({ ...editMode, [field]: false });
      setHasChanges(true);
      console.log(`✅ Updated ${field} in Firestore`);
      
    } catch (error) {
      console.error(`❌ Failed to update ${field}:`, error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = (field: string) => {
    setEditedContent({ 
      ...editedContent, 
      [field]: field === 'preferences' ? completeData.preferences : 
               field === 'objections' ? completeData.objections :
               field === 'sms' ? completeData.sms : completeData.email
    });
    setEditMode({ ...editMode, [field]: false });
  };

  const getUrgencyColor = (level?: string) => {
    switch (level) {
      case 'high': return 'text-red-400 bg-red-900/30';
      case 'medium': return 'text-yellow-400 bg-yellow-900/30'; 
      case 'low': return 'text-green-400 bg-green-900/30';
      default: return 'text-gray-400 bg-gray-900/30';
    }
  };

  const getScheduledStatus = () => {
    if (!scheduledFollowUp) return null;
    
    const statusColors = {
      pending: 'text-yellow-400 bg-yellow-900/30',
      sent: 'text-green-400 bg-green-900/30',
      failed: 'text-red-400 bg-red-900/30',
      cancelled: 'text-gray-400 bg-gray-900/30'
    };
    
    return (
      <div className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[scheduledFollowUp.status]}`}>
        {scheduledFollowUp.status === 'pending' && '⏰ Scheduled'}
        {scheduledFollowUp.status === 'sent' && '✅ Delivered'}
        {scheduledFollowUp.status === 'failed' && '❌ Failed'}
        {scheduledFollowUp.status === 'cancelled' && '🚫 Cancelled'}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center space-x-3 mb-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          <h3 className="text-lg font-semibold text-white">Generating AI Follow-up...</h3>
        </div>
        <p className="text-gray-400">Analyzing conversation and creating personalized follow-up content</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        {/* Header with Tone Selection */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 flex items-center justify-center">
                <i className="ri-robot-line text-blue-500"></i>
              </div>
              <h3 className="text-lg font-semibold text-white">AI Follow-up</h3>
              {hasChanges && (
                <span className="px-2 py-1 bg-orange-900/30 text-orange-300 rounded-full text-xs">
                  Edited
                </span>
              )}
              {getScheduledStatus()}
            </div>
            
            {/* Voice Summary & Schedule Buttons */}
            <div className="flex items-center space-x-2">
              {voiceSummaryUrl && (
                <VoicePlayer 
                  audioUrl={voiceSummaryUrl}
                  label="🔊 Voice Summary"
                  variant="compact"
                />
              )}
              
              {recordingId && userId && !scheduledFollowUp && (
                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="flex items-center space-x-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs transition-colors cursor-pointer whitespace-nowrap"
                >
                  <div className="w-3 h-3 flex items-center justify-center">
                    <i className="ri-calendar-schedule-line"></i>
                  </div>
                  <span>Schedule</span>
                </button>
              )}
            </div>
          </div>

          {/* Urgency Level Indicator */}
          <div className="flex items-center justify-between mb-3">
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${getUrgencyColor(completeData.urgencyLevel)}`}>
              {completeData.urgencyLevel.toUpperCase()} Priority
            </div>
          </div>

          {/* Follow-up Tone Selection */}
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm text-gray-400">Follow-up Tone:</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(FOLLOW_UP_TONES).map(([tone, config]) => (
                <button
                  key={tone}
                  onClick={() => handleToneChange(tone as any)}
                  className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                    selectedTone === tone 
                      ? `${config.color} text-white border-transparent` 
                      : 'bg-gray-900 text-gray-300 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <div className="w-4 h-4 flex items-center justify-center">
                      <i className={config.icon}></i>
                    </div>
                    <span className="font-medium text-sm">{config.label}</span>
                  </div>
                  <p className="text-xs opacity-75">{config.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Scheduled Follow-up Info */}
          {scheduledFollowUp && (
            <div className="mt-3 p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-300 text-sm font-medium">
                    📅 Scheduled for {scheduledFollowUp.method} delivery
                  </p>
                  <p className="text-blue-200 text-xs">
                    {new Date(scheduledFollowUp.sendAt.toDate()).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex-1 px-1 py-1 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap rounded-full ${
              activeTab === 'summary'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Summary
          </button>
          <button
            onClick={() => setActiveTab('sms')}
            className={`flex-1 px-1 py-1 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap rounded-full ${
              activeTab === 'sms'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            SMS
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`flex-1 px-1 py-1 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap rounded-full ${
              activeTab === 'email'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Email
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={`flex-1 px-1 py-1 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap rounded-full ${
              activeTab === 'actions'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Actions
          </button>
        </div>

        <div className="p-4">
          {/* Summary Tab */}
          {activeTab === 'summary' && (
            <div className="space-y-4">
              {/* Preferences Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-green-400">Client Preferences</h4>
                  <div className="flex items-center space-x-2">
                    {!editMode.preferences && (
                      <button
                        onClick={() => handleEdit('preferences')}
                        className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <div className="w-4 h-4 flex items-center justify-center">
                          <i className="ri-edit-line"></i>
                        </div>
                      </button>
                    )}
                    <button
                      onClick={() => copyToClipboard(editedContent.preferences, 'preferences')}
                      className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <div className="w-4 h-4 flex items-center justify-center">
                        <i className={`ri-${copiedField === 'preferences' ? 'check' : 'file-copy'}-line`}></i>
                      </div>
                    </button>
                  </div>
                </div>
                
                {editMode.preferences ? (
                  <div className="space-y-2">
                    <textarea
                      value={editedContent.preferences}
                      onChange={(e) => setEditedContent({ ...editedContent, preferences: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={4}
                    />
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleSave('preferences')}
                        disabled={saving}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded text-xs transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => handleCancel('preferences')}
                        className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-300 text-sm leading-relaxed">{editedContent.preferences}</p>
                )}
              </div>

              {/* Objections Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-red-400">Client Concerns</h4>
                  <div className="flex items-center space-x-2">
                    {!editMode.objections && (
                      <button
                        onClick={() => handleEdit('objections')}
                        className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <div className="w-4 h-4 flex items-center justify-center">
                          <i className="ri-edit-line"></i>
                        </div>
                      </button>
                    )}
                    <button
                      onClick={() => copyToClipboard(editedContent.objections, 'objections')}
                      className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <div className="w-4 h-4 flex items-center justify-center">
                        <i className={`ri-${copiedField === 'objections' ? 'check' : 'file-copy'}-line`}></i>
                      </div>
                    </button>
                  </div>
                </div>
                
                {editMode.objections ? (
                  <div className="space-y-2">
                    <textarea
                      value={editedContent.objections}
                      onChange={(e) => setEditedContent({ ...editedContent, objections: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={4}
                    />
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleSave('objections')}
                        disabled={saving}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded text-xs transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => handleCancel('objections')}
                        className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-300 text-sm leading-relaxed">{editedContent.objections}</p>
                )}
              </div>
            </div>
          )}

          {/* SMS Tab */}
          {activeTab === 'sms' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-message-3-line text-blue-500"></i>
                  </div>
                  <span className="font-medium text-white">SMS Message</span>
                </div>
                <div className="flex items-center space-x-2">
                  {!editMode.sms && (
                    <button
                      onClick={() => handleEdit('sms')}
                      className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <div className="w-4 h-4 flex items-center justify-center">
                        <i className="ri-edit-line"></i>
                      </div>
                    </button>
                  )}
                  <button
                    onClick={() => copyToClipboard(editedContent.sms, 'sms')}
                    className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <div className="w-4 h-4 flex items-center justify-center">
                      <i className={`ri-${copiedField === 'sms' ? 'check' : 'file-copy'}-line`}></i>
                    </div>
                  </button>
                </div>
              </div>
              
              {clientPhone && (
                <div className="flex items-center space-x-2 mb-3 text-sm text-gray-400">
                  <div className="w-3 h-3 flex items-center justify-center">
                    <i className="ri-phone-line"></i>
                  </div>
                  <span>To: {clientPhone}</span>
                </div>
              )}
              
              {editMode.sms ? (
                <div className="space-y-2">
                  <textarea
                    value={editedContent.sms}
                    onChange={(e) => setEditedContent({ ...editedContent, sms: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    maxLength={160}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{editedContent.sms.length}/160 characters</span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleSave('sms')}
                        disabled={saving}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded text-xs transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => handleCancel('sms')}
                        className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-900 rounded-lg p-3">
                  <p className="text-gray-300 text-sm leading-relaxed">{editedContent.sms}</p>
                  <div className="text-xs text-gray-500 mt-2">{editedContent.sms.length}/160 characters</div>
                </div>
              )}
            </div>
          )}

          {/* Email Tab */}
          {activeTab === 'email' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-mail-line text-blue-500"></i>
                  </div>
                  <span className="font-medium text-white">Email Message</span>
                </div>
                <div className="flex items-center space-x-2">
                  {!editMode.email && (
                    <button
                      onClick={() => handleEdit('email')}
                      className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <div className="w-4 h-4 flex items-center justify-center">
                        <i className="ri-edit-line"></i>
                      </div>
                    </button>
                  )}
                  <button
                    onClick={() => copyToClipboard(editedContent.email, 'email')}
                    className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <div className="w-4 h-4 flex items-center justify-center">
                      <i className={`ri-${copiedField === 'email' ? 'check' : 'file-copy'}-line`}></i>
                    </div>
                  </button>
                </div>
              </div>
              
              {clientEmail && (
                <div className="flex items-center space-x-2 mb-3 text-sm text-gray-400">
                  <div className="w-3 h-3 flex items-center justify-center">
                    <i className="ri-mail-line"></i>
                  </div>
                  <span>To: {clientEmail}</span>
                </div>
              )}
              
              {editMode.email ? (
                <div className="space-y-2">
                  <textarea
                    value={editedContent.email}
                    onChange={(e) => setEditedContent({ ...editedContent, email: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={8}
                  />
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleSave('email')}
                      disabled={saving}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded text-xs transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => handleCancel('email')}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-900 rounded-lg p-3 max-h-64 overflow-y-auto">
                  <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{editedContent.email}</p>
                </div>
              )}
            </div>
          )}

          {/* Actions Tab */}
          {activeTab === 'actions' && (
            <div className="space-y-4">
              {/* Key Topics */}
              <div>
                <h4 className="font-medium text-blue-400 mb-2">Discussion Topics</h4>
                <div className="flex flex-wrap gap-2">
                  {completeData.keyTopics.map((topic, index) => (
                    <span key={index} className="px-3 py-1 bg-blue-900/30 text-blue-300 rounded-full text-sm">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              {/* Recommended Actions */}
              <div>
                <h4 className="font-medium text-green-400 mb-2">Recommended Next Steps</h4>
                <div className="space-y-2">
                  {completeData.recommendedActions.map((action, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-gray-900 rounded-lg">
                      <div className="w-5 h-5 flex items-center justify-center mt-0.5">
                        <i className="ri-checkbox-circle-line text-green-500"></i>
                      </div>
                      <span className="text-gray-300 text-sm">{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Schedule Follow-up Modal */}
      {showScheduleModal && recordingId && userId && clientName && (
        <ScheduleFollowUpModal
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          recordingId={recordingId}
          userId={userId}
          clientName={clientName}
          clientEmail={clientEmail}
          clientPhone={clientPhone}
          onScheduled={() => {
            setShowScheduleModal(false);
            // Optionally refresh the recording data to show scheduled status
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
