import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

function getFallbackUrl(name: string, charClass: string, seedModifier: string = 'v1'): string {
  const seed = encodeURIComponent(`${name}-${charClass}-${seedModifier}`);
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&radius=12`;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Generate or Regenerate cartoon/video game style portrait
  app.post('/api/generate-portrait', async (req, res) => {
    const { name = 'Adventurer', class: charClass = 'Warrior', race = 'Hero', seed = 'v1' } = req.body || {};

    const classVisuals: Record<string, string> = {
      Rogue: 'hooded assassin, shadowy leather armor, wielding dual glowing daggers, stealthy expression',
      Mage: 'arcane wizard robes, mystical glyphs, clutching a glowing crystal staff, glowing eyes',
      Warrior: 'heavy knight plate armor, holding a steel broadsword and shield, battle-tested helm',
      Ranger: 'forest scout cloak, leather bracers, holding an elven longbow, quiver of feathered arrows',
      Paladin: 'gleaming holy plate armor with golden trim, glowing sacred hammer, halo of radiant light',
      Necromancer: 'dark skull-trimmed vestments, holding a bone staff with eerie necrotic green and purple soul flames',
    };

    const visualStyle = classVisuals[charClass] || 'fantasy adventurer armor and equipment';
    const prompt = `A vibrant cartoon and video game style portrait of a fantasy ${charClass} named ${name}, ${race} race, ${visualStyle}. Video game character art, colorful stylized digital illustration, RPG game avatar icon, expressive, clean dark-accented background, crisp outlines, high quality video game asset`;

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        // First attempt with gemini-3.1-flash-lite-image
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite-image',
            contents: {
              parts: [{ text: prompt }],
            },
            config: {
              imageConfig: {
                aspectRatio: '1:1',
              },
            },
          });

          const candidates = response.candidates;
          if (candidates && candidates.length > 0) {
            for (const part of candidates[0].content?.parts || []) {
              if (part.inlineData && part.inlineData.data) {
                const mimeType = part.inlineData.mimeType || 'image/png';
                return res.json({
                  imageUrl: `data:${mimeType};base64,${part.inlineData.data}`,
                  source: 'gemini',
                  message: 'Generated cartoon/video game style portrait via Gemini AI',
                });
              }
            }
          }
        } catch (liteErr: unknown) {
          console.warn('gemini-3.1-flash-lite-image call attempt:', (liteErr as Error)?.message || liteErr);
        }

        // Secondary attempt with imagen-3.0-generate-002
        try {
          const imgResponse = await ai.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt,
            config: {
              numberOfImages: 1,
              aspectRatio: '1:1',
              outputMimeType: 'image/jpeg',
            },
          });

          const generatedImages = imgResponse.generatedImages;
          if (generatedImages && generatedImages.length > 0 && generatedImages[0].image?.imageBytes) {
            return res.json({
              imageUrl: `data:image/jpeg;base64,${generatedImages[0].image.imageBytes}`,
              source: 'gemini',
              message: 'Generated cartoon/video game style portrait via Imagen AI',
            });
          }
        } catch (imgErr: unknown) {
          console.warn('imagen-3.0-generate-002 call attempt:', (imgErr as Error)?.message || imgErr);
        }
      } catch (err: unknown) {
        console.error('Error during AI image generation:', (err as Error)?.message || err);
      }
    }

    // High quality cartoon/video game style fallback
    const fallbackUrl = getFallbackUrl(name, charClass, seed);
    return res.json({
      imageUrl: fallbackUrl,
      source: 'fallback',
      message: 'Generated cartoon/video game style portrait',
    });
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
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
