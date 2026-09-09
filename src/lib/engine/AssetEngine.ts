// =====================================================================
// BookForge AI - Creative Asset & Visual Generation Engine
// Provides high-fidelity Cover Art, Illustrations, and Visual Bible Assets
// =====================================================================

import { GoogleGenAI } from "@google/genai";
import { CreativeAsset, BookProject, VisualBible, BookSpecification } from "../../types";
import { db } from "../db";
import { CostGuard } from "./CostGuard";
import { AuditLogger, AuthUser } from "../security";

export interface AssetGenerationRequest {
  projectId: string;
  type: "cover_front" | "cover_back" | "illustration" | "character_portrait" | "map";
  title: string;
  customPrompt?: string;
  chapterNumber?: number;
  characterName?: string;
  aspectRatio?: string;
}

export class AssetEngine {
  private static instance: AssetEngine | null = null;

  public static getInstance(): AssetEngine {
    if (!AssetEngine.instance) {
      AssetEngine.instance = new AssetEngine();
    }
    return AssetEngine.instance;
  }

  /**
   * Builds the Visual Bible for a book project.
   */
  public generateVisualBible(spec: BookSpecification, project: BookProject): VisualBible {
    const genreLower = (spec.genre || project.genre || "").toLowerCase();

    let artStyle = "Cinematic Realism with painterly atmospheric depth";
    let colorPalette = ["#1A2530", "#3E5871", "#B88E50", "#E8DFD8", "#0B1015"];
    let lightingMood = "Volumetric ambient fog with dramatic key lighting";

    if (genreLower.includes("krim") || genreLower.includes("spenning") || genreLower.includes("noir")) {
      artStyle = "Nordic Noir, high-contrast chiaroscuro, desaturated tones";
      colorPalette = ["#0F141C", "#263238", "#455A64", "#90A4AE", "#C62828"];
      lightingMood = "Cold rain-slicked asphalt, low-key streetlamps, heavy shadows";
    } else if (genreLower.includes("fantasy") || genreLower.includes("eventyr")) {
      artStyle = "High Fantasy oil painting, intricate filigree, gilded luminous accents";
      colorPalette = ["#1B122A", "#382354", "#A77B28", "#E2C37A", "#0E0717"];
      lightingMood = "Ethereal moonlight, glowing runes, golden dusk backlight";
    } else if (genreLower.includes("sci-fi") || genreLower.includes("science")) {
      artStyle = "Hard Sci-Fi concept art, industrial architecture, neon luminescence";
      colorPalette = ["#0A0E17", "#162B3D", "#00B4D8", "#90E0EF", "#0077B6"];
      lightingMood = "Cold LED strips, bioluminescent atmospheric haze, harsh directional stars";
    }

    const characterVisualGuidelines: Record<string, string> = {};
    for (const char of project.characters || []) {
      characterVisualGuidelines[char.name] = `${char.name} (${char.role}): ${char.archetype}, distinctive features, practical wardrobe reflecting their conflict and role.`;
    }

    const settingVisualGuidelines: Record<string, string> = {};
    for (const loc of project.locations || []) {
      settingVisualGuidelines[loc.name] = `${loc.name}: ${loc.atmosphere}, architectural nuances, environmental weather conditions.`;
    }

    const visualBible: VisualBible = {
      artStyle,
      colorPalette,
      lightingMood,
      typographyFamily: project.coverStyle.includes("historisk") ? "Cinzel Decorative Serif" : "Playfair Display & Inter",
      characterVisualGuidelines,
      settingVisualGuidelines,
    };

    project.visualBible = visualBible;
    db.saveProject(project);

    return visualBible;
  }

