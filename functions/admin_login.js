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
  } catch (_) {}
}

async function touchLastLogin(db, id) {
  try {
    await ensureLastLoginColumn(db);
    await db
      .prepare(
        `INSERT INTO users (id, password_hash, role, last_login)
         VALUES (?1, COALESCE((SELECT password_hash FROM users WHERE id = ?1), ''), 'admin', ?2)
         ON CONFLICT(id) DO UPDATE SET last_login = excluded.last_login, role = excluded.role`
      )
      .bind(id, new Date().toISOString())
      .run();
  } catch (_) {}
}

export async function onRequestPost(context) {
  try {
    const data = await context.request.json();
    const { user, password } = data || {};
    const envUser = context.env?.ADMIN_USER || "admin";
    const envPass = context.env?.ADMIN_PASS || "admin";

    if (!user || !password) {
      return json({ error: "user and password required" }, 400);
    }

    // 1) Admin présent dans la table users
    if (context.env?.DB) {
      const res = await context.env.DB.prepare("SELECT id, password_hash, role FROM users WHERE id = ?1 LIMIT 1")
        .bind(user)
        .all();
      const row = res?.results?.[0];
      if (row && (row.role || "").toLowerCase() === "admin") {
        const ok = await passwordMatches(password, row.password_hash);
        if (!ok) return json({ error: "Invalid credentials" }, 401);
        const token = `ADMIN:${row.id}:${Date.now()}`;
        return json({ token, user: row.id, role: "admin" }, 200);
      }
    }

    // 2) Fallback : variables d'environnement
    if (user !== envUser || password !== envPass) {
      return json({ error: "Invalid credentials" }, 401);
    }

    if (context.env?.DB) {
      await touchLastLogin(context.env.DB, user);
    }

    const token = `ADMIN:${user}:${Date.now()}`;
    return json({ token, user, role: "admin" }, 200);
  } catch (e) {
    return json({ error: e.toString() }, 500);
  }
}
