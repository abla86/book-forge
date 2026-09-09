// =====================================================================
// BookForge AI - ExportEngine (Real On-Demand EPUB, PDF & DOCX Generator)
// =====================================================================

import JSZip from "jszip";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { BookProject } from "../../types";

export interface ExportResult {
  filename: string;
  blob: Blob;
  mimeType: string;
  sizeBytes: number;
}

export class ExportEngine {
  /**
   * Generates a fully compliant EPUB 3 document archive.
   */
  static async generateEPUB(project: BookProject): Promise<ExportResult> {
    const zip = new JSZip();
    const dateStr = new Date().toISOString().split("T")[0];
    const identifier = `urn:uuid:${project.id}`;

    // 1. mimetype (MUST be uncompressed, first entry)
    zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

    // 2. META-INF/container.xml
    zip.file(
      "META-INF/container.xml",
      `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
    );

    // 3. CSS
    const css = `
body { font-family: "Georgia", serif; font-size: 1.05em; line-height: 1.65; margin: 5%; color: #1a1a1a; }
h1, h2, h3 { font-family: "Cinzel", "Times New Roman", serif; font-weight: bold; text-align: center; color: #111827; }
h1.book-title { font-size: 2.2em; margin-top: 30vh; margin-bottom: 0.2em; letter-spacing: 0.05em; }
p.author { text-align: center; font-size: 1.2em; font-style: italic; margin-bottom: 4em; }
.colophon { margin-top: 50vh; font-size: 0.85em; line-height: 1.5; color: #4b5563; }
.chapter-title { font-size: 1.6em; margin-top: 2em; margin-bottom: 0.2em; page-break-before: always; }
.chapter-sub { text-align: center; font-size: 0.9em; font-style: italic; color: #6b7280; margin-bottom: 2em; }
p { text-indent: 1.5em; margin: 0 0 0.5em 0; }
p.no-indent { text-indent: 0; }
nav#toc ol { list-style-type: none; padding: 0; }
nav#toc li { margin: 0.5em 0; }
`;
    zip.file("OEBPS/stylesheet.css", css);

    // 4. Title page
    const titleHtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="no">
<head>
  <title>${escapeXml(project.title)}</title>
  <link rel="stylesheet" type="text/css" href="stylesheet.css"/>
</head>
<body>
  <div style="text-align: center; padding-top: 20vh;">
    <h1 class="book-title">${escapeXml(project.title)}</h1>
    <p class="author">av ${escapeXml(project.author)}</p>
    <div style="margin-top: 3em; font-size: 0.9em; color: #6b7280;">
      <p class="no-indent">Sjanger: ${escapeXml(project.genre)}</p>
      <p class="no-indent">Tone: ${escapeXml(project.tone)}</p>
    </div>
  </div>
</body>
</html>`;
    zip.file("OEBPS/title.xhtml", titleHtml);

    // 5. Colophon
    const colophonHtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="no">
<head>
  <title>Kolofon</title>
  <link rel="stylesheet" type="text/css" href="stylesheet.css"/>
</head>
<body>
  <div class="colophon">
    <p class="no-indent"><strong>${escapeXml(project.title)}</strong></p>
    <p class="no-indent">Opphavsrett © 2026 ${escapeXml(project.author)}. Alle rettigheter forbeholdt.</p>
    <p class="no-indent">Utgitt via BookForge AI Studio.</p>
    <p class="no-indent">ISBN: Ikke tildelt (Not assigned)</p>
    <p class="no-indent" style="margin-top: 2em;">${escapeXml(project.synopsis)}</p>
  </div>
</body>
</html>`;
    zip.file("OEBPS/colophon.xhtml", colophonHtml);

    // 6. Chapters (Clearly distinguishes WRITTEN from PLANNED)
    project.chapters.forEach((chap) => {
      const isWritten = Boolean(chap.content && chap.content.trim().length > 0);
      let parasHtml = "";

      if (isWritten) {
        parasHtml = (chap.content || "")
          .split("\n\n")
          .filter(Boolean)
          .map((p, idx) => `<p class="${idx === 0 ? "no-indent" : ""}">${escapeXml(p)}</p>`)
          .join("\n");
      } else {
        parasHtml = `
          <div style="margin: 2em 0; padding: 1em; border-left: 3px solid #94a3b8; background: #f8fafc; color: #475569; font-style: italic;">
            <p class="no-indent"><strong>Status: Planlagt kapittel (ennå ikke forfattet)</strong></p>
            <p class="no-indent">Disposisjon og handling: ${escapeXml(chap.summary || "Ingen disposisjon oppgitt.")}</p>
          </div>
        `;
      }

      const chapHtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="no">
<head>
  <title>Kapittel ${chap.number}: ${escapeXml(chap.title)}</title>
  <link rel="stylesheet" type="text/css" href="stylesheet.css"/>
</head>
<body>
  <div class="chapter">
    <h2 class="chapter-title">Kapittel ${chap.number}</h2>
    <div class="chapter-sub">${escapeXml(chap.title)}${!isWritten ? " — (Planlagt)" : ""}</div>
    ${parasHtml}
  </div>
</body>
</html>`;
      zip.file(`OEBPS/chapter_${chap.number}.xhtml`, chapHtml);
    });

    // 7. Navigation document (nav.xhtml)
    const tocItems = project.chapters
      .map(
        (c) =>
          `<li><a href="chapter_${c.number}.xhtml">Kapittel ${c.number}: ${escapeXml(c.title)}</a></li>`
      )
      .join("\n");

    const navHtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="no">
<head>
  <title>Innholdsfortegnelse</title>
  <link rel="stylesheet" type="text/css" href="stylesheet.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h2>Innholdsfortegnelse</h2>
    <ol>
      <li><a href="title.xhtml">Tittelside</a></li>
      <li><a href="colophon.xhtml">Kolofon</a></li>
      ${tocItems}
    </ol>
  </nav>
</body>
</html>`;
    zip.file("OEBPS/nav.xhtml", navHtml);

    // 8. content.opf
    const manifestItems = project.chapters
      .map(
        (c) =>
          `<item id="chap-${c.number}" href="chapter_${c.number}.xhtml" media-type="application/xhtml+xml"/>`
      )
      .join("\n    ");

    const spineItems = project.chapters
      .map((c) => `<itemref idref="chap-${c.number}"/>`)
      .join("\n    ");

    const opf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookID">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookID">${identifier}</dc:identifier>
    <dc:title>${escapeXml(project.title)}</dc:title>
    <dc:creator>${escapeXml(project.author)}</dc:creator>
    <dc:language>no</dc:language>
    <dc:date>${dateStr}</dc:date>
    <dc:description>${escapeXml(project.synopsis)}</dc:description>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}/, "")}</meta>
  </metadata>
  <manifest>
    <item id="css" href="stylesheet.css" media-type="text/css"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>
    <item id="colophon" href="colophon.xhtml" media-type="application/xhtml+xml"/>
    ${manifestItems}
  </manifest>
  <spine>
    <itemref idref="title"/>
    <itemref idref="colophon"/>
    <itemref idref="nav"/>
    ${spineItems}
  </spine>
</package>`;
    zip.file("OEBPS/content.opf", opf);

    const blob = await zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
    const filename = `${sanitizeFilename(project.title)}.epub`;
    return {
      filename,
      blob,
      mimeType: "application/epub+zip",
      sizeBytes: blob.size,
    };
  }

  /**
   * Generates a fully compliant Microsoft Word (.docx) package with proper headers, styles, and page breaks.
   */
  static async generateDOCX(project: BookProject): Promise<ExportResult> {
    const zip = new JSZip();

    // 1. [Content_Types].xml
    zip.file(
      "[Content_Types].xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`
    );

    // 2. _rels/.rels
    zip.file(
      "_rels/.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
    );

    // 3. word/_rels/document.xml.rels
    zip.file(
      "word/_rels/document.xml.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
    );

    // 4. word/styles.xml
    zip.file(
      "word/styles.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
        <w:sz w:val="24"/>
        <w:szCs w:val="24"/>
        <w:lang w:val="nb-NO"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:rPr>
      <w:b/>
      <w:sz w:val="36"/>
      <w:szCs w:val="36"/>
    </w:rPr>
  </w:style>
</w:styles>`
    );

    // 5. word/document.xml
    let bodyXml = "";

    // Title page
    bodyXml += `
<w:p>
  <w:pPr><w:jc w:val="center"/><w:spacing w:before="3600" w:after="400"/></w:pPr>
  <w:r><w:rPr><w:b/><w:sz w:val="52"/></w:rPr><w:t>${escapeXml(project.title)}</w:t></w:r>
</w:p>
<w:p>
  <w:pPr><w:jc w:val="center"/><w:spacing w:after="4000"/></w:pPr>
  <w:r><w:rPr><w:i/><w:sz w:val="28"/></w:rPr><w:t>Av ${escapeXml(project.author)}</w:t></w:r>
</w:p>
<w:p>
  <w:pPr><w:jc w:val="center"/><w:spacing w:after="200"/></w:pPr>
  <w:r><w:rPr><w:sz w:val="20"/><w:color w:val="666666"/></w:rPr><w:t>BookForge AI Publishing Studio • ${escapeXml(project.genre)} • ${escapeXml(project.tone)}</w:t></w:r>
</w:p>
<w:p>
  <w:r><w:br w:type="page"/></w:r>
</w:p>`;

    // Colophon & Synopsis
    bodyXml += `
<w:p>
  <w:pPr><w:spacing w:before="1200" w:after="240"/></w:pPr>
  <w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>KOLOFON</w:t></w:r>
</w:p>
<w:p>
  <w:pPr><w:spacing w:after="160"/></w:pPr>
  <w:r><w:t>Tittel: ${escapeXml(project.title)}</w:t></w:r>
</w:p>
<w:p>
  <w:pPr><w:spacing w:after="160"/></w:pPr>
  <w:r><w:t>Forfatter: ${escapeXml(project.author)}</w:t></w:r>
</w:p>
<w:p>
  <w:pPr><w:spacing w:after="400"/></w:pPr>
  <w:r><w:t>Opphavsrett © 2026 ${escapeXml(project.author)}. Alle rettigheter forbeholdt.</w:t></w:r>
</w:p>
<w:p>
  <w:pPr><w:spacing w:after="240"/></w:pPr>
  <w:r><w:rPr><w:b/></w:rPr><w:t>SYNOPSIS</w:t></w:r>
</w:p>
<w:p>
  <w:pPr><w:spacing w:after="600"/><w:ind w:firstLine="720"/></w:pPr>
  <w:r><w:t>${escapeXml(project.synopsis)}</w:t></w:r>
</w:p>
<w:p>
  <w:r><w:br w:type="page"/></w:r>
</w:p>`;

    // Chapters
    project.chapters.forEach((chap) => {
      bodyXml += `
<w:p>
  <w:pPr>
    <w:jc w:val="center"/>
    <w:spacing w:before="1800" w:after="200"/>
  </w:pPr>
  <w:r>
    <w:rPr><w:b/><w:sz w:val="32"/></w:rPr>
    <w:t>Kapittel ${chap.number}</w:t>
  </w:r>
</w:p>
<w:p>
  <w:pPr>
    <w:jc w:val="center"/>
    <w:spacing w:after="800"/>
  </w:pPr>
  <w:r>
    <w:rPr><w:i/><w:sz w:val="24"/><w:color w:val="444444"/></w:rPr>
    <w:t>${escapeXml(chap.title)}</w:t>
  </w:r>
</w:p>`;

      const isWritten = Boolean(chap.content && chap.content.trim().length > 0);
      const paragraphs = isWritten
        ? (chap.content || "").split("\n\n").filter(Boolean)
        : [
            `[Planlagt kapittel – ennå ikke forfattet]`,
            `Disposisjon og sceneplan: ${chap.summary || "Ingen disposisjon oppgitt."}`,
          ];

      paragraphs.forEach((p, idx) => {
        bodyXml += `
<w:p>
  <w:pPr>
    <w:spacing w:line="480" w:lineRule="auto" w:after="120"/>
    ${idx > 0 && isWritten ? '<w:ind w:firstLine="720"/>' : ""}
    ${!isWritten ? '<w:rPr><w:i/><w:color w:val="666666"/></w:rPr>' : ""}
  </w:pPr>
  <w:r>
    ${!isWritten ? '<w:rPr><w:i/><w:color w:val="666666"/></w:rPr>' : ""}
    <w:t xml:space="preserve">${escapeXml(p)}</w:t>
  </w:r>
</w:p>`;
      });

      bodyXml += `
<w:p>
  <w:r><w:br w:type="page"/></w:r>
</w:p>`;
    });

    const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${bodyXml}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720"/>
    </w:sectPr>
  </w:body>
</w:document>`;
    zip.file("word/document.xml", docXml);

    const blob = await zip.generateAsync({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const filename = `${sanitizeFilename(project.title)}.docx`;
    return {
      filename,
      blob,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      sizeBytes: blob.size,
    };
  }

  /**
   * Generates a real formatted PDF document binary using pdf-lib.
   */
  static async generatePDF(project: BookProject): Promise<ExportResult> {
    const doc = await PDFDocument.create();
    const timesRoman = await doc.embedFont(StandardFonts.TimesRoman);
    const timesBold = await doc.embedFont(StandardFonts.TimesRomanBold);
    const timesItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);

    const pageWidth = 595.28; // A4 points
    const pageHeight = 841.89;
    const margin = 60;
    const contentWidth = pageWidth - margin * 2;

    // Helper: add page with running footer
    let pageNumber = 1;
    function createPage() {
      const page = doc.addPage([pageWidth, pageHeight]);
      return page;
    }

    // --- Page 1: Cover / Title Page ---
    const titlePage = createPage();
    titlePage.drawText(project.title.toUpperCase(), {
      x: margin,
      y: pageHeight - 260,
      size: 26,
      font: timesBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    titlePage.drawText(`av ${project.author}`, {
      x: margin,
      y: pageHeight - 310,
      size: 16,
      font: timesItalic,
      color: rgb(0.3, 0.3, 0.3),
    });

    titlePage.drawText(`${project.genre} • ${project.tone}`, {
      x: margin,
      y: pageHeight - 350,
      size: 11,
      font: timesRoman,
      color: rgb(0.4, 0.4, 0.4),
    });

    titlePage.drawText("BOOKFORGE AI PUBLISHING STUDIO", {
      x: margin,
      y: margin + 30,
      size: 10,
      font: timesBold,
      color: rgb(0.2, 0.2, 0.6),
    });

    // --- Page 2: Colophon & Table of Contents ---
    const colophonPage = createPage();
    pageNumber++;
    colophonPage.drawText(project.title, {
      x: margin,
      y: pageHeight - margin - 20,
      size: 14,
      font: timesBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    colophonPage.drawText(`Forfatter: ${project.author}`, {
      x: margin,
      y: pageHeight - margin - 50,
      size: 11,
      font: timesRoman,
      color: rgb(0.2, 0.2, 0.2),
    });

    colophonPage.drawText("Opphavsrett © 2026. Alle rettigheter forbeholdt.", {
      x: margin,
      y: pageHeight - margin - 70,
      size: 10,
      font: timesItalic,
      color: rgb(0.4, 0.4, 0.4),
    });

    colophonPage.drawText("ISBN: Ikke tildelt (Not assigned)", {
      x: margin,
      y: pageHeight - margin - 90,
      size: 10,
      font: timesRoman,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Innholdsfortegnelse header
    colophonPage.drawText("INNHOLDSFORTEGNELSE", {
      x: margin,
      y: pageHeight - margin - 130,
      size: 14,
      font: timesBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    let tocY = pageHeight - margin - 160;
    project.chapters.slice(0, 18).forEach((c) => {
      colophonPage.drawText(`Kapittel ${c.number}: ${c.title}`, {
        x: margin,
        y: tocY,
        size: 10,
        font: timesRoman,
        color: rgb(0.2, 0.2, 0.2),
      });
      tocY -= 20;
    });

    // --- Subsequent Pages: Chapters ---
    for (const chap of project.chapters) {
      let currentPage = createPage();
      pageNumber++;

      // Chapter header
      currentPage.drawText(`KAPITTEL ${chap.number}`, {
        x: margin,
        y: pageHeight - margin - 20,
        size: 12,
        font: timesBold,
        color: rgb(0.3, 0.3, 0.7),
      });

      const isWritten = Boolean(chap.content && chap.content.trim().length > 0);
      const titleDisplay = isWritten ? chap.title : `${chap.title} (Planlagt)`;

      currentPage.drawText(titleDisplay, {
        x: margin,
        y: pageHeight - margin - 45,
        size: 18,
        font: timesBold,
        color: rgb(0.1, 0.1, 0.1),
      });

      let cursorY = pageHeight - margin - 90;
      const paragraphs = isWritten
        ? (chap.content || "").split("\n\n").filter(Boolean)
        : [
            `[Status: Planlagt kapittel – ennå ikke forfattet i manus]`,
            `Disposisjon og sceneplan: ${chap.summary || "Ingen disposisjon oppgitt."}`,
          ];

      for (const p of paragraphs) {
        const words = p.split(/\s+/);
        let line = "";

        for (const w of words) {
          const testLine = line ? `${line} ${w}` : w;
          const testWidth = timesRoman.widthOfTextAtSize(testLine, 11);

          if (testWidth > contentWidth && line) {
            if (cursorY < margin + 40) {
              // Add page number on footer of completed page
              currentPage.drawText(String(pageNumber), {
                x: pageWidth / 2,
                y: margin - 20,
                size: 9,
                font: timesRoman,
                color: rgb(0.5, 0.5, 0.5),
              });

              currentPage = createPage();
              pageNumber++;
              cursorY = pageHeight - margin - 30;
            }

            currentPage.drawText(line, {
              x: margin,
              y: cursorY,
              size: 11,
              font: timesRoman,
              color: rgb(0.15, 0.15, 0.15),
            });
            cursorY -= 17;
            line = w;
          } else {
            line = testLine;
          }
        }

        if (line) {
          if (cursorY < margin + 40) {
            currentPage.drawText(String(pageNumber), {
              x: pageWidth / 2,
              y: margin - 20,
              size: 9,
              font: timesRoman,
              color: rgb(0.5, 0.5, 0.5),
            });
            currentPage = createPage();
            pageNumber++;
            cursorY = pageHeight - margin - 30;
          }
          currentPage.drawText(line, {
            x: margin,
            y: cursorY,
            size: 11,
            font: timesRoman,
            color: rgb(0.15, 0.15, 0.15),
          });
          cursorY -= 26; // paragraph spacing
        }
      }

      // Final page footer for chapter
      currentPage.drawText(String(pageNumber), {
        x: pageWidth / 2,
        y: margin - 20,
        size: 9,
        font: timesRoman,
        color: rgb(0.5, 0.5, 0.5),
      });
    }

    const pdfBytes = await doc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const filename = `${sanitizeFilename(project.title)}.pdf`;

    return {
      filename,
      blob,
      mimeType: "application/pdf",
      sizeBytes: blob.size,
    };
  }

  /**
   * Generates a complete JSON backup archive.
   */
  static generateJSON(project: BookProject): ExportResult {
    const jsonStr = JSON.stringify(project, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
    const filename = `${sanitizeFilename(project.title)}_arkiv.json`;
    return {
      filename,
      blob,
      mimeType: "application/json",
      sizeBytes: blob.size,
    };
  }
}

function escapeXml(unsafe: string): string {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9æøåÆØÅ_-]/g, "_").toLowerCase();
}
