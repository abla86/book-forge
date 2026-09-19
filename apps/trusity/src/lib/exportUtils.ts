import PptxGenJS from 'pptxgenjs';
import JSZip from 'jszip';
import html2canvas from 'html2canvas';
import {
  PresentationPlan,
  Slide,
  VideoExportSettings,
  VideoExportProgress,
  VideoExportResult,
} from '../types';
import { THEMES } from '../data/themes';
import {
  recordPresentationVideo,
  captureAllSlideCanvases,
} from './videoRecorder';

export { recordPresentationVideo, captureAllSlideCanvases } from './videoRecorder';
export { createAudioCueEngine } from './audioCues';

/**
 * Generates an authentic Microsoft PowerPoint (.pptx) file using PptxGenJS
 * with styled slide master, shapes, colors, speaker notes, and content layouts.
 */
export async function exportToPPTX(plan: PresentationPlan): Promise<void> {
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_16x9';
  pres.title = plan.title;
  pres.author = plan.presenter || 'Trusity AI';
  pres.subject = plan.subtitle;

  const theme = THEMES[plan.theme] || THEMES.startup;

  // Clean hex colors (remove '#' and handle alpha)
  const cleanHex = (hex: string, defaultHex = '6C63FF'): string => {
    if (!hex) return defaultHex;
    const clean = hex.replace('#', '').trim();
    if (clean.length === 6) return clean;
    if (clean.length === 8) return clean.substring(0, 6);
    return defaultHex;
  };

  const bgHex = cleanHex(theme.bg, '0F0F1A');
  const primaryHex = cleanHex(theme.primary, '6C63FF');
  const accentHex = cleanHex(theme.accent, 'A78BFA');
  const cardBgHex = cleanHex(theme.cardBg, '1A182F');
  const textPrimaryHex = cleanHex(theme.textPrimary, 'FFFFFF');
  const textSecondaryHex = cleanHex(theme.textSecondary, 'A5B4FC');

  plan.slides.forEach((slideItem, index) => {
    const slide = pres.addSlide();

    // Set background color
    slide.background = { color: bgHex };

    // Add speaker notes and reviewer annotations
    let combinedNotes = slideItem.content.speakerNotes || '';
    const stickyNotes = slideItem.metadata?.annotations?.stickyNotes || [];
    if (stickyNotes.length > 0) {
      const formattedAnnotations = stickyNotes
        .filter((n) => n.text.trim())
        .map((n) => `[Review Note by ${n.author || 'Reviewer'} - ${n.resolved ? 'Resolved' : 'Pending'}]: ${n.text}`)
        .join('\n');
      if (formattedAnnotations) {
        combinedNotes = combinedNotes
          ? `${combinedNotes}\n\n--- REVIEW ANNOTATIONS ---\n${formattedAnnotations}`
          : `--- REVIEW ANNOTATIONS ---\n${formattedAnnotations}`;
      }
    }
    if (combinedNotes) {
      slide.addNotes(combinedNotes);
    }

    // Top decorative accent line
    slide.addShape(pres.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 10,
      h: 0.1,
      fill: { color: primaryHex },
      line: { color: primaryHex },
    });

    // Small footer branding & slide number
    slide.addText(`Trusity AI • ${plan.title}`, {
      x: 0.8,
      y: 7.0,
      w: 6.0,
      h: 0.3,
      fontSize: 9,
      color: textSecondaryHex,
      fontFace: 'Arial',
    });

    slide.addText(`${index + 1} / ${plan.slides.length}`, {
      x: 8.5,
      y: 7.0,
      w: 1.0,
      h: 0.3,
      fontSize: 9,
      align: 'right',
      color: textSecondaryHex,
      fontFace: 'Arial',
    });

    // Render by slide layout
    renderSlidePPTX(pres, slide, slideItem, {
      bgHex,
      primaryHex,
      accentHex,
      cardBgHex,
      textPrimaryHex,
      textSecondaryHex,
    });
  });

  const filename = `${plan.title.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Pitch_Deck'}.pptx`;
  await pres.writeFile({ fileName: filename });
}

