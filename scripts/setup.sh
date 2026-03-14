#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# CT1D Setup — Login with OpenAI Codex & configure the AI agent
# ═══════════════════════════════════════════════════════════════════════════
#
# This script:
#   1. Installs Codex CLI if missing
#   2. Authenticates with your OpenAI account (same as Codex)
#   3. Extracts the OAuth token and wires it into CT1D
#   4. Generates the AUTONOMOUS_SECRET for the research agent cron
#   5. Verifies the connection by making a test API call
#
# Usage:
#   chmod +x scripts/setup.sh
#   ./scripts/setup.sh
#
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Colors ────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m' # No Color

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$PROJECT_DIR/.env.local"
CODEX_AUTH="$HOME/.codex/auth.json"

# ── Banner ────────────────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}${BOLD}  ╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}${BOLD}  ║                                                          ║${NC}"
echo -e "${BLUE}${BOLD}  ║   ${CYAN}CT1D${BLUE} — AI-Powered Type 1 Diabetes Research Explorer   ║${NC}"
echo -e "${BLUE}${BOLD}  ║                                                          ║${NC}"
echo -e "${BLUE}${BOLD}  ║   ${DIM}\"I have Type 1 Diabetes.                              ${BLUE}║${NC}"
echo -e "${BLUE}${BOLD}  ║   ${DIM} I am researching my own cure.\"                        ${BLUE}║${NC}"
echo -e "${BLUE}${BOLD}  ║                                                          ║${NC}"
echo -e "${BLUE}${BOLD}  ╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# ── Helper functions ──────────────────────────────────────────────────────
info()    { echo -e "${BLUE}[info]${NC}  $1"; }
success() { echo -e "${GREEN}[  ok]${NC}  $1"; }
warn()    { echo -e "${YELLOW}[warn]${NC}  $1"; }
fail()    { echo -e "${RED}[fail]${NC}  $1"; exit 1; }
step()    { echo -e "\n${BOLD}── Step $1: $2 ──${NC}"; }

# ═══════════════════════════════════════════════════════════════════════════
# Step 1: Check / Install Codex CLI
# ═══════════════════════════════════════════════════════════════════════════
step "1/5" "Codex CLI"

if command -v codex &>/dev/null; then
  CODEX_VERSION=$(codex --version 2>/dev/null || echo "unknown")
  success "Codex CLI found: $CODEX_VERSION"
else
  warn "Codex CLI not found. Installing..."
  echo ""

  # Try npm global install first, fall back to npx
  if command -v npm &>/dev/null; then
    info "Installing @openai/codex globally..."
    npm install -g @openai/codex 2>/dev/null || {
      warn "Global install failed (permissions?). Will use npx instead."
    }
  fi

  if ! command -v codex &>/dev/null; then
    info "Will use 'npx @openai/codex' for login."
    # Create a shim
    CODEX_CMD="npx -y @openai/codex"
  fi
fi

# Resolve the codex command
if command -v codex &>/dev/null; then
  CODEX_CMD="codex"
else
  CODEX_CMD="npx -y @openai/codex"
fi

# ═══════════════════════════════════════════════════════════════════════════
# Step 2: Authenticate with OpenAI
# ═══════════════════════════════════════════════════════════════════════════
step "2/5" "OpenAI Authentication"

