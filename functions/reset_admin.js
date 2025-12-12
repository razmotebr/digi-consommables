export async function onRequestPost(context) {
  try {
    const data = await context.request.json();
    const { token, password } = data || {};
    if (!token || !password) {
      return new Response(JSON.stringify({ error: "token and password required" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
    // Prototype: accept any token, persist nowhere.
    return new Response(JSON.stringify({ message: "Mot de passe admin mis à jour (prototype, non persistant)" }), {
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
