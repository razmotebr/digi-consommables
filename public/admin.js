// Admin UI: charge les données existantes via /admin/data et permet d'ajouter/éditer/supprimer en mémoire.
const state = {
  admin: sessionStorage.getItem("adminUser") || "admin",
  enseignes: {}, // {code: {nom,emailCompta}}
  clients: {}, // {id: {enseigne,magasin,contact,email}}
  prix: {}, // {enseigne: [{id,nom,prix}]}
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
      delete state.clients[id];
      renderClients();
    });
  });
}

function renderPrix() {
  const enseigne = document.getElementById("prixEnseigne").value.trim();
  const tbody = document.querySelector("#tablePrix tbody");
  tbody.innerHTML = "";
  const list = (state.prix[enseigne] || []).sort((a, b) => a.id - b.id);
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
      const prod = (state.prix[enseigne] || []).find((p) => p.id === id);
      if (!prod) return;
      document.getElementById("prixId").value = prod.id;
      document.getElementById("prixNom").value = prod.nom;
      document.getElementById("prixValeur").value = prod.prix;
    });
  });
  tbody.querySelectorAll("button[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.del);
      state.prix[enseigne] = (state.prix[enseigne] || []).filter((p) => p.id !== id);
      renderPrix();
    });
  });
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
  state.clients[id] = {
    enseigne: document.getElementById("cliEnseigne").value.trim(),
    magasin: document.getElementById("cliMagasin").value.trim(),
    contact: document.getElementById("cliContact").value.trim(),
    email: document.getElementById("cliEmail").value.trim(),
  };
  renderClients();
});

document.getElementById("btnAddPrix").addEventListener("click", () => {
  const ens = document.getElementById("prixEnseigne").value.trim();
  if (!ens) return alert("Enseigne requise");
  const id = Number(document.getElementById("prixId").value);
  const nom = document.getElementById("prixNom").value.trim();
  const prix = Number(document.getElementById("prixValeur").value);
  if (!id || !nom || isNaN(prix)) return alert("Champs prix invalides");
  if (!state.prix[ens]) state.prix[ens] = [];
  const existing = state.prix[ens].find((p) => p.id === id);
  if (existing) {
    existing.nom = nom;
    existing.prix = prix;
  } else {
    state.prix[ens].push({ id, nom, prix });
  }
  renderPrix();
});

document.getElementById("prixEnseigne").addEventListener("input", renderPrix);

async function loadInitialData() {
  try {
    const res = await fetch("/admin_data");
    if (!res.ok) throw new Error(`admin_data ${res.status}`);
    const data = await res.json();

    // Enseignes : dérivé du mapping clientEnseigne et prix dispo
    state.enseignes = {};
    if (data.clientEnseigne) {
      Object.entries(data.clientEnseigne).forEach(([cid, ens]) => {
        if (!state.enseignes[ens]) state.enseignes[ens] = { nom: ens, emailCompta: "" };
      });
    }

    state.clients = data.clients || {};
    state.prix = data.enseignePrices || {};

    // Si une enseigne existe en prix mais pas dans enseignes, on l'ajoute
    Object.keys(state.prix).forEach((ens) => {
      if (!state.enseignes[ens]) state.enseignes[ens] = { nom: ens, emailCompta: "" };
    });

    renderEnseignes();
    renderClients();
    renderPrix();
  } catch (e) {
    console.error("loadInitialData error", e);
    alert("Impossible de charger les données admin");
  }
}

loadInitialData();
