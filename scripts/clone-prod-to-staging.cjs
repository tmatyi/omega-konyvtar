/**
 * clone-prod-to-staging.cjs
 *
 * Clones production Firebase RTDB data to the staging/ prefix.
 * Exports and imports key-by-key to handle large datasets.
 *
 * Usage:
 *   node scripts/clone-prod-to-staging.cjs
 *   or: npm run clone:staging
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const PROJECT = "kpregisztracio-6fb9d";
const TMPDIR = `/tmp/fb-clone-${Date.now()}`;

// All known top-level keys we want to clone
const KEYS = [
  "books",
  "buttonCounts",
  "cash",
  "extraTransactions",
  "gifts",
  "loans",
  "pendingGuests",
  "preRegisteredUsers",
  "sales",
  "shifts",
  "users",
];

function run(cmd, timeoutMs = 120000) {
  const result = execSync(cmd, {
    encoding: "utf8",
    timeout: timeoutMs,
    maxBuffer: 50 * 1024 * 1024, // 50MB
  });
  const lines = result.split("\n");
  const clean = lines
    .filter((l) => !l.startsWith("(node:"))
    .join("\n");
  return clean.trim();
}

async function main() {
  fs.mkdirSync(TMPDIR, { recursive: true });

  console.log("📦 Exporting production data key by key...");

  let totalKeys = 0;
  let totalSize = 0;

  for (const key of KEYS) {
    try {
      process.stdout.write(`  ${key}... `);
      const raw = run(`firebase database:get /${key} --project ${PROJECT}`, 30000);

      if (raw === "null" || raw === "" || raw === "{}") {
        console.log("empty, skipping");
        continue;
      }

      const jsonStart = raw.indexOf("{");
      const clean = jsonStart >= 0 ? raw.slice(jsonStart) : raw;

      let data;
      try {
        data = JSON.parse(clean);
      } catch {
        const arrStart = raw.indexOf("[");
        if (arrStart >= 0) {
          data = JSON.parse(raw.slice(arrStart));
        } else {
          console.log(`parse error, skipping (raw: ${raw.slice(0, 60)}...)`);
          continue;
        }
      }

      const file = path.join(TMPDIR, `${key}.json`);
      fs.writeFileSync(file, JSON.stringify(data));
      const sz = fs.statSync(file).size;
      totalSize += sz;
      console.log(`${(sz / 1024).toFixed(0)} KB`);
      totalKeys++;
    } catch (e) {
      console.log(`failed: ${e.message.slice(0, 80)}`);
    }
  }

  console.log(`\nExported ${totalKeys} keys (${(totalSize / 1024 / 1024).toFixed(1)} MB total)`);

  // Step 2: Upload to staging/
  console.log("\n📤 Uploading to staging/...\n");

  let uploaded = 0;
  for (const key of KEYS) {
    const file = path.join(TMPDIR, `${key}.json`);
    if (!fs.existsSync(file)) continue;

    const sz = (fs.statSync(file).size / 1024).toFixed(0);
    process.stdout.write(`  ${key} (${sz} KB)... `);

    try {
      run(`firebase database:set /staging/${key} --project ${PROJECT} --force "${file}"`, 120000);
      console.log("✅");
      uploaded++;
    } catch (e) {
      console.log(`❌ ${e.message?.slice(0, 60) || "failed"}`);
    }
  }

  // Cleanup
  fs.rmSync(TMPDIR, { recursive: true, force: true });
  console.log(`\n✅ Done! ${uploaded} keys uploaded to staging.`);
  console.log("   Staging: https://omega-konyvtar-staging.web.app");
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  try { fs.rmSync(TMPDIR, { recursive: true, force: true }); } catch {}
  process.exit(1);
});
