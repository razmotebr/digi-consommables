export async function onRequestPost(context) {
  try {
    const db = context.env.DB;
    const data = await context.request.json();
    const { clientId, produitId, nom, prix, reference, designation, mandrin, etiquettesParRouleau, rouleauxParCarton, prixCartonHt } = data;
    if (!clientId || !produitId || typeof prix !== "number") {
      return new Response(JSON.stringify({ error: "clientId, produitId, prix requis" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    await db
      .prepare(
        `INSERT INTO catalog_produits (id, reference, nom, designation, mandrin, etiquettes_par_rouleau, rouleaux_par_carton, prix_carton_ht)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           reference=COALESCE(excluded.reference, catalog_produits.reference),
           nom=COALESCE(excluded.nom, catalog_produits.nom),
           designation=COALESCE(excluded.designation, catalog_produits.designation),
           mandrin=COALESCE(excluded.mandrin, catalog_produits.mandrin),
           etiquettes_par_rouleau=COALESCE(excluded.etiquettes_par_rouleau, catalog_produits.etiquettes_par_rouleau),
           rouleaux_par_carton=COALESCE(excluded.rouleaux_par_carton, catalog_produits.rouleaux_par_carton),
           prix_carton_ht=COALESCE(excluded.prix_carton_ht, catalog_produits.prix_carton_ht)`
      )
      .bind(
        produitId,
        reference ?? null,
        nom ?? null,
        designation ?? nom ?? null,
        mandrin ?? null,
        etiquettesParRouleau ?? null,
        rouleauxParCarton ?? null,
        prixCartonHt ?? null
      )
      .run();

    await db
      .prepare(
        `INSERT INTO prix_par_client (client_id, produit_id, prix)
         VALUES (?, ?, ?)
         ON CONFLICT(client_id, produit_id) DO UPDATE SET prix=excluded.prix`
      )
      .bind(clientId, produitId, prix)
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
    const { clientId, produitId } = data || {};
    if (!clientId || !produitId) {
      return new Response(JSON.stringify({ error: "clientId et produitId requis" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
    await db.prepare("DELETE FROM prix_par_client WHERE client_id = ? AND produit_id = ?").bind(clientId, produitId).run();
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.toString() }), { status: 500, headers: { "content-type": "application/json" } });
  }
}
