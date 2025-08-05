
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc, Timestamp, serverTimestamp } from 'firebase/firestore';
import AuthGuard from '@/components/AuthGuard';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';
import RecordingClientForm from '@/components/RecordingClientForm';
import RecordingControls from '@/components/RecordingControls';
import TranscriptDisplay from '@/components/TranscriptDisplay';
import FollowUpDisplay from '@/components/FollowUpDisplay';
import { transcribeAudio, mockTranscription } from '@/lib/transcription';
import { generateFollowUp } from '@/lib/openai';
// Removed getStoredAPIKey import - no longer needed with Cloud Functions
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { v4 as uuidv4 } from 'uuid';

interface Recording {
  id: string;
  uid: string;
  audioPath: string;
  clientName: string;
  tags: string[];
  propertyId?: string;
  propertyAddress?: string;
  transcript?: string;
  summary?: string;
  smsText?: string;
  emailText?: string;
  status: 'uploaded' | 'transcribed' | 'follow-up-ready';
  createdAt: Timestamp;
  clientEmail?: string;
  clientPhone?: string;
}

interface Session {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  tags: string[];
  propertyAddress: string;
  propertyId: string;
  transcript: string;
  followUp?: any;
  recordingDuration: number;
}

type FollowUpData = {
  preferences: string;
  objections: string;
  sms: string;
  email: string;
  urgencyLevel?: 'low' | 'medium' | 'high';
  keyTopics?: string[];
  recommendedActions?: string[];
  tone?: 'friendly' | 'professional' | 'direct' | 'action-oriented';
};

