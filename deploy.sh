#!/usr/bin/env bash
# =============================================================================
# GreenScout — Production deploy script (T-050a)
#
# Idempotenter Deploy-Lauf für den Hetzner-VPS unter
# greenscout.lumina-intelligence.ai. Reverse-Proxy: nginx + certbot.
#
# Per CLAUDE.md §8.10 wird dieses Skript NIEMALS vom Agenten ausgeführt —
# der Nutzer startet es manuell per SSH/PuTTY auf dem Server:
#
#     bash deploy.sh
#
# Erst-Lauf-Voraussetzungen siehe docs/deploy-anleitung.md.
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# Konfiguration
# -----------------------------------------------------------------------------
DOMAIN="greenscout.lumina-intelligence.ai"
PROJECT_NAME="greenscout"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"
SWAP_SIZE_GB=4
SWAP_FILE="/swapfile"
NGINX_SITE_PATH="/etc/nginx/sites-available/greenscout"
NGINX_SITE_LINK="/etc/nginx/sites-enabled/greenscout"
WEB_HEALTH_TIMEOUT_SECONDS=120

# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------
header() {
    echo ""
    echo "==============================================================="
    echo "== $*"
    echo "==============================================================="
}

err() {
    echo "FEHLER: $*" >&2
}

# -----------------------------------------------------------------------------
# Schritt 0: Pre-flight-Checks
# -----------------------------------------------------------------------------
header "Schritt 0/8: Vor-Prüfungen"

if [ "$(id -u)" -ne 0 ]; then
    err "Bitte als root ausführen — z. B. \`sudo bash deploy.sh\`."
    exit 1
fi

if [ "$(uname -s)" != "Linux" ]; then
    err "Dieses Skript läuft nur auf Linux-Servern, nicht in WSL/macOS/etc."
    exit 1
fi

# Aus dem Repo-Root starten — Anker-Dateien prüfen.
for anchor in "$COMPOSE_FILE" "package.json" "prisma/schema.prisma"; do
    if [ ! -f "$anchor" ]; then
        err "Skript muss aus dem Repo-Root laufen — die Datei '$anchor' fehlt im aktuellen Verzeichnis."
        err "Wechsele z. B. mit \`cd /opt/greenscout\` ins Repo-Verzeichnis und versuche es erneut."
        exit 1
    fi
done

if [ ! -f "$ENV_FILE" ]; then
    err ""
    err "Die Datei '$ENV_FILE' fehlt."
    err ""
    err "Erwartete Variablen (siehe .env.production.example):"
    err "  - DATABASE_URL              Prisma-Postgres-URL (postgresql://user:pass@db:5432/greenscout?schema=public)"
    err "  - POSTGRES_PASSWORD         Passwort des Postgres-Users (muss zur DATABASE_URL passen)"
    err "  - AUTH_SECRET               Auth.js v5 Session-Secret, openssl rand -base64 32"
    err "  - SETTINGS_ENCRYPTION_KEY   Verschlüsselungs-Key SMTP-Settings, openssl rand -base64 32"
    err "  - APP_URL                   Öffentliche App-Adresse (https://greenscout.lumina-intelligence.ai)"
    err "  - CERTBOT_EMAIL             (optional, nur beim ersten Cert-Lauf) — Let's-Encrypt-Mail"
    err ""
    err "Kopiere .env.production.example nach .env.production und trage die Werte ein."
    err "Niemals committen — .env.* ist via .gitignore ausgeschlossen."
    exit 1
fi

# Voraussetzungs-Tools (kein Auto-Install — wir verlangen klare Operator-Aktion).
need_tool() {
    local tool="$1"
    local hint="$2"
    if ! command -v "$tool" >/dev/null 2>&1; then
        err "Werkzeug '$tool' nicht gefunden. Bitte installieren: $hint"
        exit 1
    fi
}

need_tool docker "apt install -y docker.io"
need_tool nginx "apt install -y nginx"
need_tool certbot "apt install -y certbot python3-certbot-nginx"
need_tool git "apt install -y git"

