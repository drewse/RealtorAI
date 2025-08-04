'use client';

interface Client {
  id: string;
  name: string;
  createdAt: any;
  notes?: ClientNote[];
}

interface ClientNote {
  id: string;
  content: string;
  type: 'insight' | 'action-item' | 'objection' | 'general';
  createdAt: any;
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

interface ClientTimelineProps {
  client: Client;
  recordings: Recording[];
  loading: boolean;
}

interface TimelineEvent {
  id: string;
  type: 'recording' | 'note' | 'status-change' | 'created';
  timestamp: any;
  data: any;
}

export default function ClientTimeline({ client, recordings, loading }: ClientTimelineProps) {
  // Combine and sort all timeline events
  const getTimelineEvents = (): TimelineEvent[] => {
    const events: TimelineEvent[] = [];

    // Add client creation event
    events.push({
      id: 'created',
      type: 'created',
      timestamp: client.createdAt,
      data: { clientName: client.name }
    });

    // Add recording events
    recordings.forEach(recording => {
      events.push({
        id: recording.id,
        type: 'recording',
        timestamp: recording.createdAt,
        data: recording
      });
    });

    // Add note events
    client.notes?.forEach(note => {
      events.push({
        id: note.id,
        type: 'note',
        timestamp: note.createdAt,
        data: note
      });
    });

    // Sort by timestamp (newest first)
    return events.sort((a, b) => {
      const aTime = a.timestamp?.toDate?.() || new Date(a.timestamp);
      const bTime = b.timestamp?.toDate?.() || new Date(b.timestamp);
      return bTime - aTime;
    });
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

  const getEventIcon = (type: string, data?: any) => {
    switch (type) {
      case 'recording':
        return {
          icon: 'ri-mic-line',
          color: 'bg-blue-500',
          bgColor: 'bg-blue-900/30',
          borderColor: 'border-blue-700'
        };
      case 'note':
        const noteType = data?.type;
        return {
          icon: noteType === 'action-item' ? 'ri-task-line' : 
                noteType === 'objection' ? 'ri-alert-line' :
                noteType === 'insight' ? 'ri-lightbulb-line' : 'ri-sticky-note-line',
          color: noteType === 'action-item' ? 'bg-green-500' :
                 noteType === 'objection' ? 'bg-red-500' :
                 noteType === 'insight' ? 'bg-yellow-500' : 'bg-gray-500',
          bgColor: noteType === 'action-item' ? 'bg-green-900/30' :
                   noteType === 'objection' ? 'bg-red-900/30' :
                   noteType === 'insight' ? 'bg-yellow-900/30' : 'bg-gray-900/30',
          borderColor: noteType === 'action-item' ? 'border-green-700' :
                       noteType === 'objection' ? 'border-red-700' :
                       noteType === 'insight' ? 'border-yellow-700' : 'border-gray-700'
        };
      case 'created':
        return {
          icon: 'ri-user-add-line',
          color: 'bg-purple-500',
          bgColor: 'bg-purple-900/30',
          borderColor: 'border-purple-700'
        };
      default:
        return {
          icon: 'ri-time-line',
          color: 'bg-gray-500',
          bgColor: 'bg-gray-900/30',
          borderColor: 'border-gray-700'
        };
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

  const timelineEvents = getTimelineEvents();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-400 text-sm">Loading timeline...</p>
      </div>
    );
  }

  if (timelineEvents.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <i className="ri-timeline-view text-4xl text-gray-600"></i>
        </div>
        <h3 className="text-lg font-medium text-gray-400 mb-2">No timeline events</h3>
        <p className="text-gray-500">Client activity will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {timelineEvents.map((event, index) => {
        const eventStyle = getEventIcon(event.type, event.data);
        const isLast = index === timelineEvents.length - 1;

        return (
          <div key={event.id} className="relative">
            {/* Timeline connector line */}
            {!isLast && (
              <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-700"></div>
            )}

            <div className={`bg-gray-800 rounded-lg p-4 border ${eventStyle.borderColor} ${eventStyle.bgColor}`}>
              <div className="flex items-start space-x-3">
                {/* Event icon */}
                <div className={`w-6 h-6 ${eventStyle.color} rounded-full flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <div className="w-4 h-4 flex items-center justify-center">
                    <i className={`${eventStyle.icon} text-white text-sm`}></i>
                  </div>
                </div>

                {/* Event content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-white text-sm">
                      {event.type === 'recording' && `Recording Session`}
                      {event.type === 'note' && `${event.data.type.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} Note`}
                      {event.type === 'created' && 'Client Created'}
                    </h4>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {formatDate(event.timestamp)}
                    </span>
                  </div>

                  {/* Recording details */}
                  {event.type === 'recording' && (
                    <div className="space-y-2">
                      {event.data.propertyAddress && (
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 flex items-center justify-center">
                            <i className="ri-home-line text-blue-400"></i>
                          </div>
                          <span className="text-gray-300 text-sm">{event.data.propertyAddress}</span>
                        </div>
                      )}
                      
                      {event.data.overallSentiment && (
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 flex items-center justify-center">
                            <i className={getSentimentIcon(event.data.overallSentiment)}></i>
                          </div>
                          <span className="text-gray-300 text-sm capitalize">
                            {event.data.overallSentiment} sentiment
                          </span>
                        </div>
                      )}

                      {event.data.tags && event.data.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {event.data.tags.slice(0, 3).map((tag: string, index: number) => (
                            <span key={index} className="px-2 py-1 bg-blue-900/30 text-blue-300 rounded-full text-xs">
                              {tag}
                            </span>
                          ))}
                          {event.data.tags.length > 3 && (
                            <span className="px-2 py-1 bg-gray-700 text-gray-400 rounded-full text-xs">
                              +{event.data.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {event.data.transcript && (
                        <div className="mt-2 p-2 bg-gray-900/50 rounded text-xs text-gray-300 max-h-16 overflow-y-auto">
                          {event.data.transcript.length > 150 
                            ? `${event.data.transcript.substring(0, 150)}...` 
                            : event.data.transcript
                          }
                        </div>
                      )}
                    </div>
                  )}

                  {/* Note details */}
                  {event.type === 'note' && (
                    <div className="space-y-2">
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {event.data.content}
                      </p>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          event.data.type === 'action-item' ? 'bg-green-900/30 text-green-300' :
                          event.data.type === 'objection' ? 'bg-red-900/30 text-red-300' :
                          event.data.type === 'insight' ? 'bg-yellow-900/30 text-yellow-300' :
                          'bg-gray-700 text-gray-300'
                        }`}>
                          {event.data.type.replace('-', ' ')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Client created details */}
                  {event.type === 'created' && (
                    <p className="text-gray-300 text-sm">
                      Client profile was created in the system
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}