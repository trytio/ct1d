import { createOpenAI } from "@ai-sdk/openai";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// ---------------------------------------------------------------------------
// OpenAI Provider — supports both API key and Codex OAuth token
// ---------------------------------------------------------------------------
//
// Priority order:
//   1. OPENAI_API_KEY env var (standard API key from platform.openai.com)
//   2. CODEX_AUTH_TOKEN env var (OAuth access_token from Codex CLI)
//   3. Auto-detect from ~/.codex/auth.json (Codex CLI's stored OAuth token)
//
// This allows CT1D to authenticate with the same OpenAI account used for Codex.
// ---------------------------------------------------------------------------

function resolveOpenAIAuth(): { apiKey?: string; headers?: Record<string, string> } {
  // 1. Standard API key — preferred for server deployments
  if (process.env.OPENAI_API_KEY) {
    return { apiKey: process.env.OPENAI_API_KEY };
  }

  // 2. Codex OAuth token from env
  if (process.env.CODEX_AUTH_TOKEN) {
    return {
      apiKey: process.env.CODEX_AUTH_TOKEN,
      headers: { Authorization: `Bearer ${process.env.CODEX_AUTH_TOKEN}` },
    };
  }

  // 3. Auto-detect from Codex CLI auth.json
  const codexAuthPath = join(homedir(), ".codex", "auth.json");
  if (existsSync(codexAuthPath)) {
    try {
      const raw = readFileSync(codexAuthPath, "utf-8");
      const auth = JSON.parse(raw) as {
        access_token?: string;
        token?: string;
      };
      const token = auth.access_token ?? auth.token;
      if (token) {
        console.log("[CT1D] Using Codex OAuth token from ~/.codex/auth.json");
        return {
          apiKey: token,
          headers: { Authorization: `Bearer ${token}` },
        };
      }
    } catch {
      // Ignore parse errors — fall through
    }
  }

  // No auth found — let the SDK throw a clear error on first call
  return {};
}

const auth = resolveOpenAIAuth();

export const openai = createOpenAI({
  apiKey: auth.apiKey,
  ...(auth.headers ? { headers: auth.headers } : {}),
});
