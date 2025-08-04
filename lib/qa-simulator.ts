
// 🧪 QA Recording Simulation Tool - Advanced Testing Utilities
// This module provides comprehensive testing capabilities for AI features

import { addDoc, collection, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { generateFollowUpWithAudio, generateBuyerPersona, generateSessionAnalytics } from '@/lib/openai';

// 🎭 Mock Recording Scenarios
export interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  clientProfile: {
    name: string;
    email?: string;
    phone?: string;
    buyerType: 'first-time' | 'investor' | 'upgrader' | 'downsizer';
    budget: { min: number; max: number; };
    preferences: string[];
  };
  propertyContext: {
    address: string;
    type: string;
    price: number;
    features: string[];
    bedrooms: number;
    bathrooms: number;
  };
  conversationFlow: ConversationTurn[];
  expectedOutcomes: {
    sentiment: 'positive' | 'neutral' | 'negative';
    engagementLevel: 'low' | 'medium' | 'high';
    keyInterests: string[];
    objections: string[];
    followUpTone: 'urgent' | 'medium' | 'casual';
  };
  tags: string[];
}

export interface ConversationTurn {
  speaker: 'agent' | 'client' | 'client2';
  text: string;
  emotion?: 'excited' | 'concerned' | 'neutral' | 'disappointed';
  keywords?: string[];
}

