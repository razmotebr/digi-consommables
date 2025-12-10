const MOCK_CLIENTS = {
  "C001": { enseigne: "Intermarché", magasin: "Paris 15", contact: "Jean Dupont", emailCompta: "razmotebr@hotmail.fr" },
  "C002": { enseigne: "Carrefour", magasin: "Nice Gambetta", contact: "Sophie Martin", emailCompta: "razmotebr@hotmail.fr" }
};

export async function onRequestGet(context) {
  try {
    const auth = context.request.headers.get('Authorization') || '';
    if (!auth.startsWith('Bearer TOKEN:')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'content-type': 'application/json' } });
    }

    const parts = auth.split(':');
    const clientId = parts[1].replace('Bearer TOKEN', '').replace('Bearer TOKEN', '').trim() || parts[1];
    // Better parsing: token format is TOKEN:<id>:<ts>
    const tokenParts = auth.replace('Bearer ', '').split(':');
    const id = tokenParts[1];

    if (!id || !MOCK_CLIENTS[id]) {
      return new Response(JSON.stringify({ error: 'Client not found' }), { status: 404, headers: { 'content-type': 'application/json' } });
    }

    const cl = MOCK_CLIENTS[id];
    return new Response(JSON.stringify({ id, enseigne: cl.enseigne, magasin: cl.magasin, contact: cl.contact, emailCompta: cl.emailCompta }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.toString() }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}
