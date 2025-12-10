// Cloudflare Pages Functions ne peut pas ouvrir un socket SMTP direct.
// On envoie l'email via l'API HTTP MailChannels (supportée nativement par Workers/Pages).
// À configurer dans Pages > Settings > Environment variables :
//   EMAIL_FROM : adresse de votre domaine (ex : no-reply@votredomaine.com)
//   EMAIL_DIGI : destinataire principal (ex : ebrion@fr.digi.eu)
//   EMAIL_BCC  : destinataire en copie cachée (optionnel)
export async function onRequestPost(context) {
  try {
    const data = await context.request.json();
    const produits = Array.isArray(data.produits) ? data.produits : [];

    const lignes = produits
      .filter((p) => Number(p.qty) > 0)
      .map((p) => `- ${p.nom} : ${p.qty} x ${p.prix} €`)
      .join("\n");

    const emailCompta = data.emailCompta || "non fourni";
    const to = context.env.EMAIL_DIGI || "ebrion@fr.digi.eu";
    const bcc = context.env.EMAIL_BCC || null;
    const from =
      context.env.EMAIL_FROM || "razmotebr@hotmail.fr"; // Mettez une adresse de votre domaine

    const subject = `Commande consommables - ${(data.enseigne || "").trim()} ${(data.magasin || "").trim()}`.trim();
    const body = [
      "Commande consommables",
      "",
      `Client : ${data.clientId || ""}`,
      `Enseigne : ${data.enseigne || ""}`,
      `Magasin : ${data.magasin || ""}`,
      `Contact : ${data.contact || ""}`,
      "",
      "Produits :",
      lignes || "(aucun produit avec quantité > 0)",
      "",
      `Email compta : ${emailCompta}`,
      `Tarif : ${data.tarifMois || ""}`,
    ].join("\n");

    const mailPayload = {
      personalizations: [
        {
          to: [{ email: to }],
          ...(bcc ? { bcc: [{ email: bcc }] } : {}),
        },
      ],
      from: { email: from, name: "Commande Consommables" },
      subject,
      content: [{ type: "text/plain", value: body }],
    };

    const mailResp = await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(mailPayload),
    });

    if (!mailResp.ok) {
      const errTxt = await mailResp.text();
      throw new Error(`MailChannels error ${mailResp.status}: ${errTxt}`);
    }

    return new Response(
      JSON.stringify({ ok: true, message: "Commande envoyée", email_sent: true }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.toString() }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
