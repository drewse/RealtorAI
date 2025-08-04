
// 🚀 Cloud Function Integration for Secure AI Follow-up Generation
// This module handles communication with Firebase Cloud Functions for AI processing

// Enhanced AI Follow-up Generation with Audio Transcription, Tags, Property Context, and Analysis Features
export const generateFollowUpWithAudio = async (
  audioUrl: string,
  tags: string[],
  sessionId?: string,
  clientName?: string,
  propertyContext?: any,
  analysisOptions?: {
    followUpTone?: 'friendly' | 'professional' | 'direct' | 'action-oriented';
    speakerSeparation?: boolean;
    sentimentAnalysis?: boolean;
    keywordExtraction?: boolean;
    generatePersona?: boolean;
    generateVoiceSummary?: boolean;
  }
) => {
  try {
    console.log('🎙️ Generating enhanced AI follow-up with advanced analysis...');
    console.log('🏠 Property Context:', propertyContext);
    console.log('🔍 Analysis Options:', analysisOptions);

    // 🌐 Determine Cloud Function URL based on environment
    const isDevelopment = process.env.NEXT_PUBLIC_IS_DEV === 'true';
    const functionUrl = isDevelopment
      ? 'http://127.0.0.1:5001/showai-23713/us-central1/generateAiFollowUp'
      : 'https://generateaifollowup-x5dsxztz7q-uc.a.run.app';

    console.log('🔗 Using enhanced function URL:', functionUrl);

    // 📡 Call Enhanced Firebase Cloud Function with analysis options
    const requestBody = {
      audioUrl: audioUrl,
      tags: tags,
      sessionId: sessionId || null,
      clientName: clientName || null,
      propertyContext: propertyContext || null,
      // NEW: Analysis configuration
      followUpTone: analysisOptions?.followUpTone || 'professional',
      speakerSeparation: analysisOptions?.speakerSeparation || true,
      sentimentAnalysis: analysisOptions?.sentimentAnalysis || true,
      keywordExtraction: analysisOptions?.keywordExtraction || true,
      generatePersona: analysisOptions?.generatePersona || true,
      generateVoiceSummary: analysisOptions?.generateVoiceSummary || true
    };

    console.log('📤 Enhanced request payload:', requestBody);

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('❌ Enhanced Cloud Function error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new Error(errorData?.message || `Cloud Function request failed: ${response.status}`);
    }

    // 📊 Parse successful response with enhanced analysis data
    const result = await response.json();

    if (!result.success || !result.data) {
      throw new Error('Invalid response format from Enhanced Cloud Function');
    }

    console.log('✅ Enhanced AI follow-up generated successfully via backend');
    console.log('📊 Enhanced Metadata:', result.metadata);
    console.log('🎙️ Transcription method:', result.metadata?.transcriptionMethod);
    console.log('🏠 Property context processed:', !!result.metadata?.propertyContext);
    console.log('👤 Buyer persona generated:', !!result.metadata?.buyerPersona);
    console.log('🔊 Voice summaries generated:', !!result.metadata?.voiceSummaries);
    console.log('🔍 Analysis features:', {
      speakerSeparation: !!result.metadata?.transcriptSegments,
      sentimentAnalysis: !!result.metadata?.sentimentMap,
      keywordExtraction: !!result.metadata?.keywordAnalysis,
      personaGeneration: !!result.metadata?.buyerPersona,
      voiceSummary: !!result.metadata?.voiceSummaries
    });

    return {
      followUp: result.data,
      transcript: result.metadata?.transcript,
      transcriptionMethod: result.metadata?.transcriptionMethod,
      propertyContext: result.metadata?.propertyContext,
      // NEW: Enhanced analysis results
      transcriptSegments: result.metadata?.transcriptSegments || [],
      sentimentMap: result.metadata?.sentimentMap || [],
      keywordAnalysis: result.metadata?.keywordAnalysis || [],
      speakers: result.metadata?.speakers || [],
      overallSentiment: result.metadata?.overallSentiment || 'neutral',
      // NEW: Buyer persona and voice summaries
      buyerPersona: result.metadata?.buyerPersona || null,
      voiceSummaries: result.metadata?.voiceSummaries || null,
      metadata: result.metadata
    };

  } catch (error) {
    console.error('❌ Error generating enhanced AI follow-up:', error);

    // 🚨 Return fallback content if Cloud Function fails
    const fallbackResponse = {
      preferences: `Unable to analyze audio, tags, and property details. The AI service is temporarily unavailable. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      objections: `Unable to identify concerns from audio and property context. The AI service is temporarily unavailable. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      sms: `Hi ${clientName || 'Client'}! Thanks for visiting the property today. Let me know if you have any questions!`,
      email: `Hi ${clientName || 'Client'},\n\nThank you for taking the time to view the property today. I hope you found it interesting and that it meets some of your requirements.\n\nI'd love to hear your thoughts and answer any questions you might have. Please don't hesitate to reach out if you need any additional information or would like to schedule another viewing.\n\nLooking forward to hearing from you soon!\n\nBest regards,\n[Your Name]`,
      urgencyLevel: 'medium' as const,
      keyTopics: [...tags, 'property viewing', 'client feedback', ...(propertyContext?.propertyFeatures || [])],
      recommendedActions: ['Send follow-up message', 'Schedule callback', 'Prepare additional information'],
      tone: analysisOptions?.followUpTone || 'professional'
    };

    return {
      followUp: fallbackResponse,
      transcript: null,
      transcriptionMethod: 'fallback',
      propertyContext: propertyContext || null,
      transcriptSegments: [],
      sentimentMap: [],
      keywordAnalysis: [],
      speakers: [],
      overallSentiment: 'neutral' as const,
      buyerPersona: null,
      voiceSummaries: null,
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
};

// 🎨 Follow-up Tone Regeneration Function
export const regenerateFollowUpWithTone = async (
  originalContent: any,
  newTone: 'friendly' | 'professional' | 'direct' | 'action-oriented',
  clientName: string,
  propertyContext?: any
) => {
  try {
    console.log(`🎨 Regenerating follow-up with ${newTone} tone...`);

    const tonePrompt = `Transform the following real estate follow-up content to match a ${newTone} tone:\n\n    Original Content:\n    - Preferences: ${originalContent.preferences}\n    - Objections: ${originalContent.objections}\n    - SMS: ${originalContent.sms}\n    - Email: ${originalContent.email}\n    \n    Client: ${clientName}\n    ${propertyContext ? `Property: ${propertyContext.propertyType} at ${propertyContext.address}` : ''}\n\n    Please rewrite all content to match a ${newTone} tone while maintaining the core information. Return in the same JSON format.`;

    // Call the existing generateFollowUp function with tone-specific prompt
    const result = await generateFollowUp(tonePrompt, clientName, undefined, propertyContext, {
      followUpTone: newTone
    });

    console.log(`✅ Successfully regenerated follow-up with ${newTone} tone`);
    return result;

  } catch (error) {
    console.error(`❌ Error regenerating follow-up with ${newTone} tone:`, error);
    return originalContent; // Return original if regeneration fails
  }
};

// 👤 NEW: Generate Buyer Persona from Recording Data
export const generateBuyerPersona = async (
  transcript: string,
  tags: string[],
  clientName?: string,
  propertyContext?: any,
  sessionId?: string
): Promise<any> => {
  try {
    console.log('👤 Generating buyer persona from transcript and context...');

    const personaPrompt = `Analyze this real estate showing conversation to generate a comprehensive buyer persona:\n\n    Client Name: ${clientName || 'Unknown'}\n    Transcript: ${transcript}\n    Tags: ${tags.join(', ')}\n    ${propertyContext ? `\n    Property Context:\n    - Address: ${propertyContext.address}\n    - Type: ${propertyContext.propertyType}\n    - Price: $${propertyContext.price?.toLocaleString()}\n    - Size: ${propertyContext.bedrooms} bed, ${propertyContext.bathrooms} bath\n    - Features: ${propertyContext.propertyFeatures?.join(', ')}` : ''}\n\n    Generate a detailed buyer persona in JSON format:\n    {\n      "clientName": "${clientName || ''}",\n      "buyerType": "Select from: Investor, First-Time Buyer, Upsizer, Downsizer, Relocator, Second Home, Other",\n      "keyMotivations": ["primary motivation 1", "motivation 2", "motivation 3"],\n      "decisionTimeline": "Select from: Immediate, Within 30 Days, 2-3 Months, 6+ Months, Exploring",\n      "budgetRange": {\n        "min": estimated_min_budget,\n        "max": estimated_max_budget,\n        "flexibility": "Select from: Strict, Flexible, Very Flexible"\n      },\n      "locationPreferences": ["preferred area 1", "area 2"],\n      "propertyFeaturePriorities": ["most important feature", "feature 2", "feature 3"],\n      "emotionalProfile": "Select from: Analytical, Enthusiastic, Cautious, Decisive, Social",\n      "communicationPreference": "Select from: Email, Phone, Text, In-Person, Mixed",\n      "concerns": ["primary concern 1", "concern 2"],\n      "positiveSignals": ["positive reaction 1", "reaction 2"],\n      "recommendedStrategy": "Detailed follow-up strategy based on analysis",\n      "confidenceScore": 0.85\n    }\n\n    Base your analysis on actual conversation content, not assumptions.`;

    // 🌐 Call Cloud Function for persona generation
    const isDevelopment = process.env.NEXT_PUBLIC_IS_DEV === 'true';
    const functionUrl = isDevelopment
      ? 'http://127.0.0.1:5001/showai-23713/us-central1/generateBuyerPersona'
      : 'https://generatebuyerpersona-x5dsxztz7q-uc.a.run.app';

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: personaPrompt,
        transcript: transcript,
        tags: tags,
        clientName: clientName || 'Client',
        propertyContext: propertyContext || null,
        sessionId: sessionId || null
      })
    });

    if (!response.ok) {
      throw new Error(`Persona generation failed: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      throw new Error('Invalid persona response format');
    }

    console.log('✅ Buyer persona generated successfully');
    return result.data;

  } catch (error) {
    console.error('❌ Error generating buyer persona:', error);

    // Return fallback persona
    return {
      clientName: clientName || '',
      buyerType: 'Other',
      keyMotivations: ['Property viewing', 'Information gathering'],
      decisionTimeline: 'Exploring',
      budgetRange: {
        min: propertyContext?.price ? propertyContext.price * 0.8 : 0,
        max: propertyContext?.price ? propertyContext.price * 1.2 : 0,
        flexibility: 'Flexible'
      },
      locationPreferences: [propertyContext?.address ? 'Current area' : 'Unknown'],
      propertyFeaturePriorities: tags.length > 0 ? tags.slice(0, 3) : ['General features'],
      emotionalProfile: 'Cautious',
      communicationPreference: 'Mixed',
      concerns: ['Need more information'],
      positiveSignals: ['Attended showing'],
      recommendedStrategy: 'Follow up with additional information and schedule callback',
      confidenceScore: 0.5,
      generatedAt: new Date().toISOString(),
      generatedBy: 'fallback'
    };
  }
};

// 🔊 NEW: Generate Voice Summary using Text-to-Speech
export const generateVoiceSummary = async (
  content: string,
  type: 'followup' | 'persona',
  recordingId: string,
  provider: 'google' | 'elevenlabs' = 'google'
): Promise<{ audioUrl: string; duration: number } | null> => {
  try {
    console.log(`🔊 Generating ${type} voice summary using ${provider}...`);

    // 🌐 Call Cloud Function for voice synthesis
    const isDevelopment = process.env.NEXT_PUBLIC_IS_DEV === 'true';
    const functionUrl = isDevelopment
      ? 'http://127.0.0.1:5001/showai-23713/us-central1/generateVoiceSummary'
      : 'https://generatevoicesummary-x5dsxztz7q-uc.a.run.app';

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: content,
        type: type,
        recordingId: recordingId,
        provider: provider,
        voiceSettings: {
          languageCode: 'en-US',
          gender: 'NEUTRAL',
          speakingRate: 1.0,
          pitch: 0.0
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Voice synthesis failed: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success || !result.audioUrl) {
      throw new Error('Invalid voice synthesis response');
    }

    console.log(`✅ ${type} voice summary generated successfully`);
    return {
      audioUrl: result.audioUrl,
      duration: result.duration || 30
    };

  } catch (error) {
    console.error(`❌ Error generating ${type} voice summary:`, error);
    return null;
  }
};

// 📅 NEW: Schedule Follow-up Delivery
export const scheduleFollowUpDelivery = async (
  recordingId: string,
  method: 'email' | 'sms' | 'both',
  sendAt: Date,
  userId: string
): Promise<boolean> => {
  try {
    console.log(`📅 Scheduling ${method} follow-up delivery for recording ${recordingId}`);

    // 🌐 Call Cloud Function for scheduling
    const isDevelopment = process.env.NEXT_PUBLIC_IS_DEV === 'true';
    const functionUrl = isDevelopment
      ? 'http://127.0.0.1:5001/showai-23713/us-central1/scheduleFollowUp'
      : 'https://schedulefollowup-x5dsxztz7q-uc.a.run.app';

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recordingId: recordingId,
        method: method,
        sendAt: sendAt.toISOString(),
        userId: userId
      })
    });

    if (!response.ok) {
      throw new Error(`Follow-up scheduling failed: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error('Failed to schedule follow-up');
    }

    console.log('✅ Follow-up scheduled successfully');
    return true;

  } catch (error) {
    console.error('❌ Error scheduling follow-up:', error);
    return false;
  }
};

