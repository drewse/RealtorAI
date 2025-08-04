
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface SmartAlert {
  id: string;
  type: 'property-match';
  clientId: string;
  propertyId: string;
  timestamp: any;
  matchScore: number;
  read: boolean;
  matchReasons: string[];
  clientName?: string;
  propertyAddress?: string;
}

interface Property {
  id: string;
  address: string;
  price: number;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  status: string;
}

interface SmartAlertsPanelProps {
  alerts: SmartAlert[];
  onClose: () => void;
  onMarkAsRead: (alertId: string) => void;
}

export default function SmartAlertsPanel({ alerts, onClose, onMarkAsRead }: SmartAlertsPanelProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load associated properties and clients for alerts - FIXED: Individual document fetches
  useEffect(() => {
    if (alerts.length === 0) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const propertyIds = [...new Set(alerts.map(alert => alert.propertyId))];
        const clientIds = [...new Set(alerts.map(alert => alert.clientId))];

        // FIXED: Load properties individually to avoid "in" query limits and index issues
        const propertiesPromises = propertyIds.map(async (propertyId) => {
          try {
            const docRef = doc(db, 'properties', propertyId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              return { id: docSnap.id, ...docSnap.data() } as Property;
            }
            return null;
          } catch (error) {
            console.error(`❌ Error loading property ${propertyId}:`, error);
            return null;
          }
        });

        // FIXED: Load clients individually to avoid "in" query limits and index issues
        const clientsPromises = clientIds.map(async (clientId) => {
          try {
            const docRef = doc(db, 'clients', clientId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              return { id: docSnap.id, ...docSnap.data() };
            }
            return null;
          } catch (error) {
            console.error(`❌ Error loading client ${clientId}:`, error);
            return null;
          }
        });

        // Wait for all data to load
        const [propertiesResults, clientsResults] = await Promise.all([
          Promise.all(propertiesPromises),
          Promise.all(clientsPromises)
        ]);

        // Filter out null results
        const validProperties = propertiesResults.filter(p => p !== null) as Property[];
        const validClients = clientsResults.filter(c => c !== null);

        setProperties(validProperties);
        setClients(validClients);

        console.log(`✅ Loaded ${validProperties.length} properties and ${validClients.length} clients for alerts`);
      } catch (error) {
        console.error('❌ Error loading alert data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [alerts]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 90) return 'text-red-400 bg-red-900/30';
    if (score >= 75) return 'text-orange-400 bg-orange-900/30';
    if (score >= 60) return 'text-yellow-400 bg-yellow-900/30';
    return 'text-green-400 bg-green-900/30';
  };

  const getPropertyInfo = (propertyId: string) => {
    return properties.find(p => p.id === propertyId);
  };

  const getClientInfo = (clientId: string) => {
    return clients.find(c => c.id === clientId);
  };

  const handleAlertClick = (alert: SmartAlert) => {
    if (!alert.read) {
      onMarkAsRead(alert.id);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="text-white">Loading alerts...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-md max-h-[80vh] border border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 flex items-center justify-center">
              <i className="ri-notification-line text-blue-500 text-xl"></i>
            </div>
            <h2 className="text-lg font-semibold text-white">Smart Alerts</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <div className="w-6 h-6 flex items-center justify-center">
              <i className="ri-close-line text-xl"></i>
            </div>
          </button>
        </div>

        {/* Alerts List */}
        <div className="overflow-y-auto max-h-96">
          {alerts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <i className="ri-notification-off-line text-4xl text-gray-600"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-400 mb-2">No alerts yet</h3>
              <p className="text-gray-500">Smart property matches will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {alerts.map((alert) => {
                const property = getPropertyInfo(alert.propertyId);
                const client = getClientInfo(alert.clientId);
                
                return (
                  <div
                    key={alert.id}
                    onClick={() => handleAlertClick(alert)}
                    className={`p-4 cursor-pointer hover:bg-gray-700/50 transition-colors ${
                      !alert.read ? 'bg-blue-900/10' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                          <div className="w-3 h-3 flex items-center justify-center">
                            <i className="ri-home-heart-line text-white text-xs"></i>
                          </div>
                        </div>
                        <span className="font-medium text-white text-sm">Property Match</span>
                        {!alert.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${getMatchScoreColor(alert.matchScore)}`}>
                        {alert.matchScore}% match
                      </div>
                    </div>

                    {/* Client Info */}
                    {client ? (
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-3 h-3 flex items-center justify-center">
                          <i className="ri-user-line text-green-500"></i>
                        </div>
                        <span className="text-green-300 text-sm font-medium">
                          {client.name}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-3 h-3 flex items-center justify-center">
                          <i className="ri-user-line text-gray-500"></i>
                        </div>
                        <span className="text-gray-400 text-sm">
                          Unknown client
                        </span>
                      </div>
                    )}

                    {/* Property Info */}
                    {property ? (
                      <div className="space-y-1 mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 flex items-center justify-center">
                            <i className="ri-home-line text-blue-400"></i>
                          </div>
                          <span className="text-gray-300 text-sm">
                            {property.address}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-gray-400 ml-5">
                          <span>${property.price?.toLocaleString() || 'N/A'}</span>
                          <span>{property.bedrooms || 0} bed</span>
                          <span>{property.bathrooms || 0} bath</span>
                          <span>{property.propertyType || 'N/A'}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1 mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 flex items-center justify-center">
                            <i className="ri-home-line text-gray-500"></i>
                          </div>
                          <span className="text-gray-400 text-sm">
                            Property information unavailable
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Match Reasons */}
                    {alert.matchReasons && alert.matchReasons.length > 0 && (
                      <div className="mb-2">
                        <div className="flex flex-wrap gap-1">
                          {alert.matchReasons.slice(0, 3).map((reason, index) => (
                            <span key={index} className="px-2 py-1 bg-purple-900/30 text-purple-300 rounded-full text-xs">
                              ✓ {reason}
                            </span>
                          ))}
                          {alert.matchReasons.length > 3 && (
                            <span className="px-2 py-1 bg-gray-700 text-gray-400 rounded-full text-xs">
                              +{alert.matchReasons.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{formatDate(alert.timestamp)}</span>
                      <div className="w-3 h-3 flex items-center justify-center">
                        <i className="ri-arrow-right-s-line"></i>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">
              {alerts.filter(a => !a.read).length} unread alert{alerts.filter(a => !a.read).length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
