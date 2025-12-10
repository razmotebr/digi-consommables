// Admin UI : données via /admin_data (D1) + CRUD via /admin_clients et /admin_prices
const state = {
  admin: sessionStorage.getItem("adminUser") || "admin",
  enseignes: {}, // {code: {nom,emailCompta}}
  clients: {}, // {id: {enseigne,magasin,contact,email}}
  prix: {}, // {clientId: [{id,nom,prix}]}
};

function showSection(id) {
  document.querySelectorAll("section").forEach((s) => s.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

function renderEnseignes() {
  const tbody = document.querySelector("#tableEnseignes tbody");
  tbody.innerHTML = "";
  Object.entries(state.enseignes).forEach(([code, e]) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${code}</td><td>${e.nom || ""}</td><td>${e.emailCompta || ""}</td>
      <td><button class="secondary" data-code="${code}">Edit</button>
          <button class="secondary danger" data-del="${code}">Suppr</button></td>`;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll("button[data-code]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const code = btn.dataset.code;
      const e = state.enseignes[code];
      document.getElementById("ensCode").value = code;
      document.getElementById("ensName").value = e.nom || "";
      document.getElementById("ensEmail").value = e.emailCompta || "";
    });
  });
  tbody.querySelectorAll("button[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const code = btn.dataset.del;
      delete state.enseignes[code];
      renderEnseignes();
    });
  });
}

function renderClients() {
  const tbody = document.querySelector("#tableClients tbody");
  tbody.innerHTML = "";
  Object.entries(state.clients).forEach(([id, c]) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${id}</td><td>${c.enseigne || ""}</td><td>${c.magasin || ""}</td><td>${c.contact || ""}</td><td>${c.email || ""}</td>
      <td><button class="secondary" data-id="${id}">Edit</button>
          <button class="secondary danger" data-del="${id}">Suppr</button></td>`;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll("button[data-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const c = state.clients[id];
      document.getElementById("cliId").value = id;
      document.getElementById("cliEnseigne").value = c.enseigne || "";
      document.getElementById("cliMagasin").value = c.magasin || "";
      document.getElementById("cliContact").value = c.contact || "";
      document.getElementById("cliEmail").value = c.email || "";
    });
  });
  tbody.querySelectorAll("button[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.del;
      deleteClient(id);
    });
  });
}