// NEW: Generate Session Engagement Analytics
export const generateSessionAnalytics = async (
  transcript: string,
  transcriptSegments: any[],
  sentimentMap: any[],
  keywordAnalysis: any[],
  speakers: string[]
): Promise<{
  sentimentBreakdown: { positive: number; neutral: number; negative: number };
  engagementRating: 'low' | 'medium' | 'high';
  keywordsDetected: string[];
  questionsAsked: string[];
  actionItems: string[];
  analysisScore: number;
}> => {
  try {
    console.log('📊 Generating comprehensive session analytics...');

    // Use existing data if available, otherwise analyze transcript
    type Sentiment = 'positive' | 'neutral' | 'negative';

let sentimentBreakdown: Record<Sentiment, number> = {
  positive: 0,
  neutral: 0,
  negative: 0,
};

if (sentimentMap.length > 0) {
  sentimentMap.forEach((item: { sentiment: Sentiment }) => {
    sentimentBreakdown[item.sentiment]++;
  });
} else {
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
  sentences.forEach(sentence => {
    const sentiment = analyzeSentenceSentiment(sentence) as Sentiment;
    sentimentBreakdown[sentiment]++;
  });
}


    // Extract keywords
    let keywordsDetected: string[] = [];
    if (keywordAnalysis.length > 0) {
      keywordsDetected = keywordAnalysis
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 10)
        .map(k => k.word);
    } else {
      keywordsDetected = extractKeywordsFromTranscript(transcript);
    }

    // Identify questions asked by client
    const questionsAsked = extractQuestionsFromTranscript(transcript, transcriptSegments);

    // Extract action items
    const actionItems = extractActionItemsFromTranscript(transcript);

    // Calculate engagement rating
    const totalSentiments = sentimentBreakdown.positive + sentimentBreakdown.neutral + sentimentBreakdown.negative;
    const positiveRatio = totalSentiments > 0 ? sentimentBreakdown.positive / totalSentiments : 0;
    const questionCount = questionsAsked.length;

    let engagementRating: 'low' | 'medium' | 'high' = 'low';
    if (positiveRatio > 0.6 && questionCount > 3) {
      engagementRating = 'high';
    } else if (positiveRatio > 0.3 || questionCount > 1) {
      engagementRating = 'medium';
    }

    // Calculate overall analysis score
    const analysisScore = Math.min(100, Math.round(
      (positiveRatio * 30) +
      (Math.min(questionCount / 5, 1) * 25) +
      (Math.min(keywordsDetected.length / 10, 1) * 25) +
      (Math.min(actionItems.length / 3, 1) * 20)
    ));

    console.log('✅ Session analytics generated:', {
      sentimentBreakdown,
      engagementRating,
      analysisScore,
      questionsCount: questionsAsked.length,
      keywordsCount: keywordsDetected.length
    });

    return {
      sentimentBreakdown,
      engagementRating,
      keywordsDetected,
      questionsAsked,
      actionItems,
      analysisScore
    };

  } catch (error) {
    console.error('❌ Error generating session analytics:', error);

    // Fallback analytics
    return {
      sentimentBreakdown: { positive: 1, neutral: 2, negative: 0 },
      engagementRating: 'medium',
      keywordsDetected: ['property', 'price', 'location'],
      questionsAsked: ['What are your thoughts on this property?'],
      actionItems: ['Follow up with client', 'Send additional information'],
      analysisScore: 65
    };
  }
};