# docker compose v2 als Plugin (NICHT das alte docker-compose-Binary).
if ! docker compose version >/dev/null 2>&1; then
    err "Docker-Compose-Plugin (v2) nicht installiert. Bitte: apt install -y docker-compose-plugin"
    err "Hinweis: das alte 'docker-compose'-Binary (v1) wird nicht unterstützt."
    exit 1
fi

echo "Voraussetzungen erfüllt."

# CERTBOT_EMAIL aus .env.production lesen (für Schritt 6).
# Subshell-Source verhindert Variablen-Leak in den Hauptkontext.
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"
if [ -z "$CERTBOT_EMAIL" ]; then
    CERTBOT_EMAIL="$(
        set -a
        # shellcheck disable=SC1090
        . "$ENV_FILE"
        set +a
        printf '%s' "${CERTBOT_EMAIL:-}"
    )"
fi

# -----------------------------------------------------------------------------
# Schritt 1: Swap-Datei
# -----------------------------------------------------------------------------
header "Schritt 1/8: Swap-Datei prüfen / anlegen"

if swapon --show 2>/dev/null | awk 'NR>1 {found=1} END {exit !found}'; then
    echo "Swap bereits aktiv:"
    swapon --show
elif [ -f "$SWAP_FILE" ]; then
    echo "Swap-Datei '$SWAP_FILE' existiert, aktiviere sie."
    swapon "$SWAP_FILE" || true
else
    echo "Lege ${SWAP_SIZE_GB} GB Swap-Datei unter $SWAP_FILE an…"
    fallocate -l "${SWAP_SIZE_GB}G" "$SWAP_FILE"
    chmod 600 "$SWAP_FILE"
    mkswap "$SWAP_FILE"
    swapon "$SWAP_FILE"
    echo "Swap aktiv:"
    swapon --show
fi

# fstab-Eintrag idempotent ergänzen.
if ! grep -qE '^/swapfile[[:space:]]+' /etc/fstab; then
    echo "/swapfile none swap sw 0 0" >> /etc/fstab
    echo "fstab-Eintrag für /swapfile ergänzt."
else
    echo "fstab-Eintrag für /swapfile bereits vorhanden."
fi

# -----------------------------------------------------------------------------
# Schritt 2: Docker-Images bauen
# -----------------------------------------------------------------------------
header "Schritt 2/8: Docker-Images bauen"

echo "Baue Images aus $COMPOSE_FILE — beim ersten Lauf 5-15 Minuten."
docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build

# -----------------------------------------------------------------------------
# Schritt 3: Container starten
# -----------------------------------------------------------------------------
header "Schritt 3/8: Container starten"

echo "Starte Container (Web auf 127.0.0.1:4000, API + DB nur intern)…"
docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

echo "Warte auf web-Container Health (max ${WEB_HEALTH_TIMEOUT_SECONDS}s)…"
elapsed=0
until docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" exec -T web wget -q --spider http://127.0.0.1:3000/login 2>/dev/null; do
    if [ "$elapsed" -ge "$WEB_HEALTH_TIMEOUT_SECONDS" ]; then
        err "Timeout: web-Container nicht erreichbar innerhalb von ${WEB_HEALTH_TIMEOUT_SECONDS}s."
        err "Logs der letzten 50 Zeilen:"
        docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" logs --tail=50 web || true
        docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" logs --tail=50 api || true
        docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" logs --tail=50 db || true
        exit 1
    fi
    sleep 2
    elapsed=$((elapsed + 2))
done
echo "web-Container erreichbar."

# -----------------------------------------------------------------------------
# Schritt 4: Prisma migrate deploy
# -----------------------------------------------------------------------------
header "Schritt 4/8: Datenbankmigrationen anwenden"

docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" exec -T web npx prisma migrate deploy
echo "Migrationen angewendet."

# -----------------------------------------------------------------------------
# Schritt 5: nginx-Konfiguration
# -----------------------------------------------------------------------------
header "Schritt 5/8: nginx-Konfiguration"

if [ -e "$NGINX_SITE_PATH" ]; then
    echo "nginx-Site '$NGINX_SITE_PATH' existiert bereits — überspringe Erstellung."
