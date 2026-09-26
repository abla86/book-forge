import express from 'express';
import http from 'http';
import crypto from 'crypto';
import path from 'path';
import { WebSocketServer } from 'ws';
import { createServer as createViteServer } from 'vite';
import {
  generatePresentationPlan,
  regenerateSingleSlide,
  polishPresentationDeck,
} from './server/storyEngine';
import { THEMES } from './src/data/themes';
import {
  setupCollaborationWebSocket,
  getSessionData,
  createOrUpdateSession,
} from './server/collaborationServer';
import {
  analyzeSlideVisualContext,
  searchStockPhotos,
  generateProceduralVisual,
  STOCK_PHOTOS,
} from './server/imageService';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const httpServer = http.createServer(app);

  // Lightweight abuse protection for the independently deployable Trusity service.
  // This is intentionally in-memory: deployment-specific distributed rate limiting
  // should be provided by the hosting platform when multiple replicas are used.
  const requestBuckets = new Map<string, { windowStart: number; count: number }>();
  const AI_RATE_LIMIT = 20;
  const AI_RATE_WINDOW_MS = 60 * 60 * 1000;
  const MAX_TEXT_INPUT = 10_000;
  const MAX_PLAN_BYTES = 1_500_000;
  const MAX_COLLAB_REQUESTS_PER_MINUTE = 30;
  const collaborationBuckets = new Map<string, { windowStart: number; count: number }>();

  function clientIp(req: express.Request): string {
    return req.ip || req.socket.remoteAddress || "unknown";
  }

  function rateLimitByIp(
    buckets: Map<string, { windowStart: number; count: number }>,
    limit: number,
    windowMs: number,
    req: express.Request,
    res: express.Response,
  ): boolean {
    const key = clientIp(req);
    const now = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || now - bucket.windowStart >= windowMs) {
      buckets.set(key, { windowStart: now, count: 1 });
      return false;
    }
    bucket.count += 1;
    if (bucket.count > limit) {
      res.setHeader("Retry-After", String(Math.ceil((windowMs - (now - bucket.windowStart)) / 1000)));
      return true;
    }
    return false;
  }

  function aiAbuseGuard(req: express.Request, res: express.Response, next: express.NextFunction) {
    if (rateLimitByIp(requestBuckets, AI_RATE_LIMIT, AI_RATE_WINDOW_MS, req, res)) {
      return res.status(429).json({ error: "Rate limit exceeded. Please try again later." });
    }
    return next();
  }

  function validateText(value: unknown, field: string): string | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== "string") throw new Error(`${field} must be a string.`);
    if (value.length > MAX_TEXT_INPUT) throw new Error(`${field} is too long.`);
    return value;
  }

  setInterval(() => {
    const cutoff = Date.now() - AI_RATE_WINDOW_MS;
    for (const [key, bucket] of requestBuckets) {
      if (bucket.windowStart < cutoff) requestBuckets.delete(key);
    }
  }, AI_RATE_WINDOW_MS).unref();

  // Initialize WebSocket server for Real-Time Collaboration
  const wss = new WebSocketServer({ noServer: true });
  setupCollaborationWebSocket(wss);

  httpServer.on('upgrade', (request, socket, head) => {
    try {
      const host = request.headers.host;
      const origin = request.headers.origin;
      if (!host || (origin && origin !== `http://${host}` && origin !== `https://${host}`)) {
        socket.write('HTTP/1.1 403 Forbidden\\r\\nConnection: close\\r\\n\\r\\n');
        socket.destroy();
        return;
      }
      if (process.env.NODE_ENV === 'production' && !origin) {
        socket.write('HTTP/1.1 403 Forbidden\\r\\nConnection: close\\r\\n\\r\\n');
        socket.destroy();
        return;
      }
      const url = new URL(request.url || '', `http://${host}`);
      if (url.pathname === '/ws' || url.pathname === '/ws/collaboration') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      }
    } catch (err) {
      console.error('[WebSocket Upgrade Error]', err);
    }
  });

  // JSON body parser with generous limit for presentation plans
  app.use(express.json({ limit: '2mb', strict: true }));

  // API Route: Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Trusity AI Presentation Generator',
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
      collaborationWebSocketReady: true,
      time: new Date().toISOString(),
    });
  });

  // API Route: Get available themes
  app.get('/api/themes', (req, res) => {
    res.json({
      themes: Object.values(THEMES),
    });
  });

  // API Route: Generate presentation plan
  app.post('/api/generate', aiAbuseGuard, async (req, res) => {
    try {
      const {
        idea,
        theme = 'startup',
        tone = 'persuasive',
        presenterName = 'Founder & CEO',
        companyName,
        targetAudience,
        slideCount = 8,
      } = req.body;

      if (!idea || typeof idea !== 'string' || idea.trim().length === 0 || idea.length > MAX_TEXT_INPUT) {
        res.status(400).json({ error: 'Please provide a business idea to generate slides.' });
        return;
      }

      const plan = await generatePresentationPlan({
        idea: idea.trim(),
        theme,
        tone,
        presenterName,
        companyName,
        targetAudience,
        slideCount: Number(slideCount) || 8,
      });

      res.json(plan);
    } catch (error: any) {
      console.error('Error generating presentation:', error);
      res.status(500).json({
        error: error?.message || 'Failed to generate presentation plan.',
      });
    }
  });

  // API Route: Refine / Regenerate a single slide
  app.post('/api/regenerate-slide', aiAbuseGuard, async (req, res) => {
    try {
      const { slide, instruction, analysis } = req.body;
      if (Buffer.byteLength(JSON.stringify(slide || {}), 'utf8') > MAX_PLAN_BYTES) return res.status(413).json({ error: 'Slide payload is too large.' });
      if (!slide || !instruction) {
        res.status(400).json({ error: 'slide and instruction are required.' });
        return;
      }

      const updatedSlide = await regenerateSingleSlide(slide, instruction, analysis);
      res.json({ slide: updatedSlide });
    } catch (error: any) {
      console.error('Error regenerating slide:', error);
      res.status(500).json({
        error: error?.message || 'Failed to regenerate slide.',
      });
    }
  });

  // API Route: Professional Polish across all slides in presentation
  app.post('/api/polish-deck', aiAbuseGuard, async (req, res) => {
    try {
      const { plan, targetTone, focusAreas, customInstruction } = req.body;
      if (Buffer.byteLength(JSON.stringify(plan || {}), 'utf8') > MAX_PLAN_BYTES) return res.status(413).json({ error: 'Presentation payload is too large.' });
      if (!plan || !plan.slides || !Array.isArray(plan.slides)) {
        res.status(400).json({ error: 'A valid presentation plan with slides is required.' });
        return;
      }

      const result = await polishPresentationDeck(plan, {
        targetTone,
        focusAreas,
        customInstruction,
      });

      res.json(result);
    } catch (error: any) {
      console.error('Error polishing presentation deck:', error);
      res.status(500).json({
        error: error?.message || 'Failed to polish presentation deck.',
      });
    }
  });

  // API Route: Get collaboration session data
  app.get('/api/collaboration/session/:sessionId', (req, res) => {
    try {
      if (rateLimitByIp(collaborationBuckets, MAX_COLLAB_REQUESTS_PER_MINUTE, 60_000, req, res)) return res.status(429).json({ error: 'Too many collaboration requests.' });
      if (!/^[A-Za-z0-9_-]{6,64}$/.test(req.params.sessionId)) return res.status(400).json({ error: 'Invalid session id.' });
      const { sessionId } = req.params;
      const session = getSessionData(sessionId);
      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }
      res.json(session);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to retrieve session' });
    }
  });

  // API Route: Create or update collaboration session
  app.post('/api/collaboration/session/create', (req, res) => {
    try {
      if (rateLimitByIp(collaborationBuckets, MAX_COLLAB_REQUESTS_PER_MINUTE, 60_000, req, res)) return res.status(429).json({ error: 'Too many collaboration requests.' });
      const { sessionId, plan, hostName } = req.body;
      if (sessionId !== undefined && (typeof sessionId !== 'string' || !/^[A-Za-z0-9_-]{6,64}$/.test(sessionId))) return res.status(400).json({ error: 'Invalid session id.' });
      if (plan !== undefined && Buffer.byteLength(JSON.stringify(plan), 'utf8') > MAX_PLAN_BYTES) return res.status(413).json({ error: 'Presentation payload is too large.' });
      if (hostName !== undefined && (typeof hostName !== 'string' || hostName.length > 80)) return res.status(400).json({ error: 'Invalid host name.' });
      const targetId = sessionId || `pitch-${crypto.randomBytes(16).toString('hex')}`;
      const session = createOrUpdateSession(targetId, plan, hostName);
      res.json(session);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create session' });
    }
  });

  // API Route: Analyze slide context for visual recommendations & AI prompt
  app.post('/api/images/analyze', aiAbuseGuard, async (req, res) => {
    try {
      const { slide, themeName, fullPlanTitle } = req.body;
      if (!slide) {
        res.status(400).json({ error: 'slide object is required for visual analysis.' });
        return;
      }

      const analysis = await analyzeSlideVisualContext(slide, themeName, fullPlanTitle);
      res.json(analysis);
    } catch (error: any) {
      console.error('Error analyzing visual context:', error);
      res.status(500).json({
        error: error?.message || 'Failed to analyze slide visual context.',
      });
    }
  });

  // API Route: Search curated stock photos
  app.post('/api/images/search', (req, res) => {
    try {
      const { query, category, aspectRatio, limit } = req.body;
      const results = searchStockPhotos(query, category, aspectRatio, limit ? Number(limit) : 24);
      res.json({ results, total: results.length });
    } catch (error: any) {
      console.error('Error searching stock photos:', error);
      res.status(500).json({
        error: error?.message || 'Failed to search stock photos.',
      });
    }
  });

  // GET variant for query string searches
  app.get('/api/images/search', (req, res) => {
    try {
      const query = typeof req.query.query === 'string' ? req.query.query : undefined;
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      const aspectRatio = typeof req.query.aspectRatio === 'string' ? req.query.aspectRatio : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : 24;

      const results = searchStockPhotos(query, category, aspectRatio, limit);
      res.json({ results, total: results.length });
    } catch (error: any) {
      console.error('Error searching stock photos:', error);
      res.status(500).json({
        error: error?.message || 'Failed to search stock photos.',
      });
    }
  });

  // API Route: Generate bespoke procedural vector / SVG visual
  app.post('/api/images/generate', aiAbuseGuard, (req, res) => {
    try {
      const { prompt, stylePreset, aspectRatio, themePrimary, themeSecondary, headline } = req.body;
      if (Buffer.byteLength(JSON.stringify(req.body), 'utf8') > MAX_PLAN_BYTES) return res.status(413).json({ error: 'Request payload is too large.' });
      const visualAsset = generateProceduralVisual({
        prompt: prompt || 'Strategic technology diagram',
        stylePreset: stylePreset || 'isometric_pipeline',
        aspectRatio: aspectRatio || '16:9',
        themePrimary,
        themeSecondary,
        headline,
      });
      res.json({ visualAsset });
    } catch (error: any) {
      console.error('Error generating procedural visual:', error);
      res.status(500).json({
        error: error?.message || 'Failed to generate visual.',
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Trusity AI Presentation Generator server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
