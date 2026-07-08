import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { join } from "node:path";

const buildDir = ".next-build";
const nextBin = process.platform === "win32" ? "next.cmd" : "next";

rmSync(join(process.cwd(), buildDir), { recursive: true, force: true });

const result = spawnSync(nextBin, ["build"], {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    NEXT_DIST_DIR: buildDir
  }
});

process.exit(result.status ?? 1);