// Helper function to analyze sentence sentiment
const analyzeSentenceSentiment = (sentence: string): 'positive' | 'neutral' | 'negative' => {
  const positiveWords = ['good', 'great', 'excellent', 'love', 'like', 'perfect', 'amazing', 'beautiful', 'nice', 'wonderful'];
  const negativeWords = ['bad', 'hate', 'terrible', 'awful', 'dislike', 'problem', 'issue', 'concern', 'worry', 'expensive'];

  const lowerSentence = sentence.toLowerCase();
  const positiveCount = positiveWords.filter(word => lowerSentence.includes(word)).length;
  const negativeCount = negativeWords.filter(word => lowerSentence.includes(word)).length;

  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
};

// Helper function to extract keywords from transcript
const extractKeywordsFromTranscript = (transcript: string): string[] => {
  const commonRealEstateKeywords = [
    'price', 'location', 'neighborhood', 'schools', 'commute', 'size', 'bedrooms', 'bathrooms',
    'kitchen', 'garage', 'yard', 'basement', 'attic', 'renovation', 'condition', 'market',
    'investment', 'mortgage', 'down payment', 'closing', 'inspection', 'appraisal'
  ];

  const lowerTranscript = transcript.toLowerCase();
  const foundKeywords = commonRealEstateKeywords.filter(keyword =>
    lowerTranscript.includes(keyword)
  );

  return foundKeywords.slice(0, 10);
};

