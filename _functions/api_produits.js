const MOCK_PRODUITS = [
  { id: 1, nom: 'Film alimentaire 450 mm', prix: 12.50 },
  { id: 2, nom: 'Film alimentaire 300 mm', prix: 9.90 },
  { id: 3, nom: 'Ticket Linerless 58mm x 65M ø40mm BL', prix: 4.50 },
  { id: 4, nom: 'Ticket Linerless 58mm x 65M ø40mm BL x30', prix: 101.30 },
  { id: 5, nom: 'Étiquettes thermo 58×43', prix: 3.90 }
];

// In production: query D1 to return only allowed products and client-specific prices
export async function onRequestGet(context) {
  try {
    const auth = context.request.headers.get('Authorization') || '';
    if (!auth.startsWith('Bearer TOKEN:')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'content-type': 'application/json' } });
    }

    // For mock, simply return the list
    return new Response(JSON.stringify({ produits: MOCK_PRODUITS }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.toString() }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}
