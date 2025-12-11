// Admin UI : données via /admin_data (D1) + CRUD via /admin_clients et /admin_prices
const state = {
  admin: sessionStorage.getItem("adminUser") || "admin",
  enseignes: {}, // {code: {nom,emailCompta}}
  clients: {},   // {id: {enseigne,magasin,contact,email}}
  prix: {},      // {clientId: [{id,nom,prix}]}
  catalog: {}    // {id: nom} catalogue unique
};

function fillEnseigneOptions(selectEl, selectedValue = "") {
  selectEl.innerHTML = '<option value="">-- Choisir une enseigne --</option>';
  Object.keys(state.enseignes)
    .sort()
    .forEach((code) => {
      const opt = document.createElement("option");
      opt.value = code;
      opt.textContent = code;
      if (code === selectedValue) opt.selected = true;
      selectEl.appendChild(opt);
    });
  if (selectedValue && !state.enseignes[selectedValue]) {
    const opt = document.createElement("option");
    opt.value = selectedValue;
    opt.textContent = selectedValue;
    opt.selected = true;
    selectEl.appendChild(opt);
  }
}

function showSection(id) {
  document.querySelectorAll("section").forEach((s) => s.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

function renderEnseignes() {
  const tbody = document.querySelector("#tableEnseignes tbody");
  const addRow = tbody.querySelector(".add-row");
  tbody.innerHTML = "";
  if (addRow) tbody.appendChild(addRow);

  Object.entries(state.enseignes).forEach(([code, e]) => {
    const tr = document.createElement("tr");
    const codeInput = document.createElement("input");
    codeInput.type = "text";
    codeInput.value = code;
    codeInput.disabled = true;

    const nomInput = document.createElement("input");
    nomInput.type = "text";
    nomInput.value = e.nom || "";
    nomInput.disabled = true;

    const emailInput = document.createElement("input");
    emailInput.type = "email";
    emailInput.value = e.emailCompta || "";
    emailInput.disabled = true;

    const tdCode = document.createElement("td");
    tdCode.appendChild(codeInput);
    const tdNom = document.createElement("td");
    tdNom.appendChild(nomInput);
    const tdEmail = document.createElement("td");
    tdEmail.appendChild(emailInput);

    const actionsTd = document.createElement("td");
    const editBtn = document.createElement("button");
    editBtn.className = "secondary";
    editBtn.textContent = "Edit";

    const delBtn = document.createElement("button");
    delBtn.className = "secondary danger";
    delBtn.textContent = "Suppr";
    delBtn.style.marginLeft = "6px";

    editBtn.addEventListener("click", () => {
      const isEditing = tr.dataset.editing === "true";
      if (!isEditing) {
        tr.dataset.editing = "true";
        editBtn.textContent = "Enregistrer";
        codeInput.disabled = false;
        nomInput.disabled = false;
        emailInput.disabled = false;
        return;
      }
      const newCode = codeInput.value.trim();
      const newNom = nomInput.value.trim();
      const newEmail = emailInput.value.trim();
      if (!newCode) return alert("Code requis");
      if (newCode !== code && state.enseignes[newCode]) {
        return alert("Ce code existe déjà");
      }
      delete state.enseignes[code];
      state.enseignes[newCode] = { nom: newNom, emailCompta: newEmail };
      renderEnseignes();
    });

    delBtn.addEventListener("click", () => {
      delete state.enseignes[code];
      renderEnseignes();
    });

    actionsTd.appendChild(editBtn);
    actionsTd.appendChild(delBtn);

    tr.appendChild(tdCode);
    tr.appendChild(tdNom);
    tr.appendChild(tdEmail);
    tr.appendChild(actionsTd);
    tbody.appendChild(tr);
  });
}

function renderClients() {
  const tbody = document.querySelector("#tableClients tbody");
  const addRow = tbody.querySelector(".add-row");
  tbody.innerHTML = "";
  if (addRow) {
    tbody.appendChild(addRow);
    const addSelect = addRow.querySelector("#cliEnseigneSelect");
    if (addSelect) fillEnseigneOptions(addSelect, addSelect.value);
  }

  Object.entries(state.clients).forEach(([id, c]) => {
    const tr = document.createElement("tr");

    const idInput = document.createElement("input");
    idInput.type = "text";
    idInput.value = id;
    idInput.disabled = true;

    const ensSelect = document.createElement("select");
    fillEnseigneOptions(ensSelect, c.enseigne || "");
    ensSelect.disabled = true;

    const magInput = document.createElement("input");
    magInput.type = "text";
    magInput.value = c.magasin || "";
    magInput.disabled = true;

    const contactInput = document.createElement("input");
    contactInput.type = "text";
    contactInput.value = c.contact || "";
    contactInput.disabled = true;

    const emailInput = document.createElement("input");
    emailInput.type = "email";
    emailInput.value = c.email || "";
    emailInput.disabled = true;

    const qrData = `${window.location.origin}/login.html?client=${encodeURIComponent(id)}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrData)}`;

    const tdId = document.createElement("td");
    tdId.appendChild(idInput);
    const tdEns = document.createElement("td");
    tdEns.appendChild(ensSelect);
    const tdMag = document.createElement("td");
    tdMag.appendChild(magInput);
    const tdContact = document.createElement("td");
    tdContact.appendChild(contactInput);
    const tdEmail = document.createElement("td");
    tdEmail.appendChild(emailInput);

    const tdQr = document.createElement("td");
    tdQr.innerHTML = `<img src="${qrUrl}" alt="QR ${id}" width="70" height="70" loading="lazy"><br><small>URL+ID</small>`;

    const actionsTd = document.createElement("td");
    const editBtn = document.createElement("button");
    editBtn.className = "secondary";
    editBtn.textContent = "Edit";

    const delBtn = document.createElement("button");
    delBtn.className = "secondary danger";
    delBtn.textContent = "Suppr";
    delBtn.style.marginLeft = "6px";

    editBtn.addEventListener("click", () => {
      const isEditing = tr.dataset.editing === "true";
      if (!isEditing) {
        tr.dataset.editing = "true";
        editBtn.textContent = "Enregistrer";
        ensSelect.disabled = false;
        magInput.disabled = false;
        contactInput.disabled = false;
        emailInput.disabled = false;
        return;
      }
      saveClient({
        id,
        enseigne: ensSelect.value.trim(),
        magasin: magInput.value.trim(),
        contact: contactInput.value.trim(),
        email: emailInput.value.trim(),
      });
    });

    delBtn.addEventListener("click", () => {
      deleteClient(id);
    });

    actionsTd.appendChild(editBtn);
    actionsTd.appendChild(delBtn);

    tr.appendChild(tdId);
    tr.appendChild(tdEns);
    tr.appendChild(tdMag);
    tr.appendChild(tdContact);
    tr.appendChild(tdEmail);
    tr.appendChild(tdQr);
    tr.appendChild(actionsTd);

    tbody.appendChild(tr);
  });
}
function renderPrix() {
  const clientKey = document.getElementById("prixClientSelect").value.trim();
  const tbody = document.querySelector("#tablePrix tbody");
  const addRow = tbody.querySelector(".add-row");
  tbody.innerHTML = "";
  if (addRow) tbody.appendChild(addRow);
  if (!clientKey) return;

  const list = (state.prix[clientKey] || []).sort((a, b) => a.id - b.id);
  list.forEach((p) => {
    const tr = document.createElement("tr");

    const idInput = document.createElement("input");
    idInput.type = "number";
    idInput.value = p.id;
    idInput.disabled = true;

    const nomInput = document.createElement("input");
    nomInput.type = "text";
    nomInput.value = p.nom || "";
    nomInput.disabled = true;

    const prixInput = document.createElement("input");
    prixInput.type = "number";
    prixInput.step = "0.01";
    prixInput.value = p.prix.toFixed(2);
    prixInput.disabled = true;

    const tdId = document.createElement("td");
    tdId.appendChild(idInput);
    const tdNom = document.createElement("td");
    tdNom.appendChild(nomInput);
    const tdPrix = document.createElement("td");
    tdPrix.appendChild(prixInput);

    const actionsTd = document.createElement("td");
    const editBtn = document.createElement("button");
    editBtn.className = "secondary";
    editBtn.textContent = "Edit";

    const delBtn = document.createElement("button");
    delBtn.className = "secondary danger";
    delBtn.textContent = "Suppr";
    delBtn.style.marginLeft = "6px";

    editBtn.addEventListener("click", () => {
      const isEditing = tr.dataset.editing === "true";
      if (!isEditing) {
        tr.dataset.editing = "true";
        editBtn.textContent = "Enregistrer";
        nomInput.disabled = false;
        prixInput.disabled = false;
        return;
      }
      const prixVal = Number(prixInput.value);
      if (isNaN(prixVal)) return alert("Prix invalide");
      savePrice({
        clientId: clientKey,
        id: p.id,
        nom: nomInput.value.trim(),
        prix: prixVal,
      });
    });

    delBtn.addEventListener("click", () => {
      deletePrice(clientKey, p.id);
    });

    actionsTd.appendChild(editBtn);
    actionsTd.appendChild(delBtn);

    tr.appendChild(tdId);
    tr.appendChild(tdNom);
    tr.appendChild(tdPrix);
    tr.appendChild(actionsTd);

    tbody.appendChild(tr);
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
  renderClients();
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


