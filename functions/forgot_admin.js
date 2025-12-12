export async function onRequestPost(context) {
  try {
    // In this prototype, we don't send an email; we return a dummy link so the UI stops failing.
    const origin = context.request.headers.get("Origin") || "http://localhost:8000";
    const token = `reset-${Date.now()}`;
    const link = `${origin}/reset-admin.html?token=${token}`;
    return new Response(JSON.stringify({ message: "Lien de réinitialisation généré", link }), {
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
