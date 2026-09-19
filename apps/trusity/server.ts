import express from 'express';
import http from 'http';
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
  const PORT = 3000;
  const httpServer = http.createServer(app);

  // Initialize WebSocket server for Real-Time Collaboration
  const wss = new WebSocketServer({ noServer: true });
  setupCollaborationWebSocket(wss);

  httpServer.on('upgrade', (request, socket, head) => {
    try {
      const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
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
  app.use(express.json({ limit: '10mb' }));

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
  app.post('/api/generate', async (req, res) => {
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

      if (!idea || typeof idea !== 'string' || idea.trim().length === 0) {
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
  app.post('/api/regenerate-slide', async (req, res) => {
    try {
      const { slide, instruction, analysis } = req.body;
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
  app.post('/api/polish-deck', async (req, res) => {
    try {
      const { plan, targetTone, focusAreas, customInstruction } = req.body;
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
      const { sessionId, plan, hostName } = req.body;
      const targetId = sessionId || `pitch-${Math.random().toString(36).substring(2, 8)}`;
      const session = createOrUpdateSession(targetId, plan, hostName);
      res.json(session);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create session' });
    }
  });

  // API Route: Analyze slide context for visual recommendations & AI prompt
  app.post('/api/images/analyze', async (req, res) => {
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
  app.post('/api/images/generate', (req, res) => {
    try {
      const { prompt, stylePreset, aspectRatio, themePrimary, themeSecondary, headline } = req.body;
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
