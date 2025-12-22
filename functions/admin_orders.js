import { parseAuthActor, logEvent } from "./_log.js";

function unauthorized() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "content-type": "application/json" } });
}

export async function onRequestGet(context) {
  const auth = context.request.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ADMIN:")) return unauthorized();
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
  const auth = context.request.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ADMIN:")) return unauthorized();
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
    await db.prepare(`UPDATE commandes SET status = ?1 WHERE id = ?2`).bind(status, orderId).run();
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
