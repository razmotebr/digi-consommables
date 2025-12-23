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
  logs: [],
  settings: { emailCompta: "", fraisPort: "" },
  sort: {}, // {tableId: {key, dir}}
  pagination: {
    enseignes: 1,
    clients: 1,
    catalogue: 1,
    orders: 1,
    prix: 1,
    logs: 1,
    users: 1,
    pageSize: 20,
  },
};

const adminToken = sessionStorage.getItem("adminToken");
const adminRole = sessionStorage.getItem("adminRole") || "admin";
if (!adminToken) {
  window.location.href = "/login.html"; // login unique pour admin et clients
}

function redirectAdminLogin() {
  sessionStorage.removeItem("adminUser");
  sessionStorage.removeItem("adminToken");
  window.location.href = "/login.html";
}

function ensureAuthorized(res) {
  if (res.status === 401) {
    redirectAdminLogin();
    return false;
  }
  return true;
}

const ROLE_TABS = {
  admin: ["tabEnseignes", "tabClients", "tabPrix", "tabCatalogue", "tabCommandes", "tabUsers", "tabLogs"],
  orders: ["tabCommandes"],
  logs: ["tabLogs"],
};

const TAB_TO_SECTION = {
  tabEnseignes: "sectionEnseignes",
  tabClients: "sectionClients",
  tabPrix: "sectionPrix",
  tabCatalogue: "sectionCatalogue",
  tabCommandes: "sectionCommandes",
  tabUsers: "sectionUsers",
  tabLogs: "sectionLogs",
};

