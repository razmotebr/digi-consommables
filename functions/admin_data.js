export async function onRequestGet(context) {
  try {
    const db = context.env.DB;

    const clientsRes = await db.prepare("SELECT id, enseigne, magasin, contact, email_compta, frais_port, tva FROM clients ORDER BY id").all();
    const prixRes = await db
      .prepare(
        `SELECT pc.client_id, pc.produit_id AS id, pc.prix, p.nom
         FROM prix_par_client pc
         LEFT JOIN produits p ON p.client_id = pc.client_id AND p.id = pc.produit_id`
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

    return new Response(
      JSON.stringify({
        clients,
        prixByClient,
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