# Check if already authenticated
EXISTING_TOKEN=""
if [ -f "$CODEX_AUTH" ]; then
  EXISTING_TOKEN=$(python3 -c "
import json, sys
try:
    d = json.load(open('$CODEX_AUTH'))
    print(d.get('access_token', d.get('token', '')))
except: pass
" 2>/dev/null || true)
fi

if [ -n "$EXISTING_TOKEN" ]; then
  TOKEN_PREFIX="${EXISTING_TOKEN:0:12}..."
  success "Already authenticated with Codex (token: ${TOKEN_PREFIX})"
  echo ""
  echo -e "  ${DIM}To re-authenticate, run: ${CODEX_CMD} login${NC}"
  echo ""

  read -rp "  Use this existing token? [Y/n] " USE_EXISTING
  if [[ "${USE_EXISTING,,}" == "n" ]]; then
    EXISTING_TOKEN=""
  fi
fi

if [ -z "$EXISTING_TOKEN" ]; then
  info "Opening browser for OpenAI login..."
  echo ""
  echo -e "  ${CYAN}This will open your browser to sign in with your OpenAI account.${NC}"
  echo -e "  ${CYAN}Use the same account that has your Codex subscription.${NC}"
  echo ""

  $CODEX_CMD login 2>&1 || {
    echo ""
    warn "Codex login didn't complete or isn't available."
    echo ""
    echo -e "  ${YELLOW}Alternative: paste your OpenAI API key manually.${NC}"
    echo -e "  ${DIM}Get one at: https://platform.openai.com/api-keys${NC}"
    echo ""
    read -rsp "  OpenAI API Key (sk-...): " MANUAL_KEY
    echo ""

    if [ -z "$MANUAL_KEY" ]; then
      fail "No API key provided. Cannot continue."
    fi

    # Write directly to .env.local
    if [ -f "$ENV_FILE" ]; then
      # Replace existing OPENAI_API_KEY line
      sed -i.bak "s|^OPENAI_API_KEY=.*|OPENAI_API_KEY=$MANUAL_KEY|" "$ENV_FILE"
      rm -f "${ENV_FILE}.bak"
    else
      echo "OPENAI_API_KEY=$MANUAL_KEY" > "$ENV_FILE"
    fi

    success "API key saved to .env.local"
    EXISTING_TOKEN="__api_key__" # Flag to skip token extraction
  }

  # Re-read token after login
  if [ "$EXISTING_TOKEN" != "__api_key__" ] && [ -f "$CODEX_AUTH" ]; then
    EXISTING_TOKEN=$(python3 -c "
import json
d = json.load(open('$CODEX_AUTH'))
print(d.get('access_token', d.get('token', '')))
" 2>/dev/null || true)
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════
# Step 3: Configure .env.local with the token
# ═══════════════════════════════════════════════════════════════════════════
step "3/5" "Configure CT1D Environment"

if [ "$EXISTING_TOKEN" != "__api_key__" ] && [ -n "$EXISTING_TOKEN" ]; then
  # Using Codex OAuth token
  if [ -f "$ENV_FILE" ]; then
    # Update existing file
    if grep -q "^CODEX_AUTH_TOKEN=" "$ENV_FILE" 2>/dev/null; then
      sed -i.bak "s|^CODEX_AUTH_TOKEN=.*|CODEX_AUTH_TOKEN=$EXISTING_TOKEN|" "$ENV_FILE"
      rm -f "${ENV_FILE}.bak"
    else
      echo "CODEX_AUTH_TOKEN=$EXISTING_TOKEN" >> "$ENV_FILE"
    fi
    # Clear OPENAI_API_KEY if it's empty (Codex token takes precedence via the app logic)
    sed -i.bak "s|^OPENAI_API_KEY=$|OPENAI_API_KEY=|" "$ENV_FILE"
    rm -f "${ENV_FILE}.bak"
  else
    cat > "$ENV_FILE" <<ENVEOF
OPENAI_API_KEY=
CODEX_AUTH_TOKEN=$EXISTING_TOKEN
ENVEOF
  fi
  success "Codex OAuth token configured in .env.local"
  info "CT1D will auto-detect the token from ~/.codex/auth.json too"
fi

# ═══════════════════════════════════════════════════════════════════════════
# Step 4: Generate AUTONOMOUS_SECRET
# ═══════════════════════════════════════════════════════════════════════════
step "4/5" "Autonomous Agent Secret"

# Check if already set
if grep -q "^AUTONOMOUS_SECRET=.\+" "$ENV_FILE" 2>/dev/null; then
  success "AUTONOMOUS_SECRET already configured"
else
  # Generate a cryptographically random secret
  AUTO_SECRET=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))")

  if grep -q "^AUTONOMOUS_SECRET=" "$ENV_FILE" 2>/dev/null; then
    sed -i.bak "s|^AUTONOMOUS_SECRET=.*|AUTONOMOUS_SECRET=$AUTO_SECRET|" "$ENV_FILE"
    rm -f "${ENV_FILE}.bak"
  else
    echo "AUTONOMOUS_SECRET=$AUTO_SECRET" >> "$ENV_FILE"
  fi

  success "Generated AUTONOMOUS_SECRET (64 char hex)"
  info "This secret protects the autonomous research agent cron endpoints"
