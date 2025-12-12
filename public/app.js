let produits = [];
const config = { fraisPort: 12.0, tva: 0.2 };

const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value || "";
};

const getText = (id) => (document.getElementById(id)?.textContent || "").trim();

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

    setText("clientIdTag", clientId);
    setText("clientId", clientId);

    try {
        // Infos client depuis D1
        const resClient = await fetch("/client_info", { headers: { Authorization: `Bearer ${token}` } });
        if (!resClient.ok) throw new Error(`Failed to load client: ${resClient.status}`);
        const clientData = await resClient.json();
        const cl = clientData.client || {};
        setText("enseigne", cl.enseigne || "");
        setText("magasin", cl.magasin || "");
        setText("contact", cl.contact || "");
        if (cl.email_compta) setText("emailCompta", cl.email_compta);

        // Liste de prix depuis l'API (protegee par token)
        const resPrices = await fetch("/prices", {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!resPrices.ok) throw new Error(`Failed to load prices: ${resPrices.status}`);
        const priceData = await resPrices.json();
        produits = priceData.produits || [];

        renderProduits();
        updateTotals();
    } catch (e) {
        console.error("init error:", e);
        alert("Erreur de chargement des donnees. Merci de reessayer plus tard.");
    }
}

function renderProduits() {
    const tbody = document.getElementById("produitsBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    produits.forEach((p) => {
        const tr = document.createElement("tr");

        const tdNom = document.createElement("td");
        tdNom.textContent = p.nom;

        const tdPrix = document.createElement("td");
        tdPrix.textContent = `${p.prix.toFixed(2)} EUR`;

        const tdQty = document.createElement("td");
        const qtyInput = document.createElement("input");
        qtyInput.type = "number";
        qtyInput.min = "0";
        qtyInput.value = "0";
        qtyInput.dataset.id = p.id;
        qtyInput.addEventListener("input", updateTotals);
        tdQty.appendChild(qtyInput);

        tr.appendChild(tdNom);
        tr.appendChild(tdPrix);
        tr.appendChild(tdQty);
        tbody.appendChild(tr);
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

    setText("sousTotal", `${sous.toFixed(2)} EUR`);
    setText("fraisPort", `${frais.toFixed(2)} EUR`);
    setText("totalHT", `${tht.toFixed(2)} EUR`);
    setText("tva", `${tva.toFixed(2)} EUR`);
    setText("totalTTC", `${ttc.toFixed(2)} EUR`);
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
        clientId: getText("clientId"),
        enseigne: getText("enseigne"),
        magasin: getText("magasin"),
        contact: getText("contact"),
        emailCompta: getText("emailCompta"),
        tarifMois: getText("tarifMoisLabel").replace("Tarif :", "").trim() || "Decembre 2025",
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
