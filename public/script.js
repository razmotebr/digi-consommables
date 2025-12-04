let produits = [];
let config = {
    fraisPort: 12.0,
    tva: 0.2
};

async function init() {

    const params = new URLSearchParams(window.location.search);

    const prodData = await fetch("clients.json").then(r => r.json());
    produits = prodData.conso;

    const clientId = params.get("client");

    if (clientId && prodData.clients[clientId]) {
        const cl = prodData.clients[clientId];

        document.getElementById("clientId").value = clientId;
        document.getElementById("enseigne").value = cl.enseigne;
        document.getElementById("magasin").value = cl.magasin;
        document.getElementById("contact").value = cl.contact;
		if (cl.emailCompta) {
			document.getElementById("emailCompta").value = cl.emailCompta;
		}
    }

    renderProduits();
    updateTotals();
}

function renderProduits() {
    const zone = document.getElementById("produits");
    zone.innerHTML = "";

    produits.forEach(p => {
        const row = document.createElement("div");
        row.className = "produit";

        row.innerHTML = `
            <span>${p.nom}</span>
            <span>${p.prix.toFixed(2)} €</span>
            <input type="number" min="0" value="0" data-id="${p.id}">
        `;

        zone.appendChild(row);
    });

    document.querySelectorAll("input[type=number]").forEach(inp => {
        inp.addEventListener("input", updateTotals);
    });
}

function updateTotals() {
    let sous = 0;

    document.querySelectorAll("input[type=number]").forEach(inp => {
        const id = inp.dataset.id;
        const qty = Number(inp.value);

        const pr = produits.find(p => p.id == id);
        sous += pr.prix * qty;
    });

    const frais = config.fraisPort;
    const tht = sous + frais;
    const tva = tht * config.tva;
    const ttc = tht + tva;

    document.getElementById("sousTotal").innerText = sous.toFixed(2) + " €";
    document.getElementById("fraisPort").innerText = frais.toFixed(2) + " €";
    document.getElementById("totalHT").innerText = tht.toFixed(2) + " €";
    document.getElementById("tva").innerText = tva.toFixed(2) + " €";
    document.getElementById("totalTTC").innerText = ttc.toFixed(2) + " €";
}

document.getElementById("btnSend").addEventListener("click", async () => {

    const payload = {
        clientId : document.getElementById("clientId").value,
        enseigne : document.getElementById("enseigne").value,
        magasin  : document.getElementById("magasin").value,
        contact  : document.getElementById("contact").value,
        emailCompta : document.getElementById("emailCompta").value,
        tarifMois : "Décembre 2025",
        produits : produits.map(p => ({
            id : p.id,
            nom : p.nom,
            prix : p.prix,
            qty : Number(document.querySelector(`input[data-id="${p.id}"]`).value)
        }))
    };

    const res = await fetch("/functions/sendOrder", {
        method: "POST",
        body: JSON.stringify(payload)
    });

    const result = await res.json();
    alert(result.message);
});

init();
