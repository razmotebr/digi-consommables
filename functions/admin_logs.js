import { parseAuthActor } from "./_log.js";

function unauthorized() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}

export async function onRequestGet(context) {
  const auth = context.request.headers.get("Authorization") || "";
  const actor = parseAuthActor(auth);
  if (actor.actorType !== "admin") return unauthorized();
  try {
    const url = new URL(context.request.url);
    const limitRaw = Number(url.searchParams.get("limit") || 500);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 2000) : 500;
    const db = context.env.DB;
    const res = await db
      .prepare(
        `SELECT id, ts, actor_type, actor_id, action, target, details
         FROM logs
         ORDER BY ts DESC
         LIMIT ?1`
      )
      .bind(limit)
      .all();
    return new Response(JSON.stringify({ logs: res.results || [] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.toString() }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
