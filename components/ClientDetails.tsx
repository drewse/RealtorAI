'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Header from './Header';
import Navigation from './Navigation';
import ClientTimeline from './ClientTimeline';
import ClientNotes from './ClientNotes';

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: 'Active' | 'Cold' | 'Hot Lead';
  lastInteraction?: any;
  tags: string[];
  preferences: {
    priceRange: { min: number; max: number; };
    preferredAreas: string[];
    propertyTypes: string[];
    bedrooms: { min: number; max: number; };
    bathrooms: { min: number; max: number; };
    features: string[];
    urgency: 'low' | 'medium' | 'high';
  };
  notes: ClientNote[];
  linkedRecordings: string[];
  totalInteractions: number;
  averageSentiment?: 'positive' | 'neutral' | 'negative';
  createdAt: any;
}

interface ClientNote {
  id: string;
  content: string;
  type: 'insight' | 'action-item' | 'objection' | 'general';
  createdAt: any;
  createdBy: string;
}

interface Recording {
  id: string;
  clientName: string;
  createdAt: any;
  propertyAddress?: string;
  tags: string[];
  transcript?: string;
  overallSentiment?: 'positive' | 'neutral' | 'negative';
}

interface ClientDetailsProps {
  client: Client;
  onBack: () => void;
  onStatusUpdate: (clientId: string, status: 'Active' | 'Cold' | 'Hot Lead') => void;
  onAddNote: (clientId: string, note: Omit<ClientNote, 'id'>) => void;
}

