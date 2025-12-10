export async function onRequestGet(context) {
  try {
    const db = context.env.DB;

    const clientsRes = await db.prepare("SELECT id, enseigne, magasin, contact, email_compta, frais_port, tva FROM clients ORDER BY id").all();
    const produitsRes = await db.prepare("SELECT id, nom, description FROM produits ORDER BY id").all();
    const prixRes = await db.prepare("SELECT client_id, produit_id, prix FROM prix_par_client").all();

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
      prixByClient[r.client_id].push({ id: r.produit_id, prix: r.prix });
    });

    return new Response(
      JSON.stringify({
        clients,
        produits: produitsRes.results || [],
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
