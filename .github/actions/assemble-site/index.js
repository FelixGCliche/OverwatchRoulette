// Needs GH_TOKEN in the environment (for `gh`) and a checkout of main in the cwd.
const { execFileSync } = require("node:child_process");
const { mkdirSync } = require("node:fs");

const out = process.env.OUTPUT_DIR || "_site";
const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { maxBuffer: 1 << 30, ...opts });

// Export a commit into dest, leaving out repo-only files.
function exportTree(dest, ref) {
  mkdirSync(dest, { recursive: true });
  const tar = run("git", [
    "archive", ref, "--", ".", ":!.github", ":!.claude", ":!docs", ":!*.md",
  ]);
  run("tar", ["-x", "-C", dest], { input: tar });
}

exportTree(out, "HEAD");

// Dev (branch may not exist yet)
try {
  run("git", ["fetch", "--depth=1", "origin", "dev"], { stdio: "pipe" });
  exportTree(`${out}/dev`, "FETCH_HEAD");
} catch {
  console.log("No dev branch; skipping /dev/");
}

// Previews: open same-repo PRs targeting dev
const prs = JSON.parse(
  run("gh", [
    "pr", "list", "--base", "dev", "--state", "open",
    "--json", "number,isCrossRepository",
  ]).toString(),
);
for (const { number, isCrossRepository } of prs) {
  if (isCrossRepository) continue;
  run("git", ["fetch", "--depth=1", "origin", `refs/pull/${number}/head`]);
  exportTree(`${out}/pr-${number}`, "FETCH_HEAD");
}