function renderPrix() {
  const clientKey = document.getElementById("prixClientSelect").value.trim();
  const tbody = document.querySelector("#tablePrix tbody");
  tbody.innerHTML = "";
  const list = (state.prix[clientKey] || []).sort((a, b) => a.id - b.id);
  list.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${p.id}</td><td>${p.nom}</td><td>${p.prix.toFixed(2)}</td>
      <td><button class="secondary" data-id="${p.id}">Edit</button>
          <button class="secondary danger" data-del="${p.id}">Suppr</button></td>`;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll("button[data-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.id);
      const prod = (state.prix[clientKey] || []).find((p) => p.id === id);
      if (!prod) return;
      document.getElementById("prixId").value = prod.id;
      document.getElementById("prixNom").value = prod.nom;
      document.getElementById("prixValeur").value = prod.prix;
      document.getElementById("prixProduitSelect").value = prod.id;
    });
  });
  tbody.querySelectorAll("button[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.del);
      deletePrice(clientKey, id);
    });
  });
}

function populateClientSelect() {
  const sel = document.getElementById("prixClientSelect");
  sel.innerHTML = "";
  Object.entries(state.clients).forEach(([id, c]) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = `${id} - ${c.enseigne || ""}`.trim();
    sel.appendChild(opt);
  });
}

function populateProduitSelect() {
  const clientId = document.getElementById("prixClientSelect").value.trim();
  const sel = document.getElementById("prixProduitSelect");
  sel.innerHTML = '<option value="">-- Nouveau produit --</option>';
  (state.prix[clientId] || [])
    .sort((a, b) => a.id - b.id)
    .forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `${p.id} - ${p.nom}`;
      sel.appendChild(opt);
    });
  document.getElementById("prixId").value = "";
  document.getElementById("prixNom").value = "";
  document.getElementById("prixValeur").value = "";
}

document.getElementById("adminUserTag").textContent = state.admin;

document.getElementById("btnLogout").addEventListener("click", () => {
  sessionStorage.removeItem("adminUser");
  window.location.href = "/login.html";
});

document.getElementById("tabEnseignes").addEventListener("click", (e) => {
  e.preventDefault();
  showSection("sectionEnseignes");
});

document.getElementById("tabClients").addEventListener("click", (e) => {
  e.preventDefault();
  showSection("sectionClients");
});

document.getElementById("tabPrix").addEventListener("click", (e) => {
  e.preventDefault();
  showSection("sectionPrix");
});

document.getElementById("btnAddEnseigne").addEventListener("click", () => {
  const code = document.getElementById("ensCode").value.trim();
  const nom = document.getElementById("ensName").value.trim();
  const email = document.getElementById("ensEmail").value.trim();
  if (!code) return alert("Code requis");
  state.enseignes[code] = { nom, emailCompta: email };
  renderEnseignes();
});

document.getElementById("btnAddClient").addEventListener("click", () => {
  const id = document.getElementById("cliId").value.trim();
  if (!id) return alert("ID requis");
  saveClient({
    id,
    enseigne: document.getElementById("cliEnseigne").value.trim(),
    magasin: document.getElementById("cliMagasin").value.trim(),
    contact: document.getElementById("cliContact").value.trim(),
    email: document.getElementById("cliEmail").value.trim(),
  });
});

document.getElementById("btnAddPrix").addEventListener("click", () => {
  const clientId = document.getElementById("prixClientSelect").value.trim();
  if (!clientId) return alert("Client/enseigne requis");
  const id = Number(document.getElementById("prixId").value);
  const nom = document.getElementById("prixNom").value.trim();
  const prix = Number(document.getElementById("prixValeur").value);
  if (!id || !nom || isNaN(prix)) return alert("Champs prix invalides");
  savePrice({ clientId, id, nom, prix });
});

document.getElementById("prixClientSelect").addEventListener("change", () => {
  populateProduitSelect();
  renderPrix();
});

document.getElementById("prixProduitSelect").addEventListener("change", () => {
  const clientId = document.getElementById("prixClientSelect").value.trim();
  const prodId = Number(document.getElementById("prixProduitSelect").value);
  if (!clientId || !prodId) {
    document.getElementById("prixId").value = "";
    document.getElementById("prixNom").value = "";
    document.getElementById("prixValeur").value = "";
    return;
  }
  const prod = (state.prix[clientId] || []).find((p) => p.id === prodId);
  if (prod) {
    document.getElementById("prixId").value = prod.id;
    document.getElementById("prixNom").value = prod.nom;
    document.getElementById("prixValeur").value = prod.prix;
  }
});

async function loadInitialData() {
  try {
    const res = await fetch("/admin_data");
    if (!res.ok) throw new Error(`admin_data ${res.status}`);
    const data = await res.json();

    state.clients = data.clients || {};
    state.prix = data.prixByClient || {};

    // Enseignes derivees des clients existants
    state.enseignes = {};
    Object.values(state.clients).forEach((c) => {
      if (c.enseigne && !state.enseignes[c.enseigne]) {
        state.enseignes[c.enseigne] = { nom: c.enseigne, emailCompta: c.email || "" };
      }
    });

    renderEnseignes();
    renderClients();

    populateClientSelect();
    const keys = Object.keys(state.clients);
    if (keys.length > 0) document.getElementById("prixClientSelect").value = keys[0];
    populateProduitSelect();
    renderPrix();
  } catch (e) {
    console.error("loadInitialData error", e);
    alert("Impossible de charger les donnees admin");
  }
}

async function saveClient(payload) {
  try {
    const res = await fetch("/admin_clients", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    state.clients[payload.id] = {
      enseigne: payload.enseigne,
      magasin: payload.magasin,
      contact: payload.contact,
      email: payload.email,
    };
    renderClients();
    if (payload.enseigne && !state.enseignes[payload.enseigne]) {
      state.enseignes[payload.enseigne] = { nom: payload.enseigne, emailCompta: payload.email || "" };
      renderEnseignes();
    }
  } catch (e) {
    console.error("saveClient error", e);
    alert("Erreur sauvegarde client");
  }
}

async function deleteClient(id) {
  try {
    const res = await fetch("/admin_clients", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) throw new Error(await res.text());
    delete state.clients[id];
    renderClients();
  } catch (e) {
    console.error("deleteClient error", e);
    alert("Erreur suppression client");
  }
}

async function deletePrice(clientId, produitId) {
  try {
    const res = await fetch("/admin_prices", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientId, produitId }),
    });
    if (!res.ok) throw new Error(await res.text());
    state.prix[clientId] = (state.prix[clientId] || []).filter((p) => p.id !== produitId);
    populateProduitSelect();
    renderPrix();
  } catch (e) {
    console.error("deletePrice error", e);
    alert("Erreur suppression prix");
  }
}

async function savePrice({ clientId, id, nom, prix }) {
  try {
    const res = await fetch("/admin_prices", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientId, produitId: id, nom, prix }),
    });
    if (!res.ok) throw new Error(await res.text());
    if (!state.prix[clientId]) state.prix[clientId] = [];
    const existing = state.prix[clientId].find((p) => p.id === id);
    if (existing) {
      existing.nom = nom;
      existing.prix = prix;
    } else {
      state.prix[clientId].push({ id, nom, prix });
    }
    populateProduitSelect();
    renderPrix();
  } catch (e) {
    console.error("savePrice error", e);
    alert("Erreur sauvegarde prix");
  }
}

loadInitialData();
