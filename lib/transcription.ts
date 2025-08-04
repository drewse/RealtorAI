
// ============================================================================= 
// AUDIO TRANSCRIPTION SERVICE - AssemblyAI Implementation 
// ============================================================================= 
// This module handles audio-to-text conversion using AssemblyAI API 
// Uses fetch-based implementation with polling for completion status 

import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'; 
import { db } from './firebase'; 

// TypeScript interfaces for AssemblyAI API responses 
interface TranscriptSubmissionResponse { 
  id: string; 
  status: 'queued' | 'processing' | 'completed' | 'error'; 
  audio_url?: string; 
  text?: string; 
  error?: string; 
} 

interface TranscriptStatusResponse { 
  id: string; 
  status: 'queued' | 'processing' | 'completed' | 'error'; 
  text?: string; 
  error?: string; 
  confidence?: number; 
  audio_duration?: number; 
} 

/** 
 * Main transcription function - converts audio URL to text using AssemblyAI 
 * 
 * ASSEMBLYAI INTEGRATION: 
 * - Submits audio URL to AssemblyAI transcript endpoint 
 * - Polls for completion status every 3 seconds 
 * - Updates Firestore document with results 
 * 
 * @param audioURL - Firebase Storage download URL for audio file 
 * @param recordingId - Firestore document ID to update with transcript 
 * @returns Promise<string | null> - Transcript text or null on error 
 */ 
export const transcribeAudio = async (audioURL: string, recordingId?: string): Promise<string | null> => { 
  console.log('🎙️ TRANSCRIPTION: Starting AssemblyAI transcription for audio URL:', audioURL); 

  // Get API key from environment variables 
  const apiKey = process.env.NEXT_PUBLIC_ASSEMBLYAI_API_KEY; 
  if (!apiKey) { 
    console.error('🚨 TRANSCRIPTION ERROR: AssemblyAI API key not found in environment variables'); 
    return null; 
  } 

  try { 
    // Step 1: Submit audio URL to AssemblyAI for transcription 
    const submitResponse = await fetch('https://api.assemblyai.com/v2/transcript', { 
      method: 'POST', 
      headers: { 
        'Authorization': `Bearer ${apiKey}`, 
        'Content-Type': 'application/json' 
      }, 
      body: JSON.stringify({ 
        audio_url: audioURL, 
        language_code: 'en_us', 
        punctuate: true, 
        format_text: true, 
        speaker_labels: true, // Enable speaker detection for client meetings 
        auto_chapters: false, 
        summarization: false 
      }) 
    }); 

    if (!submitResponse.ok) { 
      throw new Error(`AssemblyAI submission failed: ${submitResponse.status} ${submitResponse.statusText}`); 
    } 

    const submitData: TranscriptSubmissionResponse = await submitResponse.json(); 
    console.log('📤 TRANSCRIPTION: Submitted to AssemblyAI, transcript ID:', submitData.id); 

    // Step 2: Poll for transcription completion 
    const transcriptId = submitData.id; 
    const maxPollingAttempts = 100; // Maximum 5 minutes of polling (100 * 3 seconds) 
    let pollingAttempt = 0; 

    while (pollingAttempt < maxPollingAttempts) { 
      // Wait 3 seconds before each poll 
      await new Promise(resolve => setTimeout(resolve, 3000)); 
      pollingAttempt++; 

      console.log(`🔄 TRANSCRIPTION: Polling attempt ${pollingAttempt}/${maxPollingAttempts} for transcript ${transcriptId}`); 

      // Check transcription status 
      const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, { 
        method: 'GET', 
        headers: { 
          'Authorization': `Bearer ${apiKey}` 
        } 
      }); 

      if (!statusResponse.ok) { 
        throw new Error(`AssemblyAI status check failed: ${statusResponse.status} ${statusResponse.statusText}`); 
      } 

      const statusData: TranscriptStatusResponse = await statusResponse.json(); 
      console.log('📊 TRANSCRIPTION STATUS:', statusData.status); 

      // Handle completion states 
      if (statusData.status === 'completed') { 
        console.log('✅ TRANSCRIPTION: Completed successfully'); 
        const transcript = statusData.text || ''; 

        // Update Firestore document with successful transcription 
        if (recordingId && transcript) { 
          await updateFirestoreTranscript(recordingId, transcript, 'transcribed'); 
          console.log('💾 FIRESTORE: Updated recording document with transcript'); 
        } 

        return transcript; 
      } 
      else if (statusData.status === 'error') { 
        console.error('🚨 TRANSCRIPTION ERROR:', statusData.error); 

        // Update Firestore document with error status 
        if (recordingId) { 
          await updateFirestoreTranscript(recordingId, null, 'transcription-failed'); 
        } 

        return null; 
      } 

      // Status is still 'queued' or 'processing', continue polling 
    } 

    // Polling timeout reached 
    console.error('⏰ TRANSCRIPTION ERROR: Polling timeout reached after', maxPollingAttempts * 3, 'seconds'); 

    if (recordingId) { 
      await updateFirestoreTranscript(recordingId, null, 'transcription-failed'); 
    } 

    return null; 

  } catch (error) { 
    console.error('🚨 TRANSCRIPTION ERROR:', error); 

    // Update Firestore document with error status 
    if (recordingId) { 
      try { 
        await updateFirestoreTranscript(recordingId, null, 'transcription-failed'); 
      } catch (firestoreError) { 
        console.error('🚨 FIRESTORE UPDATE ERROR:', firestoreError); 
      } 
    } 

    return null; 
  } 
}; 