fi

# ═══════════════════════════════════════════════════════════════════════════
# Step 5: Verify the connection
# ═══════════════════════════════════════════════════════════════════════════
step "5/5" "Verify OpenAI Connection"

# Source the env file to get the vars
set -a
source "$ENV_FILE"
set +a

# Determine which token to use for the test
TEST_TOKEN="${OPENAI_API_KEY:-${CODEX_AUTH_TOKEN:-}}"

if [ -z "$TEST_TOKEN" ] && [ -f "$CODEX_AUTH" ]; then
  TEST_TOKEN=$(python3 -c "
import json
d = json.load(open('$CODEX_AUTH'))
print(d.get('access_token', d.get('token', '')))
" 2>/dev/null || true)
fi

if [ -z "$TEST_TOKEN" ]; then
  warn "No token available to verify. Skipping connection test."
else
  info "Testing OpenAI API connection..."

  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TEST_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "model": "gpt-4o",
      "messages": [{"role": "user", "content": "Say exactly: CT1D online"}],
      "max_tokens": 10
    }' \
    "https://api.openai.com/v1/chat/completions" 2>/dev/null || echo "000")

  if [ "$HTTP_CODE" = "200" ]; then
    success "OpenAI API connection verified (HTTP 200)"
  elif [ "$HTTP_CODE" = "401" ]; then
    warn "Authentication failed (HTTP 401). Token may be expired."
    echo -e "  ${DIM}Try running: ${CODEX_CMD} login${NC}"
  elif [ "$HTTP_CODE" = "429" ]; then
    success "OpenAI API reachable (rate limited — auth works, just throttled)"
  else
    warn "Unexpected response (HTTP $HTTP_CODE). Check your token."
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════
# Done
# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${GREEN}${BOLD}  ═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  CT1D is configured and ready.${NC}"
echo -e "${GREEN}${BOLD}  ═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}Start developing:${NC}"
echo -e "    ${BOLD}npm run dev${NC}"
echo ""
echo -e "  ${CYAN}The AI agent (DiaCure) is configured with:${NC}"
echo -e "    ${DIM}• Persona: An AI that has T1D and is researching its own cure${NC}"
echo -e "    ${DIM}• Knowledge: 15+ curated cure approaches (stem cells, immunotherapy, gene editing...)${NC}"
echo -e "    ${DIM}• Live data: PubMed + ClinicalTrials.gov real-time search${NC}"
echo -e "    ${DIM}• Autonomous: 30-min research cycles, hypothesis iteration, paper writing${NC}"
echo -e "    ${DIM}• Memory: Persistent hypotheses, evidence, sessions, and scientific papers${NC}"
echo ""
echo -e "  ${CYAN}For production (Carlos):${NC}"
echo -e "    ${DIM}carlos secret set openai_api_key \$OPENAI_API_KEY${NC}"
echo -e "    ${DIM}carlos secret set codex_auth_token \$CODEX_AUTH_TOKEN${NC}"
echo -e "    ${DIM}carlos secret set autonomous_secret \$AUTONOMOUS_SECRET${NC}"
echo -e "    ${DIM}carlos submit deploy/base/ct1d.yaml -a <server>${NC}"
echo ""
