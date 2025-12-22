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

  // Ne renvoie que les produits qui ont un prix defini pour ce client (catalogue unique)
  const stmt = db
    .prepare(
      `SELECT cp.id, cp.reference, cp.nom, cp.designation, cp.mandrin, cp.etiquettes_par_rouleau, cp.rouleaux_par_carton, pc.prix
       FROM prix_par_client pc
       JOIN catalog_produits cp ON cp.id = pc.produit_id
       WHERE pc.client_id = ?
       ORDER BY cp.id`
    )
    .bind(clientId);

  const { results } = await stmt.all();

  return new Response(JSON.stringify({ produits: results || [] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
