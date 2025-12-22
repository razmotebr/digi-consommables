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

function buildPdf(lines) {
  const encoder = new TextEncoder();
  const safeLines = lines.map((l) => escapePdfText(l));
  const fontSize = 12;
  const startX = 50;
  const startY = 800;
  const lineHeight = 14;
  let y = startY;

  let content = "BT\n/F1 " + fontSize + " Tf\n";
  safeLines.forEach((line) => {
    content += `1 0 0 1 ${startX} ${y} Tm (${line}) Tj\n`;
    y -= lineHeight;
  });
  content += "ET\n";

  const contentBytes = encoder.encode(content);
  const objects = [];
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  objects.push(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
  );
  objects.push(
    `4 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n${content}endstream\nendobj\n`
  );
  objects.push("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n");

  const parts = [];
  let length = 0;
  const offsets = [0];
  const append = (str) => {
    parts.push(str);
    length += encoder.encode(str).length;
  };

  append("%PDF-1.4\n");
  objects.forEach((obj) => {
    offsets.push(length);
    append(obj);
  });

  const xrefStart = length;
  let xref = `xref\n0 ${objects.length + 1}\n`;
  xref += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    const off = String(offsets[i]).padStart(10, "0");
    xref += `${off} 00000 n \n`;
  }
  append(xref);
  append(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);

  return encoder.encode(parts.join(""));
}

function formatEuro(value) {
  const num = Number(value || 0);
  return `${num.toFixed(2)} EUR`;
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
    const sousTotal = produits.reduce((acc, p) => acc + Number(p.prix || 0) * Number(p.qty || 0), 0);
    const totalHt = Number(row.total_ht != null ? row.total_ht : sousTotal);
    const fraisPort = payload.fraisPort ?? payload.frais_port ?? Math.max(0, totalHt - sousTotal);
    const tvaRate = Number(row.tva != null ? row.tva : payload.tva ?? 0.2);
    const totalTtc = Number(row.total_ttc != null ? row.total_ttc : totalHt + totalHt * tvaRate);

    const lines = [];
    lines.push("BON DE COMMANDE");
    lines.push(`Commande #${row.id}`);
    lines.push(`Date : ${row.date ? new Date(row.date).toLocaleString("fr-FR") : "-"}`);
    lines.push(`Statut : ${row.status || "-"}`);
    lines.push("");
    lines.push(`Client : ${row.client_id || ""}`);
    lines.push(`Enseigne : ${payload.enseigne || ""}`);
    lines.push(`Magasin : ${payload.magasin || ""}`);
    lines.push(`Contact : ${payload.contact || ""}`);
    lines.push(`Email compta : ${payload.emailCompta || payload.email_compta || ""}`);
    lines.push(`Tarif : ${payload.tarifMois || ""}`);
    lines.push("");
    lines.push("Produits :");

    const productLines = produits.filter((p) => Number(p.qty || 0) > 0);
    if (!productLines.length) {
      lines.push("(aucun produit)");
    } else {
      productLines.forEach((p) => {
        const nom = toPdfText(p.nom || "").slice(0, 60);
        const qty = Number(p.qty || 0);
        const prix = Number(p.prix || 0);
        const total = qty * prix;
        lines.push(`- ${nom} | ${qty} x ${formatEuro(prix)} = ${formatEuro(total)}`);
      });
    }

    lines.push("");
    lines.push(`Sous-total HT : ${formatEuro(sousTotal)}`);
    lines.push(`Frais de port : ${formatEuro(fraisPort)}`);
    lines.push(`Total HT : ${formatEuro(totalHt)}`);
    lines.push(`TVA : ${formatEuro(totalHt * tvaRate)}`);
    lines.push(`Total TTC : ${formatEuro(totalTtc)}`);

    const pdfBytes = buildPdf(lines);

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
