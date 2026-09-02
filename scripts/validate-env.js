#!/usr/bin/env node

/**
 * Environment Variable Validator for Rangao Releases
 * Validates presence, formatting, and security boundaries of environment variables.
 * CRITICAL DIRECTIVE: NEVER prints secret values, API keys, tokens, or passwords to console.
 */

import fs from "fs";
import path from "path";

// Load .env or .env.local if present locally
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, "utf-8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

const localEnv = {
  ...parseEnvFile(path.resolve(process.cwd(), ".env")),
  ...parseEnvFile(path.resolve(process.cwd(), ".env.local")),
  ...process.env,
};

const REQUIRED_CLIENT_VARS = [
  {
    name: "VITE_SUPABASE_URL",
    aliases: ["NEXT_PUBLIC_SUPABASE_URL"],
    validate: (val) => val.startsWith("http"),
    hint: "Must start with https://",
  },
  {
    name: "VITE_SUPABASE_PUBLISHABLE_KEY",
    aliases: ["VITE_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
    validate: (val) => val.length > 20,
    hint: "Length must be > 20 characters",
  },
];

const OPTIONAL_INTEGRATION_VARS = [
  { name: "SUPABASE_SERVICE_ROLE_KEY", secret: true, hint: "Serverless admin database operations" },
  { name: "META_CAPI_ACCESS_TOKEN", secret: true, hint: "Meta Conversions API server-side reporting" },
  { name: "META_PIXEL_ID", aliases: ["VITE_META_PIXEL_ID", "NEXT_PUBLIC_META_PIXEL_ID"], secret: false, hint: "Meta browser pixel ID" },
  { name: "UDDOKTAPAY_API_KEY", secret: true, hint: "UddoktaPay authoritative payments gateway" },
  { name: "TELEGRAM_BOT_TOKEN", secret: true, hint: "Telegram internal alert dispatch" },
  { name: "STEADFAST_API_KEY", secret: true, hint: "Steadfast courier booking dispatch" },
];

console.log(`\n======================================================`);
console.log(`🔒 Rangao Environment Variable Pre-Flight Validator`);
console.log(`ℹ️  Strict Mode: Secrets and tokens are always redacted`);
console.log(`======================================================\n`);

let errors = 0;
let warnings = 0;

function resolveVar(config) {
  if (localEnv[config.name] && localEnv[config.name].trim() !== "") {
    return { name: config.name, val: localEnv[config.name] };
  }
  if (config.aliases) {
    for (const a of config.aliases) {
      if (localEnv[a] && localEnv[a].trim() !== "") {
        return { name: a, val: localEnv[a] };
      }
    }
  }
  return null;
}

console.log("Checking Required Client-Side Variables:");
for (const item of REQUIRED_CLIENT_VARS) {
  const resolved = resolveVar(item);
  if (!resolved) {
    console.error(`  ❌ MISSING: ${item.name} (${item.hint})`);
    errors++;
  } else {
    const isValid = item.validate ? item.validate(resolved.val) : true;
    if (isValid) {
      console.log(`  ✅ ${resolved.name}: [CONFIGURED] (${item.hint})`);
    } else {
      console.error(`  ❌ INVALID FORMAT: ${resolved.name} - ${item.hint}`);
      errors++;
    }
  }
}

console.log("\nChecking Server-Side & Third-Party Integration Secrets:");
for (const item of OPTIONAL_INTEGRATION_VARS) {
  const resolved = resolveVar(item);
  if (!resolved) {
    console.log(`  ⚠️  NOT SET: ${item.name} - ${item.hint} (Will fallback to DB store_settings)`);
    warnings++;
  } else {
    console.log(`  ✅ ${resolved.name}: [PRESENT & REDACTED] (Length: ${resolved.val.length} chars)`);
  }
}

console.log(`\n======================================================`);
console.log(`📊 Summary: ${errors} Errors, ${warnings} Warnings`);
if (errors === 0) {
  console.log(`✅ All required environment variables are valid and ready.`);
  console.log(`======================================================\n`);
  process.exitCode = 0;
} else {
  console.error(`❌ Build gate failed due to missing required environment variables.`);
  console.log(`======================================================\n`);
  process.exitCode = 1;
}