else
    echo "Schreibe nginx-Site nach $NGINX_SITE_PATH…"
    cat > "$NGINX_SITE_PATH" <<NGINX_CONF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    # SPEC §6.3 — HSTS am Reverse-Proxy. certbot --nginx erhält diese
    # Direktive beim Hinzufügen des HTTPS-Blocks.
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # Upload-Limit: MAX_UPLOAD_MB (10) + Headroom für Multipart-Overhead.
    client_max_body_size 12M;

    # Proxy-Timeout: PDF-Generierung kann mehrere Sekunden brauchen.
    proxy_read_timeout 75s;
    proxy_connect_timeout 10s;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX_CONF
fi

# Symlink idempotent setzen.
if [ ! -e "$NGINX_SITE_LINK" ]; then
    ln -s "$NGINX_SITE_PATH" "$NGINX_SITE_LINK"
    echo "Symlink '$NGINX_SITE_LINK' angelegt."
elif [ -L "$NGINX_SITE_LINK" ] && [ "$(readlink -f "$NGINX_SITE_LINK")" = "$(readlink -f "$NGINX_SITE_PATH")" ]; then
    echo "Symlink '$NGINX_SITE_LINK' bereits vorhanden."
else
    err "'$NGINX_SITE_LINK' existiert, zeigt aber NICHT auf '$NGINX_SITE_PATH'."
    err "Bitte manuell prüfen — Skript wird hier nicht eingreifen."
    exit 1
fi

# nginx-Test ZWINGEND vor reload.
echo "Prüfe nginx-Konfiguration (nginx -t)…"
if ! nginx -t; then
    err "nginx -t ist fehlgeschlagen — nichts wird reloaded."
    exit 1
fi

echo "Konfiguration ok — lade nginx neu."
if command -v systemctl >/dev/null 2>&1; then
    systemctl reload nginx
else
    nginx -s reload
fi

# -----------------------------------------------------------------------------
# Schritt 6: TLS-Zertifikat via certbot
# -----------------------------------------------------------------------------
header "Schritt 6/8: TLS-Zertifikat via certbot"

CERT_PATH="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
if [ -f "$CERT_PATH" ]; then
    echo "TLS-Zertifikat existiert bereits ($CERT_PATH) — überspringe certbot."
else
    if [ -z "$CERTBOT_EMAIL" ]; then
        err "CERTBOT_EMAIL ist weder in $ENV_FILE gesetzt noch als ENV-Variable übergeben."
        err "Setze die Variable und versuche es erneut, z. B.:"
        err "  CERTBOT_EMAIL=du@example.com bash deploy.sh"
        err "Oder ergänze CERTBOT_EMAIL=… in $ENV_FILE."
        exit 1
    fi
    echo "Hole TLS-Zertifikat für $DOMAIN (certbot --nginx)…"
    certbot --nginx --non-interactive --agree-tos \
        --email "$CERTBOT_EMAIL" --redirect \
        -d "$DOMAIN"
fi

# -----------------------------------------------------------------------------
# Schritt 7: Health-Check
# -----------------------------------------------------------------------------
header "Schritt 7/8: Health-Check"

if curl -fsS -o /dev/null -I "https://${DOMAIN}/login" --max-time 15; then
    echo "Health-Check ok: https://${DOMAIN}/login antwortet."
else
    echo "WARNUNG: Health-Check über HTTPS fehlgeschlagen — DNS könnte noch propagieren"
    echo "oder das Cert ist gerade erst frisch. Prüfe per Browser in ein paar Minuten."
fi

# -----------------------------------------------------------------------------
# Schritt 8: Abschluss
# -----------------------------------------------------------------------------
header "Schritt 8/8: Abschluss"

echo ""
echo "Deploy erfolgreich."
echo ""
echo "Web:           https://${DOMAIN}"
echo ""
echo "Container-Status:"
docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" ps
echo ""
echo "Folge-Deploys:  cd /opt/greenscout && git pull && bash deploy.sh"
echo ""
