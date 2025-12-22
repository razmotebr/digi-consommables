function parseAuth(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  const parts = token.split(":");
  if (parts.length < 2) return null;
  if (parts[0] === "ADMIN") return { role: "admin" };
  if (parts[0] === "TOKEN") return { role: "client", clientId: parts[1] };
  return null;
}

function toPdfText(value) {
  const raw = String(value ?? "");
  const normalized = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  let out = "";
  for (let i = 0; i < normalized.length; i += 1) {
    const code = normalized.charCodeAt(i);
    if (code === 10 || code === 13 || code === 9) {
      out += " ";
    } else if (code >= 32 && code <= 126) {
      out += normalized[i];
    } else {
      out += "?";
    }
  }
  return out;
}

function escapePdfText(value) {
  return toPdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

const LOGO_JPG_BASE64 =
  "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";
const LOGO_JPG_WIDTH = 600;
const LOGO_JPG_HEIGHT = 188;
const ENSEIGNE_JPG_BASE64 =
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCACZAlgDASIAAhEBAxEB/8QAHQABAAICAwEBAAAAAAAAAAAAAAcIBQYDBAkCAf/EAE4QAAEDAwIDAwUNBAgEBQUAAAEAAgMEBREGBwgSIRMxQRRRYXGhFRciMkJWgZGSlLHB0QlSVIIWIyQzQ2Jy4Rg0U9JERlWy4oOEk6Kk/8QAHAEBAAEFAQEAAAAAAAAAAAAAAAQBAgMFBgcI/8QAOREAAgEDAQUFBgUDBAMAAAAAAAECAwQRBQYSITFRE0FhcYEiMpGhwdEHFEJSsRUj4SQzkvBDctL/2gAMAwEAAhEDEQA/ALloiIAiIgCIiAIiIgCIiAItYv2s7ZZdW0NhuEjYfLIS9srjgNdnAB9a2ZpDmhzSCD1BHirVOMm0nyM1S3q0oxnOOFJZXij9REVxhCIupdXXFtKTbI6d8/gJ3EN9iA7aKINY13EBG2U6ftGkntHxP655f9TsBQfrbdPif0qHTXnT0dPA3qZYaASx/W0lAXPReftv4ut0qOp/tsdpqWtPwo5KUsP1g5Csrw98Qth3SqjZZ6N1qvrI+07Bz+ZkwHeWH0eYoCbUREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEXBRVlJWxmSjqYahjXFpdG8OAI7x08VzoAiIgCIiAgPiktNULhbL3GxzoeyMDnD5Lgcj8VqGg94L9poMpKzNxoW4HZyH4TB/lcrO3200F7tk1tuVO2emmGHNP4jzFV/11sfdKF8tXp6QV9OMkQuOJWjzelc/qNrdU635i2fPmv8AvM9O2a1nSruxjpuppezyb5cfHuZKOkt2NI39jWmtFBUHviqPg9fQe4reYJoZ4xJBKyRh6hzHAgqj9zs10tEpZXUNRSyDwkjLV3bHqvUVlcDbrpVQAfJDyR9XcsFHX5Qe7cQ4+H2Jl9+HVCsu0sK3B9z4r4r/ACXXRVpsO++pKNrWXKkpa9o6c2OR3sW+WLfXTdWWsuNJVULz8oAPb7FtqOrWtXlLHnwOPvNi9Ytcvst5dYvPy5/IlpfMjGSMLJGNe094cMgrW7Vr7SNyaDTX2kyfkvdyH2rYYKinnaHQTxytPixwKnxnGfGLyc5Wta9B4qwcX4poibeHh+0JuDRSyC3xWi78p7KtpGBh5vDnaOjgq/8AChs3qayb91tXdYHQUmmpJInztBDJ5HDDQ0+IwclXeXzHHHHzdmxreY8zsDGT5yrjAfSIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiA";
const ENSEIGNE_JPG_WIDTH = 600;
const ENSEIGNE_JPG_HEIGHT = 153;

function base64ToBytes(b64) {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function decodeBase64(base64) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const lookup = new Uint8Array(256);
  for (let i = 0; i < lookup.length; i += 1) lookup[i] = 255;
  for (let i = 0; i < chars.length; i += 1) lookup[chars.charCodeAt(i)] = i;

  const clean = base64.replace(/[^A-Za-z0-9+/=]/g, "");
  const len = clean.length;
  const buffer = new Uint8Array(((len * 3) / 4) | 0);
  let out = 0;
  let i = 0;
  while (i < len) {
    const c1 = lookup[clean.charCodeAt(i++)];
    const c2 = lookup[clean.charCodeAt(i++)];
    const c3 = lookup[clean.charCodeAt(i++)];
    const c4 = lookup[clean.charCodeAt(i++)];
    if (c2 === 255) break;
    const b1 = (c1 << 2) | (c2 >> 4);
    buffer[out++] = b1;
    if (c3 === 64 || c3 === 255) break;
    const b2 = ((c2 & 15) << 4) | (c3 >> 2);
    buffer[out++] = b2;
    if (c4 === 64 || c4 === 255) break;
    const b3 = ((c3 & 3) << 6) | c4;
    buffer[out++] = b3;
  }
  return buffer.slice(0, out);
}

let logoBytesCache = null;
function getLogoBytes() {
  if (logoBytesCache) return logoBytesCache;
  try {
    logoBytesCache = base64ToBytes(LOGO_JPG_BASE64);
  } catch (_) {
    logoBytesCache = decodeBase64(LOGO_JPG_BASE64);
  }
  return logoBytesCache;
}

let enseigneBytesCache = null;
function getEnseigneBytes() {
  if (enseigneBytesCache) return enseigneBytesCache;
  try {
    enseigneBytesCache = base64ToBytes(ENSEIGNE_JPG_BASE64);
  } catch (_) {
    enseigneBytesCache = decodeBase64(ENSEIGNE_JPG_BASE64);
  }
  return enseigneBytesCache;
}

function num(value) {
  return Number(value || 0)
    .toFixed(2)
    .replace(".", ",");
}

function formatEuro(value) {
  return `${num(value)} EUR`;
}

class PdfBuilder {
  constructor() {
    this.ops = [];
  }

  add(op) {
    this.ops.push(op);
  }

  setLineWidth(w) {
    this.add(`${w} w`);
  }

  setStrokeColor(r, g, b) {
    this.add(`${r} ${g} ${b} RG`);
  }

  setFillColor(r, g, b) {
    this.add(`${r} ${g} ${b} rg`);
  }

  text(x, y, text, font, size) {
    const safe = escapePdfText(text);
    this.add(`BT /${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${safe}) Tj ET`);
  }

  line(x1, y1, x2, y2) {
    this.add(`${x1} ${y1} m ${x2} ${y2} l S`);
  }

  rect(x, y, w, h, fill, stroke) {
    if (fill && stroke) {
      this.add(`${x} ${y} ${w} ${h} re B`);
      return;
    }
    if (fill) {
      this.add(`${x} ${y} ${w} ${h} re f`);
      return;
    }
    this.add(`${x} ${y} ${w} ${h} re S`);
  }

  triangle(x1, y1, x2, y2, x3, y3, fill, stroke) {
    if (fill && stroke) {
      this.add(`${x1} ${y1} m ${x2} ${y2} l ${x3} ${y3} l h B`);
      return;
    }
    if (fill) {
      this.add(`${x1} ${y1} m ${x2} ${y2} l ${x3} ${y3} l h f`);
      return;
    }
    this.add(`${x1} ${y1} m ${x2} ${y2} l ${x3} ${y3} l h S`);
  }

  image(name, x, y, w, h) {
    this.add(`q ${w} 0 0 ${h} ${x} ${y} cm /${name} Do Q`);
  }

  build() {
    return this.ops.join("\n") + "\n";
  }
}

function buildPdfDocument(content, image) {
  const encoder = new TextEncoder();
  const contentBytes = encoder.encode(content);
  const objects = [];
  const parts = [];
  let length = 0;
  const offsets = [0];

  const appendStr = (str) => {
    parts.push(str);
    length += encoder.encode(str).length;
  };
  const appendBytes = (bytes) => {
    parts.push(bytes);
    length += bytes.length;
  };

  const images = (image || []).filter((img) => img && img.bytes && img.bytes.length);
  const hasImages = images.length > 0;
  const xObjectEntries = images.map((img) => `/${img.name} ${img.obj} 0 R`).join(" ");
  const resources = hasImages
    ? `/Resources << /Font << /F1 5 0 R /F2 6 0 R >> /XObject << ${xObjectEntries} >> >>`
    : "/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >>";

  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  objects.push(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R ${resources} >>\nendobj\n`
  );

  objects.push(`4 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n${content}endstream\nendobj\n`);
  objects.push("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n");
  objects.push("6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n");

  if (hasImages) {
    images.forEach((img) => {
      const header =
        `${img.obj} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} ` +
        "/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode " +
        `/Length ${img.bytes.length} >>\nstream\n`;
      const footer = "\nendstream\nendobj\n";
      objects.push({ header, bytes: img.bytes, footer });
    });
  }

  appendStr("%PDF-1.4\n");
  objects.forEach((obj) => {
    offsets.push(length);
    if (typeof obj === "string") {
      appendStr(obj);
    } else {
      appendStr(obj.header);
      appendBytes(obj.bytes);
      appendStr(obj.footer);
    }
  });

  const xrefStart = length;
  let xref = `xref\n0 ${objects.length + 1}\n`;
  xref += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    const off = String(offsets[i]).padStart(10, "0");
    xref += `${off} 00000 n \n`;
  }
  appendStr(xref);
  appendStr(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);

  const total = length;
  const out = new Uint8Array(total);
  let offset = 0;
  parts.forEach((part) => {
    if (typeof part === "string") {
      const bytes = encoder.encode(part);
      out.set(bytes, offset);
      offset += bytes.length;
    } else {
      out.set(part, offset);
      offset += part.length;
    }
  });
  return out;
}

function clampText(text, max) {
  const safe = toPdfText(text || "");
  if (safe.length <= max) return safe;
  return `${safe.slice(0, Math.max(0, max - 3))}...`;
}

function buildOrderPdf({ row, payload, produits, catalogById }) {
  const pdf = new PdfBuilder();
  const pageW = 595;
  const pageH = 842;
  const margin = 40;

  const headerTop = pageH - 60;
  const logoX = margin;
  const logoW = 120;
  const logoH = Math.round((LOGO_JPG_HEIGHT / LOGO_JPG_WIDTH) * logoW);
  const logoY = headerTop - logoH + 10;
  pdf.image("ImDigi", logoX, logoY, logoW, logoH);

  const enseigneW = 140;
  const enseigneH = Math.round((ENSEIGNE_JPG_HEIGHT / ENSEIGNE_JPG_WIDTH) * enseigneW);
  const enseigneX = pageW - margin - enseigneW;
  const enseigneY = headerTop - enseigneH + 10;
  pdf.image("ImEns", enseigneX, enseigneY, enseigneW, enseigneH);

  const infoX = pageW - margin - 220;
  const infoY = headerTop - 4;
  pdf.text(infoX, infoY, `Date : ${row.date ? new Date(row.date).toLocaleDateString("fr-FR") : "-"}`, "F1", 9);
  pdf.text(infoX, infoY - 14, `Enseigne : ${payload.enseigne || ""}`, "F1", 9);
  pdf.text(infoX, infoY - 28, `Magasin : ${payload.magasin || ""}`, "F1", 9);
  pdf.text(infoX, infoY - 42, `Contact : ${payload.contact || ""}`, "F1", 9);

  pdf.text(margin, headerTop - 72, "BON DE COMMANDE CONSOMMABLES", "F2", 12);

  const tableX = margin;
  const tableTop = headerTop - 95;
  const headerH = 18;
  const rowH = 16;
  const cols = [
    { key: "qty", label: "Qte", w: 50 },
    { key: "designation", label: "Designation", w: 300 },
    { key: "prix", label: "P.U. HT", w: 75 },
    { key: "total", label: "Total HT", w: 90 },
  ];
  const tableW = cols.reduce((acc, c) => acc + c.w, 0);
  const rows = produits.filter((p) => Number(p.qty || 0) > 0);
  const maxRows = Math.max(0, Math.floor((tableTop - 170) / rowH));
  const rowsToShow = rows.slice(0, maxRows);

  pdf.setLineWidth(0.8);
  pdf.setStrokeColor(0, 0, 0);
  pdf.rect(tableX, tableTop - headerH, tableW, headerH, false, true);
  let cursorX = tableX;
  cols.forEach((col) => {
    pdf.text(cursorX + 2, tableTop - 12, col.label, "F2", 8);
    cursorX += col.w;
  });

  pdf.setLineWidth(0.5);
  pdf.line(tableX, tableTop - headerH, tableX + tableW, tableTop - headerH);
  pdf.line(tableX, tableTop, tableX + tableW, tableTop);

  rowsToShow.forEach((p, idx) => {
    const y = tableTop - headerH - rowH * idx - 12;
    const pid = Number(p.id || 0);
    const cat = catalogById[pid] || {};
    const designation = cat.designation || cat.nom || p.nom || "";
    const prix = Number(p.prix || 0);
    const qty = Number(p.qty || 0);
    const total = prix * qty;

    let x = tableX + 2;
    pdf.text(x, y, String(qty), "F1", 8);
    x += cols[0].w;
    pdf.text(x, y, clampText(designation, 48), "F1", 8);
    x += cols[1].w;
    pdf.text(x, y, num(prix), "F1", 8);
    x += cols[2].w;
    pdf.text(x, y, num(total), "F1", 8);
  });

  if (rows.length > rowsToShow.length) {
    pdf.text(tableX, tableTop - headerH - rowH * rowsToShow.length - 10, `... ${rows.length - rowsToShow.length} ligne(s) non affichee(s)`, "F1", 8);
  }

  const sousTotal = rows.reduce((acc, p) => acc + Number(p.prix || 0) * Number(p.qty || 0), 0);
  const totalHt = Number(row.total_ht != null ? row.total_ht : sousTotal);
  const fraisPort = payload.fraisPort ?? payload.frais_port ?? Math.max(0, totalHt - sousTotal);
  const tvaRate = Number(row.tva != null ? row.tva : payload.tva ?? 0.2);
  const totalTtc = Number(row.total_ttc != null ? row.total_ttc : totalHt + totalHt * tvaRate);
  const tvaPct = `${(tvaRate * 100).toFixed(1).replace(".", ",")}%`;

  const tableBottom = tableTop - headerH - rowH * rowsToShow.length;
  const totalsBoxW = 210;
  const totalsBoxH = 68;
  const totalsX = pageW - margin - totalsBoxW;
  const totalsY = tableBottom - totalsBoxH - 12;

  pdf.setLineWidth(0.6);
  pdf.rect(totalsX, totalsY, totalsBoxW, totalsBoxH, false, true);
  pdf.text(totalsX + 8, totalsY + 50, `Sous-total HT : ${formatEuro(sousTotal)}`, "F1", 8);
  pdf.text(totalsX + 8, totalsY + 36, `Frais de port : ${formatEuro(fraisPort)}`, "F1", 8);
  pdf.text(totalsX + 8, totalsY + 22, `Total HT : ${formatEuro(totalHt)}`, "F1", 8);
  pdf.text(totalsX + 8, totalsY + 8, `TVA ${tvaPct} : ${formatEuro(totalHt * tvaRate)}`, "F1", 8);
  pdf.text(totalsX + 8, totalsY - 6, `Total TTC : ${formatEuro(totalTtc)}`, "F2", 8);

  pdf.setLineWidth(0.5);
  pdf.line(margin, 80, pageW - margin, 80);
  pdf.text(
    margin,
    66,
    "Societe Anonyme au capital de 1 141 000 EUR - R.C.S. 404165631 Bobigny - APE 4669 B",
    "F1",
    7
  );
  pdf.text(
    margin,
    54,
    "SIRET: 404165631 00049 - N TVA FR09404165631 | TVA acquittee sur les debits",
    "F1",
    7
  );

  return buildPdfDocument(pdf.build(), [
    { name: "ImDigi", obj: 7, bytes: getLogoBytes(), width: LOGO_JPG_WIDTH, height: LOGO_JPG_HEIGHT },
    { name: "ImEns", obj: 8, bytes: getEnseigneBytes(), width: ENSEIGNE_JPG_WIDTH, height: ENSEIGNE_JPG_HEIGHT },
  ]);
}

export async function onRequestGet(context) {
  try {
    const auth = parseAuth(context.request.headers.get("Authorization") || "");
    if (!auth) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    const url = new URL(context.request.url);
    const orderId = url.searchParams.get("orderId");
    if (!orderId) {
      return new Response(JSON.stringify({ error: "orderId requis" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const db = context.env.DB;
    const res = await db
      .prepare(
        `SELECT id, client_id, date, total_ht, tva, total_ttc, status, payload
         FROM commandes
         WHERE id = ?1`
      )
      .bind(orderId)
      .all();
    const row = (res.results || [])[0];
    if (!row) {
      return new Response(JSON.stringify({ error: "Commande introuvable" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    if (auth.role === "client" && auth.clientId !== row.client_id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      });
    }

    let payload = {};
    try {
      payload = JSON.parse(row.payload || "{}");
    } catch (_) {
      payload = {};
    }

    const produits = Array.isArray(payload.produits) ? payload.produits : [];
    const ids = Array.from(
      new Set(
        produits
          .map((p) => Number(p.id))
          .filter((id) => !Number.isNaN(id) && id > 0)
      )
    );
    const catalogById = {};
    if (ids.length) {
      const placeholders = ids.map((_, i) => `?${i + 1}`).join(",");
      const catRes = await db
        .prepare(
          `SELECT id, reference, nom, designation, mandrin, etiquettes_par_rouleau, rouleaux_par_carton
           FROM catalog_produits
           WHERE id IN (${placeholders})`
        )
        .bind(...ids)
        .all();
      (catRes.results || []).forEach((p) => {
        catalogById[Number(p.id)] = p;
      });
    }

    const pdfBytes = buildOrderPdf({ row, payload, produits, catalogById });

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="commande_${row.id}.pdf"`,
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.toString() }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
