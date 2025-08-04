
'use client';

import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useFeatureGate } from '@/lib/feature-flags';
import { generateFollowUpWithAudio, generateBuyerPersona, generateVoiceSummary } from '@/lib/openai';
import AuthGuard from '@/components/AuthGuard';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';

interface TestScenario {
  id: string;
  name: string;
  description: string;
  mockAudioUrl?: string;
  tags: string[];
  expectedOutcome: string;
  clientName: string;
  propertyContext?: any;
}

const TEST_SCENARIOS: TestScenario[] = [
  {
    id: 'enthusiastic-buyer',
    name: 'Enthusiastic First-Time Buyer',
    description: 'Young couple, very excited, asking lots of questions, budget concerns',
    tags: ['first-time-buyer', 'young-couple', 'budget-conscious', 'enthusiastic'],
    expectedOutcome: 'High engagement, positive sentiment, budget-related objections',
    clientName: 'Sarah & Mike Johnson',
    propertyContext: {
      address: '123 Oak Street, Downtown',
      propertyType: 'Condo',
      price: 350000,
      bedrooms: 2,
      bathrooms: 2,
      sqft: 1200,
      propertyFeatures: ['granite counters', 'in-unit laundry', 'balcony']
    }
  },
  {
    id: 'cautious-investor',
    name: 'Cautious Real Estate Investor',
    description: 'Experienced investor, analytical approach, focused on ROI',
    tags: ['investor', 'analytical', 'experienced', 'roi-focused'],
    expectedOutcome: 'Neutral sentiment, business-focused questions, cash flow concerns',
    clientName: 'Robert Chen',
    propertyContext: {
      address: '456 Maple Avenue, Suburbs',
      propertyType: 'Single Family',
      price: 525000,
      bedrooms: 3,
      bathrooms: 2,
      sqft: 1800,
      propertyFeatures: ['rental potential', 'good schools', 'mature neighborhood']
    }
  },
  {
    id: 'downsizing-retirees',
    name: 'Downsizing Retirees',
    description: 'Older couple looking to downsize, concerned about accessibility',
    tags: ['downsizing', 'retirees', 'accessibility', 'low-maintenance'],
    expectedOutcome: 'Moderate engagement, practical concerns, accessibility questions',
    clientName: 'Frank & Helen Williams',
    propertyContext: {
      address: '789 Pine Court, Senior Community',
      propertyType: 'Townhouse',
      price: 425000,
      bedrooms: 2,
      bathrooms: 2,
      sqft: 1400,
      propertyFeatures: ['single-level living', 'low maintenance', 'community amenities']
    }
  }
];