// Helper function to extract questions from transcript
const extractQuestionsFromTranscript = (transcript: string, transcriptSegments: any[]): string[] => {
  const questions: string[] = [];

  // If we have speaker-separated segments, look for client questions
  if (transcriptSegments.length > 0) {
  transcriptSegments.forEach(segment => {
    if (segment.speaker === 'Client' && segment.text.includes('?')) {
      const segmentQuestions = segment.text
        .split('?')
        .filter((q: string) => q.trim().length > 5);
      questions.push(...segmentQuestions.map((q: string) => q.trim() + '?'));
    }
  });
} else {
  const allQuestions = transcript
    .split(/[.!]/)
    .filter((sentence: string) => sentence.includes('?'));
  questions.push(...allQuestions.map((q: string) => q.trim()));
}

  return questions.slice(0, 8); // Limit to top 8 questions
};

// Helper function to extract action items from transcript
const extractActionItemsFromTranscript = (transcript: string): string[] => {
  const actionKeywords = [
    'follow up', 'call back', 'send information', 'schedule', 'arrange', 'provide',
    'get back to', 'check on', 'look into', 'research', 'find out', 'contact'
  ];

  const sentences = transcript.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
  const actionItems: string[] = [];

  sentences.forEach(sentence => {
    const lowerSentence = sentence.toLowerCase();
    if (actionKeywords.some(keyword => lowerSentence.includes(keyword))) {
      actionItems.push(sentence);
    }
  });

  return actionItems.slice(0, 5); // Limit to top 5 action items
};

