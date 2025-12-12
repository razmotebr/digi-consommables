export async function onRequestGet(context) {
  try {
    const auth = context.request.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer TOKEN:")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "content-type": "application/json" } });
    }

    const url = new URL(context.request.url);
    const clientId = url.searchParams.get("clientId") || "";
    if (!clientId) {
      return new Response(JSON.stringify({ error: "clientId requis" }), { status: 400, headers: { "content-type": "application/json" } });
    }

    const db = context.env.DB;
    const res = await db
      .prepare(
        `SELECT id, client_id, date, total_ttc, status, payload
         FROM commandes
         WHERE client_id = ?1
         ORDER BY date DESC`
      )
      .bind(clientId)
      .all();

    const orders = (res.results || []).map((r) => {
      let payload = {};
      try {
        payload = JSON.parse(r.payload || "{}");
      } catch (_) {}
      return {
        id: r.id,
        clientId: r.client_id,
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