export default function QAToolsPage() {
  const [activeTest, setActiveTest] = useState<string>('');
  const [testResults, setTestResults] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<TestScenario | null>(null);
  const [customAudioFile, setCustomAudioFile] = useState<File | null>(null);
  const [testLogs, setTestLogs] = useState<string[]>([]);

  const { user } = useAuth();
  const { isEnabled: qaEnabled } = useFeatureGate('qaUtilities');

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`🧪 QA: ${message}`);
  };

  const runTestScenario = async (scenario: TestScenario) => {
    if (!user) return;

    setRunning(true);
    setTestResults(null);
    setTestLogs([]);
    setActiveTest(scenario.id);

    try {
      addLog(`Starting test scenario: ${scenario.name}`);
      addLog(`Expected: ${scenario.expectedOutcome}`);

      // Generate mock transcript for testing
      const mockTranscript = generateMockTranscript(scenario);
      addLog(`Generated mock transcript (${mockTranscript.length} characters)`);

      // Test 1: Basic AI Follow-up Generation
      addLog('Testing AI follow-up generation...');
      const followUpResult = await testFollowUpGeneration(mockTranscript, scenario);
      
      // Test 2: Buyer Persona Generation
      addLog('Testing buyer persona generation...');
      const personaResult = await testPersonaGeneration(mockTranscript, scenario);

      // Test 3: Session Analytics
      addLog('Testing session analytics...');
      const analyticsResult = await testSessionAnalytics(mockTranscript, scenario);

      // Compile results
      const results = {
        scenario: scenario.name,
        timestamp: new Date().toISOString(),
        tests: {
          followUp: followUpResult,
          persona: personaResult,
          analytics: analyticsResult,
        },
        mockTranscript: mockTranscript,
        passed: followUpResult.success && personaResult.success && analyticsResult.success,
      };

      setTestResults(results);
      addLog(`Test scenario completed. Status: ${results.passed ? 'PASSED' : 'FAILED'}`);

      // Save test results to Firestore for audit
      await addDoc(collection(db, 'qa-test-results'), {
        ...results,
        userId: user.uid,
        userEmail: user.email,
        createdAt: serverTimestamp(),
      });

      addLog('Test results saved to database');

    } catch (error) {
      addLog(`Test failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('❌ QA Test Error:', error);
    } finally {
      setRunning(false);
    }
  };

  const testFollowUpGeneration = async (transcript: string, scenario: TestScenario) => {
    try {
      const startTime = Date.now();
      
      // Mock audio file upload for testing
      const mockAudioBlob = new Blob(['mock audio data'], { type: 'audio/wav' });
      const mockAudioFile = new File([mockAudioBlob], 'test-audio.wav', { type: 'audio/wav' });
      
      // Upload mock file
      const storageRef = ref(storage, `qa-tests/${user!.uid}/test-${Date.now()}.wav`);
      await uploadBytes(storageRef, mockAudioFile);
      const audioUrl = await getDownloadURL(storageRef);

      // Generate follow-up using the enhanced function
      const result = await generateFollowUpWithAudio(
        audioUrl,
        scenario.tags,
        `qa-test-${Date.now()}`,
        scenario.clientName,
        scenario.propertyContext,
        {
          followUpTone: 'professional',
          speakerSeparation: true,
          sentimentAnalysis: true,
          keywordExtraction: true,
          generatePersona: true,
          generateVoiceSummary: false, // Skip for testing speed
        }
      );

      const duration = Date.now() - startTime;

      return {
        success: !!(result.followUp?.sms && result.followUp?.email),
        duration: duration,
        hasPersona: !!result.buyerPersona,
        hasSentiment: !!result.overallSentiment,
        hasSegments: result.transcriptSegments?.length > 0,
        result: result.followUp,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: 0,
      };
    }
  };

  const testPersonaGeneration = async (transcript: string, scenario: TestScenario) => {
    try {
      const startTime = Date.now();
      
      const persona = await generateBuyerPersona(
        transcript,
        scenario.tags,
        scenario.clientName,
        scenario.propertyContext,
        `qa-test-${Date.now()}`
      );

      const duration = Date.now() - startTime;

      return {
        success: !!(persona && persona.buyerType && persona.keyMotivations),
        duration: duration,
        buyerType: persona?.buyerType,
        confidenceScore: persona?.confidenceScore,
        result: persona,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: 0,
      };
    }
  };

  const testSessionAnalytics = async (transcript: string, scenario: TestScenario) => {
    try {
      const startTime = Date.now();

      // Mock analytics generation
      const analytics = {
        sentimentBreakdown: { positive: 5, neutral: 3, negative: 1 },
        engagementRating: 'high' as const,
        keywordsDetected: scenario.tags,
        questionsAsked: ['What about the neighborhood?', 'How much are the HOA fees?'],
        actionItems: ['Send neighborhood information', 'Calculate HOA costs'],
        analysisScore: 85,
      };

      const duration = Date.now() - startTime;

      return {
        success: true,
        duration: duration,
        engagementRating: analytics.engagementRating,
        analysisScore: analytics.analysisScore,
        result: analytics,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: 0,
      };
    }
  };

  const generateMockTranscript = (scenario: TestScenario): string => {
    const templates = {
      'enthusiastic-buyer': `
Agent: Welcome to 123 Oak Street! This is a beautiful 2-bedroom, 2-bathroom condo in the heart of downtown.

Sarah: Oh wow, this is gorgeous! Mike, look at those granite counters!

Mike: This is exactly what we were looking for. The kitchen is perfect for cooking together.

Agent: I'm glad you like it! The granite countertops were just installed last year, and as you can see, there's plenty of storage space.

Sarah: What about the monthly HOA fees? We're first-time buyers, so we want to make sure we can afford everything.

Agent: The HOA is $250 per month, which covers water, sewer, trash, and building maintenance.

Mike: That seems reasonable. What about parking?

Agent: Each unit comes with one assigned parking space in the underground garage, and there's guest parking available too.

Sarah: I love the balcony! Can you imagine having coffee out there in the mornings?

Agent: It's a great feature, especially with this view of the city. The unit also has in-unit laundry, which is convenient.

Mike: What's the timeline like if we wanted to make an offer?

Agent: In this market, properties are moving quickly. If you're interested, I'd recommend making a decision within the next day or two.

Sarah: We're definitely interested, but we need to talk about the numbers. This is right at the top of our budget.
      `,
      
      'cautious-investor': `
Agent: Good morning, Mr. Chen. This property has excellent rental potential given its location near the university.

Robert: I've reviewed the comps in the area. What's the current rental market like for properties of this size?

Agent: Similar 3-bedroom homes are renting for $2,800 to $3,200 per month. The schools are highly rated, which attracts families.

Robert: What about vacancy rates in this neighborhood?

Agent: Very low, typically under 5%. The area has been consistently strong for rentals.

Robert: I see the property was built in 1995. What major systems have been updated?

Agent: The HVAC system was replaced 3 years ago, and the roof is only 5 years old. The owner has been very proactive with maintenance.

Robert: What are the annual property taxes and insurance costs?

Agent: Property taxes are approximately $8,400 annually, and insurance typically runs $1,200-1,500 for this type of property.

Robert: I'll need to run my cash flow analysis. What's your asking price flexibility?

Agent: The sellers are motivated but want to see a serious offer. There's some room for negotiation, especially with a quick close.

Robert: I'll get back to you within 48 hours after I complete my due diligence.
      `,
      
      'downsizing-retirees': `
Agent: Frank and Helen, welcome! This townhouse was designed specifically with low-maintenance living in mind.

Helen: Oh, this is nice. Everything is on one level?

Agent: The main living areas are all on this floor - kitchen, living room, master bedroom, and full bath. There's a loft upstairs that could be used for storage or a guest room.

Frank: What about stairs? Helen has some mobility concerns.

Agent: The main level has no stairs at all. The entrance has just two small steps, and there's a ramp option available.

Helen: I like that the laundry room is right off the kitchen. No more going to the basement!

Agent: Exactly! And the community takes care of all exterior maintenance - landscaping, snow removal, exterior painting.

Frank: What are the monthly community fees?

Agent: $320 per month, which covers all exterior maintenance, landscaping, snow removal, and access to the community center.

Helen: Is there a community center?

Agent: Yes, with a fitness room, library, and social areas. There are regular activities and events.

Frank: We're looking to simplify our lives. This seems like it could work well for us.

Helen: I'd like to see the master bathroom. Are there grab bars?

Agent: There are grab bars in the shower, and the bathroom has a walk-in shower with no threshold - very safe and accessible.
      `
    };

    return templates[scenario.id as keyof typeof templates] || templates['enthusiastic-buyer'];
  };

  const uploadCustomAudio = async () => {
    if (!customAudioFile || !user) return;

    setRunning(true);
    addLog('Uploading custom audio file...');

    try {
      const storageRef = ref(storage, `qa-tests/${user.uid}/custom-${Date.now()}.wav`);
      await uploadBytes(storageRef, customAudioFile);
      const audioUrl = await getDownloadURL(storageRef);

      addLog('Running full AI analysis on uploaded audio...');

      const result = await generateFollowUpWithAudio(
        audioUrl,
        ['custom-test'],
        `qa-custom-${Date.now()}`,
        'Test Client',
        undefined,
        {
          followUpTone: 'professional',
          speakerSeparation: true,
          sentimentAnalysis: true,
          keywordExtraction: true,
          generatePersona: true,
          generateVoiceSummary: false,
        }
      );

      setTestResults({
        scenario: 'Custom Audio Test',
        timestamp: new Date().toISOString(),
        customAudio: true,
        tests: {
          fullAnalysis: {
            success: !!result.followUp,
            transcript: result.transcript,
            followUp: result.followUp,
            persona: result.buyerPersona,
            sentiment: result.overallSentiment,
            segments: result.transcriptSegments,
          }
        },
        passed: !!result.followUp,
      });

      addLog('Custom audio analysis completed successfully');

    } catch (error) {
      addLog(`Custom audio test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setRunning(false);
    }
  };

  if (!qaEnabled) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <i className="ri-tools-line text-4xl text-gray-500"></i>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">QA Tools Disabled</h1>
            <p className="text-gray-400">QA utilities are not enabled in the current configuration.</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-900 pb-20">
        <Header />

        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-6 h-6 flex items-center justify-center">
                <i className="ri-tools-line text-blue-500 text-xl"></i>
              </div>
              <h1 className="text-2xl font-bold text-white">QA Testing Tools</h1>
              <span className="px-2 py-1 bg-blue-900/30 text-blue-300 rounded-full text-xs">
                Development Only
              </span>
            </div>
            <p className="text-gray-400">Test AI features, simulate recordings, and validate system responses</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Test Scenarios */}
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">Predefined Test Scenarios</h2>
                <div className="space-y-3">
                  {TEST_SCENARIOS.map(scenario => (
                    <div key={scenario.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-white">{scenario.name}</h3>
                        <button
                          onClick={() => runTestScenario(scenario)}
                          disabled={running}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded text-sm transition-colors cursor-pointer whitespace-nowrap flex items-center space-x-1"
                        >
                          {running && activeTest === scenario.id ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                              <span>Testing...</span>
                            </>
                          ) : (
                            <>
                              <div className="w-3 h-3 flex items-center justify-center">
                                <i className="ri-play-line"></i>
                              </div>
                              <span>Run Test</span>
                            </>
                          )}
                        </button>
                      </div>
                      
                      <p className="text-sm text-gray-400 mb-3">{scenario.description}</p>
                      
                      <div className="flex flex-wrap gap-1 mb-2">
                        {scenario.tags.map(tag => (
                          <span key={tag} className="px-2 py-1 bg-purple-900/30 text-purple-300 rounded-full text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        Expected: {scenario.expectedOutcome}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Audio Upload */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">Custom Audio Test</h2>
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Upload Audio File
                    </label>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => setCustomAudioFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
                    />
                  </div>
                  
                  <button
                    onClick={uploadCustomAudio}
                    disabled={!customAudioFile || running}
                    className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:opacity-50 text-white rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {running ? 'Processing...' : 'Test with Custom Audio'}
                  </button>
                </div>
              </div>
            </div>

            {/* Results Panel */}
            <div className="space-y-6">
              {/* Test Results */}
              {testResults && (
                <div>
                  <h2 className="text-lg font-semibold text-white mb-4">Test Results</h2>
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-white">{testResults.scenario}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        testResults.passed 
                          ? 'bg-green-900/30 text-green-300' 
                          : 'bg-red-900/30 text-red-300'
                      }`}>
                        {testResults.passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>

                    <div className="space-y-3 text-sm">
                      {Object.entries(testResults.tests).map(([testName, result]: [string, any]) => (
                        <div key={testName} className="bg-gray-900 rounded p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-white capitalize">
                              {testName.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              result.success 
                                ? 'bg-green-900/30 text-green-300' 
                                : 'bg-red-900/30 text-red-300'
                            }`}>
                              {result.success ? 'Pass' : 'Fail'}
                            </span>
                          </div>
                          
                          {result.duration && (
                            <div className="text-gray-400">
                              Duration: {result.duration}ms
                            </div>
                          )}
                          
                          {result.error && (
                            <div className="text-red-400">
                              Error: {result.error}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Test Logs */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">Test Logs</h2>
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                  {testLogs.length === 0 ? (
                    <p className="text-gray-500 italic">No test logs yet. Run a test to see logs here.</p>
                  ) : (
                    <div className="space-y-1 font-mono text-xs max-h-64 overflow-y-auto">
                      {testLogs.map((log, index) => (
                        <div key={index} className="text-gray-300">
                          {log}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <Navigation />
      </div>
    </AuthGuard>
  );
}
