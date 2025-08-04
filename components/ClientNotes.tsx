'use client';

import { useState } from 'react';

interface Client {
  id: string;
  name: string;
  notes?: ClientNote[];
}

interface ClientNote {
  id: string;
  content: string;
  type: 'insight' | 'action-item' | 'objection' | 'general';
  createdAt: any;
  createdBy: string;
}

interface ClientNotesProps {
  client: Client;
  onAddNote: (clientId: string, note: Omit<ClientNote, 'id'>) => void;
}

const NOTE_TYPES = [
  { 
    value: 'general', 
    label: 'General Note', 
    icon: 'ri-sticky-note-line', 
    color: 'bg-gray-600 hover:bg-gray-700',
    tagColor: 'bg-gray-700 text-gray-300'
  },
  { 
    value: 'insight', 
    label: 'Client Insight', 
    icon: 'ri-lightbulb-line', 
    color: 'bg-yellow-600 hover:bg-yellow-700',
    tagColor: 'bg-yellow-900/30 text-yellow-300'
  },
  { 
    value: 'action-item', 
    label: 'Action Item', 
    icon: 'ri-task-line', 
    color: 'bg-green-600 hover:bg-green-700',
    tagColor: 'bg-green-900/30 text-green-300'
  },
  { 
    value: 'objection', 
    label: 'Objection/Concern', 
    icon: 'ri-alert-line', 
    color: 'bg-red-600 hover:bg-red-700',
    tagColor: 'bg-red-900/30 text-red-300'
  }
] as const;

export default function ClientNotes({ client, onAddNote }: ClientNotesProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteType, setNoteType] = useState<'insight' | 'action-item' | 'objection' | 'general'>('general');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAddNote(client.id, {
        content: noteContent.trim(),
        type: noteType,
        createdAt: new Date(),
        createdBy: 'current-user' // This should be the actual user ID
      });

      setNoteContent('');
      setNoteType('general');
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding note:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getNoteTypeConfig = (type: string) => {
    return NOTE_TYPES.find(t => t.value === type) || NOTE_TYPES[0];
  };

  const sortedNotes = (client.notes || []).sort((a, b) => {
    const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt);
    const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt);
    return bTime - aTime;
  });

  return (
    <div className="space-y-6">
      {/* Add Note Button */}
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-white">Notes ({client.notes?.length || 0})</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer whitespace-nowrap"
        >
          <div className="w-4 h-4 flex items-center justify-center">
            <i className={`ri-${showAddForm ? 'close' : 'add'}-line`}></i>
          </div>
          <span className="text-sm">{showAddForm ? 'Cancel' : 'Add Note'}</span>
        </button>
      </div>

      {/* Add Note Form */}
      {showAddForm && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Note Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {NOTE_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setNoteType(type.value as any)}
                    className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                      noteType === type.value
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-gray-900 text-gray-300 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 flex items-center justify-center">
                        <i className={type.icon}></i>
                      </div>
                      <span className="text-sm font-medium">{type.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Note Content
              </label>
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                placeholder="Enter your note..."
                rows={4}
                required
                maxLength={1000}
              />
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-500">
                  Add insights, action items, objections, or general observations
                </span>
                <span className="text-xs text-gray-500">
                  {noteContent.length}/1000
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="submit"
                disabled={!noteContent.trim() || isSubmitting}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:opacity-50 text-white rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    <span className="text-sm">Saving...</span>
                  </>
                ) : (
                  <>
                    <div className="w-4 h-4 flex items-center justify-center">
                      <i className="ri-save-line"></i>
                    </div>
                    <span className="text-sm">Save Note</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNoteContent('');
                  setNoteType('general');
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Notes List */}
      {sortedNotes.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <i className="ri-sticky-note-line text-4xl text-gray-600"></i>
          </div>
          <h4 className="text-lg font-medium text-gray-400 mb-2">No notes yet</h4>
          <p className="text-gray-500">Add your first note to track client insights and interactions</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedNotes.map((note) => {
            const typeConfig = getNoteTypeConfig(note.type);
            return (
              <div key={note.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className={`w-8 h-8 ${typeConfig.color.split(' ')[0]} rounded-full flex items-center justify-center`}>
                      <div className="w-4 h-4 flex items-center justify-center">
                        <i className={`${typeConfig.icon} text-white`}></i>
                      </div>
                    </div>
                    <div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeConfig.tagColor}`}>
                        {typeConfig.label}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatDate(note.createdAt)}
                  </span>
                </div>

                <p className="text-gray-300 text-sm leading-relaxed">
                  {note.content}
                </p>

                {note.type === 'action-item' && (
                  <div className="mt-3 flex items-center space-x-2 text-xs text-green-400">
                    <div className="w-3 h-3 flex items-center justify-center">
                      <i className="ri-alarm-line"></i>
                    </div>
                    <span>Action required</span>
                  </div>
                )}

                {note.type === 'objection' && (
                  <div className="mt-3 flex items-center space-x-2 text-xs text-red-400">
                    <div className="w-3 h-3 flex items-center justify-center">
                      <i className="ri-alert-line"></i>
                    </div>
                    <span>Address this concern</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}