export default function Home() {
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [transcript, setTranscript] = useState('');
  const [followUp, setFollowUp] = useState<FollowUpData | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [generatingFollowUp, setGeneratingFollowUp] = useState(false);
  const [step, setStep] = useState<'form' | 'recording' | 'results'>('form');
  const [showNewRecording, setShowNewRecording] = useState(false);
  const [recordingsLoading, setRecordingsLoading] = useState(true);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [defaultViewLoaded, setDefaultViewLoaded] = useState(false);

  const { user } = useAuth();

  // Initialize default view on app load
  useEffect(() => {
    if (!defaultViewLoaded && user && recordings.length > 0) {
      // Default to showing recording history (main functionality)
      setShowNewRecording(false);
      setDefaultViewLoaded(true);
    } else if (!defaultViewLoaded && user && recordings.length === 0) {
      // If no recordings, show the new recording form as default
      setDefaultViewLoaded(true);
    }
  }, [user, recordings, defaultViewLoaded]);

  useEffect(() => {
    console.log('=== RECORDINGS QUERY DEBUG ===');
    console.log('User state:', { user, uid: user?.uid, isAuthenticated: !!user });

    if (!user || !user.uid) {
      console.log('User not authenticated yet, skipping recordings query');
      setRecordings([]);
      setRecordingsLoading(true);
      return;
    }

    console.log('Starting recordings query for user:', user.uid);

    const q = query(
      collection(db, 'recordings'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log(`Found ${snapshot.docs.length} recordings for user:`, user.uid);
      const recordingsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Recording[];

      setRecordings(recordingsData);
      setRecordingsLoading(false);
    }, (error) => {
      console.error('❌ RECORDINGS QUERY ERROR:', error);
      setRecordingsLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const handleClientSubmit = (data: {
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    tags: string[];
    propertyAddress: string;
    propertyId: string;
    selectedClientId?: string;
  }) => {
    console.log('=== CLIENT FORM SUBMITTED ===');
    console.log('🏠 LINK TO PROPERTY ID:', {
      propertyId: data.propertyId,
      propertyAddress: data.propertyAddress
    });

    setCurrentSession({
      ...data,
      transcript: '',
      recordingDuration: 0,
    });
    setStep('recording');
  };

  const handleRecordingComplete = async (audioBlob: Blob, duration: number) => {
    if (!currentSession) {
      console.error('❌ NO CURRENT SESSION: Cannot save recording without session data');
      return;
    }

    if (!user?.uid) {
      console.error('❌ NO USER UID: Cannot save recording without authenticated user');
      return;
    }

    console.log('=== RECORDING PROCESSING START ===');
    console.log('Current session data:', currentSession);
    console.log('User UID:', user.uid);

    setTranscribing(true);
    setStep('results');

    try {
      console.log('📤 UPLOAD: Starting audio upload to Firebase Storage...');

      const audioFileName = `recording-${Date.now()}-${uuidv4()}.wav`;
      const audioFile = new File([audioBlob], audioFileName, {
        type: 'audio/wav',
      });

      const storageRef = ref(storage, `recordings/${user.uid}/${audioFileName}`);

      const uploadWithRetry = async (retries = 3): Promise<string> => {
        for (let attempt = 1; attempt <= retries; attempt++) {
          try {
            console.log(`📤 Upload attempt ${attempt}/${retries}`);

            const uploadPromise = uploadBytes(storageRef, audioFile);
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Upload timeout after 30 seconds')), 30000)
            );

            await Promise.race([uploadPromise, timeoutPromise]);
            const audioUrl = await getDownloadURL(storageRef);

            console.log('✅ UPLOAD: Audio uploaded successfully:', audioUrl);
            return audioUrl;

          } catch (error) {
            console.error(`❌ Upload attempt ${attempt} failed:`, error);

            if (attempt === retries) {
              const isUsingEmulators = process.env.NODE_ENV === 'development' &&
                process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';

              if (isUsingEmulators) {
                throw new Error('Firebase Storage Emulator connection failed. Please start emulators with: firebase emulators:start');
              } else {
                throw new Error('Firebase Storage upload failed. Please check your internet connection and try again.');
              }
            }

            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
        throw new Error('Upload failed after all retries');
      };

      const audioUrl = await uploadWithRetry();

      const recordingData = {
        uid: user.uid,
        audioPath: audioUrl,
        clientName: currentSession.clientName,
        clientEmail: currentSession.clientEmail,
        clientPhone: currentSession.clientPhone,
        tags: currentSession.tags,
        propertyId: currentSession.propertyId,
        propertyAddress: currentSession.propertyAddress,
        status: 'uploaded' as const,
        createdAt: serverTimestamp(),
      };

      console.log('🔥 FIRESTORE: Saving recording document with data:', recordingData);

      const recordingRef = await addDoc(collection(db, 'recordings'), recordingData);
      console.log('✅ FIRESTORE: Recording document created with ID:', recordingRef.id, 'status: uploaded');

      console.log('🎯 TRANSCRIPTION: Starting audio transcription...');

      try {
        const transcriptResult = await transcribeAudio(audioUrl);
        console.log('✅ TRANSCRIPTION: Transcript generated successfully');

        setTranscript(transcriptResult ?? '');

        await updateDoc(recordingRef, {
          transcript: transcriptResult ?? '',
          status: 'transcribed',
          updatedAt: serverTimestamp(),
        });
        console.log('✅ FIRESTORE: Recording updated with transcript, status: transcribed');

        const updatedSession = {
          ...currentSession,
          transcript: transcriptResult ?? '',
          recordingDuration: duration,
        };
        setCurrentSession(updatedSession);

        console.log('🤖 AI: Starting AI follow-up generation via Cloud Function...');
        setGeneratingFollowUp(true);

        if (transcriptResult) {
          try {
            const followUpData = await generateFollowUp(transcriptResult, currentSession.clientName);
            setFollowUp(followUpData);

            await updateDoc(recordingRef, {
              summary: followUpData.preferences,
              smsText: followUpData.sms,
              emailText: followUpData.email,
              status: 'follow-up-ready',
              updatedAt: serverTimestamp(),
            });
            console.log('✅ AI: Follow-up content generated and saved, status: follow-up-ready');

          } catch (aiError) {
            console.error('❌ AI GENERATION ERROR:', aiError);

            const fallbackFollowUp: FollowUpData = {
              preferences: "Unable to generate preferences summary. Please try again later.",
              objections: "Unable to generate objections summary. Please try again later.",
              sms: `Hi ${currentSession.clientName}! Thanks for visiting the property today. Let me know if you have any questions!`,
              email: `Hi ${currentSession.clientName},\n\nThank you for taking the time to view the property today. I hope you found it interesting.\n\nPlease let me know if you have any questions or would like to schedule another viewing.\n\nBest regards,\n[Your Name]`,
              urgencyLevel: 'medium',
              keyTopics: ['Property viewing', 'Client discussion'],
              recommendedActions: ['Schedule follow-up call', 'Send property information'],
              tone: 'professional'
            };

            setFollowUp(fallbackFollowUp);

            let errorMessage = 'Unknown error';
            if (aiError instanceof Error) {
              errorMessage = aiError.message;
            }

            await updateDoc(recordingRef, {
              summary: "AI generation failed - please try again later",
              smsText: fallbackFollowUp.sms,
              emailText: fallbackFollowUp.email,
              status: 'follow-up-ready',
              errorMessage: errorMessage,
              updatedAt: serverTimestamp(),
            });
          }
        }

        setGeneratingFollowUp(false);

      } catch (transcriptionError) {
        console.error('❌ TRANSCRIPTION ERROR:', transcriptionError);

        let errorMessage = 'Transcription failed.';
if (transcriptionError instanceof Error) {
  errorMessage = 'Transcription failed: ' + transcriptionError.message;
}

        await updateDoc(recordingRef, {
  status: 'transcription-failed',
  errorMessage,
  updatedAt: serverTimestamp(),
});

        setTranscript('Transcription service is currently unavailable. Please try again later.');
        setGeneratingFollowUp(false);
      }

      setTranscribing(false);

    } catch (error) {
      console.error('❌ RECORDING PROCESSING ERROR:', error);

      let message = 'Recording upload failed. Please try again.';
  if (error instanceof Error) {
    if (error.message.includes('Emulator')) {
      message = 'Firebase Emulator connection failed. Please start the Firebase emulators and try again.';
    } else if (error.message.includes('timeout')) {
      message = 'Upload timeout. Please check your internet connection and try again.';
    }
  }

  alert(message);
  setTranscribing(false);
  setGeneratingFollowUp(false);
  setStep('recording');
}
  };

  const startNewRecording = () => {
    setShowNewRecording(true);
    setCurrentSession(null);
    setTranscript('');
    setFollowUp(null);
    setStep('form');
    setSelectedRecording(null);
  };

  const backToHistory = () => {
    setShowNewRecording(false);
    setCurrentSession(null);
    setTranscript('');
    setFollowUp(null);
    setStep('form');
    setSelectedRecording(null);
  };

  const formatDate = (timestamp: Timestamp) => {
    return timestamp.toDate().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTranscriptPreview = (transcript: string) => {
    if (!transcript) return 'No transcript available';

    const sentences = transcript.split('. ');
    const firstTwoSentences = sentences.slice(0, 2).join('. ');

    return firstTwoSentences + (sentences.length > 2 ? '...' : '');
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const StatusIndicator = ({ status }: { status: string }) => {
    const getStatusConfig = () => {
      switch (status) {
        case 'uploaded':
          return { color: 'text-yellow-400', icon: 'ri-upload-line', text: 'Uploaded' };
        case 'transcribed':
          return { color: 'text-blue-400', icon: 'ri-file-text-line', text: 'Transcribed' };
        case 'follow-up-ready':
          return { color: 'text-green-400', icon: 'ri-check-line', text: 'Follow-up Ready' };
        default:
          return { color: 'text-gray-400', icon: 'ri-time-line', text: 'Processing' };
      }
    };

    const config = getStatusConfig();

    return (
      <div className={`flex items-center space-x-1 ${config.color}`}>
        <div className="w-3 h-3 flex items-center justify-center">
          <i className={`${config.icon} text-xs`}></i>
        </div>
        <span className="text-xs">{config.text}</span>
      </div>
    );
  };

  if (selectedRecording) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-900 pb-20">
          <Header />

          <div className="max-w-md mx-auto px-4 py-6 space-y-6">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSelectedRecording(null)}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <div className="w-6 h-6 flex items-center justify-center">
                  <i className="ri-arrow-left-line text-xl"></i>
                </div>
              </button>
              <div>
                <h1 className="text-xl font-bold text-white">{selectedRecording.clientName}</h1>
                <p className="text-gray-400">{formatDate(selectedRecording.createdAt)}</p>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="space-y-3">
                {selectedRecording.propertyAddress && (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 flex items-center justify-center">
                      <i className="ri-home-line text-blue-500"></i>
                    </div>
                    <span className="text-gray-300 text-sm">{selectedRecording.propertyAddress}</span>
                  </div>
                )}

                {selectedRecording.tags && selectedRecording.tags.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 flex items-center justify-center">
                      <i className="ri-price-tag-line text-blue-500"></i>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedRecording.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-900/30 text-blue-300 rounded-full text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <StatusIndicator status={selectedRecording.status} />
                </div>
              </div>
            </div>

            {selectedRecording.transcript && (
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-file-text-line text-blue-500"></i>
                  </div>
                  <h3 className="font-medium text-white">Transcript</h3>
                </div>
                <div className="bg-gray-900 rounded-lg p-3 max-h-48 overflow-y-auto">
                  <p className="text-gray-300 text-sm leading-relaxed">{selectedRecording.transcript}</p>
                </div>
              </div>
            )}

            {(selectedRecording.smsText || selectedRecording.emailText) && (
              <div className="bg-gray-800 rounded-lg border border-gray-700">
                <div className="flex items-center space-x-2 p-4 border-b border-gray-700">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <i className="ri-robot-line text-blue-500"></i>
                  </div>
                  <h3 className="text-lg font-semibold text-white">AI Follow-up</h3>
                </div>

                <div className="p-4 space-y-4">
                  {selectedRecording.smsText && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 flex items-center justify-center">
                            <i className="ri-message-3-line text-green-500"></i>
                          </div>
                          <span className="font-medium text-white">SMS</span>
                        </div>
                        <button
                          onClick={() => copyToClipboard(selectedRecording.smsText!, 'sms')}
                          className="flex items-center space-x-1 px-3 py-1 bg-green-600 hover:bg-green-700 rounded-lg text-white text-sm transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <div className="w-3 h-3 flex items-center justify-center">
                            <i className={`ri-${copiedField === 'sms' ? 'check' : 'file-copy'}-line`}></i>
                          </div>
                          <span>{copiedField === 'sms' ? 'Copied' : 'Copy SMS'}</span>
                        </button>
                      </div>
                      {selectedRecording.clientPhone && (
                        <div className="flex items-center space-x-2 mb-2 text-sm text-gray-400">
                          <div className="w-3 h-3 flex items-center justify-center">
                            <i className="ri-phone-line"></i>
                          </div>
                          <span>To: {selectedRecording.clientPhone}</span>
                        </div>
                      )}
                      <div className="bg-gray-900 rounded-lg p-3">
                        <p className="text-gray-300 text-sm leading-relaxed">{selectedRecording.smsText}</p>
                      </div>
                    </div>
                  )}

                  {selectedRecording.emailText && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 flex items-center justify-center">
                            <i className="ri-mail-line text-blue-500"></i>
                          </div>
                          <span className="font-medium text-white">Email</span>
                        </div>
                        <button
                          onClick={() => copyToClipboard(selectedRecording.emailText!, 'email')}
                          className="flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <div className="w-3 h-3 flex items-center justify-center">
                            <i className={`ri-${copiedField === 'email' ? 'check' : 'file-copy'}-line`}></i>
                          </div>
                          <span>{copiedField === 'email' ? 'Copied' : 'Copy Email'}</span>
                        </button>
                      </div>
                      {selectedRecording.clientEmail && (
                        <div className="flex items-center space-x-2 mb-2 text-sm text-gray-400">
                          <div className="w-3 h-3 flex items-center justify-center">
                            <i className="ri-mail-line"></i>
                          </div>
                          <span>To: {selectedRecording.clientEmail}</span>
                        </div>
                      )}
                      <div className="bg-gray-900 rounded-lg p-3 max-h-64 overflow-y-auto">
                        <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{selectedRecording.emailText}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <Navigation />
        </div>
      </AuthGuard>
    );
  }

  if (showNewRecording) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-900 pb-20">
          <Header />

          <div className="max-w-md mx-auto px-4 py-6 space-y-6">
            {step === 'form' && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={backToHistory}
                    className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <div className="w-6 h-6 flex items-center justify-center">
                      <i className="ri-arrow-left-line text-xl"></i>
                    </div>
                  </button>
                  <div>
                    <h1 className="text-2xl font-bold text-white">New Recording Session</h1>
                    <p className="text-gray-400">Enter client details to begin</p>
                  </div>
                </div>
                <RecordingClientForm onSubmit={handleClientSubmit} />
              </div>
            )}

            {step === 'recording' && currentSession && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setStep('form')}
                    className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <div className="w-6 h-6 flex items-center justify-center">
                      <i className="ri-arrow-left-line text-xl"></i>
                    </div>
                  </button>
                  <div>
                    <h1 className="text-xl font-bold text-white">{currentSession.clientName}</h1>
                    <p className="text-gray-400">{currentSession.propertyAddress}</p>
                    <div className="flex items-center justify-center space-x-4 text-sm text-gray-500 mt-2">
                      {currentSession.clientEmail && (
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-3 flex items-center justify-center">
                            <i className="ri-mail-line"></i>
                          </div>
                          <span>{currentSession.clientEmail}</span>
                        </div>
                      )}
                      {currentSession.clientPhone && (
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-3 flex items-center justify-center">
                            <i className="ri-phone-line"></i>
                          </div>
                          <span>{currentSession.clientPhone}</span>
                        </div>
                      )}
                    </div>
                    {currentSession.tags && currentSession.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {currentSession.tags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-900/30 text-blue-300 rounded-full text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
                  <RecordingControls onRecordingComplete={handleRecordingComplete} />
                </div>
              </div>
            )}

            {step === 'results' && (
              <div className="space-y-6">
                <div className="text-center">
                  <h1 className="text-xl font-bold text-white">{currentSession?.clientName}</h1>
                  <p className="text-gray-400">{currentSession?.propertyAddress}</p>
                </div>

                {transcript && <TranscriptDisplay transcript={transcript} loading={transcribing} />}

                {followUp && (
                  <FollowUpDisplay
                    data={followUp}
                    loading={generatingFollowUp}
                    clientEmail={currentSession?.clientEmail}
                    clientPhone={currentSession?.clientPhone}
                  />
                )}

                <button
                  onClick={startNewRecording}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  Start New Session
                </button>
              </div>
            )}
          </div>

          <Navigation />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-900 pb-20">
        <Header />

        <div className="max-w-md mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">Record</h1>
            <p className="text-gray-400">Start a new recording or view past sessions</p>
          </div>

          <button
            onClick={startNewRecording}
            className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap mb-8 flex items-center justify-center space-x-2"
          >
            <div className="w-5 h-5 flex items-center justify-center">
              <i className="ri-mic-line"></i>
            </div>
            <span>Start Recording</span>
          </button>

          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white mb-3">Recording History</h2>
          </div>

          {recordingsLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
              <p className="text-gray-400 text-sm">Loading your recordings...</p>
            </div>
          ) : !user ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <i className="ri-user-line text-4xl text-gray-600"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-400 mb-2">Please sign in</h3>
              <p className="text-gray-500">Sign in to view your recording history</p>
            </div>
          ) : recordings.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <i className="ri-mic-off-line text-4xl text-gray-600"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-400 mb-2">No recordings yet</h3>
              <p className="text-gray-500">Start your first recording session above</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recordings.map((recording) => (
                <div
                  key={recording.id}
                  onClick={() => setSelectedRecording(recording)}
                  className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-white">{recording.clientName}</h3>
                    <StatusIndicator status={recording.status} />
                  </div>

                  {recording.propertyAddress && (
                    <p className="text-sm text-gray-400 mb-2 truncate">{recording.propertyAddress}</p>
                  )}

                  {recording.tags && recording.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {recording.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-900/30 text-blue-300 rounded-full text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {recording.transcript && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">Transcript Preview:</p>
                      <p className="text-sm text-gray-300 italic leading-relaxed">{getTranscriptPreview(recording.transcript)}</p>
                    </div>
                  )}

                  {(recording.smsText || recording.emailText) && (
                    <div className="mb-3 space-y-2">
                      {recording.smsText && (
                        <div className="bg-gray-900 rounded p-2">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 flex items-center justify-center">
                                <i className="ri-message-3-line text-green-500"></i>
                              </div>
                              <span className="text-xs text-green-400 font-medium">SMS</span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(recording.smsText!, `sms-${recording.id}`);
                              }}
                              className="text-xs text-gray-400 hover:text-green-400 transition-colors cursor-pointer"
                            >
                              {copiedField === `sms-${recording.id}` ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                          <p className="text-xs text-gray-300 line-clamp-2">
                            {recording.smsText.length > 80 ? `${recording.smsText.substring(0, 80)}...` : recording.smsText}
                          </p>
                        </div>
                      )}
                      {recording.emailText && (
                        <div className="bg-gray-900 rounded p-2">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 flex items-center justify-center">
                                <i className="ri-mail-line text-blue-500"></i>
                              </div>
                              <span className="text-xs text-blue-400 font-medium">Email</span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(recording.emailText!, `email-${recording.id}`);
                              }}
                              className="text-xs text-gray-400 hover:text-blue-400 transition-colors cursor-pointer"
                            >
                              {copiedField === `email-${recording.id}` ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                          <p className="text-xs text-gray-300 line-clamp-2">
                            {recording.emailText.length > 80 ? `${recording.emailText.substring(0, 80)}...` : recording.emailText}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{formatDate(recording.createdAt)}</span>
                    <div className="w-4 h-4 flex items-center justify-center">
                      <i className="ri-arrow-right-s-line text-gray-500"></i>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Navigation />
      </div>
    </AuthGuard>
  );
}
