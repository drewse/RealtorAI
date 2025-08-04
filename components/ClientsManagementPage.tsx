'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import ClientForm from '@/components/ClientForm';
import { Client, ClientFormData } from '@/lib/types';

export default function ClientsManagementPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Cold' | 'Hot Lead'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'status'>('createdAt');

  const { user } = useAuth();

  // Load clients from Firestore
  useEffect(() => {
    if (!user?.uid) {
      setLoading(true);
      return;
    }

    console.log('🔥 Loading clients for user:', user.uid);

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

      // Sort in memory
      clientsData.sort((a, b) => {
        switch (sortBy) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'status':
            const statusOrder = { 'Hot Lead': 3, 'Active': 2, 'Cold': 1 };
            return statusOrder[b.status] - statusOrder[a.status];
          case 'createdAt':
          default:
            const aTime = a.createdAt?.toDate() || new Date(0);
            const bTime = b.createdAt?.toDate() || new Date(0);
            return bTime.getTime() - aTime.getTime();
        }
      });

      setClients(clientsData);
      setLoading(false);
    }, (error) => {
      console.error('❌ Error loading clients:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, [user, sortBy]);

  // Filter clients based on search and status
  const filteredClients = clients.filter(client => {
    const matchesSearch = !searchTerm || 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleCreateClient = () => {
    setEditingClient(null);
    setShowForm(true);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setShowForm(true);
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'clients', clientId));
      console.log('✅ Client deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting client:', error);
      alert('Failed to delete client. Please try again.');
    }
  };

  const handleFormSubmit = (client: ClientFormData) => {
    setShowForm(false);
    setEditingClient(null);
    setFormLoading(false);
    console.log('✅ Client saved successfully');
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingClient(null);
    setFormLoading(false);
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

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (showForm) {
    return (
      <div className="min-h-screen bg-gray-900 pb-20">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">
                {editingClient ? 'Edit Client' : 'Create New Client'}
              </h1>
              <p className="text-gray-400">
                {editingClient ? 'Update client information' : 'Add a new client to your database'}
              </p>
            </div>
          </div>
          
          <ClientForm
            client={editingClient}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            loading={formLoading}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pb-20">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Client Management</h1>
            <p className="text-gray-400">Manage your client relationships and preferences</p>
          </div>
          
          <button
            onClick={handleCreateClient}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors cursor-pointer flex items-center space-x-2"
          >
            <i className="ri-add-line"></i>
            <span>Create Client</span>
          </button>
        </div>

        {/* Filters and Search */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Search Clients
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, or tags..."
                className="w-full px-4 py-2 border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status Filter
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'Active' | 'Cold' | 'Hot Lead')}
                className="w-full px-4 py-2 border border-gray-700 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Cold">Cold</option>
                <option value="Hot Lead">Hot Lead</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'createdAt' | 'status')}
                className="w-full px-4 py-2 border border-gray-700 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="createdAt">Date Created</option>
                <option value="name">Name</option>
                <option value="status">Status</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Clients</p>
                <p className="text-2xl font-bold text-white">{clients.length}</p>
              </div>
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <i className="ri-user-line text-white"></i>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active</p>
                <p className="text-2xl font-bold text-green-400">
                  {clients.filter(c => c.status === 'Active').length}
                </p>
              </div>
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <i className="ri-user-star-line text-white"></i>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Hot Leads</p>
                <p className="text-2xl font-bold text-red-400">
                  {clients.filter(c => c.status === 'Hot Lead').length}
                </p>
              </div>
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                <i className="ri-fire-line text-white"></i>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Cold</p>
                <p className="text-2xl font-bold text-gray-400">
                  {clients.filter(c => c.status === 'Cold').length}
                </p>
              </div>
              <div className="w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center">
                <i className="ri-user-line text-white"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Client List */}
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
            <p className="text-gray-500 mb-6">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Create your first client to get started'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <button
                onClick={handleCreateClient}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors cursor-pointer flex items-center space-x-2 mx-auto"
              >
                <i className="ri-add-line"></i>
                <span>Create Your First Client</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client) => (
              <div
                key={client.id}
                className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white text-lg mb-1">{client.name}</h3>
                    <div className="flex items-center space-x-3 text-sm text-gray-400">
                      {client.email && (
                        <div className="flex items-center space-x-1">
                          <i className="ri-mail-line"></i>
                          <span className="truncate max-w-32">{client.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(client.status)}`}>
                    {client.status}
                  </div>
                </div>

                {/* Contact Info */}
                {client.phone && (
                  <div className="flex items-center space-x-2 text-sm text-gray-400 mb-3">
                    <i className="ri-phone-line"></i>
                    <span>{client.phone}</span>
                  </div>
                )}

                {/* Tags */}
                {client.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {client.tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-purple-900/30 text-purple-300 rounded-full text-xs">
                        {tag}
                      </span>
                    ))}
                    {client.tags.length > 3 && (
                      <span className="px-2 py-1 bg-gray-700 text-gray-400 rounded-full text-xs">
                        +{client.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Preferences Preview */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-300">💰 ${client.preferences.priceRange.min.toLocaleString()} - ${client.preferences.priceRange.max.toLocaleString()}</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      client.preferences.urgency === 'high' ? 'bg-red-900/30 text-red-300' :
                      client.preferences.urgency === 'medium' ? 'bg-yellow-900/30 text-yellow-300' :
                      'bg-green-900/30 text-green-300'
                    }`}>
                      {client.preferences.urgency.toUpperCase()}
                    </span>
                  </div>
                  
                  {client.preferences.preferredAreas.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {client.preferences.preferredAreas.slice(0, 2).map((area, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-900/30 text-blue-300 rounded-full text-xs">
                          📍 {area}
                        </span>
                      ))}
                      {client.preferences.preferredAreas.length > 2 && (
                        <span className="px-2 py-1 bg-gray-700 text-gray-400 rounded-full text-xs">
                          +{client.preferences.preferredAreas.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                  <span className="text-xs text-gray-500">
                    Created {formatDate(client.createdAt)}
                  </span>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditClient(client)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClient(client.id)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 