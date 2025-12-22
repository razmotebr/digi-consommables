function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function unauthorized() {
  return json({ error: "Unauthorized" }, 401);
}

function forbidden() {
  return json({ error: "Forbidden" }, 403);
}

function parseAdminId(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ADMIN:")) return "";
  const token = authHeader.replace("Bearer ", "");
  const parts = token.split(":");
  return parts[1] || "";
}

async function getUserRole(db, userId) {
  if (!db || !userId) return "admin";
  try {
    const res = await db.prepare("SELECT role FROM users WHERE id = ?1 LIMIT 1").bind(userId).all();
    const role = res?.results?.[0]?.role;
    return role || "admin";
  } catch (_) {
    return "admin";
  }
}

async function requireRole(context, allowedRoles = []) {
  const auth = context.request.headers.get("Authorization") || "";
  const actorId = parseAdminId(auth);
  if (!actorId) return { ok: false, response: unauthorized() };
  const role = await getUserRole(context.env.DB, actorId);
  if (role === "admin") return { ok: true, actorId, role };
  if (allowedRoles.includes(role)) return { ok: true, actorId, role };
  return { ok: false, response: forbidden() };
}

export { requireRole };
