'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Client } from '@/lib/types';

interface ClientSelectorProps {
  selectedClientId: string;
  onClientSelect: (client: Client | null) => void;
  showDropdown: boolean;
  onToggleDropdown: () => void;
}

export default function ClientSelector({ 
  selectedClientId, 
  onClientSelect, 
  showDropdown, 
  onToggleDropdown 
}: ClientSelectorProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const { user } = useAuth();

  // Load clients from Firestore
  useEffect(() => {
    if (!user?.uid) {
      setLoading(true);
      return;
    }

    const q = query(
      collection(db, 'clients'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const clientsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Client[];

      // Sort by name
      clientsData.sort((a, b) => a.name.localeCompare(b.name));
      
      setClients(clientsData);
      setLoading(false);
    }, (error) => {
      console.error('❌ Error loading clients:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const selectedClient = clients.find(c => c.id === selectedClientId);
  
  const filteredClients = clients.filter(client => 
    !searchTerm || 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleClientSelect = (client: Client) => {
    onClientSelect(client);
    onToggleDropdown();
    setSearchTerm('');
  };

  const handleClearSelection = () => {
    onClientSelect(null);
    onToggleDropdown();
    setSearchTerm('');
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

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Select Client (Optional)
      </label>
      
      <button
        type="button"
        onClick={onToggleDropdown}
        className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-800 text-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm flex items-center justify-between"
      >
        <div className="flex-1">
          {selectedClient ? (
            <div>
              <div className="text-white">{selectedClient.name}</div>
              <div className="text-xs text-gray-400 mt-1 flex items-center space-x-2">
                <span>{selectedClient.email}</span>
                <span>•</span>
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${getStatusColor(selectedClient.status)}`}>
                  {selectedClient.status}
                </span>
              </div>
              {selectedClient.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedClient.tags.slice(0, 2).map((tag, index) => (
                    <span key={index} className="px-1.5 py-0.5 bg-purple-900/20 text-purple-400 rounded text-xs">
                      {tag}
                    </span>
                  ))}
                  {selectedClient.tags.length > 2 && (
                    <span className="px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded text-xs">
                      +{selectedClient.tags.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <span className="text-gray-400">Select an existing client or create new...</span>
          )}
        </div>
        <div className="w-4 h-4 flex items-center justify-center">
          <i className={`ri-arrow-${showDropdown ? 'up' : 'down'}-s-line text-gray-400`}></i>
        </div>
      </button>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
          {/* Search */}
          <div className="p-3 border-b border-gray-700">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search clients..."
              className="w-full px-3 py-2 border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Client List */}
          <div className="max-h-48 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-3 text-gray-400 text-sm">
                Loading clients...
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="px-4 py-3 text-gray-400 text-sm">
                {searchTerm ? 'No matching clients found' : 'No clients found. Create clients first.'}
              </div>
            ) : (
              <>
                {filteredClients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => handleClientSelect(client)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors text-sm cursor-pointer border-b border-gray-700 last:border-b-0 ${
                      selectedClientId === client.id ? 'bg-blue-900/30' : ''
                    }`}
                  >
                    <div className="text-white">{client.name}</div>
                    <div className="text-xs text-gray-400 mt-1 flex items-center space-x-2">
                      <span>{client.email}</span>
                      <span>•</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-xs ${getStatusColor(client.status)}`}>
                        {client.status}
                      </span>
                    </div>
                    {client.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {client.tags.slice(0, 2).map((tag, index) => (
                          <span key={index} className="px-1.5 py-0.5 bg-purple-900/20 text-purple-400 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                        {client.tags.length > 2 && (
                          <span className="px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded text-xs">
                            +{client.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Clear Selection */}
          {selectedClient && (
            <div className="p-3 border-t border-gray-700">
              <button
                type="button"
                onClick={handleClearSelection}
                className="w-full px-3 py-2 text-red-400 hover:text-red-300 text-sm transition-colors cursor-pointer"
              >
                Clear Selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 