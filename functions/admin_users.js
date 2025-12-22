import { parseAuthActor, logEvent } from "./_log.js";
import { requireRole } from "./_auth.js";

const encoder = new TextEncoder();

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function sha256Hex(input) {
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashPassword(password) {
  if (!password) return null;
  try {
    return await sha256Hex(password);
  } catch (e) {
    throw new Error("Impossible de hacher le mot de passe");
  }
}

async function ensureLastLoginColumn(db) {
  try {
    const res = await db.prepare("PRAGMA table_info(users)").all();
    const has = (res.results || []).some((r) => r.name === "last_login" || r[1] === "last_login");
    if (!has) {
      await db.prepare("ALTER TABLE users ADD COLUMN last_login TEXT").run();
    }
  } catch (_) {
    // ignore
  }
}

export async function onRequestGet(context) {
  const gate = await requireRole(context, ["admin"]);
  if (!gate.ok) return gate.response;
  try {
    const db = context.env.DB;
    await ensureLastLoginColumn(db);
    const res = await db
      .prepare(
        `SELECT u.id, u.role, u.last_login as lastLogin, c.enseigne, c.magasin
         FROM users u
         LEFT JOIN clients c ON c.id = u.id
         ORDER BY u.id`
      )
      .all();
    return json({ users: res.results || [] });
  } catch (e) {
    return json({ error: e.toString() }, 500);
  }
}

export async function onRequestPost(context) {
  const gate = await requireRole(context, ["admin"]);
  if (!gate.ok) return gate.response;
  try {
    const auth = context.request.headers.get("Authorization") || "";
    const body = await context.request.json();
    const { id, role = "client", password } = body || {};
    if (!id) return json({ error: "id requis" }, 400);

    const db = context.env.DB;
    await ensureLastLoginColumn(db);
    const roleRaw = (role || "client").toLowerCase();
    const roleSafe = ["admin", "orders", "logs", "client"].includes(roleRaw) ? roleRaw : "client";

    const existing = await db.prepare("SELECT id FROM users WHERE id = ?1 LIMIT 1").bind(id).all();
    const userExists = existing?.results?.length > 0;

    if (!userExists && !password) {
      return json({ error: "password requis pour creer un utilisateur" }, 400);
    }

    const passwordHash = password ? await hashPassword(password) : null;

    if (userExists) {
      if (passwordHash) {
        await db.prepare("UPDATE users SET role = ?1, password_hash = ?2 WHERE id = ?3").bind(roleSafe, passwordHash, id).run();
      } else {
        await db.prepare("UPDATE users SET role = ?1 WHERE id = ?2").bind(roleSafe, id).run();
      }
    } else {
      await db
        .prepare("INSERT INTO users (id, password_hash, role) VALUES (?1, ?2, ?3)")
        .bind(id, passwordHash, roleSafe)
      .run();
    }

    const actor = parseAuthActor(auth);
    await logEvent(db, {
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "user_upsert",
      target: `user:${id}`,
      details: { role: roleSafe, created: !userExists },
    });

    return json({ ok: true });
  } catch (e) {
    return json({ error: e.toString() }, 500);
  }
}

export async function onRequestDelete(context) {
  const gate = await requireRole(context, ["admin"]);
  if (!gate.ok) return gate.response;
  try {
    const auth = context.request.headers.get("Authorization") || "";
    const body = await context.request.json();
    const { id } = body || {};
    if (!id) return json({ error: "id requis" }, 400);
    const db = context.env.DB;
    await db.prepare("DELETE FROM users WHERE id = ?1").bind(id).run();
    const actor = parseAuthActor(auth);
    await logEvent(db, {
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "user_delete",
      target: `user:${id}`,
    });
    return json({ ok: true });
  } catch (e) {
    return json({ error: e.toString() }, 500);
  }
}
