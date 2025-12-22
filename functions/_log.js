function parseAuthActor(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { actorType: "unknown", actorId: "" };
  }
  const token = authHeader.slice("Bearer ".length);
  const parts = token.split(":");
  if (!parts.length) return { actorType: "unknown", actorId: "" };
  if (parts[0] === "ADMIN") return { actorType: "admin", actorId: parts[1] || "" };
  if (parts[0] === "TOKEN") return { actorType: "client", actorId: parts[1] || "" };
  return { actorType: "unknown", actorId: "" };
}

async function logEvent(db, { actorType, actorId, action, target, details }) {
  if (!db || !action) return;
  try {
    const ts = new Date().toISOString();
    const detailsText = details ? JSON.stringify(details) : "";
    await db
      .prepare(
        `INSERT INTO logs (ts, actor_type, actor_id, action, target, details)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
      )
      .bind(ts, actorType || "", actorId || "", action, target || "", detailsText)
      .run();
  } catch (e) {
    console.error("logEvent error", e);
  }
}

export { parseAuthActor, logEvent };
