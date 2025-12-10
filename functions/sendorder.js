// Envoi d'email via l'API HTTP SendGrid (Pages/Workers n'ont pas de SMTP).
// Configurer dans Pages > Settings > Environment variables (Production) :
//   SENDGRID_API_KEY : clé SendGrid (bearer)
//   EMAIL_FROM       : adresse de votre domaine validé SendGrid (obligatoire)
//   EMAIL_DIGI       : destinataire principal (ex : ebrion@fr.digi.eu)
//   EMAIL_BCC        : copie cachée (optionnel)
export async function onRequestPost(context) {
  try {
    const data = await context.request.json();
    const produits = Array.isArray(data.produits) ? data.produits : [];

    const apiKey = context.env.SENDGRID_API_KEY || "";
    const to = context.env.EMAIL_DIGI || "ebrion@fr.digi.eu";
    const bcc = context.env.EMAIL_BCC || null;
    const from = context.env.EMAIL_FROM || "";

    if (!apiKey || !from) {
      return new Response(
        JSON.stringify({ ok: false, error: "SENDGRID_API_KEY ou EMAIL_FROM manquant" }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }

    const lignes = produits
      .filter((p) => Number(p.qty) > 0)
      .map((p) => `- ${p.nom} : ${p.qty} x ${p.prix} €`)
      .join("\n");

    const emailCompta = data.emailCompta || "non fourni";
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

    const mailResp = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(mailPayload),
    });

    if (!mailResp.ok) {
      const errTxt = await mailResp.text();
      console.error("SendGrid error", mailResp.status, errTxt);
      return new Response(
        JSON.stringify({ ok: false, error: `SendGrid ${mailResp.status}`, detail: errTxt.slice(0, 500) }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, message: "Commande envoyée", email_sent: true }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  } catch (e) {
    console.error("sendorder error", e);
    return new Response(JSON.stringify({ ok: false, error: e.toString() }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
