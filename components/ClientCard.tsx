'use client';

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
    urgency: 'low' | 'medium' | 'high';
  };
  linkedRecordings: string[];
  totalInteractions: number;
  averageSentiment?: 'positive' | 'neutral' | 'negative';
  createdAt: any;
}

interface ClientCardProps {
  client: Client;
  onClick: () => void;
  onStatusUpdate: (clientId: string, status: 'Active' | 'Cold' | 'Hot Lead') => void;
}

export default function ClientCard({ client, onClick, onStatusUpdate }: ClientCardProps) {
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'No interactions';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
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

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'high':
        return 'text-red-400';
      case 'medium':
        return 'text-yellow-400';
      case 'low':
        return 'text-green-400';
      default:
        return 'text-gray-400';
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

  const handleStatusClick = (e: React.MouseEvent, newStatus: 'Active' | 'Cold' | 'Hot Lead') => {
    e.stopPropagation();
    onStatusUpdate(client.id, newStatus);
  };

  return (
    <div
      onClick={onClick}
      className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="font-semibold text-white text-lg">{client.name}</h3>
            {client.averageSentiment && (
              <div className="w-4 h-4 flex items-center justify-center">
                <i className={getSentimentIcon(client.averageSentiment)}></i>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-3 text-sm text-gray-400">
            {client.email && (
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 flex items-center justify-center">
                  <i className="ri-mail-line"></i>
                </div>
                <span className="truncate max-w-32">{client.email}</span>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 flex items-center justify-center">
                  <i className="ri-phone-line"></i>
                </div>
                <span>{client.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="relative group">
          <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(client.status)}`}>
            {client.status}
          </div>
          
          {/* Status Change Dropdown */}
          <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 min-w-28">
            {['Hot Lead', 'Active', 'Cold'].filter(status => status !== client.status).map((status) => (
              <button
                key={status}
                onClick={(e) => handleStatusClick(e, status as any)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg transition-colors cursor-pointer whitespace-nowrap ${getStatusColor(status).split(' ')[1]}`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preferences Preview */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2 text-gray-300">
            <span>💰 ${client.preferences.priceRange.min.toLocaleString()} - ${client.preferences.priceRange.max.toLocaleString()}</span>
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getUrgencyColor(client.preferences.urgency).replace('text-', 'bg-').replace('-400', '-900/30')} ${getUrgencyColor(client.preferences.urgency)}`}>
              {client.preferences.urgency.toUpperCase()}
            </span>
          </div>
        </div>
        
        {/* Preferred Areas */}
        {client.preferences.preferredAreas.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {client.preferences.preferredAreas.slice(0, 3).map((area, index) => (
              <span key={index} className="px-2 py-1 bg-blue-900/30 text-blue-300 rounded-full text-xs">
                📍 {area}
              </span>
            ))}
            {client.preferences.preferredAreas.length > 3 && (
              <span className="px-2 py-1 bg-gray-700 text-gray-400 rounded-full text-xs">
                +{client.preferences.preferredAreas.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tags */}
      {client.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {client.tags.slice(0, 4).map((tag, index) => (
            <span key={index} className="px-2 py-1 bg-purple-900/30 text-purple-300 rounded-full text-xs">
              {tag}
            </span>
          ))}
          {client.tags.length > 4 && (
            <span className="px-2 py-1 bg-gray-700 text-gray-400 rounded-full text-xs">
              +{client.tags.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Activity Summary */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4 text-gray-400">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 flex items-center justify-center">
              <i className="ri-chat-3-line"></i>
            </div>
            <span>{client.totalInteractions} interaction{client.totalInteractions !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 flex items-center justify-center">
              <i className="ri-mic-line"></i>
            </div>
            <span>{client.linkedRecordings.length} recording{client.linkedRecordings.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">
            {formatDate(client.lastInteraction || client.createdAt)}
          </span>
          <div className="w-4 h-4 flex items-center justify-center">
            <i className="ri-arrow-right-s-line text-gray-500"></i>
          </div>
        </div>
      </div>
    </div>
  );
}