function applyRoleAccess(role) {
  const allowed = ROLE_TABS[role] || ROLE_TABS.admin;
  Object.entries(TAB_TO_SECTION).forEach(([tabId, sectionId]) => {
    const tab = document.getElementById(tabId);
    const section = document.getElementById(sectionId);
    const show = allowed.includes(tabId);
    if (tab) tab.style.display = show ? "" : "none";
    if (section) section.classList.toggle("hidden", !show);
  });
  return allowed;
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

function getSortConfig(tableId, defaultKey, defaultDir = "asc") {
  const existing = state.sort[tableId];
  if (existing && existing.key) return existing;
  return { key: defaultKey, dir: defaultDir };
}

function setSortConfig(tableId, key) {
  const current = state.sort[tableId];
  const nextDir = current && current.key === key && current.dir === "asc" ? "desc" : "asc";
  state.sort[tableId] = { key, dir: nextDir };
  return state.sort[tableId];
}

function normalizeSortValue(value, type) {
  if (value === undefined || value === null || value === "") return null;
  if (type === "number") {
    const num = Number(value);
    return Number.isNaN(num) ? null : num;
  }
  if (type === "date") {
    const ts = new Date(value).getTime();
    return Number.isNaN(ts) ? null : ts;
  }
  return String(value).toLowerCase();
}

function compareValues(a, b, dir, type) {
  const va = normalizeSortValue(a, type);
  const vb = normalizeSortValue(b, type);
  if (va === null && vb === null) return 0;
  if (va === null) return 1;
  if (vb === null) return -1;
  let cmp = 0;
  if (type === "number" || type === "date") {
    cmp = va - vb;
  } else {
    cmp = va.localeCompare(vb);
  }
  return dir === "desc" ? -cmp : cmp;
}

function sortRows(items, tableId, defaultKey, defaultDir, getters) {
  const sortCfg = getSortConfig(tableId, defaultKey, defaultDir);
  const meta = getters[sortCfg.key];
  if (!meta) return items;
  const getValue = typeof meta === "function" ? meta : meta.get;
  const type = (meta && meta.type) || "string";
  return items.slice().sort((a, b) => compareValues(getValue(a), getValue(b), sortCfg.dir, type));
}

// --- RENDER ---
function renderEnseignes() {
  const tbody = document.querySelector("#tableEnseignes tbody");
  const addRow = tbody.querySelector(".add-row");
  tbody.innerHTML = "";
  if (addRow) tbody.appendChild(addRow);

  const entries = Object.entries(state.enseignes).map(([code, e]) => ({
    code,
    nom: e.nom || "",
    emailCompta: e.emailCompta || "",
  }));
  const sortedEntries = sortRows(entries, "tableEnseignes", "code", "asc", {
    code: { get: (e) => e.code, type: "string" },
    nom: { get: (e) => e.nom, type: "string" },
    email: { get: (e) => e.emailCompta, type: "string" },
  });
  const pageSize = state.pagination.pageSize;
  const currentPage = state.pagination.enseignes;
  const totalPages = Math.max(1, Math.ceil(sortedEntries.length / pageSize));
  const start = (currentPage - 1) * pageSize;
  const pageEntries = sortedEntries.slice(start, start + pageSize);

  pageEntries.forEach((e) => {
    const code = e.code;
    const tr = document.createElement("tr");
    const isEditing = !!state.editingEnseignes[code];
    if (isEditing) tr.classList.add("editing");

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

    delBtn.addEventListener("click", () => deleteEnseigne(code));

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
  populatePrixFilterSelect();
  populateClientsFilterSelect();
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

  const filterEns = document.getElementById("clientsEnseigneFilter")?.value || "";
  const entries = Object.entries(state.clients)
    .filter(([, c]) => !filterEns || (c.enseigne || "") === filterEns)
    .map(([id, c]) => ({
      id,
      enseigne: c.enseigne || "",
      magasin: c.magasin || "",
      contact: c.contact || "",
      email: c.email || "",
      raw: c,
    }));
  const sortedEntries = sortRows(entries, "tableClients", "id", "asc", {
    id: { get: (c) => c.id, type: "string" },
    enseigne: { get: (c) => c.enseigne, type: "string" },
    magasin: { get: (c) => c.magasin, type: "string" },
    contact: { get: (c) => c.contact, type: "string" },
    email: { get: (c) => c.email, type: "string" },
  });
  const pageSize = state.pagination.pageSize;
  const currentPage = state.pagination.clients;
  const totalPages = Math.max(1, Math.ceil(sortedEntries.length / pageSize));
  const start = (currentPage - 1) * pageSize;
  const pageEntries = sortedEntries.slice(start, start + pageSize);

  pageEntries.forEach((entry) => {
    const id = entry.id;
    const c = entry.raw;
    const tr = document.createElement("tr");
    const draft = state.editingClients[id] || null;
    const isEditing = !!draft;
    if (isEditing) tr.classList.add("editing");

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

  const entries = Object.keys(state.catalog).map((k) => {
    const id = Number(k);
    const prod = state.catalog[id] || {};
    return {
      id,
      reference: prod.reference || "",
      nom: prod.nom || "",
      mandrin: prod.mandrin || "",
      etiquettesParRouleau: prod.etiquettesParRouleau,
      rouleauxParCarton: prod.rouleauxParCarton,
    };
  });
  const sortedEntries = sortRows(entries, "tableCatalogue", "id", "asc", {
    id: { get: (p) => p.id, type: "number" },
    reference: { get: (p) => p.reference, type: "string" },
    nom: { get: (p) => p.nom, type: "string" },
    mandrin: { get: (p) => p.mandrin, type: "string" },
    etiquettes: { get: (p) => p.etiquettesParRouleau, type: "number" },
    rouleaux: { get: (p) => p.rouleauxParCarton, type: "number" },
  });
  const pageSize = state.pagination.pageSize;
  const currentPage = state.pagination.catalogue;
  const totalPages = Math.max(1, Math.ceil(sortedEntries.length / pageSize));
  const start = (currentPage - 1) * pageSize;
  const pageEntries = sortedEntries.slice(start, start + pageSize);

  pageEntries.forEach((entry) => {
      const id = entry.id;
      const tr = document.createElement("tr");
      const prod = state.catalog[id] || {};
      if (tr.dataset.editing === "true") tr.classList.add("editing");

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
          tr.classList.add("editing");
          editBtn.textContent = "Enregistrer";
          inpRef.disabled = false;
          inpNom.disabled = false;
          inpMandrin.disabled = false;
          inpEtiq.disabled = false;
          inpRoul.disabled = false;
          return;
        }
        const nom = inpNom.value.trim();
        const reference = inpRef.value.trim();
        const mandrin = inpMandrin.value.trim();
        const etiquettesParRouleau = inpEtiq.value === "" ? null : Number(inpEtiq.value);
        const rouleauxParCarton = inpRoul.value === "" ? null : Number(inpRoul.value);
        if (!nom) return alert("Nom requis");
        saveCatalogue({ id: rowId, nom, reference, mandrin, etiquettesParRouleau, rouleauxParCarton });
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
    tr.appendChild(actions);
    tbody.appendChild(tr);
  });

  document.getElementById("cataloguePageLabel").textContent = `${currentPage}/${totalPages}`;
  document.getElementById("cataloguePrev").disabled = currentPage <= 1;
  document.getElementById("catalogueNext").disabled = currentPage >= totalPages;
}

function renderPrix() {
  const tbody = document.querySelector("#tablePrix tbody");
  const addRow = tbody.querySelector(".add-row");
  tbody.innerHTML = "";
  if (addRow) {
    tbody.appendChild(addRow);
    fillEnseigneOptions(document.getElementById("prixEnseigneAdd"));
    fillProduitOptions(document.getElementById("prixProduitSelect"));
    updatePrixAddRowFromSelection();
  }

  const filterEns = document.getElementById("prixEnseigneFilter")?.value || "";
  const entries = Object.entries(state.prix || {})
    .flatMap(([ens, list]) => (list || []).map((p) => ({ ...p, enseigne: ens })))
    .filter((p) => !filterEns || p.enseigne === filterEns);
  const sortedEntries = sortRows(entries, "tablePrix", "enseigne", "asc", {
    enseigne: { get: (p) => p.enseigne, type: "string" },
    id: { get: (p) => p.id, type: "number" },
    reference: { get: (p) => (state.catalog[p.id] || {}).reference || "", type: "string" },
    nom: { get: (p) => (state.catalog[p.id] || {}).nom || p.nom || "", type: "string" },
    mandrin: { get: (p) => (state.catalog[p.id] || {}).mandrin || "", type: "string" },
    etiquettes: { get: (p) => (state.catalog[p.id] || {}).etiquettesParRouleau, type: "number" },
    rouleaux: { get: (p) => (state.catalog[p.id] || {}).rouleauxParCarton, type: "number" },
    prix: { get: (p) => p.prix, type: "number" },
  });

  const pageSize = state.pagination.pageSize;
  const currentPage = state.pagination.prix;
  const totalPages = Math.max(1, Math.ceil(sortedEntries.length / pageSize));
  const start = (currentPage - 1) * pageSize;
  const pageEntries = sortedEntries.slice(start, start + pageSize);

  pageEntries.forEach((p) => {
      const tr = document.createElement("tr");
      if (tr.dataset.editing === "true") tr.classList.add("editing");

      const prod = state.catalog[p.id] || {};

      const tdEnseigne = document.createElement("td");
      const selEns = document.createElement("select");
      fillEnseigneOptions(selEns, p.enseigne || "");
      selEns.disabled = true;
      tdEnseigne.appendChild(selEns);

      const tdId = document.createElement("td");
      const inpId = document.createElement("input");
      inpId.type = "number";
      inpId.value = p.id;
      inpId.disabled = true;
      tdId.appendChild(inpId);

      const tdRef = document.createElement("td");
      tdRef.textContent = prod.reference || "";

      const tdNom = document.createElement("td");
      const selProd = document.createElement("select");
      fillProduitOptions(selProd, String(p.id || ""));
      selProd.disabled = true;
      tdNom.appendChild(selProd);

      const tdMandrin = document.createElement("td");
      tdMandrin.textContent = prod.mandrin || "";

      const tdEtiq = document.createElement("td");
      tdEtiq.textContent = prod.etiquettesParRouleau != null ? prod.etiquettesParRouleau : "";

      const tdRouleaux = document.createElement("td");
      tdRouleaux.textContent = prod.rouleauxParCarton != null ? prod.rouleauxParCarton : "";

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
          tr.classList.add("editing");
          editBtn.textContent = "Enregistrer";
          selEns.disabled = false;
          selProd.disabled = false;
          inpPrix.disabled = false;
          selProd.addEventListener("change", () =>
            updatePrixRowProductFields(selProd, { inpId, tdRef, tdMandrin, tdEtiq, tdRouleaux })
          );
          return;
        }
        const newEnseigne = selEns.value.trim();
        const newProdId = Number(selProd.value);
        const prix = Number(inpPrix.value);
        if (!newEnseigne || !newProdId || isNaN(prix)) return alert("Champs invalides");
        const prodSelected = state.catalog[newProdId] || {};
        const nom = prodSelected.nom || p.nom || "";
        if (newEnseigne !== p.enseigne || newProdId !== p.id) {
          state.prix[p.enseigne] = (state.prix[p.enseigne] || []).filter((x) => !(x.id === p.id));
        }
        savePrice({ enseigne: newEnseigne, id: newProdId, nom, prix });
      });

      delBtn.addEventListener("click", () => deletePrice(p.enseigne, Number(delBtn.dataset.produitId)));

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      tr.appendChild(tdEnseigne);
      tr.appendChild(tdId);
      tr.appendChild(tdRef);
      tr.appendChild(tdNom);
      tr.appendChild(tdMandrin);
      tr.appendChild(tdEtiq);
      tr.appendChild(tdRouleaux);
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

function statusRank(status = "") {
  const normalized = status
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  if (normalized.includes("trait")) return 0;
  if (normalized.includes("prep")) return 1;
  if (normalized.includes("envoy")) return 2;
  return -1;
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
    const pageLabel = document.getElementById("ordersPageLabel");
    if (pageLabel) pageLabel.textContent = "1/1";
    const prevBtn = document.getElementById("ordersPrev");
    const nextBtn = document.getElementById("ordersNext");
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
    return;
  }

  const sortedOrders = sortRows(state.orders, "tableAdminOrders", "date", "desc", {
    ref: { get: (o) => o.id || o.reference || "", type: "string" },
    client: { get: (o) => o.clientId || "", type: "string" },
    magasin: { get: (o) => o.magasin || "", type: "string" },
    total: { get: (o) => Number(o.totalTTC || o.total || 0), type: "number" },
    date: { get: (o) => o.createdAt || o.date || "", type: "date" },
    statut: { get: (o) => o.status || "", type: "string" },
  });

  const pageSize = state.pagination.pageSize;
  const currentPage = state.pagination.orders;
  const totalPages = Math.max(1, Math.ceil(sortedOrders.length / pageSize));
  const start = (currentPage - 1) * pageSize;
  const pageEntries = sortedOrders.slice(start, start + pageSize);

  pageEntries.forEach((o) => {
      const tr = document.createElement("tr");
      const cls = statusClass(o.status);
      const select = document.createElement("select");
      const currentRank = statusRank(o.status || "");
      ["en traitement", "en préparation", "envoyé"].forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s;
        opt.textContent = s;
        if ((o.status || "").toLowerCase() === s.toLowerCase()) opt.selected = true;
        if (currentRank >= 0 && statusRank(s) < currentRank) {
          opt.disabled = true;
        }
        select.appendChild(opt);
      });
      select.addEventListener("change", () => {
        const nextRank = statusRank(select.value);
        if (currentRank >= 0 && nextRank < currentRank) {
          alert("Retour en arriere interdit.");
          select.value = o.status || "en traitement";
          return;
        }
        updateOrderStatus(o.id, select.value);
      });

      tr.innerHTML = `
        <td>${o.id || o.reference || "-"}</td>
        <td>${o.clientId || "-"}</td>
        <td>${o.magasin || "-"}</td>
        <td>${Number(o.totalTTC || o.total || 0).toFixed(2)} EUR</td>
        <td>${o.createdAt ? new Date(o.createdAt).toLocaleString("fr-FR") : "-"}</td>
        <td><span class="status ${cls}">${o.status || "Inconnu"}</span></td>
      `;
      const actionsTd = document.createElement("td");
      actionsTd.className = "table-actions col-actions";
      const pdfBtn = document.createElement("button");
      pdfBtn.className = "secondary action-btn";
      pdfBtn.textContent = "PDF";
      pdfBtn.addEventListener("click", () => openOrderPdf(o.id));
      actionsTd.appendChild(select);
      actionsTd.appendChild(pdfBtn);
      if (adminRole === "admin") {
        const delBtn = document.createElement("button");
        delBtn.className = "secondary danger action-btn";
        delBtn.textContent = "Suppr";
        delBtn.addEventListener("click", () => deleteOrder(o.id));
        actionsTd.appendChild(delBtn);
      }
      tr.appendChild(actionsTd);
      tbody.appendChild(tr);
    });

  const pageLabel = document.getElementById("ordersPageLabel");
  if (pageLabel) pageLabel.textContent = `${currentPage}/${totalPages}`;
  const prevBtn = document.getElementById("ordersPrev");
  const nextBtn = document.getElementById("ordersNext");
  if (prevBtn) prevBtn.disabled = currentPage <= 1;
  if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
}

async function openOrderPdf(orderId) {
  if (!orderId) return;
  const newWin = window.open("", "_blank");
  if (!newWin) {
    alert("Autorisez les popups pour afficher le PDF.");
    return;
  }
  try {
    const qs = `&regen=1&ts=${Date.now()}`;
    const res = await fetch(`/order_pdf?orderId=${encodeURIComponent(orderId)}${qs}`, {
      headers: withAuthHeaders(),
    });
    if (!ensureAuthorized(res)) {
      newWin.close();
      return;
    }
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

async function deleteOrder(orderId) {
  if (!orderId) return;
  const confirmDel = confirm(`Supprimer la commande ${orderId} ?`);
  if (!confirmDel) return;
  try {
    const res = await fetch("/admin_orders", {
      method: "DELETE",
      headers: withAuthHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({ orderId }),
    });
    if (!ensureAuthorized(res)) return;
    if (!res.ok) throw new Error(await res.text());
    state.orders = state.orders.filter((o) => o.id !== orderId);
    renderAdminOrders();
  } catch (e) {
    console.error("deleteOrder error", e);
    alert("Impossible de supprimer la commande.");
  }
}

function renderUsers() {
  const tbody = document.querySelector("#tableUsers tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (!state.users.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 6;
    td.className = "muted";
    td.textContent = "Aucun utilisateur.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    const pageLabel = document.getElementById("usersPageLabel");
    if (pageLabel) pageLabel.textContent = "1/1";
    const prevBtn = document.getElementById("usersPrev");
    const nextBtn = document.getElementById("usersNext");
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
    return;
  }

  const sortedUsers = sortRows(state.users, "tableUsers", "user", "asc", {
    user: { get: (u) => u.id || "", type: "string" },
    role: { get: (u) => u.role || "", type: "string" },
    enseigne: { get: (u) => u.enseigne || "", type: "string" },
    magasin: { get: (u) => u.magasin || "", type: "string" },
    lastLogin: { get: (u) => u.lastLogin || "", type: "date" },
  });

  const pageSize = state.pagination.pageSize;
  const currentPage = state.pagination.users;
  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / pageSize));
  const start = (currentPage - 1) * pageSize;
  const pageEntries = sortedUsers.slice(start, start + pageSize);

  pageEntries.forEach((u) => {
      const tr = document.createElement("tr");
      const lastLogin = u.lastLogin ? new Date(u.lastLogin).toLocaleString("fr-FR") : "-";
      const role = (u.role || "client").toLowerCase();

      tr.innerHTML = `
        <td>${u.id || "-"}</td>
        <td>${role}</td>
        <td>${u.enseigne || "-"}</td>
        <td>${u.magasin || "-"}</td>
        <td>${lastLogin}</td>
      `;

      const actions = document.createElement("td");
      actions.className = "table-actions user-actions col-actions";
      const resetBtn = document.createElement("button");
      resetBtn.className = "secondary action-btn";
      resetBtn.textContent = "Reset MDP";
      resetBtn.addEventListener("click", () => resetUserPassword(u.id));
      const delBtn = document.createElement("button");
      delBtn.className = "secondary danger action-btn";
      delBtn.textContent = "Suppr";
      delBtn.addEventListener("click", () => deleteUser(u.id));
      actions.appendChild(resetBtn);
      actions.appendChild(delBtn);
      tr.appendChild(actions);
    tbody.appendChild(tr);
  });

  const pageLabel = document.getElementById("usersPageLabel");
  if (pageLabel) pageLabel.textContent = `${currentPage}/${totalPages}`;
  const prevBtn = document.getElementById("usersPrev");
  const nextBtn = document.getElementById("usersNext");
  if (prevBtn) prevBtn.disabled = currentPage <= 1;
  if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
}

function renderLogs() {
  const tbody = document.querySelector("#tableLogs tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (!state.logs.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 3;
    td.className = "muted";
    td.textContent = "Aucun log pour le moment.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  const sortedLogs = sortRows(state.logs, "tableLogs", "timestamp", "desc", {
    timestamp: { get: (l) => l.ts || "", type: "date" },
    actor: { get: (l) => `${l.actor_type || ""}:${l.actor_id || ""}`, type: "string" },
    action: { get: (l) => l.action || "", type: "string" },
  });

  const pageSize = 10;
  const currentPage = state.pagination.logs;
  const totalPages = Math.max(1, Math.ceil(sortedLogs.length / pageSize));
  const start = (currentPage - 1) * pageSize;
  const pageEntries = sortedLogs.slice(start, start + pageSize);

  pageEntries.forEach((l) => {
    const tr = document.createElement("tr");
    const ts = l.ts ? new Date(l.ts).toLocaleString("fr-FR") : "-";
    const actor = l.actor_type ? `${l.actor_type}:${l.actor_id || "-"}` : "unknown";
    let detailsText = "";
    if (l.details) {
      try {
        const obj = JSON.parse(l.details);
        detailsText = Object.entries(obj)
          .map(([k, v]) => `${k}=${v}`)
          .join(", ");
      } catch (_) {
        detailsText = String(l.details);
      }
    }
    let actionText = l.action || "";
    if (l.target) actionText += ` | ${l.target}`;
    if (detailsText) actionText += ` | ${detailsText}`;

    tr.innerHTML = `
      <td>${ts}</td>
      <td>${actor}</td>
      <td>${actionText}</td>
    `;
    tbody.appendChild(tr);
  });

  const label = document.getElementById("logsPageLabel");
  const prev = document.getElementById("logsPrev");
  const next = document.getElementById("logsNext");
  if (label) label.textContent = `${currentPage}/${totalPages}`;
  if (prev) prev.disabled = currentPage <= 1;
  if (next) next.disabled = currentPage >= totalPages;
}

