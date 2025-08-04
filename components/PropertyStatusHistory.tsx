'use client';

import { useState } from 'react';

interface PropertyStatusHistory {
  id: string;
  fromStatus?: 'Active' | 'Coming Soon' | 'Sold';
  toStatus: 'Active' | 'Coming Soon' | 'Sold';
  changedBy: string;
  changedAt: any;
  reason?: string;
  notes?: string;
}

interface PropertyPriceHistory {
  id: string;
  fromPrice?: number;
  toPrice: number;
  changedBy: string;
  changedAt: any;
  reason?: string;
  notes?: string;
}

interface PropertyStatusHistoryProps {
  statusHistory: PropertyStatusHistory[];
  priceHistory: PropertyPriceHistory[];
  loading?: boolean;
}

export default function PropertyStatusHistory({ 
  statusHistory, 
  priceHistory, 
  loading 
}: PropertyStatusHistoryProps) {
  const [activeTab, setActiveTab] = useState<'status' | 'price' | 'all'>('all');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'text-green-400 bg-green-900/30';
      case 'Coming Soon': return 'text-yellow-400 bg-yellow-900/30';
      case 'Sold': return 'text-red-400 bg-red-900/30';
      default: return 'text-gray-400 bg-gray-900/30';
    }
  };

  const getChangeIcon = (fromStatus?: string, toStatus?: string) => {
    if (!fromStatus) return 'ri-add-circle-line'; // Initial creation
    
    const statusOrder = { 'Coming Soon': 0, 'Active': 1, 'Sold': 2 };
    const fromOrder = statusOrder[fromStatus as keyof typeof statusOrder] || 0;
    const toOrder = statusOrder[toStatus as keyof typeof statusOrder] || 0;
    
    if (toOrder > fromOrder) return 'ri-arrow-up-circle-line';
    if (toOrder < fromOrder) return 'ri-arrow-down-circle-line';
    return 'ri-refresh-line';
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

  const formatPrice = (price: number) => {
    return `$${price.toLocaleString()}`;
  };

  const getPriceChangeIcon = (fromPrice?: number, toPrice?: number) => {
  if (fromPrice === undefined || toPrice === undefined) return 'ri-price-tag-3-line'; // Initial or missing price

  if (toPrice > fromPrice) return 'ri-arrow-up-line';
  if (toPrice < fromPrice) return 'ri-arrow-down-line';
  return 'ri-subtract-line';
};

const getPriceChangeColor = (fromPrice?: number, toPrice?: number) => {
  if (fromPrice === undefined || toPrice === undefined) return 'text-blue-400 bg-blue-900/30';

  if (toPrice > fromPrice) return 'text-green-400 bg-green-900/30';
  if (toPrice < fromPrice) return 'text-red-400 bg-red-900/30';
  return 'text-gray-400 bg-gray-900/30';
};

  // Combine and sort all history items
  const getAllHistory = () => {
    const statusItems = statusHistory.map(item => ({
      ...item,
      type: 'status' as const,
      timestamp: item.changedAt
    }));
    
    const priceItems = priceHistory.map(item => ({
      ...item,
      type: 'price' as const,
      timestamp: item.changedAt
    }));
    
    const allItems = [...statusItems, ...priceItems];
    
    // Sort by timestamp (newest first)
    return allItems.sort((a, b) => {
      const aTime = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
      const bTime = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
      return bTime.getTime() - aTime.getTime();
    });
  };

  const filteredHistory = () => {
    const allHistory = getAllHistory();
    
    if (activeTab === 'status') {
      return allHistory.filter(item => item.type === 'status');
    }
    if (activeTab === 'price') {
      return allHistory.filter(item => item.type === 'price');
    }
    return allHistory;
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center space-x-3 mb-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          <h3 className="text-lg font-semibold text-white">Loading History...</h3>
        </div>
      </div>
    );
  }

  const history = filteredHistory();

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center space-x-2 mb-3">
          <div className="w-5 h-5 flex items-center justify-center">
            <i className="ri-history-line text-blue-500"></i>
          </div>
          <h3 className="text-lg font-semibold text-white">Property History</h3>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-900 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 px-1 py-1 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap rounded-full ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            All Changes
          </button>
          <button
            onClick={() => setActiveTab('status')}
            className={`flex-1 px-1 py-1 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap rounded-full ${
              activeTab === 'status'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Status
          </button>
          <button
            onClick={() => setActiveTab('price')}
            className={`flex-1 px-1 py-1 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap rounded-full ${
              activeTab === 'price'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Price
          </button>
        </div>
      </div>

      {/* History Content */}
      <div className="p-4">
        {history.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <i className="ri-history-line text-4xl text-gray-600"></i>
            </div>
            <h4 className="text-lg font-medium text-gray-400 mb-2">No History Available</h4>
            <p className="text-gray-500">Property changes will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((item, index) => (
              <div key={item.id} className="relative">
                {/* Timeline Line */}
                {index < history.length - 1 && (
                  <div className="absolute left-6 top-12 w-0.5 h-12 bg-gray-700"></div>
                )}
                
                <div className="flex items-start space-x-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    item.type === 'status' 
                      ? getStatusColor(item.toStatus as string).replace('text-', 'bg-').replace('bg-', 'bg-opacity-20 text-')
                      : getPriceChangeColor((item as any).fromPrice, (item as any).toPrice).replace('text-', 'bg-').replace('bg-', 'bg-opacity-20 text-')
                  }`}>
                    <div className="w-5 h-5 flex items-center justify-center">
                      <i className={
                        item.type === 'status' 
                          ? getChangeIcon((item as any).fromStatus, item.toStatus as string)
                          : getPriceChangeIcon((item as any).fromPrice, (item as any).toPrice)
                      }></i>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 bg-gray-900 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {item.type === 'status' ? (
                          <>
                            <span className="text-white font-medium">Status Changed</span>
                            <div className="flex items-center space-x-2">
                              {(item as any).fromStatus && (
                                <>
                                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor((item as any).fromStatus)}`}>
                                    {(item as any).fromStatus}
                                  </span>
                                  <div className="w-3 h-3 flex items-center justify-center">
                                    <i className="ri-arrow-right-line text-gray-500"></i>
                                  </div>
                                </>
                              )}
                              <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(item.toStatus as string)}`}>
                                {item.toStatus}
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="text-white font-medium">Price Changed</span>
                            <div className="flex items-center space-x-2">
                              {(item as any).fromPrice && (
                                <>
                                  <span className="text-gray-300 text-sm">
                                    {formatPrice((item as any).fromPrice)}
                                  </span>
                                  <div className="w-3 h-3 flex items-center justify-center">
                                    <i className="ri-arrow-right-line text-gray-500"></i>
                                  </div>
                                </>
                              )}
                              <span className="text-white font-medium">
                                {formatPrice((item as any).toPrice)}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-gray-400 mb-2">
                      {formatDate(item.timestamp)}
                    </div>

                    {item.reason && (
                      <div className="text-sm text-gray-300 mb-1">
                        <strong>Reason:</strong> {item.reason}
                      </div>
                    )}

                    {item.notes && (
                      <div className="text-sm text-gray-300">
                        <strong>Notes:</strong> {item.notes}
                      </div>
                    )}
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