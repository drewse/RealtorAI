// 🔄 Follow-up Regeneration Utility
// This utility helps regenerate AI follow-ups for recordings that are missing data or have legacy API key errors

export interface RegenerationResult {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  details: Array<{
    recordingId: string;
    clientName: string;
    status: 'success' | 'failed' | 'skipped';
    reason?: string;
    error?: string;
    urgencyLevel?: string;
    keyTopics?: number;
    recommendedActions?: number;
  }>;
}

export interface RegenerationOptions {
  recordingIds?: string[]; // Specific recordings to regenerate, or all if not provided
  userId: string;
}

/**
 * Regenerate AI follow-ups for recordings that need it
 * @param options - Configuration for regeneration
 * @returns Promise with detailed results
 */
export const regenerateFollowUps = async (options: RegenerationOptions): Promise<RegenerationResult> => {
  const { userId, recordingIds } = options;

  console.log('🔄 Starting follow-up regeneration...');
  console.log('👤 User ID:', userId);
  console.log('📝 Recording IDs:', recordingIds || 'All recordings');

  try {
    // Determine Cloud Function URL based on environment
    const isDevelopment = process.env.NEXT_PUBLIC_IS_DEV === 'true';
    const functionUrl = isDevelopment
      ? 'http://127.0.0.1:5001/showai-23713/us-central1/regenerateFollowUps'
      : 'https://regeneratefollowups-x5dsxztz7q-uc.a.run.app';

    console.log('🔗 Using function URL:', functionUrl);

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        recordingIds
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('❌ Regeneration request failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new Error(errorData?.message || `Regeneration request failed: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      throw new Error('Invalid response format from regeneration function');
    }

    console.log('✅ Follow-up regeneration completed successfully');
    console.log('📊 Results:', result.data);

    return result.data;

  } catch (error) {
    console.error('❌ Error during follow-up regeneration:', error);
    throw error;
  }
};

/**
 * Check if a recording needs follow-up regeneration
 * @param recording - Recording document from Firestore
 * @returns boolean indicating if regeneration is needed
 */
export const needsFollowUpRegeneration = (recording: any): boolean => {
  return (
    !recording.aiFollowUpFinal ||
    (recording.summary && recording.summary.includes('API key required')) ||
    (recording.smsText && recording.smsText.includes('API key required')) ||
    (recording.emailText && recording.emailText.includes('API key required'))
  );
};

/**
 * Get recordings that need regeneration from a list
 * @param recordings - Array of recording documents
 * @returns Array of recordings that need regeneration
 */
export const getRecordingsNeedingRegeneration = (recordings: any[]): any[] => {
  return recordings.filter(recording => needsFollowUpRegeneration(recording));
};

/**
 * Format regeneration results for display
 * @param results - Regeneration results
 * @returns Formatted string for display
 */
export const formatRegenerationResults = (results: RegenerationResult): string => {
  const { total, processed, succeeded, failed, skipped } = results;
  
  let summary = `📊 Regeneration Complete\n\n`;
  summary += `Total recordings: ${total}\n`;
  summary += `Processed: ${processed}\n`;
  summary += `✅ Succeeded: ${succeeded}\n`;
  summary += `❌ Failed: ${failed}\n`;
  summary += `⏭️ Skipped: ${skipped}\n\n`;

  if (results.details.length > 0) {
    summary += `📝 Details:\n`;
    results.details.forEach(detail => {
      const status = detail.status === 'success' ? '✅' : 
                    detail.status === 'failed' ? '❌' : '⏭️';
      summary += `${status} ${detail.clientName} (${detail.recordingId})\n`;
      
      if (detail.status === 'success') {
        summary += `   Urgency: ${detail.urgencyLevel}, Topics: ${detail.keyTopics}, Actions: ${detail.recommendedActions}\n`;
      } else if (detail.status === 'failed') {
        summary += `   Error: ${detail.error}\n`;
      } else if (detail.reason) {
        summary += `   Reason: ${detail.reason}\n`;
      }
    });
  }

  return summary;
}; 