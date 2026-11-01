import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  GoogleGenAI,
  Type,
  type GenerateContentResponse,
} from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is missing. Please verify your API key in the Settings > Secrets panel.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface GroundingSource {
  title: string;
  uri: string;
}

function isQuotaOrRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.toLowerCase().includes('quota') ||
    msg.toLowerCase().includes('rate limit')
  );
}

let searchCooldownUntil = 0;

function isRetriableModelError(err: unknown): boolean {
  if (isQuotaOrRateLimitError(err)) return true;
  const msg = err instanceof Error ? err.message : String(err);
  const name = err instanceof Error ? err.name : '';
  return (
    name === 'AbortError' ||
    name === 'TimeoutError' ||
    msg.includes('503') ||
    msg.includes('502') ||
    msg.includes('UNAVAILABLE') ||
    msg.toLowerCase().includes('high demand') ||
    msg.toLowerCase().includes('overloaded') ||
    msg.toLowerCase().includes('aborted') ||
    msg.toLowerCase().includes('timed out')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const ANALYSIS_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    refinedTitle: {
      type: Type.STRING,
      description:
        'A crisp, clear 3 to 7 word title summarizing the core idea.',
    },
    corePremise: {
      type: Type.STRING,
      description:
        '1 to 2 lucid sentences translating what the sleepy note actually proposes or observes.',
    },
    subconsciousInsight: {
      type: Type.STRING,
      description:
        'Why this thought surfaced right before sleep: the underlying friction, connection, or opportunity.',
    },
    realityCheck: {
      type: Type.STRING,
      description:
        'Grounded feasibility and prior-art check: mention real existing products, methods, or technical considerations.',
    },
    properNote: {
      type: Type.STRING,
      description:
        'A clean, well-written 1-paragraph expanded note that preserves and elevates the original thought for permanent keeping.',
    },
    actionSteps: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
      },
      description:
        '3 concrete, low-friction actions the user can take in 15-30 minutes today to validate or explore the idea.',
    },
  },
  required: [
    'refinedTitle',
    'corePremise',
    'subconsciousInsight',
    'realityCheck',
    'properNote',
    'actionSteps',
  ],
};

async function generateAnalysisWithFallback(
  ai: GoogleGenAI,
  prompt: string
): Promise<GenerateContentResponse> {
  const systemInstruction =
    'You are the Morning Idea Analyst inside TwilightNote. Your job is to translate sleepy, fragmented hypnagogic notes into lucid, grounded, and encouraging morning briefs. Be specific, objective, and practical. Avoid hype, buzzwords, or filler.';

  const canTrySearch = Date.now() >= searchCooldownUntil;

  const attempts: {
    model: string;
    useSearch: boolean;
    timeoutMs: number;
    backoffMs: number;
  }[] = [
    ...(canTrySearch
      ? [
          {
            model: 'gemini-3.8-flash',
            useSearch: true,
            timeoutMs: 6500,
            backoffMs: 0,
          },
        ]
      : []),
    {
      model: 'gemini-3.1-flash-lite',
      useSearch: false,
      timeoutMs: 12000,
      backoffMs: 0,
    },
    {
      model: 'gemini-3.8-flash',
      useSearch: false,
      timeoutMs: 12000,
      backoffMs: 150,
    },
    {
      model: 'gemini-flash-latest',
      useSearch: false,
      timeoutMs: 12000,
      backoffMs: 200,
    },
  ];

  let lastError: unknown = null;

  for (const attempt of attempts) {
    if (attempt.backoffMs > 0) {
      await sleep(attempt.backoffMs);
    }

    try {
      return await ai.models.generateContent({
        model: attempt.model,
        contents: prompt,
        config: {
          systemInstruction,
          abortSignal: AbortSignal.timeout(attempt.timeoutMs),
          ...(attempt.useSearch ? { tools: [{ googleSearch: {} }] } : {}),
          responseMimeType: 'application/json',
          responseSchema: ANALYSIS_RESPONSE_SCHEMA,
        },
      });
    } catch (err: unknown) {
      lastError = err;
      if (attempt.useSearch && isRetriableModelError(err)) {
        // Pause search-grounding attempts for 10 minutes when free-tier search quota is exhausted
        searchCooldownUntil = Date.now() + 10 * 60_000;
      }
      if (isRetriableModelError(err)) {
        continue;
      }
      throw err;
    }
  }

  throw lastError ?? new Error('Unable to complete Gemini analysis.');
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/analyze', async (req, res) => {
    try {
      const { rawNote, capturedAt } = req.body as {
        rawNote?: string;
        capturedAt?: string;
      };

      if (!rawNote || typeof rawNote !== 'string' || !rawNote.trim()) {
        res
          .status(400)
          .json({ error: 'Please write a thought before running analysis.' });
        return;
      }

      const ai = getGenAIClient();

      const prompt = `The user captured the following half-asleep thought at ${
        capturedAt || 'late night'
      }:

"""
${rawNote.trim()}
"""

Decipher this fragmented late-night note, evaluate real-world context (existing tools, scientific principles, market landscape, or prior art), and turn it into a clear, well-structured morning brief.`;

      const response = await generateAnalysisWithFallback(ai, prompt);

      const rawText = (response.text ?? '').trim();
      let parsed: {
        refinedTitle: string;
        corePremise: string;
        subconsciousInsight: string;
        realityCheck: string;
        properNote: string;
        actionSteps: string[];
      };

      try {
        const cleaned = rawText
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/, '')
          .trim();
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = {
          refinedTitle: 'Morning Synthesis',
          corePremise: rawText.slice(0, 280) || 'Idea captured and reviewed.',
          subconsciousInsight:
            'Captured during late-night associative thinking.',
          realityCheck: rawText,
          properNote: rawText,
          actionSteps: [
            'Sketch a 5-minute outline of the core mechanism.',
            'Search for 2 existing approaches and note what they miss.',
            'Test the simplest version today.',
          ],
        };
      }

      const sources: GroundingSource[] = [];
      const seenUris = new Set<string>();
      const chunks =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      for (const chunk of chunks) {
        const uri = chunk.web?.uri;
        const title = chunk.web?.title;
        if (uri && !seenUris.has(uri)) {
          seenUris.add(uri);
          sources.push({
            title: title || new URL(uri).hostname.replace(/^www\./, ''),
            uri,
          });
        }
      }

      res.json({
        analysis: {
          ...parsed,
          sources: sources.slice(0, 6),
          analyzedAt: Date.now(),
        },
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unexpected analysis error.';

      if (
        message.includes('API_KEY_INVALID') ||
        message.includes('PERMISSION_DENIED') ||
        message.includes('403')
      ) {
        console.warn('Gemini authentication warning: check API key configuration.');
        res.status(403).json({
          error:
            'Unable to authenticate with Gemini. Please check your API key in the Settings > Secrets panel.',
        });
        return;
      }

      if (isQuotaOrRateLimitError(err)) {
        console.warn('Gemini rate limit reached across fallback models.');
        res.status(429).json({
          error:
            'Your Gemini API quota is temporarily exhausted. Wait about 60 seconds and click Retry Research, or select a billing-enabled API key in Settings > Secrets for higher limits.',
        });
        return;
      }

      console.warn('Gemini analysis request failed:', message.slice(0, 180));
      res.status(500).json({
        error: 'Analysis could not be completed right now. Please try again shortly.',
      });
    }
  });

  const { createServer: createHttpServer } = await import('node:http');
  const httpServer = createHttpServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`TwilightNote server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
