export async function onRequestGet(context) {
  try {
    const db = context.env.DB;

    const clientsRes = await db.prepare("SELECT id, enseigne, magasin, contact, email_compta, frais_port, tva FROM clients ORDER BY id").all();
    const prixRes = await db
      .prepare(
        `SELECT pc.client_id, pc.produit_id AS id, pc.prix, cp.nom
         FROM prix_par_client pc
         LEFT JOIN catalog_produits cp ON cp.id = pc.produit_id`
      )
      .all();
    const catalogRes = await db
      .prepare(
        `SELECT id, reference, nom, designation, mandrin, etiquettes_par_rouleau, rouleaux_par_carton, prix_carton_ht, description
         FROM catalog_produits
         ORDER BY id`
      )
      .all();

    const clients = {};
    (clientsRes.results || []).forEach((c) => {
      clients[c.id] = {
        enseigne: c.enseigne || "",
        magasin: c.magasin || "",
        contact: c.contact || "",
        email: c.email_compta || "",
        fraisPort: c.frais_port,
        tva: c.tva,
      };
    });

    const prixByClient = {};
    (prixRes.results || []).forEach((r) => {
      if (!prixByClient[r.client_id]) prixByClient[r.client_id] = [];
      prixByClient[r.client_id].push({ id: r.id, prix: r.prix, nom: r.nom || `Produit ${r.id}` });
    });
    const catalog = {};
    (catalogRes.results || []).forEach((p) => {
      catalog[p.id] = {
        reference: p.reference || "",
        nom: p.nom || `Produit ${p.id}`,
        designation: p.designation || "",
        mandrin: p.mandrin || "",
        etiquettesParRouleau: p.etiquettes_par_rouleau,
        rouleauxParCarton: p.rouleaux_par_carton,
        prixCartonHt: p.prix_carton_ht,
        description: p.description || "",
      };
    });

    return new Response(
      JSON.stringify({
        clients,
        prixByClient,
        catalog,
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e.toString() }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