// --- HELPERS ---
function populateEnseigneSelect() {
  fillEnseigneOptions(document.getElementById("prixEnseigneAdd"));
}

function fillProduitOptions(selectEl, selected = "") {
  if (!selectEl) return;
  const current = String(selected || "");
  selectEl.innerHTML = '<option value="">-- Choisir un produit --</option>';
  Object.keys(state.catalog)
    .map((k) => Number(k))
    .sort((a, b) => a - b)
    .forEach((id) => {
      const prod = state.catalog[id] || {};
      const opt = document.createElement("option");
      opt.value = id;
      const label = (prod.reference ? `${prod.reference} - ` : "") + (prod.nom || `Produit ${id}`);
      opt.textContent = label;
      if (String(id) === current) opt.selected = true;
      selectEl.appendChild(opt);
    });
}

function updatePrixRowProductFields(selectEl, refs) {
  const prodId = Number(selectEl?.value);
  const prod = prodId ? state.catalog[prodId] || {} : {};
  if (refs.inpId) refs.inpId.value = prodId || "";
  if (refs.tdRef) refs.tdRef.textContent = prod.reference || "";
  if (refs.tdMandrin) refs.tdMandrin.textContent = prod.mandrin || "";
  if (refs.tdEtiq) refs.tdEtiq.textContent = prod.etiquettesParRouleau != null ? prod.etiquettesParRouleau : "";
  if (refs.tdRouleaux) refs.tdRouleaux.textContent = prod.rouleauxParCarton != null ? prod.rouleauxParCarton : "";
}

