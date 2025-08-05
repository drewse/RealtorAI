import { onRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';

setGlobalOptions({ region: 'us-central1' });
admin.initializeApp();

// ✅ Load .env only in local emulator
if (process.env.FUNCTIONS_EMULATOR === 'true') {
  require('dotenv').config();
  console.log("✅ .env loaded locally");
  console.log("🔑 OPENAI_KEY =", process.env.OPENAI_KEY?.slice(0, 8));
}

// ✅ Helper for CORS setup
const setCorsHeaders = (res: any) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

// ✅ 1. generateAiFollowUp
export const generateAiFollowUp = onRequest(
  {
    secrets: ['OPENAI_KEY'],
  },
  async (req, res) => {
    setCorsHeaders(res);
    if (req.method === 'OPTIONS') {
      res.status(200).send('');
      return;
    }

    try {
      // 🔧 UPDATED: Use Firebase Functions v2 secrets instead of deprecated config()
      const openaiApiKey = (process.env.OPENAI_KEY || process.env.OPENAI_API_KEY || '').trim();

      console.log("🔐 OPENAI_KEY partial (cleaned):", JSON.stringify(openaiApiKey?.slice(0, 10)));

      if (!openaiApiKey || !openaiApiKey.startsWith('sk-')) {
        throw new Error('❌ OPENAI_KEY is missing or malformed. Make sure it is set using: firebase functions:secrets:set OPENAI_KEY');
      }

      if (openaiApiKey.startsWith('Bearer ')) {
        throw new Error('❌ OPENAI_KEY should not include "Bearer " prefix — please update the secret');
      }

      const {
        prompt,
        transcript,
        clientName,
        sessionId,
        tags = [],
        propertyContext = null,
        followUpTone,
        speakerSeparation,
        sentimentAnalysis,
        keywordExtraction,
        generatePersona,
        generateVoiceSummary,
      } = req.body;

      if (!prompt && !transcript) throw new Error('Either prompt or transcript is required');
      const safeClientName = clientName || 'Client';

      const finalPrompt = prompt || `
Generate a ${followUpTone || 'professional'} real estate follow-up for ${safeClientName} based on the following transcript:

"${transcript}"

Consider the following context:
${speakerSeparation ? '- The transcript has speaker separation.\n' : ''}
${sentimentAnalysis ? '- Perform sentiment analysis on the client’s statements.\n' : ''}
${keywordExtraction ? '- Identify key themes or keywords.\n' : ''}
${generatePersona ? '- Optionally generate insights into the client’s persona.\n' : ''}
${generateVoiceSummary ? '- Prepare a short spoken version of the follow-up.\n' : ''}

Respond ONLY with valid JSON in the following format:
{
  "preferences": "string",
  "objections": ["string"],
  "sms": "string",
  "email": "string",
  "urgencyLevel": "low | medium | high",
  "keyTopics": ["string"],
  "recommendedActions": ["string"],
  "tone": "friendly | professional | action-oriented | direct"
}
`.trim();

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`,
          'OpenAI-Beta': 'assistants=v1',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a professional real estate assistant generating personalized follow-ups. Return valid JSON with preferences, objections, sms, email, urgencyLevel, keyTopics, recommendedActions, tone.',
            },
            {
              role: 'user',
              content: finalPrompt,
            },
          ],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
  const errorText = await response.text(); // 🔍 Log body
  console.error("❌ OpenAI response error:", response.status, errorText);
  throw new Error(`OpenAI API error: ${response.status}`);
}
      const result = await response.json();
      const aiContent = result.choices[0]?.message?.content;
      console.log("🔎 Raw AI content:", aiContent);

      let parsed;
      try {
        parsed = JSON.parse(aiContent);
      } catch {
        parsed = {
          preferences: aiContent || 'General interest',
          objections: ['See follow-up'],
          sms: `Hi ${clientName}! Thanks for visiting today. Any questions?`,
          email: aiContent || `Hi ${clientName}, thank you for attending. Let me know if you need anything!`,
          urgencyLevel: 'medium',
          keyTopics: tags || ['real estate'],
          recommendedActions: ['Send email follow-up'],
          tone: 'professional',
        };
      }

      res.status(200).json({
        success: true,
        data: parsed,
        metadata: {
          timestamp: new Date().toISOString(),
          clientName,
          transcript: transcript || null,
          sessionId: sessionId || null,
          propertyContext: propertyContext || null,
        },
      });
    } catch (error) {
      console.error("❌ Error generating follow-up:", error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate follow-up',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// ✅ 2. generateBuyerPersona
export const generateBuyerPersona = onRequest(
  {
    secrets: ['OPENAI_KEY'],
  },
  async (req, res) => {
    setCorsHeaders(res);
    if (req.method === 'OPTIONS') {
      res.status(200).send('');
      return;
    }

    try {
      // 🔧 UPDATED: Use Firebase Functions v2 secrets instead of deprecated config()
      const openaiApiKey = (process.env.OPENAI_KEY || process.env.OPENAI_API_KEY || '').trim();

      console.log("🔐 OPENAI_KEY partial (cleaned):", JSON.stringify(openaiApiKey?.slice(0, 10)));

      if (!openaiApiKey || !openaiApiKey.startsWith('sk-')) {
        throw new Error('❌ OPENAI_KEY is missing or malformed. Make sure it is set using: firebase functions:secrets:set OPENAI_KEY');
      }

      if (openaiApiKey.startsWith('Bearer ')) {
        throw new Error('❌ OPENAI_KEY should not include "Bearer " prefix — please update the secret');
      }

      const { prompt, transcript, clientName, sessionId } = req.body;
      if (!transcript && !prompt) throw new Error('Transcript or prompt required');

      const personaPrompt = prompt || `Analyze this conversation to create a buyer persona for ${clientName}: ${transcript}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`,
          'OpenAI-Beta': 'assistants=v1',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a real estate assistant generating buyer personas. Return valid JSON only.',
            },
            {
              role: 'user',
              content: personaPrompt,
            },
          ],
          max_tokens: 800,
          temperature: 0.4,
        }),
      });

      if (!response.ok) {
  const errorText = await response.text(); // 🔍 Log body
  console.error("❌ OpenAI response error:", response.status, errorText);
  throw new Error(`OpenAI API error: ${response.status}`);
}
      const result = await response.json();
      const aiContent = result.choices[0]?.message?.content;

      let persona;
      try {
        persona = JSON.parse(aiContent);
      } catch {
        persona = {
          clientName: clientName || '',
          buyerType: 'General',
          keyMotivations: ['Information gathering'],
          decisionTimeline: 'Undecided',
          budgetRange: { min: 0, max: 0, flexibility: 'Flexible' },
          locationPreferences: [],
          propertyFeaturePriorities: [],
          emotionalProfile: 'Unknown',
          communicationPreference: 'Mixed',
          concerns: ['None specified'],
          positiveSignals: [],
          recommendedStrategy: 'Send more listings',
          confidenceScore: 0.5,
        };
      }

      res.status(200).json({
        success: true,
        data: persona,
        metadata: {
          timestamp: new Date().toISOString(),
          sessionId,
        },
      });
    } catch (error) {
      console.error("❌ Error generating buyer persona:", error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate buyer persona',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// ✅ 3. regenerateFollowUps - Batch regeneration for legacy recordings
export const regenerateFollowUps = onRequest(
  {
    secrets: ['OPENAI_KEY'],
  },
  async (req, res) => {
    setCorsHeaders(res);
    if (req.method === 'OPTIONS') {
      res.status(200).send('');
      return;
    }

    try {
      // 🔧 UPDATED: Use Firebase Functions v2 secrets instead of deprecated config()
      const openaiApiKey = (process.env.OPENAI_KEY || process.env.OPENAI_API_KEY || '').trim();

      console.log("🔐 OPENAI_KEY partial (cleaned):", JSON.stringify(openaiApiKey?.slice(0, 10)));

      if (!openaiApiKey || !openaiApiKey.startsWith('sk-')) {
        throw new Error('❌ OPENAI_KEY is missing or malformed. Make sure it is set using: firebase functions:secrets:set OPENAI_KEY');
      }

      if (openaiApiKey.startsWith('Bearer ')) {
        throw new Error('❌ OPENAI_KEY should not include "Bearer " prefix — please update the secret');
      }

      const { userId, recordingIds } = req.body;
      
      if (!userId) {
        throw new Error('User ID is required');
      }

      console.log(`🔄 Starting follow-up regeneration for user: ${userId}`);
      console.log(`📝 Recording IDs to process: ${recordingIds?.length || 'all'}`);

      // Get recordings that need regeneration
      const db = admin.firestore();
      const recordingsRef = db.collection('recordings');
      let query = recordingsRef.where('uid', '==', userId);
      
      if (recordingIds && recordingIds.length > 0) {
        query = recordingsRef.where('uid', '==', userId).where(admin.firestore.FieldPath.documentId(), 'in', recordingIds);
      }

      const snapshot = await query.get();
      const recordings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

      console.log(`📊 Found ${recordings.length} recordings to process`);

      const results = {
        total: recordings.length,
        processed: 0,
        succeeded: 0,
        failed: 0,
        skipped: 0,
        details: [] as any[]
      };

      for (const recording of recordings) {
        try {
          console.log(`🔄 Processing recording: ${recording.id} - ${recording.clientName}`);

          // Check if recording needs regeneration
          const needsRegeneration = 
            !recording.aiFollowUpFinal ||
            (recording.summary && recording.summary.includes('API key required')) ||
            (recording.smsText && recording.smsText.includes('API key required')) ||
            (recording.emailText && recording.emailText.includes('API key required'));

          if (!needsRegeneration) {
            console.log(`⏭️ Skipping recording ${recording.id} - already has valid follow-up`);
            results.skipped++;
            results.details.push({
              recordingId: recording.id,
              clientName: recording.clientName,
              status: 'skipped',
              reason: 'Already has valid follow-up data'
            });
            continue;
          }

          if (!recording.transcript) {
            console.log(`⚠️ Skipping recording ${recording.id} - no transcript available`);
            results.skipped++;
            results.details.push({
              recordingId: recording.id,
              clientName: recording.clientName,
              status: 'skipped',
              reason: 'No transcript available'
            });
            continue;
          }

          // Generate new follow-up
          const prompt = `Generate a professional real estate follow-up for ${recording.clientName} based on the following transcript:

"${recording.transcript}"

Consider the following context:
- The transcript has speaker separation.
- Perform sentiment analysis on the client's statements.
- Identify key themes or keywords.
- Optionally generate insights into the client's persona.
- Prepare a short spoken version of the follow-up.

Respond ONLY with valid JSON in the following format:
{
  "preferences": "string",
  "objections": ["string"],
  "sms": "string",
  "email": "string",
  "urgencyLevel": "low | medium | high",
  "keyTopics": ["string"],
  "recommendedActions": ["string"],
  "tone": "friendly | professional | action-oriented | direct"
}`;

          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openaiApiKey}`,
              'OpenAI-Beta': 'assistants=v1',
            },
            body: JSON.stringify({
              model: 'gpt-3.5-turbo',
              messages: [
                {
                  role: 'system',
                  content: 'You are a professional real estate assistant generating personalized follow-ups. Return valid JSON with preferences, objections, sms, email, urgencyLevel, keyTopics, recommendedActions, tone.',
                },
                {
                  role: 'user',
                  content: prompt,
                },
              ],
              max_tokens: 1000,
              temperature: 0.7,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ OpenAI response error:", response.status, errorText);
            throw new Error(`OpenAI API error: ${response.status}`);
          }

          const result = await response.json();
          const aiContent = result.choices[0]?.message?.content;
          console.log("🔎 Raw AI content:", aiContent);

          let parsed;
          try {
            parsed = JSON.parse(aiContent);
          } catch {
            parsed = {
              preferences: aiContent || 'General interest',
              objections: ['See follow-up'],
              sms: `Hi ${recording.clientName}! Thanks for visiting today. Any questions?`,
              email: aiContent || `Hi ${recording.clientName}, thank you for attending. Let me know if you need anything!`,
              urgencyLevel: 'medium',
              keyTopics: recording.tags || ['real estate'],
              recommendedActions: ['Send email follow-up'],
              tone: 'professional',
            };
          }

          // Save to Firestore
          const recordingRef = db.collection('recordings').doc(recording.id);
          await recordingRef.update({
            aiFollowUpFinal: {
              ...parsed,
              generatedAt: admin.firestore.FieldValue.serverTimestamp()
            },
            status: 'follow-up-ready',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          console.log(`✅ Successfully regenerated follow-up for recording: ${recording.id}`);
          results.succeeded++;
          results.details.push({
            recordingId: recording.id,
            clientName: recording.clientName,
            status: 'success',
            urgencyLevel: parsed.urgencyLevel,
            keyTopics: parsed.keyTopics?.length || 0,
            recommendedActions: parsed.recommendedActions?.length || 0
          });

        } catch (error) {
          console.error(`❌ Failed to regenerate follow-up for recording ${recording.id}:`, error);
          results.failed++;
          results.details.push({
            recordingId: recording.id,
            clientName: recording.clientName,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }

        results.processed++;
      }

      console.log(`📊 Regeneration complete:`, results);

      res.status(200).json({
        success: true,
        data: results,
        metadata: {
          timestamp: new Date().toISOString(),
          userId,
          totalRecordings: recordings.length
        },
      });

    } catch (error) {
      console.error("❌ Error in batch follow-up regeneration:", error);
      res.status(500).json({
        success: false,
        error: 'Failed to regenerate follow-ups',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);
