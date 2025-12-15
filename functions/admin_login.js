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

    const token = `ADMIN:${user}:${Date.now()}`;
    return json({ token, user, role: "admin" }, 200);
  } catch (e) {
    return json({ error: e.toString() }, 500);
  }
}