function updatePrixAddRowFromSelection() {
  const selEns = document.getElementById("prixEnseigneAdd");
  const selProd = document.getElementById("prixProduitSelect");
  const prodId = Number(selProd?.value);
  const prod = prodId ? state.catalog[prodId] || {} : {};
  if (document.getElementById("prixId")) document.getElementById("prixId").value = prodId || "";
  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || "--";
  };
  setText("prixRefPreview", prod.reference || "");
  setText("prixMandrinPreview", prod.mandrin || "");
  setText("prixEtiquettesPreview", prod.etiquettesParRouleau != null ? prod.etiquettesParRouleau : "");
  setText("prixRouleauxPreview", prod.rouleauxParCarton != null ? prod.rouleauxParCarton : "");

  const enseigne = selEns?.value?.trim() || "";
  const existing = enseigne && prodId ? (state.prix[enseigne] || []).find((p) => p.id === prodId) : null;
  if (document.getElementById("prixValeur")) {
    document.getElementById("prixValeur").value = existing ? existing.prix : "";
  }
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

function populatePrixFilterSelect() {
  const sel = document.getElementById("prixEnseigneFilter");
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

function populateClientsFilterSelect() {
  const sel = document.getElementById("clientsEnseigneFilter");
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

async function deleteEnseigne(enseigne) {
  if (!enseigne) return;
  const confirmDel = confirm(`Supprimer l'enseigne ${enseigne} et les données associées (clients, commandes, prix) ?`);
  if (!confirmDel) return;
  try {
    await fetch("/admin_enseigne", {
      method: "DELETE",
      headers: withAuthHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({ enseigne }),
    });
  } catch (e) {
    console.error("deleteEnseigne backend error", e);
  }
  // Purge locale
  Object.entries(state.clients).forEach(([id, c]) => {
    if (c.enseigne === enseigne) {
      delete state.clients[id];
    }
  });
  delete state.prix[enseigne];
  delete state.enseignes[enseigne];
  delete state.editingEnseignes[enseigne];
  renderClients();
  renderEnseignes();
  populateEnseigneSelect();
  populateOrdersEnseigneSelect();
  renderPrix();
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
    delete state.editingClients[payload.id];
    renderClients();
    renderEnseignes();
    populateEnseigneSelect();
  } catch (e) {
    console.error("saveClient error", e);
    const msg = e && e.message ? e.message : "Erreur sauvegarde client";
    alert(msg);
  }
}

async function deleteClient(id) {
  if (!id) return;
  const confirmDel = confirm(`Supprimer le compte client ${id} ? (les commandes et prix associés seront supprimés)`);
  if (!confirmDel) return;
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
  renderPrix();
  fillProduitOptions(document.getElementById("prixProduitSelect"));
  updatePrixAddRowFromSelection();
}

async function deletePrice(enseigne, produitId) {
  if (!enseigne || !produitId) return;
  const confirmDel = confirm(`Supprimer le prix du produit ${produitId} pour l'enseigne ${enseigne} ?`);
  if (!confirmDel) return;
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

async function saveCatalogue({ id, nom, reference, mandrin, etiquettesParRouleau, rouleauxParCarton }) {
  try {
    const res = await fetch("/admin_catalogue", {
      method: "POST",
      headers: withAuthHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({
        id,
        nom,
        reference,
        mandrin,
        etiquettesParRouleau,
        rouleauxParCarton,
      }),
    });
    if (!ensureAuthorized(res)) return;
    const raw = await res.text();
    let data = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn("saveCatalogue parse error", e, raw);
      data = {};
    }
    if (!res.ok) {
      const msg = data?.error || raw || `Erreur ${res.status}`;
      throw new Error(msg);
    }
  } catch (e) {
    console.error("saveCatalogue backend error", e);
    const msg = e && e.message ? e.message : "Erreur sauvegarde catalogue";
    alert(msg);
  }

  const prod = state.catalog[id] || {};
  state.catalog[id] = {
    ...prod,
    nom,
    reference: reference || prod.reference || "",
    mandrin: mandrin || prod.mandrin || "",
    etiquettesParRouleau: etiquettesParRouleau != null ? etiquettesParRouleau : prod.etiquettesParRouleau,
    rouleauxParCarton: rouleauxParCarton != null ? rouleauxParCarton : prod.rouleauxParCarton,
  };
  // Propager le libellé dans toutes les grilles de prix locales
  Object.keys(state.prix).forEach((ens) => {
    state.prix[ens] = (state.prix[ens] || []).map((p) => (p.id === id ? { ...p, nom } : p));
  });
  renderCatalogue();
  renderPrix();
  fillProduitOptions(document.getElementById("prixProduitSelect"));
  updatePrixAddRowFromSelection();
}

async function deleteCatalogue(id) {
  if (!id) return;
  const confirmDel = confirm(`Supprimer le produit ${id} du catalogue ? (les prix associés seront retirés)`);
  if (!confirmDel) return;
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
  renderPrix();
  fillProduitOptions(document.getElementById("prixProduitSelect"));
  updatePrixAddRowFromSelection();
}

async function loadOrdersByEnseigne(enseigne) {
  try {
    const url = enseigne ? `/admin_orders?enseigne=${encodeURIComponent(enseigne)}` : "/admin_orders";
    const res = await fetch(url, { headers: withAuthHeaders() });
    if (!ensureAuthorized(res)) return;
    if (!res.ok) throw new Error(`orders ${res.status}`);
    const data = await res.json();
    state.orders = data.orders || [];
    state.pagination.orders = 1;
  } catch (e) {
    console.error("loadOrdersByEnseigne error", e);
    state.orders = [];
    state.pagination.orders = 1;
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
      state.pagination.users = 1;
      renderUsers();
      return;
    }
    state.users = data.users || [];
    state.pagination.users = 1;
  } catch (e) {
    console.error("loadUsers error", e);
    state.users = [];
    state.pagination.users = 1;
  }
  renderUsers();
}