// 🔒 Secure AI Follow-up Generation via Cloud Function (Legacy - Text Only) - ENHANCED
export const generateFollowUp = async (
  transcript: string,
  clientName: string,
  sessionId?: string,
  propertyContext?: any,
  analysisOptions?: {
    followUpTone?: 'friendly' | 'professional' | 'direct' | 'action-oriented';
    speakerSeparation?: boolean;
    sentimentAnalysis?: boolean;
    keywordExtraction?: boolean;
    generatePersona?: boolean;
    generateVoiceSummary?: boolean;
  }
) => {
  try {
    console.log('🤖 Generating enhanced AI follow-up via secure backend...');
    console.log('🏠 Property Context Available:', !!propertyContext);
    console.log('🔍 Analysis Options:', analysisOptions);

    // 📝 Prepare enhanced prompt for GPT-4 with analysis instructions
    let enhancedPrompt = `You are an expert real estate assistant with advanced conversation analysis capabilities. Based on this transcript, provide comprehensive analysis and generate personalized follow-up messages.
    \n
    Client: ${clientName}
    Conversation Transcript: ${transcript}
    Follow-up Tone: ${analysisOptions?.followUpTone || 'professional'}`;

    // Add property context if available
    if (propertyContext) {
      enhancedPrompt += `\n
    \n
    PROPERTY CONTEXT:
    Address: ${propertyContext.address}
    Type: ${propertyContext.propertyType}
    Price: $${propertyContext.price?.toLocaleString()}
    Size: ${propertyContext.bedrooms} bed, ${propertyContext.bathrooms} bath, ${propertyContext.sqft?.toLocaleString()} sqft
    ${propertyContext.lotSize ? `Lot Size: ${propertyContext.lotSize.toLocaleString()} sqft` : ''}
    ${propertyContext.yearBuilt ? `Year Built: ${propertyContext.yearBuilt}` : ''}
    ${propertyContext.parking ? `Parking: ${propertyContext.parking}` : ''}
    Status: ${propertyContext.status}
    ${propertyContext.propertyFeatures?.length > 0 ? `Features: ${propertyContext.propertyFeatures.join(', ')}` : ''}`;
    }

    enhancedPrompt += `\n
    \n
    ANALYSIS REQUIREMENTS:
    ${analysisOptions?.speakerSeparation ? '- Identify and separate speaker segments (Agent vs Client)' : ''}
    ${analysisOptions?.sentimentAnalysis ? '- Analyze sentiment for each conversation segment' : ''}
    ${analysisOptions?.keywordExtraction ? '- Extract key topics and relevant keywords with frequency analysis' : ''}
    ${analysisOptions?.generatePersona ? '- Generate detailed buyer persona based on conversation' : ''}
    \n
    Please provide a comprehensive analysis and follow-up content in JSON format:
    \n
    {
      "preferences": "Detailed client preferences with property context",
      "objections": "Main concerns with property-specific considerations", 
      "sms": "Personalized SMS in ${analysisOptions?.followUpTone || 'professional'} tone (160 char max)",
      "email": "Professional email in ${analysisOptions?.followUpTone || 'professional'} tone with property details",
      "urgencyLevel": "low|medium|high based on client interest",
      "keyTopics": ["specific topics discussed with property context"],
      "recommendedActions": ["specific next steps with property considerations"],
      "tone": "${analysisOptions?.followUpTone || 'professional'}",
      ${analysisOptions?.speakerSeparation ? '"transcriptSegments": [{"speaker": "Agent|Client", "text": "segment text", "sentiment": "positive|neutral|negative"}],' : ''}
      ${analysisOptions?.sentimentAnalysis ? '"sentimentMap": [{"sentence": "text", "sentiment": "positive|neutral|negative", "confidence": 0.8}],' : ''}
      ${analysisOptions?.keywordExtraction ? '"keywordAnalysis": [{"word": "keyword", "frequency": 3, "relevance": 0.9, "category": "property|price|concern|positive|negative"}],' : ''}
      ${analysisOptions?.speakerSeparation ? '"speakers": ["Agent", "Client"],' : ''}
      ${analysisOptions?.sentimentAnalysis ? '"overallSentiment": "positive|neutral|negative"' : ''}
      ${analysisOptions?.generatePersona ? ',"buyerPersona": {"buyerType": "Investor|First-Time Buyer|etc", "keyMotivations": [], "decisionTimeline": "timeline", "emotionalProfile": "profile"}' : ''}
    }
    \n
    Ensure all content follows the specified ${analysisOptions?.followUpTone || 'professional'} tone and incorporates property-specific insights.`;

    // 🌐 Determine Cloud Function URL based on environment
    const isDevelopment = process.env.NEXT_PUBLIC_IS_DEV === 'true';
    const functionUrl = isDevelopment
      ? 'http://127.0.0.1:5001/showai-23713/us-central1/generateAiFollowUp'
      : 'https://generateaifollowup-x5dsxztz7q-uc.a.run.app';

    console.log('🔗 Using function URL:', functionUrl);

    // 📡 Call Firebase Cloud Function with enhanced options
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: enhancedPrompt,
        sessionId: sessionId || null,
        propertyContext: propertyContext || null,
        // NEW: Analysis configuration
        followUpTone: analysisOptions?.followUpTone || 'professional',
        speakerSeparation: analysisOptions?.speakerSeparation || false,
        sentimentAnalysis: analysisOptions?.sentimentAnalysis || false,
        keywordExtraction: analysisOptions?.keywordExtraction || false,
        generatePersona: analysisOptions?.generatePersona || false,
        generateVoiceSummary: analysisOptions?.generateVoiceSummary || false
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('❌ Cloud Function error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new Error(errorData?.message || `Cloud Function request failed: ${response.status}`);
    }

    // 📊 Parse successful response with enhanced data
    const result = await response.json();

    if (!result.success || !result.data) {
      throw new Error('Invalid response format from Cloud Function');
    }

    console.log('✅ Enhanced AI follow-up generated successfully via backend');
    console.log('📊 Metadata:', result.metadata);

    return result.data;

  } catch (error) {
    console.error('❌ Error generating enhanced AI follow-up:', error);

    // 🚨 Return fallback content with enhanced structure
    const propertyReference = propertyContext ? ` for the ${propertyContext.propertyType.toLowerCase()} at ${propertyContext.address}` : '';

    const fallbackResponse = {
      preferences: `Unable to analyze preferences from transcript. The AI service is temporarily unavailable. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      objections: `Unable to identify concerns from transcript. The AI service is temporarily unavailable. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      sms: `Hi ${clientName}! Thanks for visiting the property${propertyReference} today. Let me know if you have any questions!`,
      email: `Hi ${clientName},\n\nThank you for taking the time to view the property${propertyReference} today. I hope you found it interesting and that it meets some of your requirements.\n\nI'd love to hear your thoughts and answer any questions you might have. Please don't hesitate to reach out if you need any additional information or would like to schedule another viewing.\n\nLooking forward to hearing from you soon!\n\nBest regards,\n[Your Name]`,
      urgencyLevel: 'medium' as const,
      keyTopics: ['property viewing', 'client feedback', 'follow-up required', ...(propertyContext?.propertyFeatures || [])],
      recommendedActions: ['Send follow-up message', 'Schedule callback', 'Prepare additional information'],
      tone: analysisOptions?.followUpTone || 'professional',
      // Enhanced fallback data
      transcriptSegments: [],
      sentimentMap: [],
      keywordAnalysis: [],
      speakers: [],
      overallSentiment: 'neutral' as const,
      buyerPersona: null
    };

    return fallbackResponse;
  }
};

