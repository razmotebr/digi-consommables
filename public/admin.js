// Simple admin client-side mock (data in memory). Replace with API calls later.
const state = {
  admin: sessionStorage.getItem("adminUser") || "admin",
  enseignes: {},
  clients: {},
  prix: {},
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
      <td><button class="secondary" data-code="${code}">Edit</button></td>`;
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
}

function renderClients() {
  const tbody = document.querySelector("#tableClients tbody");
  tbody.innerHTML = "";
  Object.entries(state.clients).forEach(([id, c]) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${id}</td><td>${c.enseigne || ""}</td><td>${c.magasin || ""}</td><td>${c.contact || ""}</td><td>${c.email || ""}</td>
      <td><button class="secondary" data-id="${id}">Edit</button></td>`;
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
}

function renderPrix() {
  const enseigne = document.getElementById("prixEnseigne").value.trim();
  const tbody = document.querySelector("#tablePrix tbody");
  tbody.innerHTML = "";
  const list = (state.prix[enseigne] || []).sort((a, b) => a.id - b.id);
  list.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${p.id}</td><td>${p.nom}</td><td>${p.prix.toFixed(2)}</td>
      <td><button class="secondary" data-id="${p.id}">Edit</button></td>`;
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

// Change d'enseigne dans l'onglet Prix => reload table
document.getElementById("prixEnseigne").addEventListener("input", renderPrix);

// Init tables vides
renderEnseignes();
renderClients();
renderPrix();