export default function ClientDetails({ client, onBack, onStatusUpdate, onAddNote }: ClientDetailsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'notes'>('overview');
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loadingRecordings, setLoadingRecordings] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Load client recordings
  useEffect(() => {
    if (!client.linkedRecordings.length) {
      setLoadingRecordings(false);
      return;
    }

    const q = query(
      collection(db, 'recordings'),
      where('clientName', '==', client.name),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const recordingsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Recording[];

      setRecordings(recordingsData);
      setLoadingRecordings(false);
    });

    return unsubscribe;
  }, [client.name, client.linkedRecordings]);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Hot Lead':
        return 'bg-red-900/30 text-red-300 border-red-700/50';
      case 'Active':
        return 'bg-green-900/30 text-green-300 border-green-700/50';
      case 'Cold':
        return 'bg-gray-700/50 text-gray-400 border-gray-600/50';
      default:
        return 'bg-gray-700/50 text-gray-400 border-gray-600/50';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return 'text-red-400 bg-red-900/30';
      case 'medium':
        return 'text-yellow-400 bg-yellow-900/30';
      case 'low':
        return 'text-green-400 bg-green-900/30';
      default:
        return 'text-gray-400 bg-gray-900/30';
    }
  };

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return 'ri-emotion-happy-line text-green-400';
      case 'negative':
        return 'ri-emotion-unhappy-line text-red-400';
      case 'neutral':
      default:
        return 'ri-emotion-normal-line text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 pb-20">
      <Header />

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <div className="w-6 h-6 flex items-center justify-center">
              <i className="ri-arrow-left-line text-xl"></i>
            </div>
          </button>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h1 className="text-xl font-bold text-white">{client.name}</h1>
              {client.averageSentiment && (
                <div className="w-5 h-5 flex items-center justify-center">
                  <i className={getSentimentIcon(client.averageSentiment)}></i>
                </div>
              )}
            </div>
            <p className="text-gray-400 text-sm">Client Profile</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(client.status)}`}>
            {client.status}
          </div>
        </div>

        {/* Contact Info Card */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
          <div className="space-y-3">
            {client.email && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-mail-line text-blue-500"></i>
                  </div>
                  <span className="text-gray-300">{client.email}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(client.email!, 'email')}
                  className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <div className="w-4 h-4 flex items-center justify-center">
                    <i className={`ri-${copiedField === 'email' ? 'check' : 'file-copy'}-line`}></i>
                  </div>
                </button>
              </div>
            )}

            {client.phone && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-phone-line text-green-500"></i>
                  </div>
                  <span className="text-gray-300">{client.phone}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(client.phone!, 'phone')}
                  className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <div className="w-4 h-4 flex items-center justify-center">
                    <i className={`ri-${copiedField === 'phone' ? 'check' : 'file-copy'}-line`}></i>
                  </div>
                </button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-calendar-line text-purple-500"></i>
                </div>
                <span className="text-gray-300">Client since {formatDate(client.createdAt)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-time-line text-yellow-500"></i>
                </div>
                <span className="text-gray-300">Last contact: {formatDate(client.lastInteraction || client.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-gray-800 rounded-lg p-1 mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 px-1 py-1 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap rounded-full ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex-1 px-1 py-1 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap rounded-full ${
              activeTab === 'timeline'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Timeline
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex-1 px-1 py-1 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap rounded-full ${
              activeTab === 'notes'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Notes ({client.notes?.length || 0})
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Preferences */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="font-medium text-white mb-3 flex items-center space-x-2">
                <div className="w-5 h-5 flex items-center justify-center">
                  <i className="ri-heart-line text-red-500"></i>
                </div>
                <span>Client Preferences</span>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(client.preferences.urgency)}`}>
                  {client.preferences.urgency.toUpperCase()} Priority
                </div>
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Budget Range</span>
                  <span className="text-white font-medium">
                    ${client.preferences.priceRange.min.toLocaleString()} - ${client.preferences.priceRange.max.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-start">
                  <span className="text-gray-400">Property Types</span>
                  <div className="flex flex-wrap gap-1 max-w-48">
                    {client.preferences.propertyTypes.map((type, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-900/30 text-blue-300 rounded-full text-xs">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Bedrooms</span>
                  <span className="text-white">{client.preferences.bedrooms.min} - {client.preferences.bedrooms.max}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Bathrooms</span>
                  <span className="text-white">{client.preferences.bathrooms.min} - {client.preferences.bathrooms.max}</span>
                </div>

                {client.preferences.preferredAreas.length > 0 && (
                  <div className="flex justify-between items-start">
                    <span className="text-gray-400">Preferred Areas</span>
                    <div className="flex flex-wrap gap-1 max-w-48">
                      {client.preferences.preferredAreas.map((area, index) => (
                        <span key={index} className="px-2 py-1 bg-green-900/30 text-green-300 rounded-full text-xs">
                          📍 {area}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {client.preferences.features.length > 0 && (
                  <div className="flex justify-between items-start">
                    <span className="text-gray-400">Desired Features</span>
                    <div className="flex flex-wrap gap-1 max-w-48">
                      {client.preferences.features.map((feature, index) => (
                        <span key={index} className="px-2 py-1 bg-purple-900/30 text-purple-300 rounded-full text-xs">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            {client.tags.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <h3 className="font-medium text-white mb-3 flex items-center space-x-2">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <i className="ri-price-tag-line text-blue-500"></i>
                  </div>
                  <span>Tags</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {client.tags.map((tag, index) => (
                    <span key={index} className="px-3 py-1 bg-blue-900/30 text-blue-300 rounded-full text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Activity Summary */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="font-medium text-white mb-3 flex items-center space-x-2">
                <div className="w-5 h-5 flex items-center justify-center">
                  <i className="ri-bar-chart-line text-green-500"></i>
                </div>
                <span>Activity Summary</span>
              </h3>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-400">{client.totalInteractions}</div>
                  <div className="text-xs text-gray-400">Total Interactions</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-400">{client.linkedRecordings.length}</div>
                  <div className="text-xs text-gray-400">Recordings</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-400">{client.notes?.length || 0}</div>
                  <div className="text-xs text-gray-400">Notes</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <ClientTimeline
            client={client}
            recordings={recordings}
            loading={loadingRecordings}
          />
        )}

        {activeTab === 'notes' && (
          <ClientNotes
            client={client}
            onAddNote={onAddNote}
          />
        )}
      </div>

      <Navigation />
    </div>
  );
}