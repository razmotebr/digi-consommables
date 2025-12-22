import { parseAuthActor, logEvent } from "./_log.js";

const encoder = new TextEncoder();

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function unauthorized() {
  return json({ error: "Unauthorized" }, 401);
}

function isAdmin(request) {
  const auth = request.headers.get("Authorization") || "";
  return auth.startsWith("Bearer ADMIN:");
}

function randomPassword(length = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%";
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (v) => chars[v % chars.length]).join("");
}

async function sha256Hex(input) {
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function onRequestPost(context) {
  if (!isAdmin(context.request)) return unauthorized();
  try {
    const auth = context.request.headers.get("Authorization") || "";
    const body = await context.request.json();
    const { userId } = body || {};
    if (!userId) return json({ error: "userId requis" }, 400);

    const db = context.env.DB;
    const check = await db.prepare("SELECT role FROM users WHERE id = ?1 LIMIT 1").bind(userId).all();
    const existingRole = check?.results?.[0]?.role || "client";

    const plain = randomPassword(10);
    const hashed = await sha256Hex(plain);

    await db
      .prepare(
        `INSERT INTO users (id, password_hash, role)
         VALUES (?1, ?2, ?3)
         ON CONFLICT(id) DO UPDATE SET password_hash = excluded.password_hash, role = excluded.role`
      )
      .bind(userId, hashed, existingRole || "client")
      .run();

    const actor = parseAuthActor(auth);
    await logEvent(db, {
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "user_reset_password",
      target: `user:${userId}`,
    });

    return json({ ok: true, password: plain, userId });
  } catch (e) {
    return json({ error: e.toString() }, 500);
  }
}
