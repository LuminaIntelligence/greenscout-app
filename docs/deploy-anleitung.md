# GreenScout — Deploy-Anleitung

Diese Anleitung führt dich Schritt für Schritt durch das erste Aufsetzen
von GreenScout auf einem Hetzner-VPS. Du brauchst dafür keine
Programmier-Kenntnisse — nur einen SSH-Zugang per PuTTY und ein paar
Minuten Geduld beim ersten Build.

Nach dem ersten Setup ist jedes weitere Deploy nur noch:

    git pull && bash deploy.sh

---

## 0. Voraussetzungen auf dem Server (einmalig)

Voraussetzung: Du bist als `root` per SSH eingeloggt. Hetzner schickt
dir nach der VPS-Bestellung die SSH-Daten per Mail.

Installiere die System-Pakete:

    apt update
    apt install -y git nginx certbot python3-certbot-nginx \
                   docker.io docker-compose-plugin
    systemctl enable --now docker nginx

Öffne in der Hetzner-Firewall (oder per `ufw allow 80/tcp` + `ufw allow 443/tcp`)
die Ports 80 und 443.

---

## 1. DNS einrichten

Bei deinem DNS-Provider (Cloudflare, INWX, …) trage einen A-Record ein:

    Name:    greenscout
    Typ:     A
    Wert:    <IP-Adresse des Hetzner-VPS>
    TTL:     300

Warte ein paar Minuten und prüfe mit `dig greenscout.lumina-intelligence.ai +short`
ob die richtige IP zurückkommt.

---

## 2. Repository auf den Server holen

Auf dem Server ein Verzeichnis wählen — z. B. `/opt/greenscout`:

    cd /opt
    git clone https://github.com/LuminaIntelligence/greenscout-app.git greenscout
    cd greenscout

Hinweis: Wenn das Repo privat ist, brauchst du ein Personal Access Token von
GitHub (Settings → Developer settings → Tokens). Beim `git clone` fragt git
nach Username + Password — als Password gibst du den Token an.

---

## 3. `.env.production` anlegen

Kopiere das Beispiel und fülle die Werte aus:

    cp .env.production.example .env.production
    nano .env.production

In `nano` musst du jeden `REPLACE_ME`-Platzhalter ersetzen:

| Variable | Wie du den Wert erzeugst |
|---|---|
| `DATABASE_URL` | passt automatisch, wenn du nur `REPLACE_ME` durch dein Postgres-Passwort ersetzt |
| `POSTGRES_PASSWORD` | langes Zufalls-Passwort. Im Terminal: `openssl rand -base64 32` — den ausgegebenen Wert reinkopieren |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `SETTINGS_ENCRYPTION_KEY` | `openssl rand -base64 32` |
| `APP_URL` | bleibt `https://greenscout.lumina-intelligence.ai` |
| `PYTHON_SERVICE_API_KEY` | `openssl rand -base64 32` — Shared-Secret zwischen web- und pyservice-Container; ohne den schlagen Bild-Uploads fehl |
| `INTERNAL_RENDER_TOKEN` | `openssl rand -base64 32` — Shared-Secret zwischen dem Playwright-Render-Wrapper und der internen Render-Route. Ohne diesen Token schlägt jede PDF-Generation fehl. Pattern analog `PYTHON_SERVICE_API_KEY`; KEIN User-Auth-Flow. |
| `STUDY_SHARE_HMAC_SECRET` | `openssl rand -base64 32` — HMAC-Secret für die Kunden-Online-Ansicht (§7.10-Pivot PR 4). Signiert die per Berater-UI erzeugten Share-Links unter `/studie/[id]?t=<token>`. Default-Gültigkeit pro Link: 30 Tage. Rotation des Secrets invalidiert ALLE ausgestellten Share-Links (Revocation-by-Rotation). |
| `CERTBOT_EMAIL` | deine echte Email — Let's Encrypt schickt dahin Ablauf-Warnungen |

In `nano` speichern: `Strg+O`, Enter, `Strg+X`.

**Wichtig:** `.env.production` enthält Geheimnisse. Niemals committen
oder per Mail weiterschicken. `.gitignore` schützt schon davor (`.env.*`-Muster).

---

## 4. Deploy ausführen

    bash deploy.sh

Das Skript macht der Reihe nach:

