let produits = [];
const config = { fraisPort: 12.0, tva: 0.2 };
let orders = [];
let currentClientId = "";

const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value || "";
};

const getText = (id) => (document.getElementById(id)?.textContent || "").trim();
const formatEuro = (n) => `${Number(n || 0).toFixed(2)} EUR`;

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

    currentClientId = clientId;
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
        const magasinName = cl.magasin ? `magasin ${cl.magasin}` : "magasin";
        const enseigneName = cl.enseigne || "enseigne";
        setText("ordersInfo", `Historique des commandes passées pour ${enseigneName} - ${magasinName}`);

        // Liste de prix depuis l'API (protegee par token)
        const resPrices = await fetch("/prices", {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!resPrices.ok) throw new Error(`Failed to load prices: ${resPrices.status}`);
        const priceData = await resPrices.json();
        produits = priceData.produits || [];

        renderProduits();
        updateTotals();
        await loadOrders(token, clientId);
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

function getStatusClass(status = "") {
    const normalized = status.toLowerCase();
    if (normalized.includes("prép") || normalized.includes("prepa")) return "preparation";
    if (normalized.includes("trait")) return "traitement";
    if (normalized.includes("envoy")) return "envoye";
    return "inconnu";
}

function renderOrders() {
    const tbody = document.getElementById("ordersBody");
    if (!tbody) return;
    tbody.innerHTML = "";
    if (!orders.length) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 5;
        td.className = "muted";
        td.textContent = "Aucune commande trouvée.";
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
    }

    orders
        .slice()
        .sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0))
        .forEach((o) => {
            const tr = document.createElement("tr");
            const statusClass = getStatusClass(o.status);
            const date = o.createdAt || o.date || o.timestamp;
            const total = o.totalTTC || o.total || 0;

            const tdRef = document.createElement("td");
            tdRef.textContent = o.id || o.reference || "-";

            const tdDate = document.createElement("td");
            tdDate.textContent = date ? new Date(date).toLocaleString("fr-FR") : "-";

            const tdTotal = document.createElement("td");
            tdTotal.textContent = formatEuro(total);

            const tdStatus = document.createElement("td");
            tdStatus.innerHTML = `<span class="status ${statusClass}">${o.status || "Inconnu"}</span>`;

            const tdPdf = document.createElement("td");
            const btn = document.createElement("button");
            btn.className = "secondary action-btn";
            btn.textContent = "PDF";
            btn.addEventListener("click", () => openOrderPdf(o.id));
            tdPdf.appendChild(btn);

            tr.appendChild(tdRef);
            tr.appendChild(tdDate);
            tr.appendChild(tdTotal);
            tr.appendChild(tdStatus);
            tr.appendChild(tdPdf);
            tbody.appendChild(tr);
        });
}

async function loadOrders(token, clientId) {
    try {
        const url = `/orders?clientId=${encodeURIComponent(clientId)}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        orders = data.orders || [];
    } catch (e) {
        console.error("loadOrders error", e);
        orders = [];
    }
    renderOrders();
}

async function openOrderPdf(orderId) {
    if (!orderId) return;
    const token = sessionStorage.getItem("token") || "";
    if (!token) {
        alert("Session expirée.");
        return;
    }
    const newWin = window.open("", "_blank");
    if (!newWin) {
        alert("Autorisez les popups pour afficher le PDF.");
        return;
    }
    try {
        const res = await fetch(`/order_pdf?orderId=${encodeURIComponent(orderId)}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
            const msg = await res.text();
            throw new Error(msg || `Erreur ${res.status}`);
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        newWin.location = url;
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
        console.error("openOrderPdf error", e);
        newWin.close();
        alert("Impossible d'ouvrir le PDF.");
    }
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

    // Enregistrer la commande côté backend (meilleur suivi)
    const token = sessionStorage.getItem("token") || "";
    fetch("/api_commande", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    }).catch((e) => console.error("log commande error", e));

    window.location.href = mailtoUrl;
    alert("Votre application mail va s'ouvrir avec la commande pre-remplie.");

    // Reset des quantités
    document.querySelectorAll("input[type=number]").forEach((inp) => {
        inp.value = "0";
    });
    updateTotals();
});

document.getElementById("btnLogout").addEventListener("click", () => {
    sessionStorage.clear();
    window.location.href = "/login.html";
});

function showTab(tabId) {
    document.querySelectorAll("nav.subnav a").forEach((a) => a.classList.remove("active"));
    document.getElementById("tabBon").classList.toggle("active", tabId === "bon");
    document.getElementById("tabCommandes").classList.toggle("active", tabId === "commandes");
    document.getElementById("sectionBon").classList.toggle("hidden", tabId !== "bon");
    document.getElementById("sectionCommandes").classList.toggle("hidden", tabId !== "commandes");
    if (tabId === "commandes" && currentClientId) {
        const token = sessionStorage.getItem("token") || "";
        loadOrders(token, currentClientId);
    }
}

document.getElementById("tabBon").addEventListener("click", (e) => {
    e.preventDefault();
    showTab("bon");
});
document.getElementById("tabCommandes").addEventListener("click", (e) => {
    e.preventDefault();
    showTab("commandes");
});

init();