async function loadSettings() {
  try {
    const res = await fetch("/admin_settings", { headers: withAuthHeaders() });
    if (!ensureAuthorized(res)) return;
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    state.settings.emailCompta = data.emailCompta || "";
    state.settings.fraisPort = data.fraisPort ?? "";
    const input = document.getElementById("settingsEmailCompta");
    if (input) input.value = state.settings.emailCompta;
    const fraisInput = document.getElementById("settingsFraisPort");
    if (fraisInput) {
      const parsed = Number(String(state.settings.fraisPort).replace(",", "."));
      fraisInput.value = Number.isFinite(parsed) ? parsed.toFixed(2).replace(".", ",") : "";
    }
  } catch (e) {
    console.error("loadSettings error", e);
  }
}

async function saveSettings() {
  const input = document.getElementById("settingsEmailCompta");
  const emailCompta = input ? input.value.trim() : "";
  const fraisInput = document.getElementById("settingsFraisPort");
  const fraisPortRaw = fraisInput ? fraisInput.value.trim() : "";
  const fraisPortNormalized = fraisPortRaw.replace(",", ".");
  const fraisPort = fraisPortRaw === "" ? "" : Number(fraisPortNormalized);
  if (fraisPortRaw !== "" && !Number.isFinite(fraisPort)) {
    alert("Montant frais de port invalide.");
    return false;
  }
  if (
    emailCompta === (state.settings.emailCompta || "") &&
    (fraisPort === "" ? "" : String(fraisPort)) === (state.settings.fraisPort === "" ? "" : String(state.settings.fraisPort))
  ) {
    return true;
  }
  try {
    const res = await fetch("/admin_settings", {
      method: "PUT",
      headers: withAuthHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({ emailCompta, fraisPort }),
    });
    if (!ensureAuthorized(res)) return false;
    if (!res.ok) throw new Error(await res.text());
    state.settings.emailCompta = emailCompta;
    state.settings.fraisPort = fraisPort;
    return true;
  } catch (e) {
    console.error("saveSettings error", e);
    alert("Impossible de sauvegarder les parametres.");
    return false;
  }
}

