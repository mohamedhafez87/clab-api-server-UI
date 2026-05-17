#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALL_SH="${REPO_ROOT}/install.sh"
IMAGE="ghcr.io/srl-labs/clab-api-server/clab-api-server:latest"
DEFAULT_PORT="8090"

die() {
  echo "Error: $*" >&2
  exit 1
}

info() {
  echo "==> $*"
}

confirm() {
  local prompt="$1"
  local answer
  read -r -p "${prompt} [y/N] " answer
  [[ "$answer" =~ ^[Yy]$ ]]
}

need_command() {
  command -v "$1" >/dev/null 2>&1 || die "'$1' is required for this option"
}

run_systemd_install() {
  [[ -f "$INSTALL_SH" ]] || die "install.sh is missing: $INSTALL_SH"
  info "This installs the release binary, creates /etc/clab-api-server.env, and writes a systemd unit."
  info "The service is created but not enabled or started until you run systemctl."
  confirm "Run sudo install.sh install now?" || return 0
  sudo bash "$INSTALL_SH" install
}

run_pull_only() {
  [[ -f "$INSTALL_SH" ]] || die "install.sh is missing: $INSTALL_SH"
  info "This downloads only the release binary to /usr/local/bin/clab-api-server."
  confirm "Run sudo install.sh pull-only now?" || return 0
  sudo bash "$INSTALL_SH" pull-only
}

print_docker_command() {
  local port
  read -r -p "API port [${DEFAULT_PORT}]: " port
  port="${port:-$DEFAULT_PORT}"

  cat <<EOF

Docker deployment command:

docker run -d \\
  --name clab-api-server \\
  --privileged \\
  --network host \\
  --pid host \\
  -e API_PORT=${port} \\
  -e LOG_LEVEL=info \\
  -e JWT_SECRET='<replace-with-a-strong-random-value>' \\
  -v /var/run/docker.sock:/var/run/docker.sock \\
  -v /var/run/netns:/var/run/netns \\
  -v /var/lib/docker/containers:/var/lib/docker/containers \\
  -v /etc/passwd:/etc/passwd:ro \\
  -v /etc/shadow:/etc/shadow:ro \\
  -v /etc/group:/etc/group:ro \\
  -v /etc/gshadow:/etc/gshadow:ro \\
  -v /home:/home \\
  ${IMAGE}

After start:
  https://<server-ip>:${port}/app
  https://<server-ip>:${port}/swagger/index.html

EOF
}

run_docker() {
  need_command docker
  print_docker_command
  info "Docker mode requires host-level privileges and mounted host account files for PAM authentication."
  confirm "Run the Docker command now?" || return 0

  local jwt_secret port
  read -r -p "API port [${DEFAULT_PORT}]: " port
  port="${port:-$DEFAULT_PORT}"
  read -r -s -p "JWT secret: " jwt_secret
  echo
  [[ -n "$jwt_secret" ]] || die "JWT secret is required"

  docker run -d \
    --name clab-api-server \
    --privileged \
    --network host \
    --pid host \
    -e "API_PORT=${port}" \
    -e LOG_LEVEL=info \
    -e "JWT_SECRET=${jwt_secret}" \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v /var/run/netns:/var/run/netns \
    -v /var/lib/docker/containers:/var/lib/docker/containers \
    -v /etc/passwd:/etc/passwd:ro \
    -v /etc/shadow:/etc/shadow:ro \
    -v /etc/group:/etc/group:ro \
    -v /etc/gshadow:/etc/gshadow:ro \
    -v /home:/home \
    "$IMAGE"
}

print_containerlab_command() {
  local host port labs_dir jwt_secret
  read -r -p "Host [localhost]: " host
  read -r -p "Port [${DEFAULT_PORT}]: " port
  read -r -p "Labs directory [${HOME}/clab-api-labs]: " labs_dir
  host="${host:-localhost}"
  port="${port:-$DEFAULT_PORT}"
  labs_dir="${labs_dir:-${HOME}/clab-api-labs}"

  cat <<EOF

Containerlab tools command:

containerlab tools api-server start \\
  --host ${host} \\
  --port ${port} \\
  --labs-dir ${labs_dir} \\
  --jwt-secret '<replace-with-a-strong-random-value>' \\
  --tls-enable

EOF

  if confirm "Run containerlab tools api-server start now?"; then
    need_command containerlab
    read -r -s -p "JWT secret: " jwt_secret
    echo
    [[ -n "$jwt_secret" ]] || die "JWT secret is required"
    containerlab tools api-server start \
      --host "$host" \
      --port "$port" \
      --labs-dir "$labs_dir" \
      --jwt-secret "$jwt_secret" \
      --tls-enable
  fi
}

show_next_steps() {
  cat <<EOF

Post-install checks:
  1. Ensure users belong to API_USER_GROUP or SUPERUSER_GROUP.
  2. Replace default JWT_SECRET before production use.
  3. Open the UI at https://<server-ip>:8090/app.
  4. Check API docs at https://<server-ip>:8090/swagger/index.html.
  5. Check health with curl -k https://localhost:8090/health.

EOF
}

menu() {
  cat <<EOF
Containerlab API Server installation options

1) Install binary + systemd service
2) Pull release binary only
3) Print Docker deployment command
4) Run Docker deployment
5) Containerlab tools start command
6) Show post-install checks
q) Quit

EOF
}

main() {
  while true; do
    menu
    read -r -p "Select an option: " choice
    case "$choice" in
      1) run_systemd_install ;;
      2) run_pull_only ;;
      3) print_docker_command ;;
      4) run_docker ;;
      5) print_containerlab_command ;;
      6) show_next_steps ;;
      q|Q) exit 0 ;;
      *) echo "Unknown option: $choice" >&2 ;;
    esac
    echo
  done
}

main "$@"
