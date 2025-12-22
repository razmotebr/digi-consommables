function parseToken(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  const parts = token.split(":");
  if (parts.length < 3 || parts[0] !== "TOKEN") return null;
  return parts[1]; // clientId
}

export async function onRequestGet(context) {
  try {
    const db = context.env.DB;
    const clientId = parseToken(context.request.headers.get("Authorization") || "");
    if (!clientId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    const stmt = db
      .prepare(
        `SELECT id, enseigne, magasin, contact, email_compta, frais_port, tva
         FROM clients WHERE id = ? LIMIT 1`
      )
      .bind(clientId);
    const { results } = await stmt.all();
    const client = results && results[0];

    if (!client) {
      return new Response(JSON.stringify({ error: "Client not found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    let fraisPortSetting = "";
    try {
      const settingsRes = await db
        .prepare("SELECT value FROM app_settings WHERE key = ?1 LIMIT 1")
        .bind("frais_port")
        .all();
      fraisPortSetting = settingsRes?.results?.[0]?.value ?? "";
    } catch (_) {
      fraisPortSetting = "";
    }
    if (fraisPortSetting !== "") {
      client.frais_port = Number(fraisPortSetting);
    }

    return new Response(JSON.stringify({ client }), {
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
