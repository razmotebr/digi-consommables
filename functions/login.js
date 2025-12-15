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
      const token = buildToken(role, user.id);
      const payload =
        role === "admin"
          ? { token, role: "admin", id: user.id }
          : { token, role: "client", clientId: user.id, id: user.id };
      return json(payload, 200);
    }

    // 2) Fallback : admin défini par variables d'environnement
    if (id === envAdminUser && password === envAdminPass) {
      const token = buildToken("admin", id);
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
    return json({ token, role: "client", clientId: id, id }, 200);
  } catch (e) {
    return json({ error: e.toString() }, 500);
  }
}
