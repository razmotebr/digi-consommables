import { CLIENT_ENSEIGNE, ENSEIGNE_PRICES } from "./data";

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