async function loadLogs() {
  try {
    const res = await fetch("/admin_logs", { headers: withAuthHeaders() });
    if (!ensureAuthorized(res)) return;
    if (!res.ok) throw new Error(`logs ${res.status}`);
    const data = await res.json();
    state.logs = data.logs || [];
  } catch (e) {
    console.error("loadLogs error", e);
    state.logs = [];
  }
  renderLogs();
}

async function saveUser(payload) {
  try {
    const res = await fetch("/admin_users", {
      method: "POST",
      headers: withAuthHeaders({ "content-type": "application/json" }),
      body: JSON.stringify(payload),
    });
    if (!ensureAuthorized(res)) return;
    const raw = await res.text();
    let data = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn("saveUser parse error", e, raw);
    }
    if (!res.ok) {
      const msg = data?.error || raw || `Erreur ${res.status}`;
      throw new Error(msg);
    }
    await loadUsers();
    alert("Utilisateur enregistre.");
    } catch (e) {
      console.error("saveUser error", e);
      alert((e && e.message) || "Erreur sauvegarde utilisateur");
    }
  }

async function deleteUser(userId) {
  if (!userId) return;
  const confirmDel = confirm(`Supprimer l'utilisateur ${userId} ?`);
  if (!confirmDel) return;
  try {
    const res = await fetch("/admin_users", {
      method: "DELETE",
      headers: withAuthHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({ id: userId }),
    });
    if (!ensureAuthorized(res)) return;
    if (!res.ok) throw new Error(await res.text());
    state.users = state.users.filter((u) => u.id !== userId);
    renderUsers();
  } catch (e) {
    console.error("deleteUser error", e);
    alert("Impossible de supprimer l'utilisateur");
  }
}

