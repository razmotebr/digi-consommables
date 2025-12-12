export async function onRequestPost(context) {
  try {
    const db = context.env.DB;
    const data = await context.request.json();
    const { id, password } = data || {};

    if (!id || !password) {
      return new Response(JSON.stringify({ error: "id and password required" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    // Vérifier que le client existe dans D1
    const { results } = await db.prepare("SELECT id FROM clients WHERE id = ? LIMIT 1").bind(id).all();
    if (!results || !results.length) {
      return new Response(JSON.stringify({ error: "Client inconnu" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    // Auth simplifiée : mot de passe fixe "password" (à remplacer par un vrai hash si besoin)
    if (password !== "password") {
      return new Response(JSON.stringify({ error: "invalid credentials" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    // Simple token pour prototype. A remplacer par JWT/HS256 en production.
    const token = `TOKEN:${id}:${Date.now()}`;

    return new Response(JSON.stringify({ token }), { status: 200, headers: { "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.toString() }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
