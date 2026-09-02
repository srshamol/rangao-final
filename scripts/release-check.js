#!/usr/bin/env node

/**
 * Rangao Release Pre-Flight Quality Gate Runner
 * Executes all essential checks before any production build or deployment:
 * 1. Environment Variable Sanitized Validation
 * 2. ESLint Code Standard Verification
 * 3. TypeScript Static Type Safety Gate
 * 4. Vitest Unit & Integration Test Suite
 * 5. End-to-End Smoke Test
 */

import { spawn } from "child_process";

const steps = [
  { name: "Environment Pre-Flight", cmd: "node", args: ["scripts/validate-env.js"] },
  { name: "ESLint Code Standard", cmd: "npx", args: ["eslint", "."] },
  { name: "TypeScript Static Type Check", cmd: "npx", args: ["tsc", "-p", "tsconfig.app.json", "--noEmit"] },
  { name: "Automated Test Suite", cmd: "npx", args: ["vitest", "run"] },
  { name: "End-to-End Smoke Test", cmd: "node", args: ["scripts/smoke-test.js"] },
];

console.log(`\n======================================================`);
console.log(`🛡️  Rangao Master Release Quality Gate Runner`);
console.log(`🏁 Steps to execute: ${steps.length}`);
console.log(`======================================================\n`);

async function runStep(step, index) {
  return new Promise((resolve, reject) => {
    console.log(`\n👉 [${index + 1}/${steps.length}] Executing: ${step.name}...`);
    console.log(`   Command: ${step.cmd} ${step.args.join(" ")}`);

    const child = spawn(step.cmd, step.args, {
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("close", (code) => {
      if (code === 0) {
        console.log(`   ✅ ${step.name} passed successfully.`);
        resolve();
      } else {
        reject(new Error(`${step.name} failed with exit code ${code}`));
      }
    });

    child.on("error", (err) => {
      reject(err);
    });
  });
}

async function runAll() {
  const startTime = Date.now();

  try {
    for (let i = 0; i < steps.length; i++) {
      await runStep(steps[i], i);
    }

    const durationSec = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n======================================================`);
    console.log(`🎉 RELEASE QUALITY GATE PASSED in ${durationSec}s!`);
    console.log(`🚀 All lint, type, test, env, and smoke gates are green.`);
    console.log(`======================================================\n`);
    process.exitCode = 0;
  } catch (err) {
    console.error(`\n❌ RELEASE GATE FAILED: ${err.message}`);
    console.log(`======================================================\n`);
    process.exitCode = 1;
  }
}

runAll();
