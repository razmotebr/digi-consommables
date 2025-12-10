// Admin UI : données via /admin_data (D1) + CRUD via /admin_clients et /admin_prices
const state = {
  admin: sessionStorage.getItem("adminUser") || "admin",
  enseignes: {}, // {code: {nom,emailCompta}}
  clients: {},   // {id: {enseigne,magasin,contact,email}}
  prix: {},      // {clientId: [{id,nom,prix}]}
  catalog: {}    // {id: nom} catalogue unique
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
    const qrData = `${window.location.origin}/login.html?client=${encodeURIComponent(id)}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrData)}`;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${id}</td><td>${c.enseigne || ""}</td><td>${c.magasin || ""}</td><td>${c.contact || ""}</td><td>${c.email || ""}</td>
      <td><img src="${qrUrl}" alt="QR ${id}" width="70" height="70" loading="lazy"><br><small>URL+ID</small></td>
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
      document.getElementById("prixProduitGlobalSelect").value = prod.id;
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

function populateProduitGlobalSelect() {
  const sel = document.getElementById("prixProduitGlobalSelect");
  sel.innerHTML = '<option value="">-- Nouveau produit --</option>';
  Object.keys(state.catalog)
    .map((k) => Number(k))
    .sort((a, b) => a - b)
    .forEach((id) => {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = `${id} - ${state.catalog[id]}`;
      sel.appendChild(opt);
    });
  document.getElementById("prixId").value = "";
  document.getElementById("prixNom").value = "";
  document.getElementById("prixValeur").value = "";
}

function applySelectedProduct() {
  const clientId = document.getElementById("prixClientSelect").value.trim();
  const prodId = Number(document.getElementById("prixProduitGlobalSelect").value);
  if (!prodId) {
    document.getElementById("prixId").value = "";
    document.getElementById("prixNom").value = "";
    document.getElementById("prixValeur").value = "";
    return;
  }
  document.getElementById("prixId").value = prodId;
  document.getElementById("prixNom").value = state.catalog[prodId] || "";
  const prod = (state.prix[clientId] || []).find((p) => p.id === prodId);
  document.getElementById("prixValeur").value = prod ? prod.prix : "";
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
  applySelectedProduct();
  renderPrix();
});

document.getElementById("prixProduitGlobalSelect").addEventListener("change", () => {
  applySelectedProduct();
});

async function loadInitialData() {
  try {
    const res = await fetch("/admin_data");
    if (!res.ok) throw new Error(`admin_data ${res.status}`);
    const data = await res.json();

    state.clients = data.clients || {};
    state.prix = data.prixByClient || {};
    state.catalog = data.catalog || {};

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
    populateProduitGlobalSelect();
    const keys = Object.keys(state.clients);
    if (keys.length > 0) document.getElementById("prixClientSelect").value = keys[0];
    applySelectedProduct();
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
    populateClientSelect();
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
    populateClientSelect();
    renderPrix();
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

    // Maj catalog local
    state.catalog[id] = nom || state.catalog[id] || `Produit ${id}`;
    populateProduitGlobalSelect();

    if (!state.prix[clientId]) state.prix[clientId] = [];
    const existing = state.prix[clientId].find((p) => p.id === id);
    if (existing) {
      existing.nom = state.catalog[id];
      existing.prix = prix;
    } else {
      state.prix[clientId].push({ id, nom: state.catalog[id], prix });
    }
    renderPrix();
  } catch (e) {
    console.error("savePrice error", e);
    alert("Erreur sauvegarde prix");
  }
}

loadInitialData();
