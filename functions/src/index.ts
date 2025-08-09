import { onRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';
import * as logger from 'firebase-functions/logger';
import { defineString } from 'firebase-functions/params';

const SCRAPER_URL = defineString('SCRAPER_URL'); // set via functions:secrets:set

setGlobalOptions({ region: 'us-central1' });
admin.initializeApp();

console.log('🚀 Firebase Functions module loaded');
console.log('🔧 Node.js version:', process.version);
console.log('🔧 Environment:', process.env.NODE_ENV || 'production');



// ✅ Load .env only in local emulator
if (process.env.FUNCTIONS_EMULATOR === 'true') {
  require('dotenv').config();
  console.log("✅ .env loaded locally");
  console.log("🔑 OPENAI_KEY =", process.env.OPENAI_KEY?.slice(0, 8));
}

// ✅ 1. generateAiFollowUp
export const generateAiFollowUp = onRequest(
  {
    secrets: ['OPENAI_KEY'],
  },
  async (req, res) => {
    // Handle CORS for Vercel frontend
    res.set('Access-Control-Allow-Origin', 'https://realtor-ai-mu.vercel.app');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Allow-Credentials', 'true');
    
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

      const finalPrompt = prompt || `Generate a ${followUpTone || 'professional'} real estate follow-up for ${safeClientName} based on the following transcript:

"${transcript}"

Consider the following context:
${speakerSeparation ? '- The transcript has speaker separation.' : ''}
${sentimentAnalysis ? '- Perform sentiment analysis on the client statements.' : ''}
${keywordExtraction ? '- Identify key themes or keywords.' : ''}
${generatePersona ? '- Optionally generate insights into the client persona.' : ''}
${generateVoiceSummary ? '- Prepare a short spoken version of the follow-up.' : ''}

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
}`.trim();

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
      const result = await response.json() as any;
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
    // Handle CORS for Vercel frontend
    res.set('Access-Control-Allow-Origin', 'https://realtor-ai-mu.vercel.app');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Allow-Credentials', 'true');
    
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
      const result = await response.json() as any;
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

const ALLOWED_ORIGINS = new Set([
  'https://realtor-ai-mu.vercel.app',
  'http://localhost:3000',
]);

function setCors(res: any, origin?: string) {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : '';
  if (allow) {
    res.setHeader('Access-Control-Allow-Origin', allow);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export const importPropertyFromText = onRequest({ region: 'us-central1' }, async (req, res): Promise<void> => {
  const origin = req.get('Origin') || undefined;

  // Preflight
  if (req.method === 'OPTIONS') {
    setCors(res, origin);
    res.status(204).send(''); // no body
    return;
  }

  setCors(res, origin); // ensure CORS on all subsequent responses

  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { text, userId, city, state } = body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Missing or invalid "text"' });
      return;
    }

    const cloudRunUrl = SCRAPER_URL.value() || process.env.SCRAPER_URL;
    if (!cloudRunUrl) {
      logger.error('SCRAPER_URL not set');
      res.status(500).json({ error: 'Server not configured (SCRAPER_URL missing)' });
      return;
    }

    const payload: any = { text, userId };
    if (city) payload.city = city;
    if (state) payload.state = state;

    const upstream = await fetch(cloudRunUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const ct = upstream.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await upstream.json() : await upstream.text();

    if (!upstream.ok) {
      logger.error('Scraper error', { status: upstream.status, data });
      res.status(upstream.status).json({ error: 'Scraper error', details: data });
      return;
    }

    res.status(200).json(data);
    return;
  } catch (err: any) {
    logger.error('importPropertyFromText failed', { error: err?.message });
    // setCors was already called above; headers are present here too
    res.status(500).json({ error: 'Internal error', details: err?.message || String(err) });
    return;
  }
});