interface PaletteColors {
  bgHex: string;
  primaryHex: string;
  accentHex: string;
  cardBgHex: string;
  textPrimaryHex: string;
  textSecondaryHex: string;
  cardBorderHex?: string;
}

function renderSlidePPTX(
  pres: PptxGenJS,
  slide: PptxGenJS.Slide,
  slideItem: Slide,
  palette: PaletteColors
) {
  const { content, layout } = slideItem;

  // Title / Centered Hero
  if (layout === 'centered_hero') {
    if (content.badge) {
      slide.addText(content.badge.toUpperCase(), {
        x: 1.5,
        y: 1.8,
        w: 7.0,
        h: 0.4,
        fontSize: 12,
        bold: true,
        color: palette.accentHex,
        align: 'center',
      });
    }

    slide.addText(content.headline, {
      x: 1.0,
      y: 2.3,
      w: 8.0,
      h: 1.8,
      fontSize: 34,
      bold: true,
      color: palette.textPrimaryHex,
      align: 'center',
    });

    if (content.subheadline) {
      slide.addText(content.subheadline, {
        x: 1.5,
        y: 4.2,
        w: 7.0,
        h: 1.2,
        fontSize: 16,
        color: palette.textSecondaryHex,
        align: 'center',
      });
    }

    if (content.ctaAction?.primaryText) {
      slide.addShape(pres.ShapeType.roundRect, {
        x: 3.5,
        y: 5.6,
        w: 3.0,
        h: 0.6,
        fill: { color: palette.primaryHex },
      });
      slide.addText(content.ctaAction.primaryText, {
        x: 3.5,
        y: 5.6,
        w: 3.0,
        h: 0.6,
        fontSize: 14,
        bold: true,
        color: 'FFFFFF',
        align: 'center',
      });
    }
    return;
  }

  // Standard Header for other slides
  if (content.badge) {
    slide.addText(content.badge.toUpperCase(), {
      x: 0.8,
      y: 0.6,
      w: 8.4,
      h: 0.3,
      fontSize: 10,
      bold: true,
      color: palette.accentHex,
    });
  }

  slide.addText(content.headline, {
    x: 0.8,
    y: 0.9,
    w: 8.4,
    h: 0.8,
    fontSize: 24,
    bold: true,
    color: palette.textPrimaryHex,
  });

  if (content.subheadline) {
    slide.addText(content.subheadline, {
      x: 0.8,
      y: 1.7,
      w: 8.4,
      h: 0.45,
      fontSize: 13,
      color: palette.textSecondaryHex,
    });
  }

  const startY = 2.4;

  // Layout: split_with_stat
  if (layout === 'split_with_stat') {
    // Left side: bullet points
    if (content.bulletPoints && content.bulletPoints.length > 0) {
      const bullets = content.bulletPoints.map((b) => ({
        text: b,
        options: { fontSize: 13, color: palette.textPrimaryHex, breakLine: true },
      }));
      slide.addText(bullets, {
        x: 0.8,
        y: startY,
        w: 4.8,
        h: 4.0,
        bullet: true,
        paraSpaceAfter: 12,
      });
    }

    // Right side: big stat card
    if (content.statistic) {
      slide.addShape(pres.ShapeType.roundRect, {
        x: 6.0,
        y: startY,
        w: 3.2,
        h: 3.8,
        fill: { color: palette.cardBgHex },
        line: { color: palette.primaryHex, width: 1.5 },
      });

      slide.addText(content.statistic.number, {
        x: 6.2,
        y: startY + 0.6,
        w: 2.8,
        h: 1.2,
        fontSize: 40,
        bold: true,
        color: palette.primaryHex,
        align: 'center',
      });

      slide.addText(content.statistic.label, {
        x: 6.2,
        y: startY + 1.8,
        w: 2.8,
        h: 0.8,
        fontSize: 14,
        bold: true,
        color: palette.textPrimaryHex,
        align: 'center',
      });

      if (content.statistic.context) {
        slide.addText(content.statistic.context, {
          x: 6.2,
          y: startY + 2.6,
          w: 2.8,
          h: 0.8,
          fontSize: 11,
          color: palette.textSecondaryHex,
          align: 'center',
        });
      }
    }
    return;
  }

  // Layout: metrics_grid
  if (layout === 'metrics_grid') {
    const metrics = content.metrics || [];
    const count = Math.min(metrics.length, 4);
    const cardW = count === 4 ? 1.95 : 2.6;
    const gap = 0.25;

    metrics.slice(0, 4).forEach((m, idx) => {
      const cardX = 0.8 + idx * (cardW + gap);
      slide.addShape(pres.ShapeType.roundRect, {
        x: cardX,
        y: startY,
        w: cardW,
        h: 3.8,
        fill: { color: palette.cardBgHex },
        line: { color: palette.primaryHex, width: 1 },
      });

      slide.addText(m.value, {
        x: cardX + 0.15,
        y: startY + 0.5,
        w: cardW - 0.3,
        h: 1.0,
        fontSize: 30,
        bold: true,
        color: palette.accentHex,
        align: 'center',
      });

      slide.addText(m.label, {
        x: cardX + 0.15,
        y: startY + 1.6,
        w: cardW - 0.3,
        h: 0.8,
        fontSize: 13,
        bold: true,
        color: palette.textPrimaryHex,
        align: 'center',
      });

      if (m.change || m.subtext) {
        slide.addText(m.change || m.subtext || '', {
          x: cardX + 0.15,
          y: startY + 2.5,
          w: cardW - 0.3,
          h: 0.8,
          fontSize: 11,
          color: palette.textSecondaryHex,
          align: 'center',
        });
      }
    });
    return;
  }

  // Layout: comparison_table
  if (layout === 'comparison_table') {
    const rows = content.comparisonRows || [];
    const competitors = content.competitorNames || ['Traditional / Competitors'];
    const compHeader = competitors[0] || 'Competitors';

    const tableData: Array<Array<{ text: string; options?: Record<string, unknown> }>> = [];
    tableData.push([
      { text: 'Capability / Advantage', options: { bold: true, fill: palette.primaryHex, color: 'FFFFFF' } },
      { text: 'Our Solution', options: { bold: true, fill: palette.primaryHex, color: 'FFFFFF', align: 'center' } },
      { text: compHeader, options: { bold: true, fill: palette.primaryHex, color: 'FFFFFF', align: 'center' } },
    ]);

    rows.forEach((r) => {
      tableData.push([
        { text: r.feature, options: { color: palette.textPrimaryHex, fill: palette.cardBgHex } },
        {
          text: r.us === true ? '✓ YES' : String(r.us),
          options: { bold: true, color: palette.accentHex, fill: palette.cardBgHex, align: 'center' },
        },
        {
          text: r.competitors === false ? '✕ NO' : String(r.competitors),
          options: { color: palette.textSecondaryHex, fill: palette.cardBgHex, align: 'center' },
        },
      ]);
    });

    slide.addTable(tableData, {
      x: 0.8,
      y: startY,
      w: 8.4,
      colW: [4.4, 2.0, 2.0],
      fontSize: 12,
      border: { pt: 1, color: palette.primaryHex },
    });
    return;
  }

  // Layout: swot_grid
  if (layout === 'swot_grid') {
    const swot = content.swot || {
      strengths: ['Proprietary technology', 'First-mover advantage'],
      weaknesses: ['Early-stage brand awareness', 'Resource constraints'],
      opportunities: ['Rapidly expanding TAM', 'Global partnerships'],
      threats: ['Legacy incumbent reactions', 'Regulatory changes'],
    };

    const boxes = [
      { title: 'STRENGTHS', items: swot.strengths, x: 0.8, y: startY, color: palette.accentHex },
      { title: 'WEAKNESSES', items: swot.weaknesses, x: 5.2, y: startY, color: palette.textSecondaryHex },
      { title: 'OPPORTUNITIES', items: swot.opportunities, x: 0.8, y: startY + 2.1, color: palette.primaryHex },
      { title: 'THREATS', items: swot.threats, x: 5.2, y: startY + 2.1, color: palette.textSecondaryHex },
    ];

    boxes.forEach((b) => {
      slide.addShape(pres.ShapeType.roundRect, {
        x: b.x,
        y: b.y,
        w: 4.0,
        h: 1.9,
        fill: { color: palette.cardBgHex },
        line: { color: b.color, width: 1 },
      });

      slide.addText(b.title, {
        x: b.x + 0.2,
        y: b.y + 0.15,
        w: 3.6,
        h: 0.3,
        fontSize: 11,
        bold: true,
        color: b.color,
      });

      const items = b.items.map((it) => ({
        text: it,
        options: { fontSize: 10, color: palette.textPrimaryHex, breakLine: true },
      }));

      slide.addText(items, {
        x: b.x + 0.2,
        y: b.y + 0.5,
        w: 3.6,
        h: 1.3,
        bullet: true,
      });
    });
    return;
  }

  // Layout: pricing_table
  if (layout === 'pricing_table') {
    const tiers = content.pricingTiers || [];
    const count = Math.max(tiers.length, 1);
    const cardW = 8.4 / count - 0.2;

    tiers.forEach((tier, idx) => {
      const cardX = 0.8 + idx * (cardW + 0.2);
      slide.addShape(pres.ShapeType.roundRect, {
        x: cardX,
        y: startY,
        w: cardW,
        h: 4.0,
        fill: { color: palette.cardBgHex },
        line: { color: tier.isPopular ? palette.accentHex : palette.primaryHex, width: tier.isPopular ? 2 : 1 },
      });

      slide.addText(tier.name.toUpperCase(), {
        x: cardX + 0.15,
        y: startY + 0.2,
        w: cardW - 0.3,
        h: 0.3,
        fontSize: 12,
        bold: true,
        color: tier.isPopular ? palette.accentHex : palette.textSecondaryHex,
        align: 'center',
      });

      slide.addText(tier.price, {
        x: cardX + 0.15,
        y: startY + 0.55,
        w: cardW - 0.3,
        h: 0.7,
        fontSize: 24,
        bold: true,
        color: palette.textPrimaryHex,
        align: 'center',
      });

      const bullets = tier.features.map((f) => ({
        text: `• ${f}`,
        options: { fontSize: 10, color: palette.textPrimaryHex, breakLine: true },
      }));

      slide.addText(bullets, {
        x: cardX + 0.15,
        y: startY + 1.4,
        w: cardW - 0.3,
        h: 2.3,
      });
    });
    return;
  }

  // Layout: team_cards
  if (layout === 'team_cards') {
    const members = content.teamMembers || [];
    const count = Math.max(members.length, 1);
    const cardW = 8.4 / Math.min(count, 4) - 0.25;

    members.slice(0, 4).forEach((m, idx) => {
      const cardX = 0.8 + idx * (cardW + 0.25);
      slide.addShape(pres.ShapeType.roundRect, {
        x: cardX,
        y: startY,
        w: cardW,
        h: 4.0,
        fill: { color: palette.cardBgHex },
        line: { color: palette.primaryHex, width: 1 },
      });

      // Initials circle
      slide.addShape(pres.ShapeType.ellipse, {
        x: cardX + cardW / 2 - 0.45,
        y: startY + 0.3,
        w: 0.9,
        h: 0.9,
        fill: { color: palette.primaryHex },
      });

      slide.addText(m.avatarInitials || m.name.substring(0, 2).toUpperCase(), {
        x: cardX + cardW / 2 - 0.45,
        y: startY + 0.3,
        w: 0.9,
        h: 0.9,
        fontSize: 14,
        bold: true,
        color: 'FFFFFF',
        align: 'center',
      });

      slide.addText(m.name, {
        x: cardX + 0.1,
        y: startY + 1.3,
        w: cardW - 0.2,
        h: 0.4,
        fontSize: 13,
        bold: true,
        color: palette.textPrimaryHex,
        align: 'center',
      });

      slide.addText(m.role, {
        x: cardX + 0.1,
        y: startY + 1.7,
        w: cardW - 0.2,
        h: 0.3,
        fontSize: 11,
        color: palette.accentHex,
        align: 'center',
      });

      slide.addText(m.bio, {
        x: cardX + 0.15,
        y: startY + 2.1,
        w: cardW - 0.3,
        h: 1.6,
        fontSize: 10,
        color: palette.textSecondaryHex,
        align: 'center',
      });
    });
    return;
  }

  // Layout: quad_grid (2x2 Grid)
  if (layout === 'quad_grid') {
    const points = content.bulletPoints || [];
    const count = Math.min(points.length, 4);
    const cardW = 4.0;
    const cardH = 1.9;
    const gapX = 0.4;
    const gapY = 0.25;

    points.slice(0, count).forEach((bp, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const cardX = 0.8 + col * (cardW + gapX);
      const cardY = startY + row * (cardH + gapY);

      slide.addShape(pres.ShapeType.roundRect, {
        x: cardX,
        y: cardY,
        w: cardW,
        h: cardH,
        fill: { color: palette.cardBgHex },
        line: { color: palette.cardBorderHex || palette.primaryHex, width: 1 },
      });

      const parts = bp.includes(':')
        ? [bp.split(':')[0], bp.split(':').slice(1).join(':').trim()]
        : [`Key Pillar 0${idx + 1}`, bp];

      slide.addText(parts[0], {
        x: cardX + 0.25,
        y: cardY + 0.2,
        w: cardW - 0.5,
        h: 0.4,
        fontSize: 13,
        bold: true,
        color: palette.textPrimaryHex,
      });

      slide.addText(parts[1], {
        x: cardX + 0.25,
        y: cardY + 0.65,
        w: cardW - 0.5,
        h: cardH - 0.8,
        fontSize: 11,
        color: palette.textSecondaryHex,
      });
    });
    return;
  }

  // Layout: three_columns (3 Cards)
  if (layout === 'three_columns') {
    const points = (content.bulletPoints || []).slice(0, 3);
    const cardW = 2.65;
    const gap = 0.22;

    points.forEach((bp, idx) => {
      const cardX = 0.8 + idx * (cardW + gap);
      slide.addShape(pres.ShapeType.roundRect, {
        x: cardX,
        y: startY,
        w: cardW,
        h: 4.1,
        fill: { color: palette.cardBgHex },
        line: { color: palette.cardBorderHex || palette.primaryHex, width: 1 },
      });

      // Accent stripe
      slide.addShape(pres.ShapeType.rect, {
        x: cardX,
        y: startY,
        w: cardW,
        h: 0.08,
        fill: { color: palette.primaryHex },
      });

      const parts = bp.includes(':')
        ? [bp.split(':')[0], bp.split(':').slice(1).join(':').trim()]
        : [`Pillar 0${idx + 1}`, bp];

      slide.addText(parts[0], {
        x: cardX + 0.2,
        y: startY + 0.4,
        w: cardW - 0.4,
        h: 0.5,
        fontSize: 13,
        bold: true,
        color: palette.textPrimaryHex,
      });

      slide.addText(parts[1], {
        x: cardX + 0.2,
        y: startY + 1.0,
        w: cardW - 0.4,
        h: 2.8,
        fontSize: 11,
        color: palette.textSecondaryHex,
      });
    });
    return;
  }

  // Default / Bullet List / Process / Fallback
  if (content.bulletPoints && content.bulletPoints.length > 0) {
    const bullets = content.bulletPoints.map((b) => ({
      text: b,
      options: { fontSize: 13, color: palette.textPrimaryHex, breakLine: true },
    }));

    slide.addText(bullets, {
      x: 0.8,
      y: startY,
      w: 8.4,
      h: 4.2,
      bullet: true,
      paraSpaceAfter: 14,
    });
  }
}