async function resetUserPassword(userId) {
  if (!userId) return;
  const confirmReset = confirm(`Reinitialiser le mot de passe pour ${userId} ?`);
  if (!confirmReset) return;
  try {
    const res = await fetch("/admin_reset_password", {
      method: "POST",
      headers: withAuthHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({ userId }),
    });
    if (!ensureAuthorized(res)) return;
    const raw = await res.text();
    let data = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn("resetUserPassword parse error", e, raw);
    }
      if (!res.ok) {
        const msg = data?.error || raw || `Erreur ${res.status}`;
        throw new Error(msg);
      }
      const newPass = data.password || "(non disponible)";
      alert(`Mot de passe reinitialise.\nNouveau mot de passe pour ${userId} : ${newPass}`);
      await loadUsers();
    } catch (e) {
      console.error("resetUserPassword error", e);
      alert("Impossible de reinitialiser le mot de passe.");
    }
}

function setupSortHeaders() {
  const renderers = {
    tableEnseignes: () => {
      state.pagination.enseignes = 1;
      renderEnseignes();
    },
    tableClients: () => {
      state.pagination.clients = 1;
      renderClients();
    },
    tablePrix: () => {
      state.pagination.prix = 1;
      renderPrix();
    },
    tableCatalogue: () => {
      state.pagination.catalogue = 1;
      renderCatalogue();
    },
    tableAdminOrders: () => renderAdminOrders(),
    tableUsers: () => renderUsers(),
    tableLogs: () => {
      state.pagination.logs = 1;
      renderLogs();
    },
  };

  Object.entries(renderers).forEach(([tableId, render]) => {
    const table = document.getElementById(tableId);
    if (!table) return;
    table.querySelectorAll("thead th[data-sort-key]").forEach((th) => {
      th.addEventListener("dblclick", () => {
        const key = th.dataset.sortKey;
        if (!key) return;
        setSortConfig(tableId, key);
        render();
      });
    });
  });
}

