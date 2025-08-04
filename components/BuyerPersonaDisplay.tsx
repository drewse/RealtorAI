'use client';

import { useState } from 'react';
import VoicePlayer from './VoicePlayer';

interface BuyerPersona {
  clientName?: string;
  buyerType: 'Investor' | 'First-Time Buyer' | 'Upsizer' | 'Downsizer' | 'Relocator' | 'Second Home' | 'Other';
  keyMotivations: string[];
  decisionTimeline: 'Immediate' | 'Within 30 Days' | '2-3 Months' | '6+ Months' | 'Exploring';
  budgetRange?: {
    min: number;
    max: number;
    flexibility: 'Strict' | 'Flexible' | 'Very Flexible';
  };
  locationPreferences: string[];
  propertyFeaturePriorities: string[];
  emotionalProfile: 'Analytical' | 'Enthusiastic' | 'Cautious' | 'Decisive' | 'Social';
  communicationPreference: 'Email' | 'Phone' | 'Text' | 'In-Person' | 'Mixed';
  concerns: string[];
  positiveSignals: string[];
  recommendedStrategy: string;
  confidenceScore: number;
  generatedAt?: any;
  generatedBy?: 'openai' | 'manual';
}

interface BuyerPersonaDisplayProps {
  persona: BuyerPersona;
  loading?: boolean;
  clientName?: string;
  voiceSummaryUrl?: string;
}

const getBuyerTypeIcon = (type: string) => {
  const iconMap = {
    'Investor': 'ri-money-dollar-circle-line',
    'First-Time Buyer': 'ri-home-heart-line',
    'Upsizer': 'ri-arrow-up-circle-line',
    'Downsizer': 'ri-arrow-down-circle-line',
    'Relocator': 'ri-map-pin-line',
    'Second Home': 'ri-home-2-line',
    'Other': 'ri-user-line'
  };
  return iconMap[type as keyof typeof iconMap] || 'ri-user-line';
};

const getBuyerTypeColor = (type: string) => {
  const colorMap = {
    'Investor': 'text-green-400 bg-green-900/30',
    'First-Time Buyer': 'text-blue-400 bg-blue-900/30',
    'Upsizer': 'text-purple-400 bg-purple-900/30',
    'Downsizer': 'text-orange-400 bg-orange-900/30',
    'Relocator': 'text-yellow-400 bg-yellow-900/30',
    'Second Home': 'text-pink-400 bg-pink-900/30',
    'Other': 'text-gray-400 bg-gray-900/30'
  };
  return colorMap[type as keyof typeof colorMap] || 'text-gray-400 bg-gray-900/30';
};

const getTimelineColor = (timeline: string) => {
  const colorMap = {
    'Immediate': 'text-red-400 bg-red-900/30',
    'Within 30 Days': 'text-orange-400 bg-orange-900/30',
    '2-3 Months': 'text-yellow-400 bg-yellow-900/30',
    '6+ Months': 'text-blue-400 bg-blue-900/30',
    'Exploring': 'text-gray-400 bg-gray-900/30'
  };
  return colorMap[timeline as keyof typeof colorMap] || 'text-gray-400 bg-gray-900/30';
};

const getEmotionalProfileIcon = (profile: string) => {
  const iconMap = {
    'Analytical': 'ri-bar-chart-line',
    'Enthusiastic': 'ri-emotion-happy-line',
    'Cautious': 'ri-shield-check-line',
    'Decisive': 'ri-flashlight-line',
    'Social': 'ri-team-line'
  };
  return iconMap[profile as keyof typeof iconMap] || 'ri-user-line';
};

const getCommunicationIcon = (preference: string) => {
  const iconMap = {
    'Email': 'ri-mail-line',
    'Phone': 'ri-phone-line',
    'Text': 'ri-message-3-line',
    'In-Person': 'ri-user-voice-line',
    'Mixed': 'ri-chat-1-line'
  };
  return iconMap[preference as keyof typeof iconMap] || 'ri-chat-1-line';
};

const getConfidenceColor = (score: number) => {
  if (score >= 0.8) return 'text-green-400 bg-green-900/30';
  if (score >= 0.6) return 'text-yellow-400 bg-yellow-900/30';
  return 'text-red-400 bg-red-900/30';
};