  /**
   * Generates a high-quality visual asset prompt based on the book specification and visual bible.
   */
  public buildPrompt(
    project: BookProject,
    request: AssetGenerationRequest,
    visualBible?: VisualBible
  ): { prompt: string; negativePrompt: string } {
    const vb = visualBible || project.visualBible || this.generateVisualBible(
      {
        title: project.title,
        author: project.author,
        originalIdea: project.idea,
        genre: project.genre,
        subgenre: "",
        tone: project.tone,
        audience: "Allmenn",
        language: "Norsk",
        pov: project.pov,
        targetWords: project.targetWords,
        targetChapters: project.targetChapters,
        acts: project.acts,
        synopsis: project.synopsis,
        themes: [],
        setting: project.locations[0]?.name || "Norge",
        timePeriod: "Nåtid",
        chapterTargets: [],
      },
      project
    );

    const negativePrompt = "blurry, low resolution, amateur, deformed text, watermarks, signature, oversaturated, disjointed limbs, generic stock photo";

    if (request.type === "cover_front") {
      const prompt = `Professional book cover artwork for "${project.title}" by ${project.author}. Genre: ${project.genre}. Style: ${vb.artStyle}. Mood: ${vb.lightingMood}. Color palette: ${vb.colorPalette.join(", ")}. Motifs: ${project.idea}. Center composition suitable for title typography overlay, vertical format 2:3 aspect ratio, award-winning publishing house standard, 8k render quality, cinematic depth.`;
      return { prompt, negativePrompt };
    }

    if (request.type === "cover_back") {
      const prompt = `Atmospheric back cover background artwork matching "${project.title}". Seamless ambient mood, ${vb.artStyle}, generous dark negative space in the center and lower third for blurb text typography and barcode placement, harmonious continuation of front cover palette: ${vb.colorPalette.join(", ")}.`;
      return { prompt, negativePrompt };
    }

    if (request.type === "illustration" && request.chapterNumber) {
      const chap = project.chapters.find((c) => c.number === request.chapterNumber);
      const sceneSummary = chap ? chap.summary : request.title;
      const prompt = `Editorial book chapter interior illustration for Chapter ${request.chapterNumber}: «${chap?.title || request.title}». Scene: ${sceneSummary}. Visual style: ${vb.artStyle}, ${vb.lightingMood}. Highly detailed composition capturing emotional tension and physical environment.`;
      return { prompt, negativePrompt };
    }

    if (request.type === "character_portrait" && request.characterName) {
      const char = project.characters.find((c) => c.name.toLowerCase() === request.characterName?.toLowerCase());
      const charDetails = char ? `${char.archetype}, ${char.background}` : "Hovedkarakter";
      const prompt = `Character concept portrait of ${request.characterName}. Description: ${charDetails}. Visual guidelines: ${vb.characterVisualGuidelines[request.characterName || ""] || vb.artStyle}. Intimate lighting, expressive facial emotion reflecting their core struggle, painterly texture.`;
      return { prompt, negativePrompt };
    }

    return {
      prompt: `${request.title}. Visual style: ${vb.artStyle}, mood: ${vb.lightingMood}. Theme: ${project.idea}.`,
      negativePrompt,
    };
  }

