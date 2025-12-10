let produits = [];
const config = {
    fraisPort: 12.0,
    tva: 0.2
};

console.log("app.js charge");

async function init() {
    const token = sessionStorage.getItem("token");
    let clientId = sessionStorage.getItem("clientId");

    if (!token) {
        window.location.href = "/login.html";
        return;
    }

    if (!clientId) {
        const params = new URLSearchParams(window.location.search);
        clientId = params.get("client") || "C001";
    }

    const clientIdInput = document.getElementById("clientId");
    if (clientIdInput) {
        clientIdInput.value = clientId;
    }

    try {
        const response = await fetch("clients.json");
        if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
        const prodData = await response.json();

        produits = prodData.conso || [];

        if (prodData.clients && prodData.clients[clientId]) {
            const cl = prodData.clients[clientId];
            document.getElementById("enseigne").value = cl.enseigne || "";
            document.getElementById("magasin").value = cl.magasin || "";
            document.getElementById("contact").value = cl.contact || "";
            if (cl.emailCompta) document.getElementById("emailCompta").value = cl.emailCompta;
        }

        renderProduits();
        updateTotals();
    } catch (e) {
        console.error("init error:", e);
        alert("Erreur de chargement des donnees. Merci de reessayer plus tard.");
    }
}

function renderProduits() {
    const zone = document.getElementById("produits");
    zone.innerHTML = "";

    produits.forEach((p) => {
        const row = document.createElement("div");
        row.className = "produit";
        row.innerHTML = `
            <span>${p.nom}</span>
            <span>${p.prix.toFixed(2)} EUR</span>
            <input type="number" min="0" value="0" data-id="${p.id}">
        `;
        zone.appendChild(row);
    });

    document.querySelectorAll("input[type=number]").forEach((inp) => {
        inp.addEventListener("input", updateTotals);
    });
}

function updateTotals() {
    let sous = 0;

    document.querySelectorAll("input[type=number]").forEach((inp) => {
        const id = inp.dataset.id;
        const qty = Number(inp.value);
        const pr = produits.find((p) => p.id == id);
        if (pr) sous += pr.prix * qty;
    });

    const frais = config.fraisPort;
    const tht = sous + frais;
    const tva = tht * config.tva;
    const ttc = tht + tva;

    document.getElementById("sousTotal").innerText = sous.toFixed(2) + " EUR";
    document.getElementById("fraisPort").innerText = frais.toFixed(2) + " EUR";
    document.getElementById("totalHT").innerText = tht.toFixed(2) + " EUR";
    document.getElementById("tva").innerText = tva.toFixed(2) + " EUR";
    document.getElementById("totalTTC").innerText = ttc.toFixed(2) + " EUR";
}

function buildMailto(payload) {
    const lignes = payload.produits
        .filter((p) => p.qty > 0)
        .map((p) => `- ${p.nom} : ${p.qty} x ${p.prix.toFixed(2)} EUR`)
        .join("\n");

    if (!lignes) return null;

    const sousTotal = payload.produits.reduce((acc, p) => acc + p.prix * p.qty, 0);
    const fraisPort = config.fraisPort;
    const totalHT = sousTotal + fraisPort;
    const tva = totalHT * config.tva;
    const totalTTC = totalHT + tva;
    const formatEuro = (n) => `${n.toFixed(2)} EUR`;

    const to = "ebrion@fr.digi.eu";
    const cc = payload.emailCompta || "";
    const subject = `Commande consommables - ${payload.clientId || ""}`;
    const body = [
        `Client : ${payload.clientId || ""}`,
        `Enseigne : ${payload.enseigne || ""}`,
        `Magasin : ${payload.magasin || ""}`,
        `Contact : ${payload.contact || ""}`,
        `Email compta : ${payload.emailCompta || "non fourni"}`,
        `Tarif : ${payload.tarifMois || ""}`,
        "",
        "Produits :",
        lignes,
        "",
        `Sous-total HT : ${formatEuro(sousTotal)}`,
        `Frais de port : ${formatEuro(fraisPort)}`,
        `Total HT : ${formatEuro(totalHT)}`,
        `TVA : ${formatEuro(tva)}`,
        `Total TTC : ${formatEuro(totalTTC)}`
    ].join("\n");

    const base = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    return cc ? `${base}&cc=${encodeURIComponent(cc)}` : base;
}

document.getElementById("btnSend").addEventListener("click", () => {
    const payload = {
        clientId: document.getElementById("clientId").value,
        enseigne: document.getElementById("enseigne").value,
        magasin: document.getElementById("magasin").value,
        contact: document.getElementById("contact").value,
        emailCompta: document.getElementById("emailCompta").value,
        tarifMois: "Decembre 2025",
        produits: produits.map((p) => ({
            id: p.id,
            nom: p.nom,
            prix: p.prix,
            qty: Number(document.querySelector(`input[data-id="${p.id}"]`).value)
        }))
    };

    const mailtoUrl = buildMailto(payload);
    if (!mailtoUrl) {
        alert("Veuillez saisir au moins une quantite avant d'envoyer.");
        return;
    }

    window.location.href = mailtoUrl;
    alert("Votre application mail va s'ouvrir avec la commande pre-remplie.");
});

document.getElementById("btnLogout").addEventListener("click", () => {
    sessionStorage.clear();
    window.location.href = "/login.html";
});

init();