export default function BuyerPersonaDisplay({ 
  persona, 
  loading, 
  clientName, 
  voiceSummaryUrl 
}: BuyerPersonaDisplayProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'motivations' | 'strategy'>('overview');

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center space-x-3 mb-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500"></div>
          <h3 className="text-lg font-semibold text-white">Generating Buyer Persona...</h3>
        </div>
        <p className="text-gray-400">Analyzing conversation to create detailed buyer profile</p>
      </div>
    );
  }

  if (!persona) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <i className="ri-user-line text-4xl text-gray-600"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-400 mb-2">No Persona Available</h3>
          <p className="text-gray-500">Buyer persona will appear here after AI analysis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 flex items-center justify-center">
              <i className="ri-user-star-line text-purple-500"></i>
            </div>
            <h3 className="text-lg font-semibold text-white">Buyer Persona</h3>
            {persona.generatedBy === 'openai' && (
              <span className="px-2 py-1 bg-purple-900/30 text-purple-300 rounded-full text-xs">
                AI Generated
              </span>
            )}
          </div>
          
          {/* Voice Summary Button */}
          {voiceSummaryUrl && (
            <VoicePlayer 
              audioUrl={voiceSummaryUrl}
              label="🔊 Voice Summary"
              variant="compact"
            />
          )}
        </div>

        {/* Buyer Type Badge */}
        <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg ${getBuyerTypeColor(persona.buyerType)}`}>
          <div className="w-4 h-4 flex items-center justify-center">
            <i className={getBuyerTypeIcon(persona.buyerType)}></i>
          </div>
          <span className="font-medium">{persona.buyerType}</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 px-1 py-1 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap rounded-full ${
            activeTab === 'overview'
              ? 'bg-purple-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('motivations')}
          className={`flex-1 px-1 py-1 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap rounded-full ${
            activeTab === 'motivations'
              ? 'bg-purple-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Motivations
        </button>
        <button
          onClick={() => setActiveTab('strategy')}
          className={`flex-1 px-1 py-1 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap rounded-full ${
            activeTab === 'strategy'
              ? 'bg-purple-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Strategy
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Decision Timeline</h4>
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTimelineColor(persona.decisionTimeline)}`}>
                  <div className="w-3 h-3 flex items-center justify-center mr-1">
                    <i className="ri-time-line"></i>
                  </div>
                  {persona.decisionTimeline}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Confidence Score</h4>
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(persona.confidenceScore)}`}>
                  <div className="w-3 h-3 flex items-center justify-center mr-1">
                    <i className="ri-thumbs-up-line"></i>
                  </div>
                  {Math.round(persona.confidenceScore * 100)}%
                </div>
              </div>
            </div>

            {/* Budget Range */}
            {persona.budgetRange && (
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Budget Range</h4>
                <div className="bg-gray-900 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">
                      ${persona.budgetRange.min.toLocaleString()} - ${persona.budgetRange.max.toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-400">{persona.budgetRange.flexibility}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Communication & Emotional Profile */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Communication</h4>
                <div className="flex items-center space-x-2 text-blue-300">
                  <div className="w-4 h-4 flex items-center justify-center">
                    <i className={getCommunicationIcon(persona.communicationPreference)}></i>
                  </div>
                  <span className="text-sm">{persona.communicationPreference}</span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Profile</h4>
                <div className="flex items-center space-x-2 text-green-300">
                  <div className="w-4 h-4 flex items-center justify-center">
                    <i className={getEmotionalProfileIcon(persona.emotionalProfile)}></i>
                  </div>
                  <span className="text-sm">{persona.emotionalProfile}</span>
                </div>
              </div>
            </div>

            {/* Location Preferences */}
            {persona.locationPreferences.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Location Preferences</h4>
                <div className="flex flex-wrap gap-1">
                  {persona.locationPreferences.map((location, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-900/30 text-blue-300 rounded-full text-xs">
                      {location}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Property Feature Priorities */}
            {persona.propertyFeaturePriorities.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Feature Priorities</h4>
                <div className="flex flex-wrap gap-1">
                  {persona.propertyFeaturePriorities.map((feature, index) => (
                    <span key={index} className="px-2 py-1 bg-purple-900/30 text-purple-300 rounded-full text-xs">
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Motivations Tab */}
        {activeTab === 'motivations' && (
          <div className="space-y-4">
            {/* Key Motivations */}
            <div>
              <h4 className="font-medium text-green-400 mb-3">Key Motivations</h4>
              <div className="space-y-2">
                {persona.keyMotivations.map((motivation, index) => (
                  <div key={index} className="flex items-start space-x-3 p-2 bg-gray-900 rounded-lg">
                    <div className="w-4 h-4 flex items-center justify-center mt-0.5">
                      <i className="ri-heart-line text-green-500"></i>
                    </div>
                    <span className="text-gray-300 text-sm">{motivation}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Positive Signals */}
            {persona.positiveSignals.length > 0 && (
              <div>
                <h4 className="font-medium text-green-400 mb-3">Positive Signals</h4>
                <div className="space-y-2">
                  {persona.positiveSignals.map((signal, index) => (
                    <div key={index} className="flex items-start space-x-3 p-2 bg-gray-900 rounded-lg">
                      <div className="w-4 h-4 flex items-center justify-center mt-0.5">
                        <i className="ri-thumb-up-line text-green-500"></i>
                      </div>
                      <span className="text-gray-300 text-sm">{signal}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Concerns */}
            {persona.concerns.length > 0 && (
              <div>
                <h4 className="font-medium text-red-400 mb-3">Concerns</h4>
                <div className="space-y-2">
                  {persona.concerns.map((concern, index) => (
                    <div key={index} className="flex items-start space-x-3 p-2 bg-gray-900 rounded-lg">
                      <div className="w-4 h-4 flex items-center justify-center mt-0.5">
                        <i className="ri-alert-line text-red-500"></i>
                      </div>
                      <span className="text-gray-300 text-sm">{concern}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Strategy Tab */}
        {activeTab === 'strategy' && (
          <div>
            <h4 className="font-medium text-blue-400 mb-3">Recommended Follow-up Strategy</h4>
            <div className="bg-gray-900 rounded-lg p-4">
              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                {persona.recommendedStrategy}
              </p>
            </div>

            {/* Generation Info */}
            {persona.generatedAt && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Generated by {persona.generatedBy || 'AI'}</span>
                  <span>{new Date(persona.generatedAt.toDate()).toLocaleDateString()}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}