// 🔒 Secure Transcript Analysis via Cloud Function - ENHANCED
export const analyzeTranscript = async (
  transcript: string,
  sessionId?: string,
  analysisOptions?: {
    speakerSeparation?: boolean;
    sentimentAnalysis?: boolean;
    keywordExtraction?: boolean;
    generatePersona?: boolean;
  }
): Promise<{
  sentiment: 'positive' | 'neutral' | 'negative';
  keyTopics: string[];
  urgencyLevel: 'low' | 'medium' | 'high';
  recommendedActions: string[];
  transcriptSegments?: any[];
  sentimentMap?: any[];
  keywordAnalysis?: any[];
  speakers?: string[];
  buyerPersona?: any;
}> => {
  try {
    console.log('🧠 Analyzing transcript with enhanced features via secure backend...');

    const analysisPrompt = `Perform comprehensive real estate conversation analysis on this transcript:\n\n    Transcript: ${transcript}\n\n    Provide analysis including:\n    1. Overall client sentiment (positive/neutral/negative)\n    2. Key topics discussed (max 8 topics)\n    3. Client urgency level (low/medium/high)\n    4. Recommended follow-up actions (max 6 actions)\n    ${analysisOptions?.speakerSeparation ? '5. Speaker identification and segmentation' : ''}\n    ${analysisOptions?.sentimentAnalysis ? '6. Sentence-level sentiment analysis' : ''}\n    ${analysisOptions?.keywordExtraction ? '7. Keyword frequency and relevance analysis' : ''}\n    ${analysisOptions?.generatePersona ? '8. Buyer persona generation' : ''}\n\n    Respond in JSON format with: sentiment, keyTopics (array), urgencyLevel, recommendedActions (array)${analysisOptions?.speakerSeparation ? ', transcriptSegments (array)' : ''}${analysisOptions?.sentimentAnalysis ? ', sentimentMap (array)' : ''}${analysisOptions?.keywordExtraction ? ', keywordAnalysis (array), speakers (array)' : ''}${analysisOptions?.generatePersona ? ', buyerPersona (object)' : ''}`;

    // 🌐 Determine Cloud Function URL based on environment
    const isDevelopment = process.env.NEXT_PUBLIC_IS_DEV === 'true';
    const functionUrl = isDevelopment
      ? 'http://127.0.0.1:5001/showai-23713/us-central1/generateAiFollowUp'
      : 'https://generateaifollowup-x5dsxztz7q-uc.a.run.app';

    // 📡 Call Firebase Cloud Function
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: analysisPrompt,
        sessionId: sessionId || null,
        analysisMode: true,
        speakerSeparation: analysisOptions?.speakerSeparation || false,
        sentimentAnalysis: analysisOptions?.sentimentAnalysis || false,
        keywordExtraction: analysisOptions?.keywordExtraction || false,
        generatePersona: analysisOptions?.generatePersona || false
      })
    });

    if (!response.ok) {
      throw new Error(`Analysis request failed: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      throw new Error('Invalid analysis response format');
    }

    console.log('✅ Enhanced transcript analysis completed via backend');

    // 🔍 Extract enhanced analysis data or provide fallback
    return {
      sentiment: result.data.sentiment || 'neutral',
      keyTopics: result.data.keyTopics || ['general discussion'],
      urgencyLevel: result.data.urgencyLevel || 'medium',
      recommendedActions: result.data.recommendedActions || ['Follow up within 24 hours'],
      transcriptSegments: result.data.transcriptSegments || [],
      sentimentMap: result.data.sentimentMap || [],
      keywordAnalysis: result.data.keywordAnalysis || [],
      speakers: result.data.speakers || [],
      buyerPersona: result.data.buyerPersona || null
    };

  } catch (error) {
    console.error('❌ Error analyzing transcript:', error);

    // 🚨 Return fallback analysis with enhanced structure
    return {
      sentiment: 'neutral',
      keyTopics: ['property viewing', 'client interaction'],
      urgencyLevel: 'medium',
      recommendedActions: ['Schedule follow-up call', 'Send property information'],
      transcriptSegments: [],
      sentimentMap: [],
      keywordAnalysis: [],
      speakers: [],
      buyerPersona: null
    };
  }
};

// 🚫 Deprecated: Legacy OpenAI client functions (kept for backward compatibility)
let openaiClient: any = null;

export const initializeOpenAI = (apiKey: string) => {
  console.warn('⚠️ initializeOpenAI is deprecated. AI processing now handled by secure Cloud Functions.');
  return null;
};

export const getOpenAIClient = () => {
  console.warn('⚠️ getOpenAIClient is deprecated. AI processing now handled by secure Cloud Functions.');
  return null;
};
