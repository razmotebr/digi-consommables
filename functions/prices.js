// Prix par enseigne stockes dans des fichiers separes (JSON) et selectionnes par client.
// Auth: Authorization: Bearer TOKEN:<clientId>:<timestamp>
import intermarche from "./prices_data/intermarche.json";
import carrefour from "./prices_data/carrefour.json";

// Associe chaque clientId a une enseigne
const CLIENT_ENSEIGNE = {
  C001: "Intermarche",
  C002: "Carrefour",
};

// Associe chaque enseigne a son catalogue de prix
const ENSEIGNE_PRICES = {
  Intermarche: intermarche,
  Carrefour: carrefour,
};

function parseToken(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  const parts = token.split(":");
  if (parts.length < 3 || parts[0] !== "TOKEN") return null;
  return parts[1]; // clientId
}

export async function onRequestGet(context) {
  const clientId = parseToken(context.request.headers.get("Authorization") || "");
  if (!clientId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const enseigne = CLIENT_ENSEIGNE[clientId];
  const produits = (enseigne && ENSEIGNE_PRICES[enseigne]) || [];

  return new Response(JSON.stringify({ enseigne: enseigne || null, produits }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
