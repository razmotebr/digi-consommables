import { parseAuthActor, logEvent } from "./_log.js";
import { requireRole } from "./_auth.js";

export async function onRequestDelete(context) {
  const gate = await requireRole(context, ["admin"]);
  if (!gate.ok) return gate.response;
  try {
    const auth = context.request.headers.get("Authorization") || "";
    const db = context.env.DB;
    const data = await context.request.json();
    const enseigne = (data && data.enseigne || "").trim();
    if (!enseigne) {
      return new Response(JSON.stringify({ error: "enseigne requise" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    // Récupérer les clients de cette enseigne
    const { results: clients = [] } = await db
      .prepare("SELECT id FROM clients WHERE enseigne = ?")
      .bind(enseigne)
      .all();
    const clientIds = clients.map((c) => c.id);

    // Purger commandes et prix pour ces clients
    const tx = await db.batch([
      ...clientIds.map((cid) => db.prepare("DELETE FROM commandes WHERE client_id = ?").bind(cid)),
      ...clientIds.map((cid) => db.prepare("DELETE FROM prix_par_client WHERE client_id = ?").bind(cid)),
      db.prepare("DELETE FROM clients WHERE enseigne = ?").bind(enseigne),
    ]);
    await Promise.all(tx);

    const actor = parseAuthActor(auth);
    await logEvent(db, {
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "enseigne_delete",
      target: `enseigne:${enseigne}`,
      details: { clientsSupprimes: clientIds.length },
    });

    return new Response(JSON.stringify({ ok: true, clientsSupprimes: clientIds.length }), {
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
