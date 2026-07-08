import { spawnSync } from "node:child_process";

const nextBin = process.platform === "win32" ? "next.cmd" : "next";

const result = spawnSync(nextBin, ["start"], {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    NEXT_DIST_DIR: ".next-build"
  }
});

process.exit(result.status ?? 1);
