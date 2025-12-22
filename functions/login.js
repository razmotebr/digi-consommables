async function sha256Hex(input) {
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", enc.encode(input));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function passwordMatches(password, storedHash) {
  if (!storedHash) return false;
  if (storedHash === password) return true;
  try {
    const hashed = await sha256Hex(password);
    return storedHash === hashed;
  } catch (_) {
    return false;
  }
}

function buildToken(role, id) {
  const prefix = role === "admin" ? "ADMIN" : "TOKEN";
  return `${prefix}:${id}:${Date.now()}`;
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
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

async function touchLastLogin(db, id, role, passwordHash = null) {
  try {
    await ensureLastLoginColumn(db);
    const now = new Date().toISOString();
    await db
      .prepare(
        `INSERT INTO users (id, password_hash, role, last_login)
         VALUES (?1, COALESCE(?2, (SELECT password_hash FROM users WHERE id = ?1)), ?3, ?4)
         ON CONFLICT(id) DO UPDATE SET last_login = excluded.last_login, role = excluded.role`
      )
      .bind(id, passwordHash, role, now)
      .run();
  } catch (_) {
    // best-effort only
  }
}

export async function onRequestPost(context) {
  try {
    const db = context.env.DB;
    const data = await context.request.json();
    const { id, password } = data || {};
    const envAdminUser = context.env?.ADMIN_USER || "admin";
    const envAdminPass = context.env?.ADMIN_PASS || "admin";

    if (!id || !password) {
      return json({ error: "id and password required" }, 400);
    }

    // 1) Recherche dans la table users (mot de passe géré par la base)
    const userRes = await db
      .prepare("SELECT id, password_hash, role FROM users WHERE id = ?1 LIMIT 1")
      .bind(id)
      .all();
    const user = userRes?.results?.[0];

    if (user) {
      const ok = await passwordMatches(password, user.password_hash);
      if (!ok) return json({ error: "invalid credentials" }, 401);
      const role = (user.role || "client").toLowerCase();
      const isBackoffice = role !== "client";
      const token = buildToken(isBackoffice ? "admin" : "client", user.id);
      const payload = isBackoffice
        ? { token, role, id: user.id }
        : { token, role: "client", clientId: user.id, id: user.id };
      await touchLastLogin(db, user.id, role, user.password_hash);
      return json(payload, 200);
    }

    // 2) Fallback : admin défini par variables d'environnement
    if (id === envAdminUser && password === envAdminPass) {
      const token = buildToken("admin", id);
      await touchLastLogin(db, id, "admin");
      return json({ token, role: "admin", id }, 200);
    }

    // 3) Fallback legacy : client existant + mot de passe "password"
    const { results } = await db.prepare("SELECT id FROM clients WHERE id = ?1 LIMIT 1").bind(id).all();
    if (!results || !results.length) {
      return json({ error: "Client inconnu" }, 404);
    }
    if (password !== "password") {
      return json({ error: "invalid credentials" }, 401);
    }

    const token = buildToken("client", id);
    await touchLastLogin(db, id, "client");
    return json({ token, role: "client", clientId: id, id }, 200);
  } catch (e) {
    return json({ error: e.toString() }, 500);
  }
}
