import { CLIENT_ENSEIGNE, ENSEIGNE_PRICES } from "./data";

export async function onRequestGet(context) {
  try {
    // Charge clients.json depuis le site (même origine)
    const clientsRes = await fetch(new URL("/clients.json", context.request.url));
    const clientsJson = clientsRes.ok ? await clientsRes.json() : { clients: {} };

    const payload = {
      clients: clientsJson.clients || {},
      clientEnseigne: CLIENT_ENSEIGNE,
      enseignePrices: ENSEIGNE_PRICES,
    };

    return new Response(JSON.stringify(payload), {
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
