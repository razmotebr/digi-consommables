let produits = [];
let config = {
    fraisPort: 12.0,
    tva: 0.2
};

console.log('app.js chargé');

async function init() {
    console.log('init() appelé');
    
    // Check if user is logged in (from sessionStorage)
    const token = sessionStorage.getItem('token');
    let clientId = sessionStorage.getItem('clientId');
    console.log('clientId from sessionStorage:', clientId);

    if (!token) {
        console.warn('Token manquant, redirection vers login');
        window.location.href = '/login.html';
        return;
    }
    
    // If no clientId in sessionStorage, check if it's in URL params (for direct access)
    if (!clientId) {
        const params = new URLSearchParams(window.location.search);
        clientId = params.get('client') || 'C001';
        console.log('clientId from URL or default:', clientId);
    }
    
    console.log('Using clientId:', clientId);

    // Set client ID
    const clientIdInput = document.getElementById('clientId');
    if (clientIdInput) {
        clientIdInput.value = clientId;
        console.log('✓ Set clientId field to:', clientId);
    } else {
        console.error('✗ Element clientId not found!');
    }

    // Fetch client info and products
    try {
        console.log('Fetching clients.json...');
        const response = await fetch("clients.json");
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status}`);
        }
        
        const prodData = await response.json();
        console.log('✓ Data loaded');
        
        produits = prodData.conso || [];
        console.log('✓ Produits:', produits.length, 'items');

        // Find client
        if (prodData.clients && prodData.clients[clientId]) {
            const cl = prodData.clients[clientId];
            console.log('✓ Client found:', cl);
            
            document.getElementById("enseigne").value = cl.enseigne || '';
            document.getElementById("magasin").value = cl.magasin || '';
            document.getElementById("contact").value = cl.contact || '';
            if (cl.emailCompta) {
                document.getElementById("emailCompta").value = cl.emailCompta;
            }
            console.log('✓ All fields filled');
        } else {
            console.error('✗ Client', clientId, 'not found');
            console.log('Available clients:', Object.keys(prodData.clients || {}));
        }

        renderProduits();
        updateTotals();
        console.log('✓ init() complete');
    } catch (e) {
        console.error('✗ Error in init:', e);
        alert('Erreur de chargement des donnees. Merci de reessayer plus tard.');
    }
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
        if (pr) {
            sous += pr.prix * qty;
        }
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

    console.log('btnSend clicked');

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

    console.log('Payload:', payload);

    try {
        console.log('Sending to /sendorder...');
        const res = await fetch("/sendorder", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${sessionStorage.getItem('token') || ''}`
            },
            body: JSON.stringify(payload)
        });

        console.log('Response status:', res.status);

        if (!res.ok) {
            throw new Error(`Erreur serveur: ${res.status}`);
        }

        const result = await res.json();
        console.log('Result:', result);
        
        let msg = "Commande envoyée avec succès !";
        if (result.pdf_generated) msg += "\n✓ PDF généré";
        if (result.email_sent) msg += "\n✓ Email envoyé";
        if (result.saved_path) msg += `\n📁 Fichier local: ${result.saved_path}`;
        
        console.log('Alert message:', msg);
        alert(msg);
    } catch (error) {
        console.error("Erreur lors de l'envoi:", error);
        alert("Erreur: " + error.message);
    }
});

// Logout button
document.getElementById('btnLogout').addEventListener('click', () => {
    sessionStorage.clear();
    window.location.href = '/login.html';
});

init();

