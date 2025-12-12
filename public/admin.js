// Admin UI
const state = {
  admin: sessionStorage.getItem("adminUser") || "admin",
  enseignes: {}, // {code: {nom,emailCompta}}
  clients: {}, // {id: {enseigne,magasin,contact,email}}
  prix: {}, // {enseigne: [{id,nom,prix}]}
  catalog: {}, // {id: nom}
  orders: [], // [{id, clientId, enseigne, magasin, total, status, createdAt}]
  editingEnseignes: {}, // {code: true}
  editingClients: {}, // {id: {enseigne,magasin,contact,email}}
  users: [], // [{id, enseigne, magasin, lastLogin}]
  pagination: {
    enseignes: 1,
    clients: 1,
    catalogue: 1,
    prix: 1,
    pageSize: 20,
  },
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

function setActiveTab(tabId) {
  document.querySelectorAll("nav.subnav a").forEach((a) => a.classList.remove("active"));
  const link = document.getElementById(tabId);
  if (link) link.classList.add("active");
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

  const entries = Object.entries(state.enseignes).sort(([a], [b]) => a.localeCompare(b));
  const pageSize = state.pagination.pageSize;
  const currentPage = state.pagination.enseignes;
  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize));
  const start = (currentPage - 1) * pageSize;
  const pageEntries = entries.slice(start, start + pageSize);

  pageEntries.forEach(([code, e]) => {
    const tr = document.createElement("tr");
    const isEditing = !!state.editingEnseignes[code];

    const tdCode = document.createElement("td");
    const inpCode = document.createElement("input");
    inpCode.type = "text";
    inpCode.value = code || "";
    inpCode.disabled = !isEditing;
    tdCode.appendChild(inpCode);

    const tdNom = document.createElement("td");
    const inpNom = document.createElement("input");
    inpNom.type = "text";
    inpNom.value = e.nom || "";
    inpNom.disabled = !isEditing;
    tdNom.appendChild(inpNom);

    const tdEmail = document.createElement("td");
    const inpEmail = document.createElement("input");
    inpEmail.type = "email";
    inpEmail.value = e.emailCompta || "";
    inpEmail.disabled = !isEditing;
    tdEmail.appendChild(inpEmail);

    const actions = document.createElement("td");
    actions.className = "table-actions";
    const editBtn = document.createElement("button");
    editBtn.className = "secondary action-btn";
    editBtn.textContent = isEditing ? "Enregistrer" : "Edit";
    editBtn.dataset.code = code;
    const delBtn = document.createElement("button");
    delBtn.className = "secondary danger action-btn";
    delBtn.textContent = "Suppr";
    delBtn.dataset.code = code;

    editBtn.addEventListener("click", () => {
      const rowCode = editBtn.dataset.code;
      const editing = !!state.editingEnseignes[rowCode];
      if (!editing) {
        state.editingEnseignes[rowCode] = true;
        renderEnseignes();
        return;
      }
      const newCode = inpCode.value.trim();
      const newNom = inpNom.value.trim();
      const newEmail = inpEmail.value.trim();
      if (!newCode) return alert("Code requis");
      if (newCode !== rowCode && state.enseignes[newCode]) return alert("Code déjà existant");
      delete state.enseignes[rowCode];
      state.enseignes[newCode] = { nom: newNom, emailCompta: newEmail };
      delete state.editingEnseignes[rowCode];
      renderEnseignes();
      fillEnseigneOptions(document.getElementById("cliEnseigneSelect"));
      populateEnseigneSelect();
    });

    delBtn.addEventListener("click", () => {
      const rowCode = delBtn.dataset.code;
      delete state.enseignes[rowCode];
      delete state.editingEnseignes[rowCode];
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

  document.getElementById("enseignePageLabel").textContent = `${currentPage}/${totalPages}`;
  document.getElementById("enseignePrev").disabled = currentPage <= 1;
  document.getElementById("enseigneNext").disabled = currentPage >= totalPages;

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
    addRow.style.height = "64px";
    addRow.querySelectorAll("td").forEach((td) => (td.style.verticalAlign = "middle"));
  }

  const entries = Object.entries(state.clients).sort(([a], [b]) => a.localeCompare(b));
  const pageSize = state.pagination.pageSize;
  const currentPage = state.pagination.clients;
  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize));
  const start = (currentPage - 1) * pageSize;
  const pageEntries = entries.slice(start, start + pageSize);

  pageEntries.forEach(([id, c]) => {
    const tr = document.createElement("tr");
    const draft = state.editingClients[id] || null;
    const isEditing = !!draft;

    const tdId = document.createElement("td");
    const inpId = document.createElement("input");
    inpId.type = "text";
    inpId.value = id;
    inpId.disabled = true;
    tdId.appendChild(inpId);

    const tdEns = document.createElement("td");
    const selEns = document.createElement("select");
    fillEnseigneOptions(selEns, (draft && draft.enseigne) || c.enseigne || "");
    selEns.disabled = !isEditing;
    tdEns.appendChild(selEns);

    const tdMag = document.createElement("td");
    const inpMag = document.createElement("input");
    inpMag.type = "text";
    inpMag.value = (draft && draft.magasin) || c.magasin || "";
    inpMag.disabled = !isEditing;
    tdMag.appendChild(inpMag);

    const tdContact = document.createElement("td");
    const inpContact = document.createElement("input");
    inpContact.type = "text";
    inpContact.value = (draft && draft.contact) || c.contact || "";
    inpContact.disabled = !isEditing;
    tdContact.appendChild(inpContact);

    const tdEmail = document.createElement("td");
    const inpEmail = document.createElement("input");
    inpEmail.type = "email";
    inpEmail.value = (draft && draft.email) || c.email || "";
    inpEmail.disabled = !isEditing;
    tdEmail.appendChild(inpEmail);

    const actions = document.createElement("td");
    actions.className = "table-actions col-actions";
    const qrBtn = document.createElement("button");
    qrBtn.className = "qr-btn action-btn";
    qrBtn.title = "Copier le QR dans le presse-papiers";
    qrBtn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm10 0h2v2h-2v-2zm-2 2h2v2h-2v-2zm4 0h2v4h-2v-4zm-2 2h2v2h-2v-2zm4-4h2v2h-2v-2zm-4 4h2v2h-2v-2z"></path>
    </svg>`;
    qrBtn.addEventListener("click", () => copyQrToClipboard(id));

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "secondary action-btn";
    editBtn.textContent = isEditing ? "Enregistrer" : "Edit";
    editBtn.dataset.id = id;
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "secondary danger action-btn";
    delBtn.textContent = "Suppr";
    delBtn.dataset.id = id;

    const persistDraft = () => {
      state.editingClients[id] = {
        enseigne: selEns.value.trim(),
        magasin: inpMag.value.trim(),
        contact: inpContact.value.trim(),
        email: inpEmail.value.trim(),
      };
    };
    [selEns, inpMag, inpContact, inpEmail].forEach((el) => {
      el.addEventListener("input", persistDraft);
      el.addEventListener("change", persistDraft);
    });

    editBtn.addEventListener("click", () => {
      const rowId = id;
      const editing = !!state.editingClients[rowId];
      if (!editing) {
        state.editingClients[rowId] = {
          enseigne: c.enseigne || "",
          magasin: c.magasin || "",
          contact: c.contact || "",
          email: c.email || "",
        };
        renderClients();
        return;
      }
      // enregistrer
      const payload = {
        id: rowId,
        enseigne: state.editingClients[rowId].enseigne,
        magasin: state.editingClients[rowId].magasin,
        contact: state.editingClients[rowId].contact,
        email: state.editingClients[rowId].email,
      };
      saveClient(payload);
    });

    delBtn.addEventListener("click", () => deleteClient(id));

    actions.appendChild(qrBtn);
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    tr.appendChild(tdId);
    tr.appendChild(tdEns);
    tr.appendChild(tdMag);
    tr.appendChild(tdContact);
    tr.appendChild(tdEmail);
    tr.appendChild(actions);
    tbody.appendChild(tr);
  });

  document.getElementById("clientsPageLabel").textContent = `${currentPage}/${totalPages}`;
  document.getElementById("clientsPrev").disabled = currentPage <= 1;
  document.getElementById("clientsNext").disabled = currentPage >= totalPages;
}

function renderCatalogue() {
  const tbody = document.querySelector("#tableCatalogue tbody");
  const addRow = tbody.querySelector(".add-row");
  tbody.innerHTML = "";
  if (addRow) tbody.appendChild(addRow);

  const entries = Object.keys(state.catalog)
    .map((k) => Number(k))
    .sort((a, b) => a - b);
  const pageSize = state.pagination.pageSize;
  const currentPage = state.pagination.catalogue;
  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize));
  const start = (currentPage - 1) * pageSize;
  const pageEntries = entries.slice(start, start + pageSize);

  pageEntries.forEach((id) => {
      const tr = document.createElement("tr");
      const prod = state.catalog[id] || {};

      const tdId = document.createElement("td");
      const inpId = document.createElement("input");
      inpId.type = "number";
      inpId.value = id;
      inpId.disabled = true;
      tdId.appendChild(inpId);

      const tdRef = document.createElement("td");
      const inpRef = document.createElement("input");
      inpRef.type = "text";
      inpRef.value = prod.reference || "";
      inpRef.disabled = true;
      tdRef.appendChild(inpRef);

      const tdNom = document.createElement("td");
      const inpNom = document.createElement("input");
      inpNom.type = "text";
      inpNom.value = prod.nom || "";
      inpNom.disabled = true;
      inpNom.classList.add("wide");
      tdNom.appendChild(inpNom);

      const tdMandrin = document.createElement("td");
      const inpMandrin = document.createElement("input");
      inpMandrin.type = "text";
      inpMandrin.value = prod.mandrin || "";
      inpMandrin.disabled = true;
      tdMandrin.appendChild(inpMandrin);

      const tdEtiq = document.createElement("td");
      const inpEtiq = document.createElement("input");
      inpEtiq.type = "number";
      inpEtiq.value = prod.etiquettesParRouleau || "";
      inpEtiq.disabled = true;
      tdEtiq.appendChild(inpEtiq);

      const tdRoul = document.createElement("td");
      const inpRoul = document.createElement("input");
      inpRoul.type = "number";
      inpRoul.value = prod.rouleauxParCarton || "";
      inpRoul.disabled = true;
      tdRoul.appendChild(inpRoul);

      const tdPrix = document.createElement("td");
      const inpPrix = document.createElement("input");
      inpPrix.type = "number";
      inpPrix.step = "0.01";
      const prixVal = prod.prixCartonHt;
      inpPrix.value = prixVal != null && !isNaN(prixVal) ? Number(prixVal).toFixed(2) : "";
      inpPrix.disabled = true;
      tdPrix.appendChild(inpPrix);

    const actions = document.createElement("td");
    actions.className = "table-actions actions-col col-actions";
      const editBtn = document.createElement("button");
      editBtn.className = "secondary action-btn";
      editBtn.textContent = "Edit";
      editBtn.dataset.catalogId = id;
      const delBtn = document.createElement("button");
      delBtn.className = "secondary danger action-btn";
      delBtn.textContent = "Suppr";
      delBtn.dataset.catalogId = id;

      editBtn.addEventListener("click", () => {
        const rowId = Number(editBtn.dataset.catalogId);
        const editing = tr.dataset.editing === "true";
        if (!editing) {
          tr.dataset.editing = "true";
          editBtn.textContent = "Enregistrer";
          inpRef.disabled = false;
          inpNom.disabled = false;
          inpMandrin.disabled = false;
          inpEtiq.disabled = false;
          inpRoul.disabled = false;
          inpPrix.disabled = false;
          return;
        }
        const nom = inpNom.value.trim();
        const reference = inpRef.value.trim();
        const mandrin = inpMandrin.value.trim();
        const etiquettesParRouleau = inpEtiq.value === "" ? null : Number(inpEtiq.value);
        const rouleauxParCarton = inpRoul.value === "" ? null : Number(inpRoul.value);
        const prixCartonHt = inpPrix.value === "" ? null : Number(inpPrix.value);
        if (!nom) return alert("Nom requis");
        saveCatalogue({ id: rowId, nom, reference, mandrin, etiquettesParRouleau, rouleauxParCarton, prixCartonHt });
      });

      delBtn.addEventListener("click", () => deleteCatalogue(Number(delBtn.dataset.catalogId)));

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      tr.appendChild(tdId);
      tr.appendChild(tdRef);
      tr.appendChild(tdNom);
      tr.appendChild(tdMandrin);
      tr.appendChild(tdEtiq);
      tr.appendChild(tdRoul);
    tr.appendChild(tdPrix);
    tr.appendChild(actions);
    tbody.appendChild(tr);
  });

  document.getElementById("cataloguePageLabel").textContent = `${currentPage}/${totalPages}`;
  document.getElementById("cataloguePrev").disabled = currentPage <= 1;
  document.getElementById("catalogueNext").disabled = currentPage >= totalPages;
}

function renderPrix() {
  const enseigne = document.getElementById("prixEnseigneSelect").value.trim();
  const tbody = document.querySelector("#tablePrix tbody");
  const addRow = tbody.querySelector(".add-row");
  tbody.innerHTML = "";
  if (addRow) tbody.appendChild(addRow);
  if (!enseigne) return;

  const entries = (state.prix[enseigne] || []).slice().sort((a, b) => a.id - b.id);
  const pageSize = state.pagination.pageSize;
  const currentPage = state.pagination.prix;
  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize));
  const start = (currentPage - 1) * pageSize;
  const pageEntries = entries.slice(start, start + pageSize);

  pageEntries.forEach((p) => {
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
      actions.className = "table-actions col-actions";
      const editBtn = document.createElement("button");
      editBtn.className = "secondary action-btn";
      editBtn.textContent = "Edit";
      editBtn.dataset.produitId = p.id;
      const delBtn = document.createElement("button");
      delBtn.className = "secondary danger action-btn";
      delBtn.textContent = "Suppr";
      delBtn.dataset.produitId = p.id;

      editBtn.addEventListener("click", () => {
        const rowId = Number(editBtn.dataset.produitId);
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
        savePrice({ enseigne, id: rowId, nom, prix });
      });

      delBtn.addEventListener("click", () => deletePrice(enseigne, Number(delBtn.dataset.produitId)));

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      tr.appendChild(tdId);
      tr.appendChild(tdNom);
      tr.appendChild(tdPrix);
      tr.appendChild(actions);
      tbody.appendChild(tr);
    });

  document.getElementById("prixPageLabel").textContent = `${currentPage}/${totalPages}`;
  document.getElementById("prixPrev").disabled = currentPage <= 1;
  document.getElementById("prixNext").disabled = currentPage >= totalPages;
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
      const prod = state.catalog[id] || {};
      const opt = document.createElement("option");
      opt.value = id;
      const label = prod.reference ? `${prod.reference} - ${prod.nom || ""}` : `${id} - ${prod.nom || ""}`;
      opt.textContent = label.trim();
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
  document.getElementById("prixNom").value = (state.catalog[prodId]?.nom) || "";
  const prod = (state.prix[enseigne] || []).find((p) => p.id === prodId);
  document.getElementById("prixValeur").value = prod ? prod.prix : "";
}

function getClientsForEnseigne(enseigne) {
  return Object.entries(state.clients)
    .filter(([, c]) => c.enseigne === enseigne)
    .map(([id]) => id);
}

async function copyQrToClipboard(clientId) {
  if (!clientId) return;
  const loginUrl = `${window.location.origin}/login.html?client=${encodeURIComponent(clientId)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(loginUrl)}`;
  try {
    const res = await fetch(qrUrl);
    const blob = await res.blob();
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    alert("QR copié dans le presse-papiers.");
  } catch (e) {
    console.error("copyQrToClipboard error", e);
    // Fallback : copier juste l'URL si l'image n'est pas autorisée
    try {
      await navigator.clipboard.writeText(loginUrl);
      alert("URL copiée (QR non disponible dans le presse-papiers).");
    } catch (err) {
      alert("Impossible de copier le QR ou l'URL.");
    }
  }
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
          state.catalog[p.id] = {
            nom: p.nom,
            reference: p.id ? String(p.id) : "",
          };
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
    const body = {
      id: payload.id,
      enseigne: payload.enseigne || "",
      magasin: payload.magasin || "",
      contact: payload.contact || "",
      email: payload.email || "",
      emailCompta: payload.email || "",
      fraisPort: payload.fraisPort ?? state.clients[payload.id]?.fraisPort ?? 12.0,
      tva: payload.tva ?? state.clients[payload.id]?.tva ?? 0.2,
    };

    const res = await fetch("/admin_clients", {
      method: "POST",
      headers: withAuthHeaders({ "content-type": "application/json" }),
      body: JSON.stringify(body),
    });
    if (!ensureAuthorized(res)) return;
    const raw = await res.text();
    let data = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn("saveClient parse error", e, raw);
      data = {};
    }
    if (!res.ok) {
      const msg = data?.error || raw || `Erreur ${res.status}`;
      throw new Error(msg);
    }
    state.clients[payload.id] = {
      enseigne: payload.enseigne,
      magasin: payload.magasin,
      contact: payload.contact,
      email: payload.email,
      fraisPort: body.fraisPort,
      tva: body.tva,
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
    delete state.editingClients[payload.id];
  } catch (e) {
    console.error("saveClient error", e);
    const msg = e && e.message ? e.message : "Erreur sauvegarde client";
    alert(msg);
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
    delete state.editingClients[id];
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
  const existingProd = state.catalog[id] || {};
  state.catalog[id] = {
    ...existingProd,
    nom: nom || existingProd.nom || `Produit ${id}`,
  };
  if (!state.prix[enseigne]) state.prix[enseigne] = [];
  const existing = state.prix[enseigne].find((p) => p.id === id);
  if (existing) {
    existing.nom = state.catalog[id].nom;
    existing.prix = prix;
  } else {
    state.prix[enseigne].push({ id, nom: state.catalog[id].nom, prix });
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

async function saveCatalogue({ id, nom, reference, mandrin, etiquettesParRouleau, rouleauxParCarton, prixCartonHt }) {
  try {
    await fetch("/admin_catalogue", {
      method: "POST",
      headers: withAuthHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({
        id,
        nom,
        reference,
        mandrin,
        etiquettesParRouleau,
        rouleauxParCarton,
        prixCartonHt,
      }),
    });
  } catch (e) {
    console.error("saveCatalogue backend error", e);
  }

  const prod = state.catalog[id] || {};
  state.catalog[id] = {
    ...prod,
    nom,
    reference: reference || prod.reference || "",
    mandrin: mandrin || prod.mandrin || "",
    etiquettesParRouleau: etiquettesParRouleau != null ? etiquettesParRouleau : prod.etiquettesParRouleau,
    rouleauxParCarton: rouleauxParCarton != null ? rouleauxParCarton : prod.rouleauxParCarton,
    prixCartonHt: prixCartonHt != null ? prixCartonHt : prod.prixCartonHt,
  };
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
  try {
    await fetch("/admin_catalogue", {
      method: "DELETE",
      headers: withAuthHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({ id }),
    });
  } catch (e) {
    console.error("deleteCatalogue backend error", e);
  }

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
    const raw = await res.text();
    const ct = res.headers.get("content-type") || "";
    let data = {};
    if (ct.includes("application/json")) {
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch (e) {
        console.warn("loadUsers parse error", e);
        data = {};
      }
    }
    if (!res.ok) {
      console.warn("admin_users non disponible", raw ? raw.slice(0, 200) : "");
      state.users = [];
      renderUsers();
      return;
    }
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
  setActiveTab("tabEnseignes");
});
document.getElementById("tabClients").addEventListener("click", (e) => {
  e.preventDefault();
  showSection("sectionClients");
  setActiveTab("tabClients");
});
document.getElementById("tabPrix").addEventListener("click", (e) => {
  e.preventDefault();
  showSection("sectionPrix");
  setActiveTab("tabPrix");
});
document.getElementById("tabCatalogue").addEventListener("click", (e) => {
  e.preventDefault();
  showSection("sectionCatalogue");
  setActiveTab("tabCatalogue");
});
document.getElementById("tabCommandes").addEventListener("click", async (e) => {
  e.preventDefault();
  showSection("sectionCommandes");
  setActiveTab("tabCommandes");
  await loadOrdersByEnseigne(document.getElementById("ordersEnseigneSelect").value);
});
document.getElementById("tabUsers").addEventListener("click", async (e) => {
  e.preventDefault();
  showSection("sectionUsers");
  setActiveTab("tabUsers");
  await loadUsers();
});

document.getElementById("prixEnseigneSelect").addEventListener("change", () => {
  state.pagination.prix = 1;
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
  state.pagination.enseignes = 1;
  // Reset champs avec exemples
  document.getElementById("ensCode").value = "Ex: C001";
  document.getElementById("ensName").value = "Ex: Intermarche";
  document.getElementById("ensEmail").value = "exemple@domaine.com";
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
  const reference = document.getElementById("catRef").value.trim();
  const mandrin = document.getElementById("catMandrin").value.trim();
  const etiquettesParRouleau = document.getElementById("catEtiquettes").value === "" ? null : Number(document.getElementById("catEtiquettes").value);
  const rouleauxParCarton = document.getElementById("catRouleaux").value === "" ? null : Number(document.getElementById("catRouleaux").value);
  const prixCartonHt = document.getElementById("catPrix").value === "" ? null : Number(document.getElementById("catPrix").value);
  const id = getNextCatalogId();
  saveCatalogue({ id, nom, reference, mandrin, etiquettesParRouleau, rouleauxParCarton, prixCartonHt });
  // reset inputs
  document.getElementById("catRef").value = "Ex: DIGI604840V";
  document.getElementById("catNom").value = "Ex: Etiquette blanche 60x48";
  document.getElementById("catMandrin").value = "Ex: Ø40mm";
  document.getElementById("catEtiquettes").value = "";
  document.getElementById("catRouleaux").value = "";
  document.getElementById("catPrix").value = "";
  state.pagination.catalogue = 1;
});

// Pagination controls
document.getElementById("enseignePrev").addEventListener("click", () => {
  if (state.pagination.enseignes > 1) {
    state.pagination.enseignes -= 1;
    renderEnseignes();
  }
});
document.getElementById("enseigneNext").addEventListener("click", () => {
  state.pagination.enseignes += 1;
  renderEnseignes();
});

document.getElementById("clientsPrev").addEventListener("click", () => {
  if (state.pagination.clients > 1) {
    state.pagination.clients -= 1;
    renderClients();
  }
});
document.getElementById("clientsNext").addEventListener("click", () => {
  state.pagination.clients += 1;
  renderClients();
});

document.getElementById("cataloguePrev").addEventListener("click", () => {
  if (state.pagination.catalogue > 1) {
    state.pagination.catalogue -= 1;
    renderCatalogue();
  }
});
document.getElementById("catalogueNext").addEventListener("click", () => {
  state.pagination.catalogue += 1;
  renderCatalogue();
});

document.getElementById("prixPrev").addEventListener("click", () => {
  if (state.pagination.prix > 1) {
    state.pagination.prix -= 1;
    renderPrix();
  }
});
document.getElementById("prixNext").addEventListener("click", () => {
  state.pagination.prix += 1;
  renderPrix();
});

// Init
loadInitialData();
setActiveTab("tabEnseignes");