1. Prüft Root-Rechte, Linux, alle Voraussetzungs-Tools.
2. Legt eine 4-GB-Swap-Datei an (falls noch keine da ist) — verhindert,
   dass der Docker-Build den RAM überlaufen lässt.
3. Baut die Docker-Images (`web`, `pyservice`, `db`). Beim ersten Mal **10-25 Minuten** —
   das Web-Image basiert seit dem §7.10-Pivot (Playwright-PDF-Renderer)
   auf `mcr.microsoft.com/playwright:vX.Y-jammy` und ist ~1.4 GB groß
   (vorher ~280 MB mit node-alpine). Mehr Disk + längerer initialer Pull.
4. Startet die Container. Web ist intern an `127.0.0.1:4000` gebunden.
5. Wendet alle Datenbank-Migrationen an.
6. Legt eine nginx-Konfiguration unter `/etc/nginx/sites-available/greenscout` an
   (nur wenn noch nicht vorhanden) — und aktiviert sie.
7. Holt ein TLS-Zertifikat von Let's Encrypt via certbot.
8. Macht einen Health-Check auf `https://greenscout.lumina-intelligence.ai/login`.

Bei Erfolg gibt das Skript am Ende `Deploy erfolgreich` aus und listet
die Container-Stati.

---

## 5. Ersten Admin anlegen

Beim ersten Deploy ist die Datenbank leer — es gibt noch keinen Login-User.
Lege ihn so an:

a) Trage zwei Zeilen in `.env.production` ein:

    SEED_ADMIN_EMAIL="deine-email@example.com"
    SEED_ADMIN_TEMP_PASSWORD="langes-temporäres-passwort"

b) Lade den Web-Container mit der neuen `.env` neu und führe den Seed aus:

    docker compose -p greenscout -f docker-compose.prod.yml up -d web
    docker exec greenscout-web node prisma/seed.cjs

c) Login auf https://greenscout.lumina-intelligence.ai/login mit diesen Daten.
   Du wirst sofort aufgefordert, das temporäre Passwort zu ändern.

d) Aus Sicherheitsgründen die beiden `SEED_ADMIN_*`-Zeilen aus `.env.production`
   wieder entfernen.

---

## 6. Updates (jedes weitere Deploy)

    cd /opt/greenscout
    git pull
    bash deploy.sh

Das Skript ist idempotent — Schritte die schon erledigt sind (Swap, nginx-Site,
TLS-Cert) werden übersprungen.

---

## Empfehlungen für später

- **DB-Backup vor jedem Update.** Z. B. mit:
  `docker compose -p greenscout -f docker-compose.prod.yml exec -T db pg_dump -U greenscout greenscout > backup-$(date +%F).sql`
  Anschließend per `scp` vom Server runterziehen.
- **Automatische Cert-Erneuerung.** certbot legt einen systemd-Timer an
  (`systemctl status certbot.timer`). Erneuerung läuft im Hintergrund.
- **Monitoring.** Z. B. uptimerobot.com gegen die Domain — dann bekommst du
  eine Mail wenn der Server down geht.

---

## Wenn was schiefgeht

- Skript bricht ab → die deutsche Meldung sagt was fehlt (Tool, .env-Variable, …).
- nginx-Test schlägt fehl → der Inhalt von `/etc/nginx/sites-available/greenscout`
  ist falsch. Vergleiche mit der Vorlage aus dem Skript.
- certbot scheitert → meistens DNS noch nicht propagiert. Warte 10 Minuten,
  führe `bash deploy.sh` nochmal aus.
- Container starten nicht → `docker compose -p greenscout logs --tail=100 web`
  (bzw. `pyservice` / `db`) zeigt die Fehler.
- **Alte VPS-Installationen mit hardcoded WebSocket-Headern in der nginx-Site**
  (vor diesem Fix angelegt) sollten den Header-Block einmalig entfernen — der
  hardcoded `Connection: upgrade` ist ein Anti-Pattern und kann multipart-Uploads
  zerstören. Auf dem Server ausführen:

      sudo sed -i '/proxy_set_header Upgrade/d; /proxy_set_header Connection "upgrade"/d' /etc/nginx/sites-available/greenscout && sudo nginx -t && sudo systemctl reload nginx

  Bei Neu-Installationen ist das nicht nötig — `deploy.sh` schreibt die Site
  bereits ohne diese Header.
- Im Zweifel: ein Kontext-Recap an Claude Code mit dem letzten Stück Skript-Output
  + dem Inhalt des fehlerhaften Logs.
