import { parseAuthActor, logEvent } from "./_log.js";

export async function onRequestPost(context) {
  try {
    const auth = context.request.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer TOKEN:")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "content-type": "application/json" } });
    }

    const body = await context.request.json();
    const db = context.env.DB;

    // Basic validation
    if (!body || !body.clientId || !Array.isArray(body.produits)) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400, headers: { "content-type": "application/json" } });
    }

    // Compute totals
    const produits = body.produits.map((p) => ({
      id: p.id,
      nom: p.nom,
      prix: Number(p.prix) || 0,
      qty: Number(p.qty) || 0,
    }));
    const sousTotal = produits.reduce((acc, p) => acc + p.prix * p.qty, 0);
    const totalCartons = produits.reduce((acc, p) => acc + p.qty, 0);
    const baseFraisPort = Number(body.fraisPortBase ?? body.fraisPort ?? body.frais_port ?? 12.0);
    const fraisPort = totalCartons >= 5 ? 0 : baseFraisPort * totalCartons;
    const tva = Number(body.tva ?? 0.2);
    const totalHT = sousTotal + fraisPort;
    const totalTVA = totalHT * tva;
    const totalTTC = totalHT + totalTVA;

    // Insert into D1
    const now = new Date().toISOString();
    const insert = await db
      .prepare(
        `INSERT INTO commandes (client_id, date, total_ht, tva, total_ttc, status, payload)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
      )
      .bind(body.clientId, now, totalHT, tva, totalTTC, "en traitement", JSON.stringify({ ...body, produits }))
      .run();
    const orderId = insert.meta.last_row_id;
    const actor = parseAuthActor(auth);
    await logEvent(db, {
      actorType: actor.actorType,
      actorId: actor.actorId || body.clientId,
      action: "order_create",
      target: `commande:${orderId}`,
      details: { clientId: body.clientId, totalTTC },
    });

    return new Response(
      JSON.stringify({ message: "Commande enregistrée", id: orderId, totalTTC, status: "en traitement" }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e.toString() }), { status: 500, headers: { "content-type": "application/json" } });
  }
}
