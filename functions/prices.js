function parseToken(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  const parts = token.split(":");
  if (parts.length < 3 || parts[0] !== "TOKEN") return null;
  return parts[1]; // clientId
}

export async function onRequestGet(context) {
  const db = context.env.DB;
  const clientId = parseToken(context.request.headers.get("Authorization") || "");
  if (!clientId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const stmt = db.prepare(
    `SELECT p.id, p.nom, COALESCE(pc.prix, 0) AS prix
     FROM produits p
     LEFT JOIN prix_par_client pc ON pc.produit_id = p.id AND pc.client_id = ?
     ORDER BY p.id`
  ).bind(clientId);

  const { results } = await stmt.all();

  return new Response(JSON.stringify({ produits: results || [] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
