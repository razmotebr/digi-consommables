// Admin UI
const state = {
  admin: sessionStorage.getItem("adminUser") || "admin",
  enseignes: {}, // {code: {nom,emailCompta}}
  clients: {}, // {id: {enseigne,magasin,contact,email}}
  prix: {}, // {enseigne: [{id,nom,prix}]}
  catalog: {}, // {id: nom}
  orders: [], // [{id, clientId, enseigne, magasin, total, status, createdAt}]
  users: [], // [{id, enseigne, magasin, lastLogin}]
};

const adminToken = sessionStorage.getItem("adminToken");
if (!adminToken) {
  window.location.href = "/admin-login.html";
}

function redirectAdminLogin() {
  sessionStorage.removeItem("adminUser");
  sessionStorage.removeItem("adminToken");
  window.location.href = "/admin-login.html";
}

function ensureAuthorized(res) {
  if (res.status === 401) {
    redirectAdminLogin();
    return false;
  }
  return true;
}

function showSection(id) {
  document.querySelectorAll("section").forEach((s) => s.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

function withAuthHeaders(headers = {}) {
  return adminToken ? { ...headers, Authorization: `Bearer ${adminToken}` } : headers;
}

function fillEnseigneOptions(selectEl, selected = "") {
  if (!selectEl) return;
  const current = selected;
  selectEl.innerHTML = '<option value="">-- Choisir une enseigne --</option>';
  Object.keys(state.enseignes)
    .sort()
    .forEach((code) => {
      const opt = document.createElement("option");
      opt.value = code;
      opt.textContent = code;
      if (code === current) opt.selected = true;
      selectEl.appendChild(opt);
    });
  if (current && !state.enseignes[current]) {
    const opt = document.createElement("option");
    opt.value = current;
    opt.textContent = current;
    opt.selected = true;
    selectEl.appendChild(opt);
  }
}

// --- RENDER ---
function renderEnseignes() {
  const tbody = document.querySelector("#tableEnseignes tbody");
  const addRow = tbody.querySelector(".add-row");
  tbody.innerHTML = "";
  if (addRow) tbody.appendChild(addRow);

  Object.entries(state.enseignes).forEach(([code, e]) => {
    const tr = document.createElement("tr");

    const tdCode = document.createElement("td");
    const inpCode = document.createElement("input");
    inpCode.type = "text";
    inpCode.value = code;
    inpCode.disabled = true;
    tdCode.appendChild(inpCode);

    const tdNom = document.createElement("td");
    const inpNom = document.createElement("input");
    inpNom.type = "text";
    inpNom.value = e.nom || "";
    inpNom.disabled = true;
    tdNom.appendChild(inpNom);

    const tdEmail = document.createElement("td");
    const inpEmail = document.createElement("input");
    inpEmail.type = "email";
    inpEmail.value = e.emailCompta || "";
    inpEmail.disabled = true;
    tdEmail.appendChild(inpEmail);

    const actions = document.createElement("td");
    actions.className = "table-actions";
    const editBtn = document.createElement("button");
    editBtn.className = "secondary action-btn";
    editBtn.textContent = "Edit";
    const delBtn = document.createElement("button");
    delBtn.className = "secondary danger action-btn";
    delBtn.textContent = "Suppr";

    editBtn.addEventListener("click", () => {
      const editing = tr.dataset.editing === "true";
      if (!editing) {
        tr.dataset.editing = "true";
        editBtn.textContent = "Enregistrer";
        inpCode.disabled = false;
        inpNom.disabled = false;
        inpEmail.disabled = false;
        return;
      }
      const newCode = inpCode.value.trim();
      const newNom = inpNom.value.trim();
      const newEmail = inpEmail.value.trim();
      if (!newCode) return alert("Code requis");
      if (newCode !== code && state.enseignes[newCode]) return alert("Code déjà existant");
      delete state.enseignes[code];
      state.enseignes[newCode] = { nom: newNom, emailCompta: newEmail };
      renderEnseignes();
      fillEnseigneOptions(document.getElementById("cliEnseigneSelect"));
      populateEnseigneSelect();
    });

    delBtn.addEventListener("click", () => {
      delete state.enseignes[code];
      renderEnseignes();
      fillEnseigneOptions(document.getElementById("cliEnseigneSelect"));
      populateEnseigneSelect();
    });

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    tr.appendChild(tdCode);
    tr.appendChild(tdNom);
    tr.appendChild(tdEmail);
    tr.appendChild(actions);
    tbody.appendChild(tr);
  });

  populateOrdersEnseigneSelect();
}

function renderClients() {
  const tbody = document.querySelector("#tableClients tbody");
  const addRow = tbody.querySelector(".add-row");
  tbody.innerHTML = "";
  if (addRow) {
    tbody.appendChild(addRow);
    fillEnseigneOptions(document.getElementById("cliEnseigneSelect"));
    // Normaliser la hauteur de la ligne d'ajout
    addRow.style.height = "78px";
    addRow.querySelectorAll("td").forEach((td) => (td.style.verticalAlign = "middle"));
  }

  Object.entries(state.clients).forEach(([id, c]) => {
    const tr = document.createElement("tr");

    const tdQr = document.createElement("td");
    tdQr.className = "qr-cell";
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
      `${window.location.origin}/login.html?client=${encodeURIComponent(id)}`
    )}`;
    const img = document.createElement("img");
    img.src = qrUrl;
    img.alt = `QR ${id}`;
    img.width = 70;
    img.height = 70;
    img.loading = "lazy";
    tdQr.appendChild(img);
    tdQr.style.flexWrap = "nowrap";
    tdQr.style.gap = "8px";

    const tdId = document.createElement("td");
    const inpId = document.createElement("input");
    inpId.type = "text";
    inpId.value = id;
    inpId.disabled = true;
    tdId.appendChild(inpId);

    const tdEns = document.createElement("td");
    const selEns = document.createElement("select");
    fillEnseigneOptions(selEns, c.enseigne || "");
    selEns.disabled = true;
    tdEns.appendChild(selEns);

    const tdMag = document.createElement("td");
    const inpMag = document.createElement("input");
    inpMag.type = "text";
    inpMag.value = c.magasin || "";
    inpMag.disabled = true;
    tdMag.appendChild(inpMag);

    const tdContact = document.createElement("td");
    const inpContact = document.createElement("input");
    inpContact.type = "text";
    inpContact.value = c.contact || "";
    inpContact.disabled = true;
    tdContact.appendChild(inpContact);

    const tdEmail = document.createElement("td");
    const inpEmail = document.createElement("input");
    inpEmail.type = "email";
    inpEmail.value = c.email || "";
    inpEmail.disabled = true;
    tdEmail.appendChild(inpEmail);

    const actions = document.createElement("td");
    actions.className = "table-actions";
    const editBtn = document.createElement("button");
    editBtn.className = "secondary action-btn";
    editBtn.textContent = "Edit";
    const delBtn = document.createElement("button");
    delBtn.className = "secondary danger action-btn";
    delBtn.textContent = "Suppr";

    editBtn.addEventListener("click", () => {
      const editing = tr.dataset.editing === "true";
      if (!editing) {
        tr.dataset.editing = "true";
        editBtn.textContent = "Enregistrer";
        selEns.disabled = false;
        inpMag.disabled = false;
        inpContact.disabled = false;
        inpEmail.disabled = false;
        return;
      }
      saveClient({
        id,
        enseigne: selEns.value.trim(),
        magasin: inpMag.value.trim(),
        contact: inpContact.value.trim(),
        email: inpEmail.value.trim(),
      });
    });

    delBtn.addEventListener("click", () => deleteClient(id));

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    tr.appendChild(tdQr);
    tr.appendChild(tdId);
    tr.appendChild(tdEns);
    tr.appendChild(tdMag);
    tr.appendChild(tdContact);
    tr.appendChild(tdEmail);
    tr.appendChild(actions);
    tbody.appendChild(tr);
  });
}

function renderCatalogue() {
  const tbody = document.querySelector("#tableCatalogue tbody");
  const addRow = tbody.querySelector(".add-row");
  tbody.innerHTML = "";
  if (addRow) tbody.appendChild(addRow);

  Object.keys(state.catalog)
    .map((k) => Number(k))
    .sort((a, b) => a - b)
    .forEach((id) => {
      const tr = document.createElement("tr");

      const tdId = document.createElement("td");
      const inpId = document.createElement("input");
      inpId.type = "number";
      inpId.value = id;
      inpId.disabled = true;
      tdId.appendChild(inpId);

      const tdNom = document.createElement("td");
      const inpNom = document.createElement("input");
      inpNom.type = "text";
      inpNom.value = state.catalog[id] || "";
      inpNom.disabled = true;
      tdNom.appendChild(inpNom);

      const actions = document.createElement("td");
      actions.className = "table-actions";
      const editBtn = document.createElement("button");
      editBtn.className = "secondary action-btn";
      editBtn.textContent = "Edit";
      const delBtn = document.createElement("button");
      delBtn.className = "secondary danger action-btn";
      delBtn.textContent = "Suppr";

      editBtn.addEventListener("click", () => {
        const editing = tr.dataset.editing === "true";
        if (!editing) {
          tr.dataset.editing = "true";
          editBtn.textContent = "Enregistrer";
          inpNom.disabled = false;
          return;
        }
        const nom = inpNom.value.trim();
        if (!nom) return alert("Nom requis");
        saveCatalogue({ id, nom });
      });

      delBtn.addEventListener("click", () => deleteCatalogue(id));

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      tr.appendChild(tdId);
      tr.appendChild(tdNom);
      tr.appendChild(actions);
      tbody.appendChild(tr);
    });
}

function renderPrix() {
  const enseigne = document.getElementById("prixEnseigneSelect").value.trim();
  const tbody = document.querySelector("#tablePrix tbody");
  const addRow = tbody.querySelector(".add-row");
  tbody.innerHTML = "";
  if (addRow) tbody.appendChild(addRow);
  if (!enseigne) return;

  (state.prix[enseigne] || [])
    .slice()
    .sort((a, b) => a.id - b.id)
    .forEach((p) => {
      const tr = document.createElement("tr");

      const tdId = document.createElement("td");
      const inpId = document.createElement("input");
      inpId.type = "number";
      inpId.value = p.id;
      inpId.disabled = true;
      tdId.appendChild(inpId);

      const tdNom = document.createElement("td");
      const inpNom = document.createElement("input");
      inpNom.type = "text";
      inpNom.value = p.nom || "";
      inpNom.disabled = true;
      tdNom.appendChild(inpNom);

      const tdPrix = document.createElement("td");
      const inpPrix = document.createElement("input");
      inpPrix.type = "number";
      inpPrix.step = "0.01";
      inpPrix.value = p.prix.toFixed(2);
      inpPrix.disabled = true;
      tdPrix.appendChild(inpPrix);

      const actions = document.createElement("td");
      actions.className = "table-actions";
      const editBtn = document.createElement("button");
      editBtn.className = "secondary action-btn";
      editBtn.textContent = "Edit";
      const delBtn = document.createElement("button");
      delBtn.className = "secondary danger action-btn";
      delBtn.textContent = "Suppr";

      editBtn.addEventListener("click", () => {
        const editing = tr.dataset.editing === "true";
        if (!editing) {
          tr.dataset.editing = "true";
          editBtn.textContent = "Enregistrer";
          inpNom.disabled = false;
          inpPrix.disabled = false;
          return;
        }
        const nom = inpNom.value.trim();
        const prix = Number(inpPrix.value);
        if (!nom || isNaN(prix)) return alert("Champs invalides");
        savePrice({ enseigne, id: p.id, nom, prix });
      });

      delBtn.addEventListener("click", () => deletePrice(enseigne, p.id));

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      tr.appendChild(tdId);
      tr.appendChild(tdNom);
      tr.appendChild(tdPrix);
      tr.appendChild(actions);
      tbody.appendChild(tr);
    });
}

function statusClass(status = "") {
  const normalized = status
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  if (normalized.includes("prep")) return "preparation";
  if (normalized.includes("trait")) return "traitement";
  if (normalized.includes("envoy")) return "envoye";
  return "inconnu";
}

function renderAdminOrders() {
  const tbody = document.querySelector("#tableAdminOrders tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (!state.orders.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 7;
    td.className = "muted";
    td.textContent = "Aucune commande pour cette enseigne.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  state.orders
    .slice()
    .sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0))
    .forEach((o) => {
      const tr = document.createElement("tr");
      const cls = statusClass(o.status);
      const select = document.createElement("select");
      ["en traitement", "en préparation", "envoyé"].forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s;
        opt.textContent = s;
        if ((o.status || "").toLowerCase() === s.toLowerCase()) opt.selected = true;
        select.appendChild(opt);
      });
      select.addEventListener("change", () => updateOrderStatus(o.id, select.value));

      tr.innerHTML = `
        <td>${o.id || o.reference || "-"}</td>
        <td>${o.clientId || "-"}</td>
        <td>${o.magasin || "-"}</td>
        <td>${o.totalTTC || o.total || 0} EUR</td>
        <td>${o.createdAt ? new Date(o.createdAt).toLocaleString("fr-FR") : "-"}</td>
        <td><span class="status ${cls}">${o.status || "Inconnu"}</span></td>
      `;
      const actionsTd = document.createElement("td");
      actionsTd.appendChild(select);
      tr.appendChild(actionsTd);
      tbody.appendChild(tr);
    });
}

function renderUsers() {
  const tbody = document.querySelector("#tableUsers tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (!state.users.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.className = "muted";
    td.textContent = "Aucun utilisateur.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  state.users
    .slice()
    .sort((a, b) => (a.id || "").localeCompare(b.id || ""))
    .forEach((u) => {
      const tr = document.createElement("tr");
      const lastLogin = u.lastLogin ? new Date(u.lastLogin).toLocaleString("fr-FR") : "-";

      tr.innerHTML = `
        <td>${u.id || "-"}</td>
        <td>${u.enseigne || "-"}</td>
        <td>${u.magasin || "-"}</td>
        <td>${lastLogin}</td>
      `;

      const actions = document.createElement("td");
      const resetBtn = document.createElement("button");
      resetBtn.className = "secondary action-btn";
      resetBtn.textContent = "Reset MDP";
      resetBtn.addEventListener("click", () => resetUserPassword(u.id));
      actions.appendChild(resetBtn);
      tr.appendChild(actions);
      tbody.appendChild(tr);
    });
}

// --- HELPERS ---
function populateEnseigneSelect() {
  fillEnseigneOptions(document.getElementById("prixEnseigneSelect"));
}

function populateOrdersEnseigneSelect() {
  const sel = document.getElementById("ordersEnseigneSelect");
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">Toutes les enseignes</option>';
  Object.keys(state.enseignes)
    .sort()
    .forEach((code) => {
      const opt = document.createElement("option");
      opt.value = code;
      opt.textContent = code;
      if (code === current) opt.selected = true;
      sel.appendChild(opt);
    });
}

function populateProduitGlobalSelect() {
  const sel = document.getElementById("prixProduitGlobalSelect");
  if (!sel) return;
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
  const enseigne = document.getElementById("prixEnseigneSelect").value.trim();
  const prodId = Number(document.getElementById("prixProduitGlobalSelect").value);
  if (!prodId) {
    document.getElementById("prixId").value = "";
    document.getElementById("prixNom").value = "";
    document.getElementById("prixValeur").value = "";
    return;
  }
  document.getElementById("prixId").value = prodId;
  document.getElementById("prixNom").value = state.catalog[prodId] || "";
  const prod = (state.prix[enseigne] || []).find((p) => p.id === prodId);
  document.getElementById("prixValeur").value = prod ? prod.prix : "";
}

function getClientsForEnseigne(enseigne) {
  return Object.entries(state.clients)
    .filter(([, c]) => c.enseigne === enseigne)
    .map(([id]) => id);
}

function getNextCatalogId() {
  const ids = Object.keys(state.catalog).map((k) => Number(k)).filter((n) => !isNaN(n));
  return ids.length ? Math.max(...ids) + 1 : 1;
}

// --- API ---
async function loadInitialData() {
  try {
    const res = await fetch("/admin_data", { headers: withAuthHeaders() });
    if (!ensureAuthorized(res)) return;
    if (!res.ok) throw new Error(`admin_data ${res.status}`);
    const data = await res.json();

    state.clients = data.clients || {};
    state.catalog = data.catalog || {};
    state.prix = {};

    // Enseignes dérivées des clients
    state.enseignes = {};
    Object.values(state.clients).forEach((c) => {
      if (c.enseigne) state.enseignes[c.enseigne] = { nom: c.enseigne, emailCompta: c.email || "" };
    });

    // Prix par enseigne à partir des prix par client
    const prixByClient = data.prixByClient || {};
    Object.entries(prixByClient).forEach(([clientId, list]) => {
      const ens = state.clients[clientId]?.enseigne || clientId;
      if (!state.prix[ens]) state.prix[ens] = [];
      list.forEach((p) => {
        const existing = state.prix[ens].find((x) => x.id === p.id);
        if (existing) {
          existing.nom = p.nom;
          existing.prix = p.prix;
        } else {
          state.prix[ens].push({ id: p.id, nom: p.nom, prix: p.prix });
        }
      });
    });

    renderEnseignes();
    renderClients();
    renderCatalogue();
    populateEnseigneSelect();
    populateProduitGlobalSelect();
    applySelectedProduct();
    renderPrix();
    await loadOrdersByEnseigne(document.getElementById("ordersEnseigneSelect")?.value || "");
    renderAdminOrders();
    await loadUsers();
  } catch (e) {
    console.error("loadInitialData error", e);
    // Fallback local pour éviter un écran vide
    try {
      const fallback = await fetch("/clients.json");
      if (fallback.ok) {
        const data = await fallback.json();
        state.clients = data.clients || {};
        state.catalog = {};
        (data.conso || []).forEach((p) => {
          state.catalog[p.id] = p.nom;
        });
        // Prix identiques pour chaque client du fallback
        state.prix = {};
        Object.entries(state.clients).forEach(([cid, c]) => {
          const ens = c.enseigne || cid;
          state.prix[ens] = (data.conso || []).map((p) => ({ id: p.id, nom: p.nom, prix: p.prix }));
        });
        // Enseignes
        state.enseignes = {};
        Object.values(state.clients).forEach((c) => {
          if (c.enseigne) state.enseignes[c.enseigne] = { nom: c.enseigne, emailCompta: c.emailCompta || "" };
        });
        populateOrdersEnseigneSelect();
        renderEnseignes();
        renderClients();
        renderCatalogue();
        populateEnseigneSelect();
        populateProduitGlobalSelect();
        applySelectedProduct();
        renderPrix();
        alert("Chargement admin_data impossible. Données locales de secours chargées.");
        return;
      }
    } catch (err) {
      console.error("fallback load error", err);
    }
    alert(`Impossible de charger les données admin : ${e.message || e}`);
  }
}

async function saveClient(payload) {
  try {
    const res = await fetch("/admin_clients", {
      method: "POST",
      headers: withAuthHeaders({ "content-type": "application/json" }),
      body: JSON.stringify(payload),
    });
    if (!ensureAuthorized(res)) return;
    if (!res.ok) throw new Error(await res.text());
    state.clients[payload.id] = {
      enseigne: payload.enseigne,
      magasin: payload.magasin,
      contact: payload.contact,
      email: payload.email,
    };
    if (payload.enseigne && !state.enseignes[payload.enseigne]) {
      state.enseignes[payload.enseigne] = { nom: payload.enseigne, emailCompta: payload.email || "" };
    }
    // Copier les prix de l'enseigne vers ce nouveau client (persistance backend)
    if (payload.enseigne && state.prix[payload.enseigne]?.length) {
      await Promise.all(
        state.prix[payload.enseigne].map((p) =>
          fetch("/admin_prices", {
            method: "POST",
            headers: withAuthHeaders({ "content-type": "application/json" }),
            body: JSON.stringify({ clientId: payload.id, produitId: p.id, nom: p.nom, prix: p.prix }),
          })
        )
      ).catch((e) => console.error("copy prices to new client error", e));
    }
    renderClients();
    renderEnseignes();
    populateEnseigneSelect();
  } catch (e) {
    console.error("saveClient error", e);
    alert("Erreur sauvegarde client");
  }
}

async function deleteClient(id) {
  try {
    const res = await fetch("/admin_clients", {
      method: "DELETE",
      headers: withAuthHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({ id }),
    });
    if (!ensureAuthorized(res)) return;
    if (!res.ok) throw new Error(await res.text());
    delete state.clients[id];
    renderClients();
    renderEnseignes();
    populateEnseigneSelect();
    renderPrix();
  } catch (e) {
    console.error("deleteClient error", e);
    alert("Erreur suppression client");
  }
}

async function savePrice({ enseigne, id, nom, prix }) {
  // Maj backend pour chaque client de l'enseigne
  const clientIds = getClientsForEnseigne(enseigne);
  await Promise.all(
    clientIds.map((cid) =>
      fetch("/admin_prices", {
        method: "POST",
        headers: withAuthHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({ clientId: cid, produitId: id, nom, prix }),
      })
    )
  ).catch((e) => console.error("savePrice error", e));

  // Maj locale
  state.catalog[id] = nom || state.catalog[id] || `Produit ${id}`;
  if (!state.prix[enseigne]) state.prix[enseigne] = [];
  const existing = state.prix[enseigne].find((p) => p.id === id);
  if (existing) {
    existing.nom = state.catalog[id];
    existing.prix = prix;
  } else {
    state.prix[enseigne].push({ id, nom: state.catalog[id], prix });
  }
  populateProduitGlobalSelect();
  renderPrix();
}

async function deletePrice(enseigne, produitId) {
  const clientIds = getClientsForEnseigne(enseigne);
  await Promise.all(
    clientIds.map((cid) =>
      fetch("/admin_prices", {
        method: "DELETE",
        headers: withAuthHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({ clientId: cid, produitId }),
      })
    )
  ).catch((e) => console.error("deletePrice error", e));

  state.prix[enseigne] = (state.prix[enseigne] || []).filter((p) => p.id !== produitId);
  renderPrix();
}

async function saveCatalogue({ id, nom }) {
  state.catalog[id] = nom;
  // Propager le libellé dans toutes les grilles de prix locales
  Object.keys(state.prix).forEach((ens) => {
    state.prix[ens] = (state.prix[ens] || []).map((p) => (p.id === id ? { ...p, nom } : p));
  });
  renderCatalogue();
  populateProduitGlobalSelect();
  applySelectedProduct();
  renderPrix();
}

async function deleteCatalogue(id) {
  delete state.catalog[id];
  Object.keys(state.prix).forEach((ens) => {
    state.prix[ens] = (state.prix[ens] || []).filter((p) => p.id !== id);
  });
  renderCatalogue();
  populateProduitGlobalSelect();
  applySelectedProduct();
  renderPrix();
}

async function loadOrdersByEnseigne(enseigne) {
  try {
    const url = enseigne ? `/admin_orders?enseigne=${encodeURIComponent(enseigne)}` : "/admin_orders";
    const res = await fetch(url, { headers: withAuthHeaders() });
    if (!ensureAuthorized(res)) return;
    if (!res.ok) throw new Error(`orders ${res.status}`);
    const data = await res.json();
    state.orders = data.orders || [];
  } catch (e) {
    console.error("loadOrdersByEnseigne error", e);
    state.orders = [];
  }
  renderAdminOrders();
}

async function updateOrderStatus(orderId, status) {
  try {
    const res = await fetch("/admin_orders", {
      method: "PUT",
      headers: withAuthHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({ orderId, status }),
    });
    if (!ensureAuthorized(res)) return;
    if (!res.ok) throw new Error(await res.text());
    const found = state.orders.find((o) => o.id === orderId);
    if (found) found.status = status;
    renderAdminOrders();
  } catch (e) {
    console.error("updateOrderStatus error", e);
    alert("Impossible de mettre à jour le statut.");
  }
}

async function loadUsers() {
  try {
    const res = await fetch("/admin_users", { headers: withAuthHeaders() });
    if (!ensureAuthorized(res)) return;
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    state.users = data.users || [];
  } catch (e) {
    console.error("loadUsers error", e);
    state.users = [];
  }
  renderUsers();
}

async function resetUserPassword(userId) {
  if (!userId) return;
  const confirmReset = confirm(`Réinitialiser le mot de passe pour ${userId} ?`);
  if (!confirmReset) return;
  try {
    const res = await fetch("/admin_reset_password", {
      method: "POST",
      headers: withAuthHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({ userId }),
    });
    if (!ensureAuthorized(res)) return;
    if (!res.ok) throw new Error(await res.text());
    alert("Mot de passe réinitialisé. Un nouveau mot de passe a été généré.");
    await loadUsers();
  } catch (e) {
    console.error("resetUserPassword error", e);
    alert("Impossible de réinitialiser le mot de passe.");
  }
}

// --- Events ---
document.getElementById("adminUserTag").textContent = state.admin;
document.getElementById("btnLogout").addEventListener("click", () => {
  sessionStorage.removeItem("adminUser");
  sessionStorage.removeItem("adminToken");
  window.location.href = "/admin-login.html";
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
document.getElementById("tabCatalogue").addEventListener("click", (e) => {
  e.preventDefault();
  showSection("sectionCatalogue");
});
document.getElementById("tabCommandes").addEventListener("click", async (e) => {
  e.preventDefault();
  showSection("sectionCommandes");
  await loadOrdersByEnseigne(document.getElementById("ordersEnseigneSelect").value);
});
document.getElementById("tabUsers").addEventListener("click", async (e) => {
  e.preventDefault();
  showSection("sectionUsers");
  await loadUsers();
});

document.getElementById("prixEnseigneSelect").addEventListener("change", () => {
  applySelectedProduct();
  renderPrix();
});
document.getElementById("prixProduitGlobalSelect").addEventListener("change", applySelectedProduct);
document.getElementById("ordersEnseigneSelect").addEventListener("change", (e) => {
  loadOrdersByEnseigne(e.target.value);
});

document.getElementById("btnAddEnseigne").addEventListener("click", () => {
  const code = document.getElementById("ensCode").value.trim();
  const nom = document.getElementById("ensName").value.trim();
  const email = document.getElementById("ensEmail").value.trim();
  if (!code) return alert("Code requis");
  state.enseignes[code] = { nom, emailCompta: email };
  renderEnseignes();
  fillEnseigneOptions(document.getElementById("cliEnseigneSelect"));
  populateEnseigneSelect();
});

document.getElementById("btnAddClient").addEventListener("click", () => {
  const id = document.getElementById("cliId").value.trim();
  if (!id) return alert("ID requis");
  saveClient({
    id,
    enseigne: document.getElementById("cliEnseigneSelect").value.trim(),
    magasin: document.getElementById("cliMagasin").value.trim(),
    contact: document.getElementById("cliContact").value.trim(),
    email: document.getElementById("cliEmail").value.trim(),
  });
});

document.getElementById("btnAddPrix").addEventListener("click", () => {
  const enseigne = document.getElementById("prixEnseigneSelect").value.trim();
  const id = Number(document.getElementById("prixId").value);
  const nom = document.getElementById("prixNom").value.trim();
  const prix = Number(document.getElementById("prixValeur").value);
  if (!enseigne) return alert("Enseigne requise");
  if (!id || !nom || isNaN(prix)) return alert("Champs prix invalides");
  savePrice({ enseigne, id, nom, prix });
});

document.getElementById("btnAddProduitGlobal").addEventListener("click", () => {
  const nom = document.getElementById("catNom").value.trim();
  if (!nom) return alert("Nom requis");
  const id = getNextCatalogId();
  saveCatalogue({ id, nom });
});

// Init
loadInitialData();