  /**
   * Generates or synthesizes a real CreativeAsset.
   * If Gemini / Imagen is configured and available, generates a photographic/illustrative render.
   * Also synthesizes an ultra-clean, vector-grade SVG graphic asset for instantaneous offline rendering.
   */
  public async generateAsset(
    project: BookProject,
    request: AssetGenerationRequest,
    aiClient: GoogleGenAI | null,
    user: AuthUser
  ): Promise<CreativeAsset> {
    const { prompt, negativePrompt } = this.buildPrompt(project, request);
    const assetId = `asset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    let generatedImageUrl: string | undefined = undefined;

    // Try AI Image generation if client is available
    if (aiClient) {
      try {
        console.log(`[AssetEngine] Attempting image generation via Imagen for ${request.type}...`);
        // Attempt generation using standard model Imagen 3 if supported by the credentials
        const imagenResponse = await (aiClient.models as any).generateImages?.({
          model: "imagen-3.0-generate-002",
          prompt,
          config: {
            numberOfImages: 1,
            aspectRatio: request.aspectRatio || (request.type === "cover_front" || request.type === "cover_back" ? "3:4" : "16:9"),
            outputMimeType: "image/jpeg",
          },
        });

        if (imagenResponse?.generatedImages?.[0]?.image?.imageBytes) {
          generatedImageUrl = `data:image/jpeg;base64,${imagenResponse.generatedImages[0].image.imageBytes}`;
          CostGuard.recordUsage({
            userId: user.id,
            projectId: project.id,
            action: "GENERATE_IMAGE_ASSET",
            inputTokens: 1000,
            outputTokens: 2000,
          });
        }
      } catch (imgErr: any) {
        console.warn("[AssetEngine] Imagen direct call unavailable or quota limited, synthesizing vector visual:", imgErr?.message || imgErr);
      }
    }

    // Synthesize structured vector visual representation
    const svgData = this.synthesizeArtworkSvg(project, request, prompt);

    const asset: CreativeAsset = {
      id: assetId,
      projectId: project.id,
      type: request.type,
      title: request.title,
      prompt,
      negativePrompt,
      url: generatedImageUrl,
      svgData,
      aspectRatio: request.aspectRatio || (request.type === "cover_front" ? "2:3" : "16:9"),
      status: "ready",
      metadata: {
        generatedWith: generatedImageUrl ? "imagen-3.0-generate-002" : "vector_visual_synthesizer",
        genre: project.genre,
        chapterNumber: request.chapterNumber,
        characterName: request.characterName,
      },
      createdAt: new Date().toISOString(),
    };

    // Persist asset
    db.saveAsset(asset);

    // If it's a cover, update the project covers
    if (request.type === "cover_front") {
      if (!project.covers) project.covers = [];
      const primaryCover = project.covers[0];
      if (primaryCover) {
        primaryCover.assetId = asset.id;
        primaryCover.imageUrl = generatedImageUrl;
        primaryCover.prompt = prompt;
      } else {
        project.covers.push({
          id: `cover_${Date.now()}`,
          title: project.title,
          author: project.author,
          tagline: project.idea.slice(0, 60),
          gradient: "from-slate-900 to-indigo-950",
          style: project.coverStyle,
          badge: "BookForge Masterpiece",
          fontStyle: "cinzel",
          assetId: asset.id,
          imageUrl: generatedImageUrl,
          prompt,
        });
      }
      db.saveProject(project);
    }

    AuditLogger.log({
      actorId: user.id,
      actorRole: user.role,
      action: "GENERATE_ASSET",
      projectId: project.id,
      status: "SUCCESS",
      metadata: { assetId, type: request.type, title: request.title },
    });

    return asset;
  }

  /**
   * Synthesizes an elegant, scalable SVG vector artwork representation
   * for reliable zero-latency preview and printing.
   */
  private synthesizeArtworkSvg(
    project: BookProject,
    request: AssetGenerationRequest,
    prompt: string
  ): string {
    const isCover = request.type === "cover_front" || request.type === "cover_back";
    const width = isCover ? 600 : 800;
    const height = isCover ? 900 : 450;

    const colors = project.visualBible?.colorPalette || ["#0F172A", "#1E293B", "#334155", "#E2E8F0", "#D97706"];
    const c1 = colors[0] || "#0B1015";
    const c2 = colors[1] || "#1E293B";
    const accent = colors[2] || "#D97706";

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="60%" stop-color="${c2}"/>
      <stop offset="100%" stop-color="${c1}"/>
    </linearGradient>
    <radialGradient id="ambientLight" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${c1}" stop-opacity="0"/>
    </radialGradient>
    <filter id="noiseFilter">
      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.08 0"/>
    </filter>
  </defs>

  <!-- Background Canvas -->
  <rect width="${width}" height="${height}" fill="url(#bgGrad)"/>
  <rect width="${width}" height="${height}" fill="url(#ambientLight)"/>
  <rect width="${width}" height="${height}" filter="url(#noiseFilter)"/>

  <!-- Decorative Border Frame -->
  <rect x="24" y="24" width="${width - 48}" height="${height - 48}" fill="none" stroke="${accent}" stroke-width="1.5" stroke-opacity="0.4"/>
  <rect x="32" y="32" width="${width - 64}" height="${height - 64}" fill="none" stroke="${accent}" stroke-width="0.75" stroke-opacity="0.25"/>

  <!-- Central Visual Emblem -->
  <g transform="translate(${width / 2}, ${isCover ? height * 0.42 : height * 0.5})">
    <circle r="${isCover ? 90 : 70}" fill="none" stroke="${accent}" stroke-width="2" stroke-opacity="0.6"/>
    <circle r="${isCover ? 120 : 95}" fill="none" stroke="${accent}" stroke-width="0.75" stroke-dasharray="6,4" stroke-opacity="0.4"/>
    <polygon points="0,-60 52,30 -52,30" fill="none" stroke="${accent}" stroke-width="1.5" stroke-opacity="0.5"/>
    <polygon points="0,60 -52,-30 52,-30" fill="none" stroke="${accent}" stroke-width="1.5" stroke-opacity="0.5"/>
  </g>

  <!-- Typographic Display -->
  ${
    isCover
      ? `
  <text x="${width / 2}" y="120" text-anchor="middle" fill="#FFFFFF" font-family="Cinzel, serif" font-size="28" font-weight="700" letter-spacing="4">${escapeXml(
          project.title
        )}</text>
  <text x="${width / 2}" y="160" text-anchor="middle" fill="${accent}" font-family="Inter, sans-serif" font-size="13" font-weight="600" letter-spacing="3">${escapeXml(
          project.genre.toUpperCase()
        )}</text>
  <text x="${width / 2}" y="${height - 90}" text-anchor="middle" fill="#E2E8F0" font-family="Inter, sans-serif" font-size="15" font-weight="500" letter-spacing="2">${escapeXml(
          project.author
        )}</text>
  <text x="${width / 2}" y="${height - 60}" text-anchor="middle" fill="${accent}" font-family="Inter, sans-serif" font-size="10" font-weight="600" letter-spacing="4">BOOKFORGE AI MASTERPIECE</text>
  `
      : `
  <text x="${width / 2}" y="${height - 40}" text-anchor="middle" fill="#E2E8F0" font-family="Inter, sans-serif" font-size="14" font-weight="500">${escapeXml(
          request.title
        )}</text>
  `
  }
</svg>`;
  }
}

function escapeXml(unsafe: string): string {
  return (unsafe || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const assetEngine = AssetEngine.getInstance();
