-- D1 schema initialisation script (SQLite/SQL compatible)

DROP TABLE IF EXISTS prix_par_client;
DROP TABLE IF EXISTS catalog_produits;
DROP TABLE IF EXISTS commandes;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS users;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'client'
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  enseigne TEXT,
  magasin TEXT,
  contact TEXT,
  email_compta TEXT,
  frais_port REAL DEFAULT 12.0,
  tva REAL DEFAULT 0.2
);

-- Catalogue produit unique
CREATE TABLE IF NOT EXISTS catalog_produits (
  id INTEGER PRIMARY KEY,
  reference TEXT,
  nom TEXT NOT NULL,
  designation TEXT,
  mandrin TEXT,
  etiquettes_par_rouleau INTEGER,
  rouleaux_par_carton INTEGER,
  prix_carton_ht REAL,
  description TEXT
);

-- Prix par client pour un produit du catalogue
CREATE TABLE IF NOT EXISTS prix_par_client (
  client_id TEXT,
  produit_id INTEGER,
  prix REAL,
  PRIMARY KEY (client_id, produit_id),
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (produit_id) REFERENCES catalog_produits(id)
);

CREATE TABLE IF NOT EXISTS commandes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT,
  date TEXT,
  total_ht REAL,
  tva REAL,
  total_ttc REAL,
  pdf_url TEXT,
  status TEXT,
  payload JSON
);

-- Données de test
INSERT OR IGNORE INTO clients (id, enseigne, magasin, contact, email_compta) VALUES
('C001','Intermarche','Paris 15','Jean Dupont','razmotebr@hotmail.fr'),
('C002','Carrefour','Nice Gambetta','Sophie Martin','razmotebr@hotmail.fr');

INSERT OR IGNORE INTO catalog_produits (id, nom) VALUES
(1,'Film alimentaire 450 mm'),
(2,'Film alimentaire 300 mm'),
(3,'Ticket Linerless 58mm x 65M 40mm BL'),
(4,'Ticket Linerless 58mm x 65M 40mm BL x30'),
(5,'Etiquettes thermo 58x43');

INSERT OR IGNORE INTO prix_par_client (client_id, produit_id, prix) VALUES
('C001',1,12.50),('C001',2,9.90),('C001',3,4.50),('C001',4,101.30),('C001',5,3.90);
