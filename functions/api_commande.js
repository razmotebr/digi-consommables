export async function onRequestPost(context) {
  try {
    const auth = context.request.headers.get('Authorization') || '';
    if (!auth.startsWith('Bearer TOKEN:')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'content-type': 'application/json' } });
    }

    const body = await context.request.json();

    // Basic validation
    if (!body || !body.clientId || !Array.isArray(body.produits)) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400, headers: { 'content-type': 'application/json' } });
    }

    // Log the order server-side (for prototype, using console.log)
    console.log('Nouvelle commande reçue:', JSON.stringify(body, null, 2));

    // TODO: generate PDF, send email, store in D1

    return new Response(JSON.stringify({ message: 'Commande reçue (mock). PDF/email non encore implémentés.' }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.toString() }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}
