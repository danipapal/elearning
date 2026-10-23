import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";

import { coverUrl } from "@/lib/storage";
import type { CertificateSettings } from "@/types/database";

type CertificateData = {
  fullName: string;
  courseTitle: string;
  issuedAt: string;
  code: string;
  verifyUrl: string;
};

const PRIMARY = rgb(0.114, 0.306, 0.847);
const INK = rgb(0.09, 0.09, 0.11);
const MUTED = rgb(0.42, 0.42, 0.46);
const LINE = rgb(0.85, 0.86, 0.9);

// Las fuentes se cargan una sola vez por proceso.
let fonts: Promise<[Uint8Array, Uint8Array]> | null = null;
function loadFonts() {
  const dir = path.join(process.cwd(), "assets", "fonts");
  fonts ??= Promise.all([
    readFile(path.join(dir, "Geist-Regular.ttf")),
    readFile(path.join(dir, "Geist-SemiBold.ttf")),
  ]);
  return fonts;
}

// Imagen pública del bucket de portadas (logo o firma). PNG o JPG.
async function embedImage(pdf: PDFDocument, storagePath: string | null): Promise<PDFImage | null> {
  const url = coverUrl(storagePath);
  if (!url) return null;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
    return isPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
  } catch (error) {
    console.error("[certificado] imagen", storagePath, error);
    return null;
  }
}

function centered(page: PDFPage, text: string, y: number, font: PDFFont, size: number, color = INK) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (page.getWidth() - width) / 2, y, size, font, color });
}

// Ajusta el tamaño para que un texto largo (nombre, título) entre en una línea.
function fitSize(text: string, font: PDFFont, size: number, maxWidth: number, min = 14) {
  let current = size;
  while (current > min && font.widthOfTextAtSize(text, current) > maxWidth) current -= 1;
  return current;
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function fitImage(image: PDFImage, maxWidth: number, maxHeight: number) {
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
  return { width: image.width * scale, height: image.height * scale };
}

export async function generateCertificatePdf(data: CertificateData, settings: CertificateSettings) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const [regularBytes, boldBytes] = await loadFonts();
  const regular = await pdf.embedFont(regularBytes, { subset: true });
  const bold = await pdf.embedFont(boldBytes, { subset: true });
  const [logo, signature] = await Promise.all([
    embedImage(pdf, settings.logo_path),
    embedImage(pdf, settings.signature_path),
  ]);

  const date = new Intl.DateTimeFormat("es-AR", {
    dateStyle: "long",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(data.issuedAt));

  pdf.setTitle(`${settings.title} - ${data.fullName}`);
  pdf.setAuthor(data.fullName);
  pdf.setSubject(data.courseTitle);

  // A4 apaisado.
  const page = pdf.addPage([841.89, 595.28]);
  const { width, height } = page.getSize();

  page.drawRectangle({ x: 20, y: 20, width: width - 40, height: height - 40, borderColor: PRIMARY, borderWidth: 3 });
  page.drawRectangle({ x: 30, y: 30, width: width - 60, height: height - 60, borderColor: LINE, borderWidth: 1 });

  let y = height - 80;
  if (logo) {
    const size = fitImage(logo, 180, 60);
    page.drawImage(logo, { x: (width - size.width) / 2, y: y - size.height, ...size });
    y -= size.height + 30;
  } else {
    y -= 20;
  }

  const titleSize = fitSize(settings.title.toUpperCase(), bold, 30, width - 160);
  centered(page, settings.title.toUpperCase(), y - titleSize, bold, titleSize, PRIMARY);
  y -= titleSize + 40;

  centered(page, settings.recipient_label, y, regular, 14, MUTED);
  y -= 50;

  const nameSize = fitSize(data.fullName, bold, 36, width - 200);
  centered(page, data.fullName, y, bold, nameSize);
  page.drawLine({
    start: { x: width / 2 - 220, y: y - 12 },
    end: { x: width / 2 + 220, y: y - 12 },
    thickness: 1,
    color: LINE,
  });
  y -= 50;

  const body = settings.body
    .replaceAll("{curso}", `“${data.courseTitle}”`)
    .replaceAll("{nombre}", data.fullName)
    .replaceAll("{fecha}", date);
  for (const line of wrap(body, regular, 15, width - 220).slice(0, 5)) {
    centered(page, line, y, regular, 15);
    y -= 22;
  }

  // Pie: fecha a la izquierda, firma a la derecha, código al centro.
  const footerY = 95;
  page.drawText("Fecha de emisión", { x: 90, y: footerY + 18, size: 10, font: regular, color: MUTED });
  page.drawText(date, { x: 90, y: footerY, size: 13, font: bold, color: INK });

  if (settings.signer_name || signature) {
    const centerX = width - 200;
    if (signature) {
      const size = fitImage(signature, 160, 55);
      page.drawImage(signature, { x: centerX - size.width / 2, y: footerY + 22, ...size });
    }
    page.drawLine({ start: { x: centerX - 100, y: footerY + 18 }, end: { x: centerX + 100, y: footerY + 18 }, thickness: 1, color: INK });
    if (settings.signer_name) {
      const nameWidth = bold.widthOfTextAtSize(settings.signer_name, 12);
      page.drawText(settings.signer_name, { x: centerX - nameWidth / 2, y: footerY, size: 12, font: bold, color: INK });
    }
    if (settings.signer_title) {
      const titleWidth = regular.widthOfTextAtSize(settings.signer_title, 10);
      page.drawText(settings.signer_title, { x: centerX - titleWidth / 2, y: footerY - 15, size: 10, font: regular, color: MUTED });
    }
  }

  centered(page, `Código de verificación: ${data.code}`, 52, bold, 9, MUTED);
  centered(page, `Verificalo en ${data.verifyUrl}`, 40, regular, 8, MUTED);

  return pdf.save();
}
