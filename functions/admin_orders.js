import { parseAuthActor, logEvent } from "./_log.js";
import { requireRole } from "./_auth.js";

function unauthorized() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "content-type": "application/json" } });
}

function statusRank(status = "") {
  const normalized = status
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  if (normalized.includes("trait")) return 0;
  if (normalized.includes("prep")) return 1;
  if (normalized.includes("envoy")) return 2;
  return -1;
}

export async function onRequestGet(context) {
  const gate = await requireRole(context, ["orders"]);
  if (!gate.ok) return gate.response;
  try {
    const url = new URL(context.request.url);
    const enseigne = url.searchParams.get("enseigne") || "";
    const db = context.env.DB;
    let query = `SELECT id, client_id, date, total_ttc, status, payload FROM commandes`;
    const binds = [];
    if (enseigne) {
      query += ` WHERE json_extract(payload,'$.enseigne') = ?1`;
      binds.push(enseigne);
    }
    query += ` ORDER BY date DESC`;
    const stmt = db.prepare(query);
    const res = binds.length ? await stmt.bind(...binds).all() : await stmt.all();
    const orders = (res.results || []).map((r) => {
      let payload = {};
      try {
        payload = JSON.parse(r.payload || "{}");
      } catch (_) {}
      return {
        id: r.id,
        clientId: r.client_id,
        enseigne: payload.enseigne,
        magasin: payload.magasin,
        createdAt: r.date,
        totalTTC: r.total_ttc,
        status: r.status,
        payload,
      };
    });
    return new Response(JSON.stringify({ orders }), { status: 200, headers: { "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.toString() }), { status: 500, headers: { "content-type": "application/json" } });
  }
}

export async function onRequestPut(context) {
  const gate = await requireRole(context, ["orders"]);
  if (!gate.ok) return gate.response;
  try {
    const body = await context.request.json();
    const { orderId, status } = body || {};
    if (!orderId || !status) {
      return new Response(JSON.stringify({ error: "orderId et status requis" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
    const db = context.env.DB;
    const currentRes = await db.prepare("SELECT status FROM commandes WHERE id = ?1 LIMIT 1").bind(orderId).all();
    const currentStatus = currentRes?.results?.[0]?.status || "";
    if (!currentRes?.results?.length) {
      return new Response(JSON.stringify({ error: "Commande introuvable" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }
    const fromRank = statusRank(currentStatus);
    const toRank = statusRank(status);
    if (fromRank >= 0 && toRank >= 0 && toRank < fromRank) {
      return new Response(JSON.stringify({ error: "Retour en arriere interdit" }), {
        status: 409,
        headers: { "content-type": "application/json" },
      });
    }
    await db.prepare(`UPDATE commandes SET status = ?1 WHERE id = ?2`).bind(status, orderId).run();
    const auth = context.request.headers.get("Authorization") || "";
    const actor = parseAuthActor(auth);
    await logEvent(db, {
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "order_status_update",
      target: `commande:${orderId}`,
      details: { status },
    });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.toString() }), { status: 500, headers: { "content-type": "application/json" } });
  }
}