// 📝 Predefined Test Scenarios
export const SIMULATION_SCENARIOS: SimulationScenario[] = [
  {
    id: 'enthusiastic-first-timers',
    name: 'Enthusiastic First-Time Buyers',
    description: 'Young couple, very excited about homeownership, budget-conscious',
    clientProfile: {
      name: 'Emma & Jake Rodriguez',
      email: 'emma.rodriguez@email.com',
      phone: '+1-555-0123',
      buyerType: 'first-time',
      budget: { min: 280000, max: 350000 },
      preferences: ['modern kitchen', 'good schools', 'walkable neighborhood']
    },
    propertyContext: {
      address: '1247 Maple Drive, Riverside Heights',
      type: 'Townhouse',
      price: 325000,
      features: ['granite counters', 'hardwood floors', 'private patio', 'attached garage'],
      bedrooms: 3,
      bathrooms: 2
    },
    conversationFlow: [
      { speaker: 'agent', text: "Welcome to 1247 Maple Drive! This is a beautiful 3-bedroom townhouse that just came on the market." },
      { speaker: 'client', text: "Oh wow! This is exactly what we were looking for! Jake, look at those hardwood floors!", emotion: 'excited' },
      { speaker: 'client2', text: "This is gorgeous! The kitchen is perfect for cooking together. What's the square footage?", emotion: 'excited' },
      { speaker: 'agent', text: "It's 1,650 square feet with an open floor plan. The kitchen was recently renovated with granite countertops." },
      { speaker: 'client', text: "We love it! But we're first-time buyers, so we want to make sure we understand all the costs. What are the monthly expenses?", emotion: 'concerned' },
      { speaker: 'agent', text: "Great question! Property taxes are about $320 per month, and HOA fees are $150 monthly, covering exterior maintenance and landscaping." },
      { speaker: 'client2', text: "That seems reasonable. What about the schools in this area? We're planning to start a family.", emotion: 'neutral' },
      { speaker: 'agent', text: "The schools are excellent! Riverside Elementary is rated 9/10, and the high school has a great STEM program." },
      { speaker: 'client', text: "This is our dream home! How competitive is this market? Do we need to make a decision quickly?", emotion: 'excited' },
      { speaker: 'agent', text: "Properties in this price range and condition typically receive multiple offers within the first weekend." },
      { speaker: 'client2', text: "We definitely want to make an offer. Can we schedule a second showing for tomorrow with my parents?", emotion: 'excited' }
    ],
    expectedOutcomes: {
      sentiment: 'positive',
      engagementLevel: 'high',
      keyInterests: ['kitchen', 'schools', 'first-time buyer process'],
      objections: ['monthly costs', 'market competition'],
      followUpTone: 'urgent'
    },
    tags: ['first-time-buyer', 'young-couple', 'enthusiastic', 'budget-conscious', 'family-planning']
  },
  
  {
    id: 'analytical-investor',
    name: 'Analytical Real Estate Investor',
    description: 'Experienced investor focused on cash flow and ROI metrics',
    clientProfile: {
      name: 'Marcus Thompson',
      email: 'marcus.t.investor@gmail.com',
      phone: '+1-555-0187',
      buyerType: 'investor',
      budget: { min: 400000, max: 600000 },
      preferences: ['rental potential', 'appreciation areas', 'low maintenance']
    },
    propertyContext: {
      address: '892 University Boulevard, College District',
      type: 'Duplex',
      price: 485000,
      features: ['separate entrances', 'updated units', 'parking spaces', 'laundry hookups'],
      bedrooms: 4,
      bathrooms: 3
    },
    conversationFlow: [
      { speaker: 'agent', text: "Marcus, this duplex has excellent rental potential given its proximity to the university." },
      { speaker: 'client', text: "I can see that. What are comparable rental rates in this area?", emotion: 'neutral' },
      { speaker: 'agent', text: "Each unit typically rents for $1,400-1,600 per month. The property has been consistently rented with minimal vacancy." },
      { speaker: 'client', text: "That's $2,800-3,200 total monthly income. What are the annual operating expenses?", emotion: 'neutral' },
      { speaker: 'agent', text: "Property taxes are $7,200 annually, insurance runs about $1,800, and maintenance has averaged $2,000 per year." },
      { speaker: 'client', text: "So roughly $11,000 in expenses. When were major systems last updated?", emotion: 'neutral' },
      { speaker: 'agent', text: "HVAC systems were replaced 2 years ago, roof is 5 years old, and both units have updated electrical." },
      { speaker: 'client', text: "Good. What's the neighborhood appreciation trend over the past 5 years?", emotion: 'neutral' },
      { speaker: 'agent', text: "This area has seen steady 4-6% annual appreciation, driven by university expansion and downtown revitalization." },
      { speaker: 'client', text: "Interesting. I'll need to run my cash flow analysis. Are the sellers motivated?", emotion: 'neutral' },
      { speaker: 'agent', text: "Yes, they're relocating for work and would prefer a quick close. There's room for negotiation." }
    ],
    expectedOutcomes: {
      sentiment: 'neutral',
      engagementLevel: 'medium',
      keyInterests: ['rental income', 'cash flow', 'appreciation', 'maintenance costs'],
      objections: ['needs analysis time', 'wants negotiation'],
      followUpTone: 'medium'
    },
    tags: ['investor', 'analytical', 'cash-flow-focused', 'experienced', 'negotiation-minded']
  },

  {
    id: 'concerned-downsizers',
    name: 'Concerned Downsizing Couple',
    description: 'Older couple downsizing, worried about major life change',
    clientProfile: {
      name: 'Robert & Patricia Wilson',
      email: 'rwilson@email.com',
      phone: '+1-555-0198',
      buyerType: 'downsizer',
      budget: { min: 350000, max: 450000 },
      preferences: ['single level', 'low maintenance', 'safe neighborhood']
    },
    propertyContext: {
      address: '156 Sunset Lane, Golden Years Community',
      type: 'Ranch',
      price: 389000,
      features: ['single level', 'master suite', 'small yard', 'garage'],
      bedrooms: 2,
      bathrooms: 2
    },
    conversationFlow: [
      { speaker: 'agent', text: "Bob and Patricia, this ranch-style home is perfect for single-level living." },
      { speaker: 'client', text: "It's nice, but this is such a big decision for us. We've been in our current home for 30 years.", emotion: 'concerned' },
      { speaker: 'client2', text: "The size feels so much smaller than what we're used to. Will we have enough storage?", emotion: 'concerned' },
      { speaker: 'agent', text: "I understand this is a major transition. The home has excellent storage solutions, including a walk-in closet and basement." },
      { speaker: 'client', text: "What about maintenance? We're getting older and can't handle yard work like we used to.", emotion: 'concerned' },
      { speaker: 'agent', text: "The community offers landscaping services, and this yard is very manageable. Many residents use the community maintenance program." },
      { speaker: 'client2', text: "Is this neighborhood safe? We hear about crime increasing everywhere.", emotion: 'concerned' },
      { speaker: 'agent', text: "This is one of the safest neighborhoods in the city, with low crime rates and an active community watch program." },
      { speaker: 'client', text: "We like it, but we're just not sure if we're ready to make such a big change.", emotion: 'concerned' },
      { speaker: 'agent', text: "Take your time to think it over. I'm here to answer any questions and help make this transition as smooth as possible." },
      { speaker: 'client2', text: "We appreciate your patience. Can we think about it over the weekend?", emotion: 'neutral' }
    ],
    expectedOutcomes: {
      sentiment: 'negative',
      engagementLevel: 'medium',
      keyInterests: ['single level living', 'low maintenance', 'safety'],
      objections: ['major life change', 'size concerns', 'decision anxiety'],
      followUpTone: 'casual'
    },
    tags: ['downsizers', 'seniors', 'concerned', 'major-transition', 'safety-focused']
  }
];

