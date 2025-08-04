
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import AuthGuard from '@/components/AuthGuard';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';
import ClientSearch from '@/components/ClientSearch';
import ClientCard from '@/components/ClientCard';
import ClientDetails from '@/components/ClientDetails';
import SmartAlertsPanel from '@/components/SmartAlertsPanel';

interface Client {
  id: string;
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  status: 'Active' | 'Cold' | 'Hot Lead';
  lastInteraction?: any;
  tags: string[];
  preferences: ClientPreferences;
  notes: ClientNote[];
  createdAt: any;
  updatedAt?: any;
  linkedRecordings: string[];
  totalInteractions: number;
  averageSentiment?: 'positive' | 'neutral' | 'negative';
}

interface ClientPreferences {
  priceRange: { min: number; max: number; };
  preferredAreas: string[];
  propertyTypes: string[];
  bedrooms: { min: number; max: number; };
  bathrooms: { min: number; max: number; };
  features: string[];
  urgency: 'low' | 'medium' | 'high';
}

interface ClientNote {
  id: string;
  content: string;
  type: 'insight' | 'action-item' | 'objection' | 'general';
  createdAt: any;
  createdBy: string;
}

interface SmartAlert {
  id: string;
  type: 'property-match';
  clientId: string;
  propertyId: string;
  timestamp: any;
  matchScore: number;
  read: boolean;
  matchReasons: string[];
}

