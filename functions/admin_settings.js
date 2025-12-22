import { requireRole } from "./_auth.js";

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function readSetting(db, key) {
  const res = await db.prepare("SELECT value FROM app_settings WHERE key = ?1 LIMIT 1").bind(key).all();
  return res?.results?.[0]?.value ?? "";
}

async function writeSetting(db, key, value) {
  const ts = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES (?1, ?2, ?3)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`
    )
    .bind(key, value, ts)
    .run();
}

export async function onRequestGet(context) {
  const auth = await requireRole(context, ["admin"]);
  if (!auth.ok) return auth.response;
  const db = context.env.DB;
  const emailCompta = db ? await readSetting(db, "email_compta") : "";
  const fraisPort = db ? await readSetting(db, "frais_port") : "";
  return json({ emailCompta, fraisPort });
}

export async function onRequestPut(context) {
  const auth = await requireRole(context, ["admin"]);
  if (!auth.ok) return auth.response;
  const db = context.env.DB;
  if (!db) return json({ error: "DB not configured" }, 500);
  let data = {};
  try {
    data = await context.request.json();
  } catch (_) {
    data = {};
  }
  const emailCompta = String(data.emailCompta || "").trim();
  const fraisPortRaw = data.fraisPort;
  const fraisPort = fraisPortRaw === "" || fraisPortRaw === null || typeof fraisPortRaw === "undefined"
    ? ""
    : String(fraisPortRaw);
  await writeSetting(db, "email_compta", emailCompta);
  await writeSetting(db, "frais_port", fraisPort);
  return json({ ok: true, emailCompta, fraisPort });
}
