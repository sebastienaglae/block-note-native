/**
 * Sets the version across all workspaces and rewrites the internal
 * `@sebastienaglae/bnn-*` dependency pins to match, so a published `bnn-react`
 * always depends on the exact `bnn-core` version released alongside it.
 *
 * Usage: node scripts/set-version.mjs v1.2.3   (the leading "v" is optional)
 */
import { readFileSync, writeFileSync } from "node:fs";

const raw = process.argv[2] ?? "";
const version = raw.replace(/^v/, "");
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error(`Invalid version: "${raw}". Expected semver like 1.2.3 or v1.2.3.`);
  process.exit(1);
}

const INTERNAL = ["@sebastienaglae/bnn-core", "@sebastienaglae/bnn-react"];
const files = [
  "packages/core/package.json",
  "packages/react/package.json",
  "packages/demo-shared/package.json",
];

for (const file of files) {
  const pkg = JSON.parse(readFileSync(file, "utf8"));
  pkg.version = version;
  for (const field of ["dependencies", "peerDependencies", "devDependencies"]) {
    if (!pkg[field]) continue;
    for (const name of INTERNAL) {
      if (pkg[field][name] && pkg[field][name] !== "*") pkg[field][name] = version;
    }
  }
  writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log(`set ${file} -> ${version}`);
}
