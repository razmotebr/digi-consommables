// Admin UI : données via /admin_data (D1) + CRUD via /admin_clients et /admin_prices
const state = {
  admin: sessionStorage.getItem("adminUser") || "admin",
  enseignes: {}, // {code: {nom,emailCompta}}
  clients: {},   // {id: {enseigne,magasin,contact,email}}
  prix: {},      // {enseigne: [{id,nom,prix}]}
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

    const editBtn = document.createElement("button");
    editBtn.className = "secondary action-btn";
    editBtn.textContent = "Edit";

    const delBtn = document.createElement("button");
    delBtn.className = "secondary danger action-btn";
    delBtn.textContent = "Suppr";

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

    const actionsTd = document.createElement("td");
    actionsTd.className = "table-actions";
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
    tdQr.className = "qr-cell";
    const qrImg = document.createElement("img");
    qrImg.src = qrUrl;
    qrImg.alt = `QR ${id}`;
    qrImg.width = 70;
    qrImg.height = 70;
    qrImg.loading = "lazy";
    const copyBtn = document.createElement("button");
    copyBtn.className = "secondary";
    copyBtn.textContent = "Copier QR";
    copyBtn.addEventListener("click", async () => {
      if (!navigator.clipboard || !window.ClipboardItem) {
        alert("Copie d'image non supportée par ce navigateur");
        return;
      }
      try {
        const res = await fetch(qrUrl);
        const blob = await res.blob();
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        alert("Image QR copiée dans le presse-papiers");
      } catch (err) {
        console.error("copy qr error", err);
        alert("Impossible de copier l'image du QR");
      }
    });
    tdQr.appendChild(qrImg);
    tdQr.appendChild(copyBtn);
    tdQr.style.flexWrap = "nowrap";
    tdQr.style.gap = "10px";

    const actionsTd = document.createElement("td");
    actionsTd.className = "table-actions";
    const editBtn = document.createElement("button");
    editBtn.className = "secondary action-btn";
    editBtn.textContent = "Edit";

    const delBtn = document.createElement("button");
    delBtn.className = "secondary danger action-btn";
    delBtn.textContent = "Suppr";

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

    tr.appendChild(tdId);
    tr.appendChild(tdEns);
    tr.appendChild(tdMag);
    tr.appendChild(tdContact);
    tr.appendChild(tdEmail);
    tdQr.appendChild(editBtn);
    tdQr.appendChild(delBtn);
    tr.appendChild(tdQr);

    tbody.appendChild(tr);
  });
}
function renderPrix() {
  const ensKey = document.getElementById("prixEnseigneSelect").value.trim();
  const tbody = document.querySelector("#tablePrix tbody");
  const addRow = tbody.querySelector(".add-row");
  tbody.innerHTML = "";
  if (addRow) tbody.appendChild(addRow);
  if (!ensKey) return;

  const list = (state.prix[ensKey] || []).sort((a, b) => a.id - b.id);
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
    actionsTd.className = "table-actions";
    const editBtn = document.createElement("button");
    editBtn.className = "secondary action-btn";
    editBtn.textContent = "Edit";

    const delBtn = document.createElement("button");
    delBtn.className = "secondary danger action-btn";
    delBtn.textContent = "Suppr";

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
        enseigne: ensKey,
        id: p.id,
        nom: nomInput.value.trim(),
        prix: prixVal,
      });
    });

    delBtn.addEventListener("click", () => {
      deletePrice(ensKey, p.id);
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

function renderCatalogue() {
  const tbody = document.querySelector("#tableCatalogue tbody");
  const addRow = tbody.querySelector(".add-row");
  tbody.innerHTML = "";
  if (addRow) tbody.appendChild(addRow);

  Object.keys(state.catalog)
    .map((k) => Number(k))
    .sort((a, b) => a - b)
    .forEach((id) => {
      const nom = state.catalog[id] || "";
      const tr = document.createElement("tr");

      const idInput = document.createElement("input");
      idInput.type = "number";
      idInput.value = id;
      idInput.disabled = true;

      const nomInput = document.createElement("input");
      nomInput.type = "text";
      nomInput.value = nom;
      nomInput.disabled = true;

      const tdId = document.createElement("td");
      tdId.appendChild(idInput);
      const tdNom = document.createElement("td");
      tdNom.appendChild(nomInput);

      const actionsTd = document.createElement("td");
      actionsTd.className = "table-actions";
      const editBtn = document.createElement("button");
      editBtn.className = "secondary action-btn";
      editBtn.textContent = "Edit";

      const delBtn = document.createElement("button");
      delBtn.className = "secondary danger action-btn";
      delBtn.textContent = "Suppr";

      editBtn.addEventListener("click", () => {
        const isEditing = tr.dataset.editing === "true";
        if (!isEditing) {
          tr.dataset.editing = "true";
          editBtn.textContent = "Enregistrer";
          nomInput.disabled = false;
          return;
        }
        const newNom = nomInput.value.trim();
        if (!newNom) return alert("Nom requis");
        saveCatalogue({ id, nom: newNom });
      });

      delBtn.addEventListener("click", () => {
        deleteCatalogue(id);
      });

      actionsTd.appendChild(editBtn);
      actionsTd.appendChild(delBtn);

      tr.appendChild(tdId);
      tr.appendChild(tdNom);
      tr.appendChild(actionsTd);
      tbody.appendChild(tr);
    });
}


function populateEnseigneSelect() {
  const sel = document.getElementById("prixEnseigneSelect");
  if (!sel) return;
  sel.innerHTML = "";
  Object.keys(state.enseignes)
    .sort()
    .forEach((code) => {
      const opt = document.createElement("option");
      opt.value = code;
      opt.textContent = code;
      sel.appendChild(opt);
    });
  if (!sel.value && sel.options.length > 0) sel.value = sel.options[0].value;
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
  const enseigneId = document.getElementById("prixEnseigneSelect").value.trim();
  const prodId = Number(document.getElementById("prixProduitGlobalSelect").value);
  if (!prodId) {
    document.getElementById("prixId").value = "";
    document.getElementById("prixNom").value = "";
    document.getElementById("prixValeur").value = "";
    return;
  }
  document.getElementById("prixId").value = prodId;
  document.getElementById("prixNom").value = state.catalog[prodId] || "";
  const prod = (state.prix[enseigneId] || []).find((p) => p.id === prodId);
  document.getElementById("prixValeur").value = prod ? prod.prix : "";
}

function getClientsForEnseigne(enseigne) {
  return Object.entries(state.clients)
    .filter(([, c]) => c.enseigne === enseigne)
    .map(([id]) => id);
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

document.getElementById("tabCatalogue").addEventListener("click", (e) => {
  e.preventDefault();
  showSection("sectionCatalogue");
});

document.getElementById("prixEnseigneSelect").addEventListener("change", () => {
  applySelectedProduct();
  renderPrix();
});

document.getElementById("btnAddEnseigne").addEventListener("click", () => {
  const code = document.getElementById("ensCode").value.trim();
  const nom = document.getElementById("ensName").value.trim();
  const email = document.getElementById("ensEmail").value.trim();
  if (!code) return alert("Code requis");
  state.enseignes[code] = { nom, emailCompta: email };
  renderEnseignes();
  renderClients();
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
  if (!enseigne) return alert("Enseigne requise");
  const id = Number(document.getElementById("prixId").value);
  const nom = document.getElementById("prixNom").value.trim();
  const prix = Number(document.getElementById("prixValeur").value);
  if (!id || !nom || isNaN(prix)) return alert("Champs prix invalides");
  savePrice({ enseigne, id, nom, prix });
});

document.getElementById("btnAddProduitGlobal").addEventListener("click", () => {
  const nom = document.getElementById("catNom").value.trim();
  if (!nom) return alert("Nom requis");
  const id = getNextCatalogId();
  saveCatalogue({ id, nom });
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
    const prixByClient = data.prixByClient || {};
    state.prix = {};
    state.catalog = data.catalog || {};

    // Enseignes derivees des clients existants
    state.enseignes = {};
    Object.values(state.clients).forEach((c) => {
      if (c.enseigne && !state.enseignes[c.enseigne]) {
        state.enseignes[c.enseigne] = { nom: c.enseigne, emailCompta: c.email || "" };
      }
    });

    // Convertir les prix par client en prix par enseigne
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
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) throw new Error(await res.text());
    delete state.clients[id];
    renderClients();
    populateEnseigneSelect();
    renderPrix();
  } catch (e) {
    console.error("deleteClient error", e);
    alert("Erreur suppression client");
  }
}

async function deletePrice(enseigne, produitId) {
  // Supprimer pour tous les clients de l'enseigne côté backend
  const clientIds = getClientsForEnseigne(enseigne);
  try {
    await Promise.all(
      clientIds.map((cid) =>
        fetch("/admin_prices", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ clientId: cid, produitId }),
        })
      )
    );
  } catch (e) {
    console.error("deletePrice error", e);
    alert("Erreur suppression prix");
  }
  state.prix[enseigne] = (state.prix[enseigne] || []).filter((p) => p.id !== produitId);
  renderPrix();
}

