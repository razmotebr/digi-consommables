import { parseAuthActor, logEvent } from "./_log.js";
import { requireRole } from "./_auth.js";

export async function onRequestPost(context) {
  const gate = await requireRole(context, ["admin"]);
  if (!gate.ok) return gate.response;
  try {
    const auth = context.request.headers.get("Authorization") || "";
    const db = context.env.DB;
    const data = await context.request.json();
    const {
      id,
      reference = "",
      nom,
      designation = "",
      mandrin = "",
      etiquettesParRouleau = null,
      rouleauxParCarton = null,
      description = "",
    } = data || {};

    if (!id || !nom) {
      return new Response(JSON.stringify({ error: "id et nom requis" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    await db
      .prepare(
        `INSERT INTO catalog_produits (id, reference, nom, designation, mandrin, etiquettes_par_rouleau, rouleaux_par_carton, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET reference=excluded.reference, nom=excluded.nom, designation=excluded.designation,
           mandrin=excluded.mandrin, etiquettes_par_rouleau=excluded.etiquettes_par_rouleau,
           rouleaux_par_carton=excluded.rouleaux_par_carton, description=excluded.description`
      )
      .bind(
        id,
        reference,
        nom,
        designation,
        mandrin,
        etiquettesParRouleau,
        rouleauxParCarton,
        description
      )
      .run();

    const actor = parseAuthActor(auth);
    await logEvent(db, {
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "catalog_upsert",
      target: `catalog:${id}`,
      details: { reference, nom },
    });

    return new Response(JSON.stringify({ ok: true }), {
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

export async function onRequestDelete(context) {
  const gate = await requireRole(context, ["admin"]);
  if (!gate.ok) return gate.response;
  try {
    const auth = context.request.headers.get("Authorization") || "";
    const db = context.env.DB;
    const data = await context.request.json();
    const { id } = data || {};
    if (!id) {
      return new Response(JSON.stringify({ error: "id requis" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    // Supprimer les prix associés
    await db.prepare("DELETE FROM prix_par_client WHERE produit_id = ?").bind(id).run();
    await db.prepare("DELETE FROM catalog_produits WHERE id = ?").bind(id).run();

    const actor = parseAuthActor(auth);
    await logEvent(db, {
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "catalog_delete",
      target: `catalog:${id}`,
    });

    return new Response(JSON.stringify({ ok: true }), {
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
