#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
LOG_DIR="$ROOT_DIR/.run-logs"
mkdir -p "$LOG_DIR"

info() { echo "[INFO] $*"; }
warn() { echo "[WARN] $*"; }
err() { echo "[ERROR] $*"; }

start_mysql() {
  info "Starting SQL server service..."
  if systemctl is-active --quiet mariadb; then
    info "MariaDB already running."
    return 0
  fi
  if systemctl is-active --quiet mysql; then
    info "MySQL already running."
    return 0
  fi

  if systemctl start mariadb 2>/dev/null; then
    info "Started mariadb service."
    return 0
  fi

  if systemctl start mysql 2>/dev/null; then
    info "Started mysql service."
    return 0
  fi

  warn "Could not auto-start mariadb/mysql via systemctl. Start it manually if needed."
}

backend_cmd() {
  cd "$BACKEND_DIR"
  if [[ -d ".venv" ]]; then
    # shellcheck disable=SC1091
    source .venv/bin/activate
  else
    warn "No backend .venv found. Using system python."
  fi
  exec python app.py
}

frontend_cmd() {
  cd "$FRONTEND_DIR"
  if [[ ! -d "node_modules" ]]; then
    info "Installing frontend dependencies..."
    npm install
  fi
  exec npm run dev
}

start_in_gnome_terminal() {
  info "Launching backend and frontend in gnome-terminal tabs..."
  gnome-terminal \
    --tab --title="Maxfit Backend" -- bash -lc "$(declare -f warn); $(declare -f backend_cmd); backend_cmd" \
    --tab --title="Maxfit Frontend" -- bash -lc "$(declare -f info); $(declare -f frontend_cmd); frontend_cmd"
}

start_in_background() {
  info "Launching backend/frontend in background with logs."
  (
    backend_cmd
  ) >"$LOG_DIR/backend.log" 2>&1 &
  BACKEND_PID=$!

  (
    frontend_cmd
  ) >"$LOG_DIR/frontend.log" 2>&1 &
  FRONTEND_PID=$!

  echo "$BACKEND_PID" > "$LOG_DIR/backend.pid"
  echo "$FRONTEND_PID" > "$LOG_DIR/frontend.pid"

  info "Backend PID: $BACKEND_PID (log: $LOG_DIR/backend.log)"
  info "Frontend PID: $FRONTEND_PID (log: $LOG_DIR/frontend.log)"
  info "Stop with: kill \$(cat $LOG_DIR/backend.pid) \$(cat $LOG_DIR/frontend.pid)"
}

main() {
  start_mysql

  if command -v gnome-terminal >/dev/null 2>&1; then
    start_in_gnome_terminal
  else
    warn "gnome-terminal not found. Falling back to background mode."
    start_in_background
  fi

  info "App startup triggered."
  info "Frontend: http://localhost:3000"
  info "Backend:  http://localhost:5000"
}

main "$@"