/**
 * Exports the raw presentation plan as a .json file
 */
export function exportToJSON(plan: PresentationPlan): void {
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(plan, null, 2)
  )}`;
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', jsonString);
  downloadAnchor.setAttribute(
    'download',
    `${plan.title.replace(/[^a-zA-Z0-9_-]/g, '_') || 'presentation_plan'}.json`
  );
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Exports all slides as PNG images zipped into an archive
 */
export async function exportToPNGZip(
  plan: PresentationPlan,
  slideElementIds: string[]
): Promise<void> {
  const zip = new JSZip();

  for (let i = 0; i < slideElementIds.length; i++) {
    const el = document.getElementById(slideElementIds[i]);
    if (el) {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const base64 = dataUrl.split(',')[1];
      zip.file(`slide_${String(i + 1).padStart(2, '0')}.png`, base64, { base64: true });
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${plan.title.replace(/[^a-zA-Z0-9_-]/g, '_') || 'slides'}_images.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Exports the complete presentation deck as a formatted Markdown outline (.md)
 */
export function exportToMarkdown(plan: PresentationPlan): void {
  const lines: string[] = [
    `# ${plan.title}`,
    `*${plan.subtitle || 'Pitch Deck Presentation'}*`,
    ``,
    `- **Presenter:** ${plan.presenter || 'Executive Team'}`,
    `- **Theme:** ${plan.theme}`,
    `- **Total Slides:** ${plan.slides.length}`,
    `- **Exported:** ${new Date().toLocaleDateString()}`,
    ``,
    `---`,
    ``,
  ];

  plan.slides.forEach((slide, idx) => {
    lines.push(`## Slide ${idx + 1}: ${slide.content.headline}`);
    lines.push(`**Type:** ${slide.slideType} | **Layout:** ${slide.layout}`);
    if (slide.content.badge) {
      lines.push(`**Badge:** ${slide.content.badge}`);
    }
    if (slide.content.subheadline) {
      lines.push(``);
      lines.push(`> ${slide.content.subheadline}`);
    }
    lines.push(``);

    // Bullet points
    if (slide.content.bulletPoints && slide.content.bulletPoints.length > 0) {
      lines.push(`### Key Points`);
      slide.content.bulletPoints.forEach((bp) => {
        lines.push(`- ${bp}`);
      });
      lines.push(``);
    }

    // Statistic
    if (slide.content.statistic) {
      lines.push(`### Key Metric`);
      lines.push(`**${slide.content.statistic.number}** — ${slide.content.statistic.label}`);
      if (slide.content.statistic.context) {
        lines.push(`*${slide.content.statistic.context}*`);
      }
      lines.push(``);
    }

    // Metrics grid
    if (slide.content.metrics && slide.content.metrics.length > 0) {
      lines.push(`### Metrics`);
      slide.content.metrics.forEach((m) => {
        lines.push(`- **${m.value}**: ${m.label} ${m.change ? `(${m.change})` : ''}`);
      });
      lines.push(``);
    }

    // Speaker notes
    if (slide.content.speakerNotes) {
      lines.push(`#### Speaker Script / Presenter Notes:`);
      lines.push(`_${slide.content.speakerNotes}_`);
      lines.push(``);
    }

    // Annotations
    const stickyNotes = slide.metadata?.annotations?.stickyNotes || [];
    if (stickyNotes.length > 0) {
      lines.push(`#### Reviewer Sticky Notes:`);
      stickyNotes.forEach((sn) => {
        lines.push(
          `- [${sn.resolved ? 'Resolved' : 'Pending'}] **${sn.author || 'Reviewer'}**: ${sn.text}`
        );
      });
      lines.push(``);
    }

    lines.push(`---`);
    lines.push(``);
  });

  const mdString = `data:text/markdown;charset=utf-8,${encodeURIComponent(lines.join('\n'))}`;
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', mdString);
  downloadAnchor.setAttribute(
    'download',
    `${plan.title.replace(/[^a-zA-Z0-9_-]/g, '_') || 'presentation_outline'}.md`
  );
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Programmatic export of presentation to high-quality MP4/WebM video
 * using MediaRecorder API and synchronized Web Audio API cues.
 */
export async function exportToMP4(
  plan: PresentationPlan,
  slideElementIds: string[],
  customSettings?: Partial<VideoExportSettings>,
  onProgress?: (progress: VideoExportProgress) => void
): Promise<VideoExportResult> {
  const settings: VideoExportSettings = {
    resolution: '1080p',
    slideDuration: 4.5,
    transitionStyle: 'slide',
    transitionDuration: 0.8,
    audioCues: true,
    introOutroAudio: true,
    ambientMusic: true,
    audioVolume: 0.85,
    showCaptions: true,
    showProgressBar: true,
    enableAudioMonitor: false,
    ...customSettings,
  };

  const slideCanvases = await captureAllSlideCanvases(slideElementIds);
  return recordPresentationVideo({
    plan,
    slideCanvases,
    settings,
    onProgress: onProgress || (() => {}),
  });
}


