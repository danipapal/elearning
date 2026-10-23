import "server-only";

import sanitizeHtml from "sanitize-html";

// Limpia el HTML del editor enriquecido para evitar XSS. Solo se permiten
// las etiquetas que genera el editor.
export function sanitizeRichText(html: string) {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "strong", "b", "em", "i", "u", "s", "code", "pre", "blockquote",
      "h2", "h3", "h4", "ul", "ol", "li", "a", "hr",
    ],
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer nofollow" }),
    },
  }).trim();
}

export function isEmptyHtml(html: string) {
  return sanitizeHtml(html, { allowedTags: [] }).trim() === "";
}
