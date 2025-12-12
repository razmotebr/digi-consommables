export async function onRequestGet(context) {
  try {
    const db = context.env.DB;

    // Déterminer les colonnes disponibles du catalogue pour éviter les erreurs si la base n'est pas migrée
    const catalogColsRes = await db.prepare("PRAGMA table_info(catalog_produits)").all();
    const cols = new Set((catalogColsRes.results || []).map((c) => c.name));
    const has = (c) => cols.has(c);
    // Construire une requête tolérante : si une colonne n'existe pas, on renvoie une valeur vide/NULL avec un alias attendu
    const catalogSelect = [
      "id",
      has("reference") ? "reference" : "'' AS reference",
      "nom",
      has("designation") ? "designation" : "'' AS designation",
      has("mandrin") ? "mandrin" : "'' AS mandrin",
      has("etiquettes_par_rouleau") ? "etiquettes_par_rouleau AS etiquettesParRouleau" : "NULL AS etiquettesParRouleau",
      has("rouleaux_par_carton") ? "rouleaux_par_carton AS rouleauxParCarton" : "NULL AS rouleauxParCarton",
      has("prix_carton_ht") ? "prix_carton_ht AS prixCartonHt" : "NULL AS prixCartonHt",
      has("description") ? "description" : "'' AS description",
    ].join(", ");

    const clientsRes = await db.prepare("SELECT id, enseigne, magasin, contact, email_compta, frais_port, tva FROM clients ORDER BY id").all();
    const prixRes = await db
      .prepare(
        `SELECT pc.client_id, pc.produit_id AS id, pc.prix, cp.nom
         FROM prix_par_client pc
         LEFT JOIN catalog_produits cp ON cp.id = pc.produit_id`
      )
      .all();
    const catalogRes = await db.prepare(`SELECT ${catalogSelect} FROM catalog_produits ORDER BY id`).all();

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
        etiquettesParRouleau: p.etiquettesParRouleau,
        rouleauxParCarton: p.rouleauxParCarton,
        prixCartonHt: p.prixCartonHt,
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
