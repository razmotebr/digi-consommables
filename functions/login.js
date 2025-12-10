export async function onRequestPost(context) {
  try {
    const data = await context.request.json();
    const { id, password } = data || {};

    // Mock auth for prototype: password must equal 'password'
    // Replace with real hashing + D1 lookup in production
    if (!id || !password) {
      return new Response(JSON.stringify({ error: 'id and password required' }), { status: 400, headers: { 'content-type': 'application/json' } });
    }

    if (password !== 'password') {
      return new Response(JSON.stringify({ error: 'invalid credentials' }), { status: 401, headers: { 'content-type': 'application/json' } });
    }

    // Simple token for prototype. Replace by JWT (HS256) in production.
    const token = `TOKEN:${id}:${Date.now()}`;

    return new Response(JSON.stringify({ token }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.toString() }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}
