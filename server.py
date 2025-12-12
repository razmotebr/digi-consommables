#!/usr/bin/env python3
import json
from http.server import HTTPServer, SimpleHTTPRequestHandler
import os
import io
import datetime
import smtplib
from email.message import EmailMessage
import secrets
import string
from typing import Dict, Any, Tuple

# Load environment variables from .env if present
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

# Optional dependency for PDF generation
try:
    from reportlab.pdfgen import canvas
    REPORTLAB_AVAILABLE = True
except Exception:
    REPORTLAB_AVAILABLE = False

ALLOWED_ORIGINS = [
    o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "http://localhost:8000").split(",") if o.strip()
]

ADMIN_USER = os.environ.get("ADMIN_USER", "admin")
ADMIN_PASS = os.environ.get("ADMIN_PASS", "admin123")
DATA_FILE = os.environ.get("ADMIN_DATA_FILE", "admin_data.json")
CLIENTS_FALLBACK = "public/clients.json"


class MyHandler(SimpleHTTPRequestHandler):
    # --- Utils -------------------------------------------------------------
    def _add_cors(self):
        origin = self.headers.get("Origin")
        if origin and origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")

    def _parse_json_body(self):
        content_length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(content_length)
        return json.loads(raw)

    # --- Data helpers ------------------------------------------------------
    def _load_data(self):
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        # fallback build from public/clients.json
        data = {"clients": {}, "catalog": {}, "prixByClient": {}, "orders": [], "resetTokens": {"client": {}, "admin": {}}, "adminPassword": ADMIN_PASS}
        try:
            with open(CLIENTS_FALLBACK, "r", encoding="utf-8") as f:
                fallback = json.load(f)
            data["clients"] = fallback.get("clients", {})
            # default passwords
            for cid, c in data["clients"].items():
                c.setdefault("password", "password")
            # catalogue from conso
            for p in fallback.get("conso", []):
                data["catalog"][str(p.get("id"))] = p.get("nom", f"Produit {p.get('id')}")
            # prix identiques par client
            for cid in data["clients"].keys():
                data["prixByClient"][cid] = [
                    {"id": p.get("id"), "nom": p.get("nom"), "prix": p.get("prix", 0)}
                    for p in fallback.get("conso", [])
                ]
        except Exception:
            pass
        self._save_data(data)
        return data

    def _save_data(self, data):
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def _make_client_token(self, client_id: str):
        return f"TOKEN:{client_id}:{datetime.datetime.utcnow().isoformat()}"

    def _make_admin_token(self, user: str):
        return f"ADMIN:{user}:{datetime.datetime.utcnow().isoformat()}"

    def _validate_admin(self):
        auth_header = self.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return False
        token = auth_header.replace("Bearer ", "", 1)
        parts = token.split(":")
        return len(parts) >= 3 and parts[0] == "ADMIN"

    def _validate_token(self, client_id: str):
        auth_header = self.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return False, "Jeton manquant"
        token = auth_header.replace("Bearer ", "", 1)
        parts = token.split(":")
        if len(parts) < 3 or parts[0] != "TOKEN" or parts[1] != client_id:
            return False, "Jeton invalide"
        return True, None

    def _validate_payload(self, data):
        errors = []
        client_id = str(data.get("clientId", "")).strip()
        if not client_id:
            errors.append("clientId obligatoire")

        def is_number(x):
            try:
                float(x)
                return True
            except Exception:
                return False

        produits = data.get("produits", [])
        if not isinstance(produits, list):
            errors.append("produits doit etre une liste")
            produits = []

        for idx, p in enumerate(produits):
            qty = p.get("qty", 0)
            prix = p.get("prix", 0)
            if not is_number(qty) or float(qty) < 0:
                errors.append(f"produit {idx}: qty invalide")
            if not is_number(prix) or float(prix) < 0:
                errors.append(f"produit {idx}: prix invalide")
        return errors

    def _send_mail(self, to_addr: str, subject: str, body: str):
        smtp_host = os.environ.get("SMTP_HOST")
        smtp_port = int(os.environ.get("SMTP_PORT", "587"))
        smtp_user = os.environ.get("SMTP_USER")
        smtp_pass = os.environ.get("SMTP_PASS")
        from_addr = smtp_user or "no-reply@example.com"

        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = from_addr
        msg["To"] = to_addr
        msg.set_content(body)

        with smtplib.SMTP(smtp_host, smtp_port) as s:
            s.starttls()
            if smtp_user and smtp_pass:
                s.login(smtp_user, smtp_pass)
            s.send_message(msg)

    def _generate_reset_token(self, kind: str, payload: Dict[str, Any], ttl_minutes: int = 60) -> str:
        data = self._load_data()
        data.setdefault("resetTokens", {"client": {}, "admin": {}})
        token = secrets.token_urlsafe(24)
        expires = (datetime.datetime.utcnow() + datetime.timedelta(minutes=ttl_minutes)).isoformat()
        data["resetTokens"].setdefault(kind, {})[token] = {**payload, "exp": expires}
        self._save_data(data)
        return token

    def _consume_reset_token(self, kind: str, token: str) -> Tuple[bool, Dict[str, Any]]:
        data = self._load_data()
        tok = data.get("resetTokens", {}).get(kind, {}).get(token)
        if not tok:
            return False, {}
        exp = tok.get("exp")
        if exp and datetime.datetime.fromisoformat(exp) < datetime.datetime.utcnow():
            # expired
            del data["resetTokens"][kind][token]
            self._save_data(data)
            return False, {}
        # consume
        del data["resetTokens"][kind][token]
        self._save_data(data)
        return True, tok

    # --- HTTP verbs --------------------------------------------------------
    def do_OPTIONS(self):
        cors_paths = {
            "/login": "POST, OPTIONS",
            "/sendorder": "POST, OPTIONS",
            "/admin_login": "POST, OPTIONS",
            "/admin_clients": "POST, DELETE, OPTIONS",
            "/admin_prices": "POST, DELETE, OPTIONS",
            "/admin_orders": "GET, PUT, OPTIONS",
            "/admin_users": "GET, OPTIONS",
            "/admin_reset_password": "POST, OPTIONS",
            "/client_info": "GET, OPTIONS",
            "/prices": "GET, OPTIONS",
            "/orders": "GET, OPTIONS",
            "/admin_data": "GET, OPTIONS",
        }
        if self.path in cors_paths:
            self.send_response(204)
            self.send_header("Access-Control-Allow-Methods", cors_paths[self.path])
            self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
            self.send_header("Access-Control-Max-Age", "600")
            self._add_cors()
            super().end_headers()
        else:
            self.send_response(404)
            super().end_headers()

    def do_GET(self):
        if self.path == "/":
            self.path = "/index.html"
        return super().do_GET()

    def do_POST(self):
        print(f"POST recu sur: {self.path}")
        if self.path == "/login":
            self._handle_login()
        elif self.path == "/sendorder":
            self._handle_send_order()
        elif self.path == "/admin_login":
            self._handle_admin_login()
        elif self.path == "/forgot_client":
            self._handle_forgot_client()
        elif self.path == "/reset_client":
            self._handle_reset_client()
        elif self.path == "/forgot_admin":
            self._handle_forgot_admin()
        elif self.path == "/reset_admin":
            self._handle_reset_admin()
        else:
            self.send_response(404)
            self._add_cors()
            self.end_headers()

    # --- Handlers ----------------------------------------------------------
    def _handle_login(self):
        try:
            data = self._parse_json_body()
            client_id = data.get("id", "").strip()
            password = data.get("password", "")

            store = self._load_data()
            user = store.get("clients", {}).get(client_id)

            if not client_id or not user or password != user.get("password", ""):
                self.send_response(401)
                self.send_header("Content-Type", "application/json")
                self._add_cors()
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Invalid credentials"}).encode())
                return

            token = self._make_client_token(client_id)

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._add_cors()
            self.end_headers()
            self.wfile.write(json.dumps({"token": token}).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self._add_cors()
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def _handle_send_order(self):
        try:
            data = self._parse_json_body()

            token_ok, token_error = self._validate_token(str(data.get("clientId", "")).strip())
            if not token_ok:
                self.send_response(401)
                self.send_header("Content-Type", "application/json")
                self._add_cors()
                self.end_headers()
                self.wfile.write(json.dumps({"error": token_error}).encode())
                return

            validation_errors = self._validate_payload(data)
            if validation_errors:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self._add_cors()
                self.end_headers()
                self.wfile.write(json.dumps({"error": "; ".join(validation_errors)}).encode())
                return

            print("\n=== COMMANDE RECUE ===")
            print(f"Client: {data.get('clientId')}")
            print(f"Enseigne: {data.get('enseigne')}")
            print(f"Email: {data.get('emailCompta')}")
            print("Produits commandes:")
            for p in data.get("produits", []):
                if p.get("qty", 0) > 0:
                    print(f"  - {p.get('nom')}: {p.get('qty')} x {p.get('prix')} EUR")
            print("==============\n")

            pdf_bytes = None
            timestamp = datetime.datetime.utcnow().strftime("%Y%m%d%H%M%S")
            pdf_filename = f"commande_{data.get('clientId','unknown')}_{timestamp}.pdf"

            if REPORTLAB_AVAILABLE:
                from reportlab.lib import colors
                from reportlab.pdfgen import canvas
                from reportlab.lib.pagesizes import A4
                from reportlab.lib.utils import ImageReader

                buffer = io.BytesIO()
                c = canvas.Canvas(buffer, pagesize=A4)
                width, height = A4
                margin = 40
                y = height - margin

                DIGI_GREEN = colors.HexColor("#009C84")  # vert DIGI
                DARK = colors.HexColor("#3A3A3A")
                GREY_BORDER = colors.HexColor("#999999")
                GREY_LOGO = colors.HexColor("#666666")

                def fmt_euro(x):
                    try:
                        return f"{float(x):.2f} €".replace(".", ",")
                    except Exception:
                        return "0,00 €"

                # En-tete
                logo_path = "logo_pdf.png"  # cwd = public
                if os.path.exists(logo_path):
                    c.drawImage(ImageReader(logo_path), margin, y - 32, width=100, height=30, preserveAspectRatio=True, mask="auto")
                c.setFont("Helvetica-Bold", 26)
                c.setFillColor(DARK)
                c.drawRightString(width - margin, y - 6, "BON DE COMMANDE")

                c.setFont("Helvetica", 9)
                coord_x = margin + 120
                c.setFillColor(GREY_LOGO)
                c.drawString(coord_x, y - 12, "DIGI France SA")
                c.setFillColor(DARK)
                c.drawString(coord_x, y - 24, "Z.A. Central Parc - 4, allée du Sanglier")
                c.drawString(coord_x, y - 36, "93421 VILLEPINTE CEDEX FRANCE")
                c.drawString(coord_x, y - 48, "Tel: 01 56 48 06 06 | SAV: 01 45 91 02 97")

                ref_block_width = 220
                ref_x = width - margin - ref_block_width
                c.drawRightString(width - margin, y - 16, "Page 1/1")
                c.drawString(ref_x, y - 30, f"Ref: {pdf_filename}")
                c.drawString(ref_x, y - 44, f"Date: {datetime.datetime.now().strftime('%d/%m/%Y %H:%M')}")

                y -= 70
                c.setStrokeColor(GREY_BORDER)
                c.setLineWidth(1)
                c.line(margin, y, width - margin, y)
                y -= 16

                # Adresses (livraison / facturation)
                c.setFont("Helvetica-Bold", 12)
                c.setFillColor(DARK)
                c.drawString(margin, y, "Adresse de livraison")
                c.drawString(width / 2, y, "Adresse de facturation")
                y -= 14
                c.setFont("Helvetica", 10)
                c.setFillColor(colors.black)
                addr_lines = [
                    data.get("enseigne", ""),
                    data.get("magasin", ""),
                    data.get("contact", ""),
                    data.get("emailCompta", ""),
                ]
                for i, line in enumerate(addr_lines):
                    c.drawString(margin, y - (i * 12), line)
                    c.drawString(width / 2, y - (i * 12), line)
                y -= 60

                # Tableau produits
                # Largeurs ajustées pour tenir dans la page (A4 - marges)
                headers = [("Code", 60), ("Designation", 230), ("Qté", 60), ("P.U.", 70), ("Montant HT", 95)]
                table_width = sum(w for _, w in headers)
                table_left = margin
                table_right = table_left + table_width
                table_top = y

                header_height = 26
                c.setFillColor(DIGI_GREEN)
                c.rect(table_left, y - header_height, table_width, header_height, fill=1, stroke=0)
                c.setFillColor(colors.white)
                c.setFont("Helvetica-Bold", 10)
                x = table_left
                text_y = y - (header_height / 2) + 2  # centré verticalement
                for title, wcol in headers:
                    c.drawCentredString(x + wcol / 2, text_y, title)
                    x += wcol
                y -= header_height + 2

                c.setFont("Helvetica", 9)
                total_ht = 0
                row_num = 0
                row_height = 20
                for p in data.get("produits", []):
                    qty_raw = p.get("qty", 0)
                    try:
                        qty = float(qty_raw) if qty_raw else 0
                    except Exception:
                        qty = 0
                    if qty <= 0:
                        continue

                    prix = float(p.get("prix", 0)) if p.get("prix") else 0
                    montant = qty * prix
                    total_ht += montant

                    row_top = y - row_height
                    if row_num % 2 == 0:
                        c.setFillColor(colors.HexColor("#F4F6F4"))
                        c.rect(table_left, row_top, table_width, row_height, fill=1, stroke=0)
                    c.setFillColor(colors.black)

                    text_y = row_top + (row_height / 2) + 2  # centré verticalement
                    col_x = table_left
                    c.drawCentredString(col_x + headers[0][1] / 2, text_y, str(p.get("id", "")))
                    col_x += headers[0][1]
                    c.drawString(col_x + 4, text_y, str(p.get("nom", ""))[:70])
                    col_x += headers[1][1]
                    c.drawCentredString(col_x + headers[2][1] / 2, text_y, f"{int(qty)}")
                    col_x += headers[2][1]
                    c.drawRightString(col_x + headers[3][1] - 6, text_y, fmt_euro(prix))
                    col_x += headers[3][1]
                    c.drawRightString(col_x + headers[4][1] - 6, text_y, fmt_euro(montant))

                    y -= row_height
                    row_num += 1

                # Bordure tableau
                table_height = (table_top - y)
                c.setStrokeColor(DIGI_GREEN)
                c.setLineWidth(1)
                c.rect(table_left, y, table_width, table_height, stroke=1, fill=0)

                # Totaux
                y -= 28  # espace avant totaux
                frais_port = 12.0
                tva_rate = 0.2
                total_ht_frais = total_ht + frais_port
                tva = total_ht_frais * tva_rate
                total_ttc = total_ht_frais + tva

                block_width = 220
                block_left = table_right - block_width
                c.setStrokeColor(DIGI_GREEN)
                c.setLineWidth(1)
                c.line(block_left, y, block_left + block_width, y)
                y -= 12

                c.setFont("Helvetica", 10)
                def line_tot(label, value):
                    nonlocal y
                    c.setFillColor(colors.black)
                    c.drawString(block_left, y, label)
                    c.drawRightString(block_left + block_width, y, fmt_euro(value))
                    y -= 14

                line_tot("Sous-total HT:", total_ht)
                line_tot("Frais port:", frais_port)
                line_tot("Total HT:", total_ht_frais)
                line_tot("TVA 20%:", tva)
                y -= 8
                c.setFillColor(DIGI_GREEN)
                total_bar_height = 26
                c.rect(block_left, y - total_bar_height, block_width, total_bar_height, fill=1, stroke=0)
                c.setFillColor(colors.white)
                c.setFont("Helvetica-Bold", 12)
                text_y = y - (total_bar_height / 2) + 2  # centrer verticalement
                c.drawString(block_left + 8, text_y, "TOTAL TTC:")
                c.drawRightString(block_left + block_width - 8, text_y, fmt_euro(total_ttc))

                # Pied de page
                c.setFont("Helvetica", 8)
                c.setFillColor(colors.grey)
                c.drawString(margin, 25, "DIGI France - Commande de consommables")
                c.drawRightString(width - margin, 25, pdf_filename)

                c.save()
                buffer.seek(0)
                pdf_bytes = buffer.read()
                print(f"PDF genere: {len(pdf_bytes)} bytes, {row_num} produits")
            else:
                print("reportlab non installe")

            smtp_host = os.environ.get("SMTP_HOST")
            smtp_port = int(os.environ.get("SMTP_PORT", "0")) if os.environ.get("SMTP_PORT") else None
            smtp_user = os.environ.get("SMTP_USER")
            smtp_pass = os.environ.get("SMTP_PASS")
            email_to = os.environ.get("EMAIL_DIGI") or "ebrion@fr.digi.eu"

            email_sent = False
            email_error = None

            if smtp_host and smtp_port and smtp_user and smtp_pass and pdf_bytes:
                try:
                    msg = EmailMessage()
                    subject = f"Commande Consommables - {data.get('enseigne','')} - {data.get('magasin','')}"
                    msg["Subject"] = subject
                    msg["From"] = smtp_user
                    msg["To"] = email_to
                    body = (
                        f"Commande recue pour {data.get('clientId')} - "
                        f"{data.get('enseigne')} / {data.get('magasin')}\n\nPDF en piece jointe."
                    )
                    msg.set_content(body)
                    msg.add_attachment(pdf_bytes, maintype="application", subtype="pdf", filename=pdf_filename)

                    with smtplib.SMTP(smtp_host, smtp_port) as s:
                        s.starttls()
                        s.login(smtp_user, smtp_pass)
                        s.send_message(msg)
                    email_sent = True
                    print(f"Email envoye avec succes a {email_to}")
                except Exception as e:
                    email_error = str(e)
                    print("Erreur envoi email:", email_error)
            elif not (smtp_host and smtp_port and smtp_user and smtp_pass):
                print("Variables SMTP non configurees. PDF sauvegarde localement.")
            else:
                print("PDF non genere, pas d'envoi d'email")

            saved_path = None
            if pdf_bytes and not email_sent:
                out_dir = os.path.join(os.getcwd(), "..", "outbox")
                os.makedirs(out_dir, exist_ok=True)
                saved_path = os.path.join(out_dir, pdf_filename)
                with open(saved_path, "wb") as f:
                    f.write(pdf_bytes)

            resp = {
                "ok": True,
                "pdf_generated": bool(pdf_bytes),
                "email_sent": email_sent,
                "email_error": email_error,
                "saved_path": saved_path,
            }

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._add_cors()
            self.end_headers()
            self.wfile.write(json.dumps(resp).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self._add_cors()
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def _handle_admin_login(self):
        try:
            data = self._parse_json_body()
            user = data.get("user", "").strip()
            password = data.get("password", "")
            store = self._load_data()
            admin_pass = store.get("adminPassword", ADMIN_PASS)

            if user != ADMIN_USER or password != admin_pass:
                self.send_response(401)
                self.send_header("Content-Type", "application/json")
                self._add_cors()
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Invalid credentials"}).encode())
                return

            token = self._make_admin_token(user)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._add_cors()
            self.end_headers()
            self.wfile.write(json.dumps({"token": token, "user": user}).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self._add_cors()
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def _handle_forgot_client(self):
        try:
            data = self._parse_json_body()
            client_id = data.get("id", "").strip()
            store = self._load_data()
            client = store.get("clients", {}).get(client_id)
            if not client:
                self.send_response(404)
                self.send_header("Content-Type", "application/json")
                self._add_cors()
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Client inconnu"}).encode())
                return
            email = client.get("emailCompta") or client.get("email")
            if not email:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self._add_cors()
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Aucune adresse email compta"}).encode())
                return
            token = self._generate_reset_token("client", {"clientId": client_id})
            reset_link = f"{self.headers.get('Origin','http://localhost:8000')}/reset-client.html?token={token}"
            subject = f"Réinitialisation mot de passe client {client_id}"
            body = f"Bonjour,\n\nPour réinitialiser le mot de passe du client {client_id}, utilisez le lien suivant :\n{reset_link}\n\nCe lien expirera dans 60 minutes."
            self._send_mail(email, subject, body)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._add_cors()
            self.end_headers()
            self.wfile.write(json.dumps({"message": "Email de réinitialisation envoyé"}).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self._add_cors()
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def _handle_reset_client(self):
        try:
            data = self._parse_json_body()
            token = data.get("token", "")
            new_pass = data.get("password", "")
            ok, payload = self._consume_reset_token("client", token)
            if not ok:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self._add_cors()
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Token invalide ou expiré"}).encode())
                return
            cid = payload.get("clientId")
            store = self._load_data()
            if cid not in store.get("clients", {}):
                self.send_response(404)
                self.send_header("Content-Type", "application/json")
                self._add_cors()
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Client introuvable"}).encode())
                return
            store["clients"][cid]["password"] = new_pass
            self._save_data(store)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._add_cors()
            self.end_headers()
            self.wfile.write(json.dumps({"message": "Mot de passe mis à jour"}).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self._add_cors()
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def _handle_forgot_admin(self):
        try:
            token = self._generate_reset_token("admin", {"user": ADMIN_USER})
            dest = os.environ.get("EMAIL_DIGI") or os.environ.get("SMTP_USER") or "adv@example.com"
            reset_link = f"{self.headers.get('Origin','http://localhost:8000')}/reset-admin.html?token={token}"
            subject = "Réinitialisation mot de passe admin DIGI"
            body = f"Bonjour ADV,\n\nPour réinitialiser le mot de passe administrateur, cliquez sur :\n{reset_link}\n\nLien valable 60 minutes."
            self._send_mail(dest, subject, body)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._add_cors()
            self.end_headers()
            self.wfile.write(json.dumps({"message": "Email de réinitialisation envoyé"}).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self._add_cors()
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def _handle_reset_admin(self):
        try:
            data = self._parse_json_body()
            token = data.get("token", "")
            new_pass = data.get("password", "")
            ok, payload = self._consume_reset_token("admin", token)
            if not ok:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self._add_cors()
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Token invalide ou expiré"}).encode())
                return
            store = self._load_data()
            store["adminPassword"] = new_pass
            self._save_data(store)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._add_cors()
            self.end_headers()
            self.wfile.write(json.dumps({"message": "Mot de passe admin mis à jour"}).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self._add_cors()
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())


if __name__ == "__main__":
    os.chdir("public")
    server = HTTPServer(("localhost", 8000), MyHandler)
    print("Serveur demarre sur http://localhost:8000")
    print("Endpoint /sendorder disponible pour les tests")
    server.serve_forever()