async function savePrice({ enseigne, id, nom, prix }) {
  // Maj catalog local
  state.catalog[id] = nom || state.catalog[id] || `Produit ${id}`;
  populateProduitGlobalSelect();

  // Propager à tous les clients de l'enseigne côté backend
  const clientIds = getClientsForEnseigne(enseigne);
  try {
    await Promise.all(
      clientIds.map((cid) =>
        fetch("/admin_prices", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ clientId: cid, produitId: id, nom, prix }),
        })
      )
    );
  } catch (e) {
    console.error("savePrice error", e);
    alert("Erreur sauvegarde prix");
  }

  if (!state.prix[enseigne]) state.prix[enseigne] = [];
  const existing = state.prix[enseigne].find((p) => p.id === id);
  if (existing) {
    existing.nom = state.catalog[id];
    existing.prix = prix;
  } else {
    state.prix[enseigne].push({ id, nom: state.catalog[id], prix });
  }
  renderPrix();
}

async function saveCatalogue({ id, nom }) {
  state.catalog[id] = nom;
  // Propager le libellé catalogue dans tous les prix existants
  Object.keys(state.prix).forEach((clientId) => {
    state.prix[clientId] = (state.prix[clientId] || []).map((p) =>
      p.id === id ? { ...p, nom } : p
    );
  });
  renderCatalogue();
  populateProduitGlobalSelect();
  applySelectedProduct();
  renderPrix();
}

async function deleteCatalogue(id) {
  delete state.catalog[id];
  Object.keys(state.prix).forEach((clientId) => {
    state.prix[clientId] = (state.prix[clientId] || []).filter((p) => p.id !== id);
  });
  renderCatalogue();
  populateProduitGlobalSelect();
  applySelectedProduct();
  renderPrix();
}

function getNextCatalogId() {
  const ids = Object.keys(state.catalog).map((k) => Number(k)).filter((n) => !isNaN(n));
  if (ids.length === 0) return 1;
  return Math.max(...ids) + 1;
}

loadInitialData();
