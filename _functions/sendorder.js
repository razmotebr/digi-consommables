export async function onRequestPost(context) {
  try {
    const data = await context.request.json();

    // Récupération des variables
    const emailADV = "ebrion@fr.digi.eu";
    const emailCompta = data.emailCompta || null;

    let lignes = "";
    data.produits.forEach(p => {
      if (p.qty > 0) {
        lignes += `- ${p.nom} : ${p.qty} × ${p.prix}€\n`;
      }
    });

    const texte = `
Commande consommables

Client : ${data.clientId}
Enseigne : ${data.enseigne}
Magasin : ${data.magasin}
Contact : ${data.contact}

Produits :
${lignes}

Email compta : ${emailCompta ?? "non fourni"}
Tarif : ${data.tarifMois}
`;

    console.log("MAIL À ENVOYER :\n", texte);

    return new Response(JSON.stringify({ 
      message: "Commande envoyée avec succès !" 
    }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.toString() }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}

