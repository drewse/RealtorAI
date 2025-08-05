'use client';

import { useState } from 'react';
import { regenerateFollowUps, getRecordingsNeedingRegeneration, formatRegenerationResults, RegenerationResult } from '@/lib/regenerateFollowUps';
import { useAuth } from '@/hooks/useAuth';

interface RegenerationUtilityProps {
  recordings: any[];
  onRegenerationComplete?: () => void;
}

export default function RegenerationUtility({ recordings, onRegenerationComplete }: RegenerationUtilityProps) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [results, setResults] = useState<RegenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const recordingsNeedingRegeneration = getRecordingsNeedingRegeneration(recordings);
  const hasRecordingsToRegenerate = recordingsNeedingRegeneration.length > 0;

  const handleRegenerateAll = async () => {
    if (!user?.uid) {
      setError('User not authenticated');
      return;
    }

    setIsRegenerating(true);
    setError(null);
    setResults(null);

    try {
      console.log('🔄 Starting regeneration for all recordings...');
      
      const result = await regenerateFollowUps({
        userId: user.uid
      });

      setResults(result);
      console.log('✅ Regeneration completed:', result);
      
      // Call the callback to refresh data
      if (onRegenerationComplete) {
        onRegenerationComplete();
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('❌ Regeneration failed:', err);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleRegenerateSelected = async () => {
    if (!user?.uid) {
      setError('User not authenticated');
      return;
    }

    const recordingIds = recordingsNeedingRegeneration.map(r => r.id);
    
    setIsRegenerating(true);
    setError(null);
    setResults(null);

    try {
      console.log('🔄 Starting regeneration for selected recordings...');
      
      const result = await regenerateFollowUps({
        userId: user.uid,
        recordingIds
      });

      setResults(result);
      console.log('✅ Regeneration completed:', result);
      
      // Call the callback to refresh data
      if (onRegenerationComplete) {
        onRegenerationComplete();
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('❌ Regeneration failed:', err);
    } finally {
      setIsRegenerating(false);
    }
  };

  if (!hasRecordingsToRegenerate) {
    return (
      <div className="bg-green-900/20 border border-green-700 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 flex items-center justify-center">
            <i className="ri-check-line text-green-500"></i>
          </div>
          <span className="text-green-300 font-medium">All recordings have valid follow-ups</span>
        </div>
        <p className="text-green-200 text-sm mt-1">
          No recordings need follow-up regeneration.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-orange-900/20 border border-orange-700 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 flex items-center justify-center">
            <i className="ri-refresh-line text-orange-500"></i>
          </div>
          <h3 className="text-orange-300 font-medium">Follow-up Regeneration</h3>
        </div>
        <span className="text-orange-200 text-sm">
          {recordingsNeedingRegeneration.length} recording(s) need regeneration
        </span>
      </div>

      <p className="text-orange-200 text-sm mb-4">
        Some recordings are missing AI follow-up data or contain legacy API key errors. 
        Click below to regenerate them using the secure backend.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={handleRegenerateSelected}
          disabled={isRegenerating}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-800 text-white rounded-lg transition-colors cursor-pointer whitespace-nowrap flex items-center space-x-2"
        >
          {isRegenerating ? (
            <>
              <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              <span>Regenerating...</span>
            </>
          ) : (
            <>
              <div className="w-4 h-4 flex items-center justify-center">
                <i className="ri-refresh-line"></i>
              </div>
              <span>Regenerate Selected ({recordingsNeedingRegeneration.length})</span>
            </>
          )}
        </button>

        <button
          onClick={handleRegenerateAll}
          disabled={isRegenerating}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors cursor-pointer whitespace-nowrap flex items-center space-x-2"
        >
          {isRegenerating ? (
            <>
              <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              <span>Regenerating All...</span>
            </>
          ) : (
            <>
              <div className="w-4 h-4 flex items-center justify-center">
                <i className="ri-refresh-line"></i>
              </div>
              <span>Regenerate All ({recordings.length})</span>
            </>
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-error-warning-line text-red-500"></i>
            </div>
            <span className="text-red-300 font-medium">Regeneration Failed</span>
          </div>
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}

      {/* Results Display */}
      {results && (
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-check-line text-blue-500"></i>
            </div>
            <span className="text-blue-300 font-medium">Regeneration Complete</span>
          </div>
          
          <div className="text-blue-200 text-sm space-y-1">
            <div>Total: {results.total}</div>
            <div>✅ Succeeded: {results.succeeded}</div>
            <div>❌ Failed: {results.failed}</div>
            <div>⏭️ Skipped: {results.skipped}</div>
          </div>

          {results.details.length > 0 && (
            <details className="mt-3">
              <summary className="text-blue-300 text-sm cursor-pointer hover:text-blue-200">
                View Details ({results.details.length})
              </summary>
              <div className="mt-2 space-y-1 text-xs">
                {results.details.map((detail, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <span className={detail.status === 'success' ? 'text-green-400' : 
                                   detail.status === 'failed' ? 'text-red-400' : 'text-yellow-400'}>
                      {detail.status === 'success' ? '✅' : 
                       detail.status === 'failed' ? '❌' : '⏭️'}
                    </span>
                    <span className="text-blue-200">{detail.clientName}</span>
                    {detail.status === 'success' && (
                      <span className="text-blue-300">
                        (Urgency: {detail.urgencyLevel}, Topics: {detail.keyTopics}, Actions: {detail.recommendedActions})
                      </span>
                    )}
                    {detail.status === 'failed' && (
                      <span className="text-red-300">Error: {detail.error}</span>
                    )}
                    {detail.status === 'skipped' && detail.reason && (
                      <span className="text-yellow-300">Reason: {detail.reason}</span>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Recordings List */}
      <details className="mt-4">
        <summary className="text-orange-300 text-sm cursor-pointer hover:text-orange-200">
          Show Recordings Needing Regeneration ({recordingsNeedingRegeneration.length})
        </summary>
        <div className="mt-2 space-y-2">
          {recordingsNeedingRegeneration.map((recording) => (
            <div key={recording.id} className="bg-gray-800 rounded-lg p-3 text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-white font-medium">{recording.clientName}</span>
                <span className="text-gray-400 text-xs">{recording.id}</span>
              </div>
              <div className="text-gray-400 text-xs">
                {recording.propertyAddress && <div>📍 {recording.propertyAddress}</div>}
                <div>📅 {recording.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown date'}</div>
                {!recording.aiFollowUpFinal && <div className="text-orange-400">⚠️ Missing AI follow-up data</div>}
                {(recording.summary?.includes('API key required') || 
                  recording.smsText?.includes('API key required') || 
                  recording.emailText?.includes('API key required')) && (
                  <div className="text-red-400">❌ Contains legacy API key errors</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
} 