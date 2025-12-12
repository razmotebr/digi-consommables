export async function onRequestPost(context) {
  try {
    const db = context.env.DB;
    const data = await context.request.json();
    const { id, enseigne, magasin, contact, email, fraisPort = 12.0, tva = 0.2 } = data;
    if (!id) {
      return new Response(JSON.stringify({ error: "id requis" }), { status: 400, headers: { "content-type": "application/json" } });
    }
    await db
      .prepare(
        `INSERT INTO clients (id, enseigne, magasin, contact, email_compta, frais_port, tva)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET enseigne=excluded.enseigne, magasin=excluded.magasin, contact=excluded.contact,
         email_compta=excluded.email_compta, frais_port=excluded.frais_port, tva=excluded.tva`
      )
      .bind(id, enseigne || "", magasin || "", contact || "", email || "", fraisPort, tva)
      .run();
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.toString() }), { status: 500, headers: { "content-type": "application/json" } });
  }
}

export async function onRequestDelete(context) {
  try {
    const db = context.env.DB;
    const data = await context.request.json();
    const { id } = data || {};
    if (!id) return new Response(JSON.stringify({ error: "id requis" }), { status: 400, headers: { "content-type": "application/json" } });
    // Supprimer commandes, prix et client
    await db.prepare("DELETE FROM commandes WHERE client_id = ?").bind(id).run();
    await db.prepare("DELETE FROM prix_par_client WHERE client_id = ?").bind(id).run();
    await db.prepare("DELETE FROM clients WHERE id = ?").bind(id).run();
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.toString() }), { status: 500, headers: { "content-type": "application/json" } });
  }
}