type SortOption = 'recent' | 'name' | 'interactions' | 'status';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  // DEFAULT: Show all clients by default
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Cold' | 'Hot Lead'>('all');
  // DEFAULT: Sort by recent activity by default  
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [showAlerts, setShowAlerts] = useState(false);
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);
  const [defaultViewLoaded, setDefaultViewLoaded] = useState(false);

  const { user } = useAuth();

  // Initialize default view for Clients page
  useEffect(() => {
    if (!defaultViewLoaded && user && !loading) {
      // Ensure default filters are set (already initialized above)
      // This ensures we show all clients sorted by recent activity
      setDefaultViewLoaded(true);
    }
  }, [user, loading, defaultViewLoaded]);

  // Load clients from Firestore - FIXED: Simplified query to avoid index issues
  useEffect(() => {
    if (!user?.uid) {
      setLoading(true);
      return;
    }

    console.log('🔥 Loading clients for user:', user.uid);

    // FIXED: Use simpler query that doesn't require composite index
    const q = query(
      collection(db, 'clients'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log(`📊 Found ${snapshot.docs.length} clients`);
      
      const clientsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Client[];

      // FIXED: Sort in memory instead of in query to avoid index requirement
      clientsData.sort((a, b) => {
        const aTime = a.createdAt?.toDate() || new Date(0);
        const bTime = b.createdAt?.toDate() || new Date(0);
        return bTime.getTime() - aTime.getTime();
      });

      setClients(clientsData);
      setLoading(false);
    }, (error) => {
      console.error('❌ Error loading clients:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  // Load smart alerts - FIXED: Simplified query to avoid index issues
  useEffect(() => {
    if (!user?.uid) return;

    console.log('🔔 Loading alerts for user:', user.uid);

    // FIXED: Use simpler query that doesn't require composite index
    const q = query(
      collection(db, 'alerts'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log(`📢 Found ${snapshot.docs.length} alerts`);
      
      const alertsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as SmartAlert[];

      // FIXED: Sort in memory instead of in query to avoid index requirement
      alertsData.sort((a, b) => {
        const aTime = a.timestamp?.toDate() || new Date(0);
        const bTime = b.timestamp?.toDate() || new Date(0);
        return bTime.getTime() - aTime.getTime();
      });

      setAlerts(alertsData);
      setUnreadAlertsCount(alertsData.filter(alert => !alert.read).length);
    }, (error) => {
      console.error('❌ Error loading alerts:', error);
      // Don't fail the entire page if alerts fail to load
      setAlerts([]);
      setUnreadAlertsCount(0);
    });

    return unsubscribe;
  }, [user]);

  // Filter and sort clients - DEFAULT: All clients, sorted by recent activity
  useEffect(() => {
    let filtered = clients;

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(client => 
        client.name.toLowerCase().includes(searchLower) ||
        client.email?.toLowerCase().includes(searchLower) ||
        client.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
        client.preferences?.preferredAreas?.some(area => 
          area.toLowerCase().includes(searchLower)
        ) ||
        client.preferences?.propertyTypes?.some(type => 
          type.toLowerCase().includes(searchLower)
        )
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(client => client.status === statusFilter);
    }

    // Apply sorting - DEFAULT: Recent activity first
    switch (sortBy) {
      case 'name':
        filtered = filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'interactions':
        filtered = filtered.sort((a, b) => (b.totalInteractions || 0) - (a.totalInteractions || 0));
        break;
      case 'status':
        filtered = filtered.sort((a, b) => {
          const statusOrder = { 'Hot Lead': 3, 'Active': 2, 'Cold': 1 };
          return statusOrder[b.status] - statusOrder[a.status];
        });
        break;
      case 'recent':
      default:
        filtered = filtered.sort((a, b) => {
          const aTime = a.lastInteraction?.toDate() || a.createdAt?.toDate() || new Date(0);
          const bTime = b.lastInteraction?.toDate() || b.createdAt?.toDate() || new Date(0);
          return bTime.getTime() - aTime.getTime();
        });
        break;
    }

    setFilteredClients(filtered);
  }, [clients, searchTerm, statusFilter, sortBy]);

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
  };

  const handleBackToList = () => {
    setSelectedClient(null);
  };

  const handleStatusUpdate = async (clientId: string, newStatus: 'Active' | 'Cold' | 'Hot Lead') => {
    try {
      await updateDoc(doc(db, 'clients', clientId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      console.log('✅ Client status updated');
    } catch (error) {
      console.error('❌ Error updating client status:', error);
    }
  };

  const handleAddNote = async (clientId: string, note: Omit<ClientNote, 'id'>) => {
    try {
      const client = clients.find(c => c.id === clientId);
      if (!client) return;

      const newNote = {
        ...note,
        id: `note_${Date.now()}`,
        createdAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'clients', clientId), {
        notes: [...(client.notes || []), newNote],
        updatedAt: serverTimestamp()
      });
      console.log('✅ Client note added');
    } catch (error) {
      console.error('❌ Error adding client note:', error);
    }
  };

  const markAlertAsRead = async (alertId: string) => {
    try {
      await updateDoc(doc(db, 'alerts', alertId), {
        read: true,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('❌ Error marking alert as read:', error);
    }
  };

  const getStatusCount = (status: 'all' | 'Active' | 'Cold' | 'Hot Lead'): number => {
    if (status === 'all') return clients.length;
    return clients.filter(client => client.status === status).length;
  };

  if (selectedClient) {
    return (
      <AuthGuard>
        <ClientDetails
          client={selectedClient}
          onBack={handleBackToList}
          onStatusUpdate={handleStatusUpdate}
          onAddNote={handleAddNote}
        />
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-900 pb-20">
        <Header />

        <div className="max-w-md mx-auto px-4 py-6">
          {/* Header with Alerts */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Clients</h1>
              <p className="text-gray-400">Manage your client relationships</p>
            </div>
            
            <button
              onClick={() => setShowAlerts(!showAlerts)}
              className="relative w-10 h-10 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center transition-colors cursor-pointer whitespace-nowrap"
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <i className="ri-notification-line text-white text-xl"></i>
              </div>
              {unreadAlertsCount > 0 && (
                <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {unreadAlertsCount > 9 ? '9+' : unreadAlertsCount}
                  </span>
                </div>
              )}
            </button>
          </div>

          {/* Smart Alerts Panel */}
          {showAlerts && (
            <SmartAlertsPanel
              alerts={alerts}
              onClose={() => setShowAlerts(false)}
              onMarkAsRead={markAlertAsRead}
            />
          )}

          {/* Search and Filters - DEFAULT: All clients, recent activity */}
          <ClientSearch
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            sortBy={sortBy}
            onSortChange={setSortBy}
            statusCounts={{
              all: getStatusCount('all'),
              'Active': getStatusCount('Active'),
              'Cold': getStatusCount('Cold'),
              'Hot Lead': getStatusCount('Hot Lead')
            }}
          />

          {/* Client List - DEFAULT: Show all clients if available */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-400 text-sm">Loading your clients...</p>
            </div>
          ) : !user ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <i className="ri-user-line text-4xl text-gray-600"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-400 mb-2">Authentication Required</h3>
              <p className="text-gray-500">Please log in to view your clients</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <i className="ri-user-line text-4xl text-gray-600"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-400 mb-2">
                {searchTerm || statusFilter !== 'all' ? 'No matching clients' : 'No clients yet'}
              </h3>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Your clients will appear here after recording sessions'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredClients.map((client) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  onClick={() => handleClientSelect(client)}
                  onStatusUpdate={handleStatusUpdate}
                />
              ))}
            </div>
          )}
        </div>

        <Navigation />
      </div>
    </AuthGuard>
  );
}