// 🎬 Audio Generation for Simulations
export class QASimulator {
  
  static async generateMockTranscript(scenario: SimulationScenario): Promise<string> {
    const transcript = scenario.conversationFlow
      .map(turn => {
        const speakerName = turn.speaker === 'agent' ? 'Agent' : 
                           turn.speaker === 'client2' ? scenario.clientProfile.name.split(' & ')[1] || 'Client 2' :
                           scenario.clientProfile.name.split(' & ')[0] || 'Client';
        return `${speakerName}: ${turn.text}`;
      })
      .join('\n\n');
    
    return transcript;
  }

  static async createMockAudioFile(scenario: SimulationScenario, userId: string): Promise<string> {
    // Generate a mock audio file for testing
    const transcript = await this.generateMockTranscript(scenario);
    const audioContent = `Mock audio data for scenario: ${scenario.name}\nTranscript: ${transcript}`;
    
    const audioBlob = new Blob([audioContent], { type: 'text/plain' });
    const audioFile = new File([audioBlob], `qa-${scenario.id}-${Date.now()}.txt`, { type: 'text/plain' });
    
    const storageRef = ref(storage, `qa-simulations/${userId}/${audioFile.name}`);
    await uploadBytes(storageRef, audioFile);
    
    return await getDownloadURL(storageRef);
  }