/** 
 * Update Firestore recording document with transcription results 
 * 
 * FIRESTORE INTEGRATION: 
 * - Updates transcript field with text content 
 * - Updates status field with completion state 
 * - Adds transcription timestamp 
 * 
 * @param recordingId - Firestore document ID 
 * @param transcript - Transcribed text content or null 
 * @param status - New status: 'transcribed' or 'transcription-failed' 
 */ 
const updateFirestoreTranscript = async ( 
  recordingId: string, 
  transcript: string | null, 
  status: 'transcribed' | 'transcription-failed' 
): Promise<void> => { 
  try { 
    const recordingRef = doc(db, 'recordings', recordingId); 

    const updateData: any = { 
      status: status, 
      transcribedAt: serverTimestamp(), 
      updatedAt: serverTimestamp() 
    }; 

    // Only add transcript field if transcription was successful 
    if (transcript) { 
      updateData.transcript = transcript; 
    } 

    await updateDoc(recordingRef, updateData); 
    console.log(`💾 FIRESTORE: Updated recording ${recordingId} with status: ${status}`); 

  } catch (error) { 
    console.error('🚨 FIRESTORE UPDATE ERROR:', error); 
    throw error; 
  } 
}; 

/** 
 * Mock transcription function for development/testing 
 * Returns realistic real estate conversation samples 
 */ 
export const mockTranscription = (): string => { 
  const mockTranscripts = [ 
    "Hi, welcome to this beautiful home! I love the open floor plan and the natural light coming through these large windows. However, I'm a bit concerned about the kitchen size - we do a lot of cooking and entertaining. The master bedroom is gorgeous though, and I really appreciate the walk-in closet space. What's the timeline on the seller? Are they flexible on price?", 

    "This property has great potential, but I'm wondering about the neighborhood schools and commute times to downtown. The backyard is exactly what we're looking for - perfect for our kids to play. The price point seems reasonable, but we'd want to negotiate on some of the needed repairs we noticed. Can you tell me about the roof and HVAC system age?", 

    "The location is fantastic and we love being close to the shopping center. The house has good bones but might need some updating in the bathrooms. We're definitely interested but would like to see a few more properties before making a decision. Can you tell me more about the HOA fees? Also, what's included in the monthly dues?", 

    "I really like the layout but I'm concerned about the noise from the main road. During rush hour, how bad does it get? The kitchen renovation is beautiful - when was that done? We're pre-approved for up to the asking price, but we'd want a home inspection contingency. What's the seller's preferred closing timeline?", 

    "This is close to what we're looking for. The square footage works for our family, and we love the garage space. But honestly, the carpet throughout needs to go - we'd want to put in hardwood floors. Is the seller open to any credits for flooring? Also, I noticed some cracks in the driveway. Has there been any foundation work done recently?" 
  ]; 

  return mockTranscripts[Math.floor(Math.random() * mockTranscripts.length)]; 
}; 

/** 
 * Format transcript for display preview 
 * Returns first 2 lines or specified line count 
 */ 
export const getTranscriptPreview = (transcript: string, lines: number = 2): string => { 
  if (!transcript) return ''; 

  const sentences = transcript.split('. '); 
  const previewSentences = sentences.slice(0, lines); 
  const preview = previewSentences.join('. '); 

  return preview + (sentences.length > lines ? '...' : ''); 
}; 

/** 
 * Validate audio file format for transcription 
 * Returns true if file is supported, false otherwise 
 */ 
export const validateAudioFormat = (fileName: string): boolean => { 
  const supportedFormats = ['.wav', '.mp3', '.m4a', '.flac', '.ogg']; 
  const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.')); 
  return supportedFormats.includes(fileExtension); 
}; 

export default { 
  transcribeAudio, 
  mockTranscription, 
  getTranscriptPreview, 
  validateAudioFormat 
}; 
