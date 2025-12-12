export async function onRequestPost(context) {
  try {
    const data = await context.request.json();
    const { user, password } = data || {};

    const envUser = context.env?.ADMIN_USER || "admin";
    const envPass = context.env?.ADMIN_PASS || "admin";

    if (!user || !password) {
      return new Response(JSON.stringify({ error: "user and password required" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    if (user !== envUser || password !== envPass) {
      return new Response(JSON.stringify({ error: "Invalid credentials" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    const token = `ADMIN:${user}:${Date.now()}`;
    return new Response(JSON.stringify({ token, user }), {
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