  static async runFullSimulation(scenario: SimulationScenario, userId: string): Promise<{
    recordingId: string;
    transcript: string;
    followUp: any;
    persona: any;
    analytics: any;
    success: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let success = true;

    try {
      console.log(`🎬 Starting full simulation: ${scenario.name}`);

      // 1. Create mock recording document
      const recordingData = {
        uid: userId,
        clientName: scenario.clientProfile.name,
        clientEmail: scenario.clientProfile.email,
        clientPhone: scenario.clientProfile.phone,
        tags: scenario.tags,
        propertyAddress: scenario.propertyContext.address,
        propertyId: `mock-${scenario.id}`,
        status: 'simulation-testing',
        createdAt: serverTimestamp(),
        simulationScenario: scenario.id,
        isQATest: true,
      };

      const recordingRef = await addDoc(collection(db, 'recordings'), recordingData);
      console.log(`✅ Mock recording created: ${recordingRef.id}`);

      // 2. Generate transcript
      const transcript = await this.generateMockTranscript(scenario);

      // 3. Create mock audio file
      const audioUrl = await this.createMockAudioFile(scenario, userId);

      // 4. Run AI analysis
      let followUp, persona, analytics;

      try {
        // Generate follow-up
        const followUpResult = await generateFollowUpWithAudio(
          audioUrl,
          scenario.tags,
          recordingRef.id,
          scenario.clientProfile.name,
          scenario.propertyContext,
          {
            followUpTone: 'professional',
            speakerSeparation: true,
            sentimentAnalysis: true,
            keywordExtraction: true,
            generatePersona: true,
            generateVoiceSummary: false,
          }
        );
        followUp = followUpResult.followUp;
        persona = followUpResult.buyerPersona;

        // Generate session analytics
        analytics = await generateSessionAnalytics(
          transcript,
          followUpResult.transcriptSegments || [],
          followUpResult.sentimentMap || [],
          followUpResult.keywordAnalysis || [],
          followUpResult.speakers || []
        );

        console.log('✅ AI analysis completed successfully');

      } catch (aiError) {
        errors.push(`AI Analysis Error: ${aiError instanceof Error ? aiError.message : 'Unknown error'}`);
        success = false;
      }

      // 5. Validate results against expected outcomes
      const validationResults = this.validateSimulationResults(
        scenario.expectedOutcomes,
        { followUp, persona, analytics, transcript }
      );

      if (validationResults.errors.length > 0) {
        errors.push(...validationResults.errors);
        success = false;
      }

      // 6. Save test results
      await setDoc(doc(db, 'qa-simulation-results', recordingRef.id), {
        scenarioId: scenario.id,
        userId: userId,
        recordingId: recordingRef.id,
        success: success,
        errors: errors,
        results: {
          transcript,
          followUp,
          persona,
          analytics
        },
        expectedOutcomes: scenario.expectedOutcomes,
        validation: validationResults,
        completedAt: serverTimestamp(),
      });

      return {
        recordingId: recordingRef.id,
        transcript,
        followUp,
        persona,
        analytics,
        success,
        errors
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown simulation error';
      errors.push(errorMessage);
      console.error('❌ Simulation failed:', error);

      return {
        recordingId: '',
        transcript: '',
        followUp: null,
        persona: null,
        analytics: null,
        success: false,
        errors
      };
    }
  }

  private static validateSimulationResults(
    expected: SimulationScenario['expectedOutcomes'],
    actual: { followUp: any; persona: any; analytics: any; transcript: string }
  ): { passed: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate sentiment
    if (actual.analytics?.sentimentBreakdown) {
      const { positive, neutral, negative } = actual.analytics.sentimentBreakdown;
      const total = positive + neutral + negative;
      const dominantSentiment = positive > neutral && positive > negative ? 'positive' :
                               negative > positive && negative > neutral ? 'negative' : 'neutral';
      
      if (dominantSentiment !== expected.sentiment) {
        warnings.push(`Expected sentiment ${expected.sentiment}, got ${dominantSentiment}`);
      }
    }

    // Validate engagement level
    if (actual.analytics?.engagementRating !== expected.engagementLevel) {
      warnings.push(`Expected engagement ${expected.engagementLevel}, got ${actual.analytics?.engagementRating}`);
    }

    // Validate key interests detection
    if (expected.keyInterests.length > 0 && actual.followUp) {
      const detectedInterests = actual.followUp.keyTopics || [];
      const matchedInterests = expected.keyInterests.filter(interest =>
        detectedInterests.some((detected: string) => 
          detected.toLowerCase().includes(interest.toLowerCase()) ||
          interest.toLowerCase().includes(detected.toLowerCase())
        )
      );

      if (matchedInterests.length === 0) {
        warnings.push(`Expected to detect interests: ${expected.keyInterests.join(', ')}`);
      }
    }

    // Validate objections detection
    if (expected.objections.length > 0 && actual.followUp?.objections) {
      const detectedObjections = actual.followUp.objections.toLowerCase();
      const foundObjections = expected.objections.filter(objection =>
        detectedObjections.includes(objection.toLowerCase())
      );

      if (foundObjections.length === 0) {
        warnings.push(`Expected to detect objections: ${expected.objections.join(', ')}`);
      }
    }

    // Validate basic AI completeness
    if (!actual.followUp?.sms || !actual.followUp?.email) {
      errors.push('AI failed to generate complete follow-up content');
    }

    if (!actual.persona?.buyerType) {
      warnings.push('AI failed to generate buyer persona');
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings
    };
  }

  // Batch testing utilities
  static async runAllScenarios(userId: string): Promise<{
    total: number;
    passed: number;
    failed: number;
    results: any[];
  }> {
    const results = [];
    let passed = 0;

    console.log(`🧪 Running batch simulation of ${SIMULATION_SCENARIOS.length} scenarios`);

    for (const scenario of SIMULATION_SCENARIOS) {
      try {
        const result = await this.runFullSimulation(scenario, userId);
        results.push({
          scenario: scenario.name,
          success: result.success,
          errors: result.errors,
          recordingId: result.recordingId
        });

        if (result.success) passed++;

        // Add delay between tests to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        results.push({
          scenario: scenario.name,
          success: false,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          recordingId: null
        });
      }
    }

    return {
      total: SIMULATION_SCENARIOS.length,
      passed,
      failed: SIMULATION_SCENARIOS.length - passed,
      results
    };
  }

  // Performance benchmarking
  static async benchmarkPerformance(scenario: SimulationScenario, userId: string, iterations: number = 3): Promise<{
    averageTime: number;
    minTime: number;
    maxTime: number;
    successRate: number;
    results: any[];
  }> {
    const results = [];
    let successCount = 0;

    console.log(`⏱️ Benchmarking scenario "${scenario.name}" with ${iterations} iterations`);

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      
      try {
        const result = await this.runFullSimulation(scenario, userId);
        const duration = Date.now() - startTime;

        results.push({
          iteration: i + 1,
          duration,
          success: result.success,
          errors: result.errors
        });

        if (result.success) successCount++;

        // Small delay between iterations
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        const duration = Date.now() - startTime;
        results.push({
          iteration: i + 1,
          duration,
          success: false,
          errors: [error instanceof Error ? error.message : 'Unknown error']
        });
      }
    }

    const durations = results.map(r => r.duration);
    
    return {
      averageTime: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minTime: Math.min(...durations),
      maxTime: Math.max(...durations),
      successRate: successCount / iterations,
      results
    };
  }
}

export default QASimulator;
