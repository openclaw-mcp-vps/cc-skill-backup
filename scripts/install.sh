#!/usr/bin/env bash
set -euo pipefail

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install Node 18+ and rerun." >&2
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "${NODE_MAJOR}" -lt 18 ]; then
  echo "Node 18+ is required. Current version: $(node -v)" >&2
  exit 1
fi

INSTALL_DIR="${HOME}/.local/bin"
TARGET="${INSTALL_DIR}/cc-backup"
DASHBOARD_URL="${CCSB_DASHBOARD_URL:-https://cc-skill-backup.vercel.app}"
CLI_URL="${CCSB_CLI_URL:-${DASHBOARD_URL}/cli/cc-backup.js}"

mkdir -p "${INSTALL_DIR}"

echo "Downloading cc-backup CLI from ${CLI_URL}"
curl -fsSL "${CLI_URL}" -o "${TARGET}"
chmod +x "${TARGET}"

if ! echo ":${PATH}:" | grep -q ":${INSTALL_DIR}:"; then
  echo "Add ${INSTALL_DIR} to your PATH to run cc-backup from any shell:" >&2
  echo "  export PATH=\"${INSTALL_DIR}:\$PATH\"" >&2
fi

echo "Install complete."
echo "Next step: cc-backup login --dashboard ${DASHBOARD_URL}"