function openSettingsModal() {
  const modal = document.getElementById("settingsModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  const input = document.getElementById("settingsEmailCompta");
  if (input) input.focus();
}

function closeSettingsModal() {
  const modal = document.getElementById("settingsModal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

// --- Events ---
document.getElementById("adminUserTag").textContent = state.admin;
const settingsBtn = document.getElementById("btnSettings");
if (settingsBtn) {
  settingsBtn.addEventListener("click", async () => {
    await loadSettings();
    openSettingsModal();
  });
}
const settingsCancelBtn = document.getElementById("btnSettingsCancel");
if (settingsCancelBtn) {
  settingsCancelBtn.addEventListener("click", () => {
    closeSettingsModal();
  });
}
const settingsSaveBtn = document.getElementById("btnSettingsSave");
if (settingsSaveBtn) {
  settingsSaveBtn.addEventListener("click", async () => {
    await saveSettings();
    closeSettingsModal();
  });
}
const settingsModal = document.getElementById("settingsModal");
if (settingsModal) {
  settingsModal.addEventListener("click", async (e) => {
    if (e.target === settingsModal) {
      closeSettingsModal();
    }
  });
}
document.addEventListener("keydown", async (e) => {
  if (e.key === "Escape") {
    const modal = document.getElementById("settingsModal");
    if (modal && !modal.classList.contains("hidden")) {
      closeSettingsModal();
    }
  }
});
document.getElementById("btnLogout").addEventListener("click", () => {
  sessionStorage.removeItem("adminUser");
  sessionStorage.removeItem("adminToken");
  window.location.href = "/login.html";
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
document.getElementById("tabLogs").addEventListener("click", async (e) => {
  e.preventDefault();
  showSection("sectionLogs");
  setActiveTab("tabLogs");
  await loadLogs();
});

document.getElementById("btnSaveUser").addEventListener("click", async (e) => {
  e.preventDefault();
  const id = document.getElementById("userIdInput").value.trim();
  const role = document.getElementById("userRoleSelect").value;
  const password = document.getElementById("userPasswordInput").value;
  if (!id) return alert("Utilisateur requis");
  await saveUser({ id, role, password: password || undefined });
  document.getElementById("userPasswordInput").value = "";
});

const prixEnseigneAdd = document.getElementById("prixEnseigneAdd");
const prixProduitSelect = document.getElementById("prixProduitSelect");
if (prixEnseigneAdd) prixEnseigneAdd.addEventListener("change", updatePrixAddRowFromSelection);
if (prixProduitSelect) prixProduitSelect.addEventListener("change", updatePrixAddRowFromSelection);
const prixEnseigneFilter = document.getElementById("prixEnseigneFilter");
if (prixEnseigneFilter) {
  prixEnseigneFilter.addEventListener("change", () => {
    state.pagination.prix = 1;
    renderPrix();
  });
}
const clientsEnseigneFilter = document.getElementById("clientsEnseigneFilter");
if (clientsEnseigneFilter) {
  clientsEnseigneFilter.addEventListener("change", () => {
    state.pagination.clients = 1;
    renderClients();
  });
}
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
  // Reset des champs avec les exemples
  document.getElementById("cliId").value = "Ex: C001";
  document.getElementById("cliEnseigneSelect").value = "";
  document.getElementById("cliMagasin").value = "Ex: Paris 15";
  document.getElementById("cliContact").value = "";
  document.getElementById("cliEmail").value = "";
});

document.getElementById("btnAddPrix").addEventListener("click", () => {
  const enseigne = document.getElementById("prixEnseigneAdd").value.trim();
  const prodId = Number(document.getElementById("prixProduitSelect").value);
  const prix = Number(document.getElementById("prixValeur").value);
  if (!enseigne) return alert("Enseigne requise");
  if (!prodId || isNaN(prix)) return alert("Champs prix invalides");
  const prod = state.catalog[prodId] || {};
  const nom = prod.nom || "";
  savePrice({ enseigne, id: prodId, nom, prix });
  document.getElementById("prixValeur").value = "";
});

document.getElementById("btnAddProduitGlobal").addEventListener("click", () => {
  const nom = document.getElementById("catNom").value.trim();
  if (!nom) return alert("Nom requis");
  const reference = document.getElementById("catRef").value.trim();
  const mandrin = document.getElementById("catMandrin").value.trim();
  const etiquettesParRouleau = document.getElementById("catEtiquettes").value === "" ? null : Number(document.getElementById("catEtiquettes").value);
  const rouleauxParCarton = document.getElementById("catRouleaux").value === "" ? null : Number(document.getElementById("catRouleaux").value);
  const id = getNextCatalogId();
  saveCatalogue({ id, nom, reference, mandrin, etiquettesParRouleau, rouleauxParCarton });
  // reset inputs
  document.getElementById("catRef").value = "Ex: DIGI604840V";
  document.getElementById("catNom").value = "Ex: Etiquette blanche 60x48";
  document.getElementById("catMandrin").value = "Ex: Ø40mm";
  document.getElementById("catEtiquettes").value = "";
  document.getElementById("catRouleaux").value = "";
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

document.getElementById("ordersPrev").addEventListener("click", () => {
  if (state.pagination.orders > 1) {
    state.pagination.orders -= 1;
    renderAdminOrders();
  }
});
document.getElementById("ordersNext").addEventListener("click", () => {
  state.pagination.orders += 1;
  renderAdminOrders();
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

document.getElementById("logsPrev").addEventListener("click", () => {
  if (state.pagination.logs > 1) {
    state.pagination.logs -= 1;
    renderLogs();
  }
});
document.getElementById("logsNext").addEventListener("click", () => {
  state.pagination.logs += 1;
  renderLogs();
});

document.getElementById("usersPrev").addEventListener("click", () => {
  if (state.pagination.users > 1) {
    state.pagination.users -= 1;
    renderUsers();
  }
});
document.getElementById("usersNext").addEventListener("click", () => {
  state.pagination.users += 1;
  renderUsers();
});

// Init
setupSortHeaders();
const allowedTabs = applyRoleAccess(adminRole);
if (settingsBtn) settingsBtn.style.display = adminRole === "admin" ? "" : "none";
if (adminRole === "orders") {
  showSection("sectionCommandes");
  setActiveTab("tabCommandes");
  loadOrdersByEnseigne(document.getElementById("ordersEnseigneSelect")?.value || "");
} else if (adminRole === "logs") {
  showSection("sectionLogs");
  setActiveTab("tabLogs");
  loadLogs();
} else {
  loadSettings();
  loadInitialData();
  showSection("sectionEnseignes");
  setActiveTab("tabEnseignes");
}
