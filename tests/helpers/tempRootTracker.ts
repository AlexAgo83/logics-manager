import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

export function createTempRootTracker(prefix: string): {
  makeRoot: () => string;
  cleanup: () => void;
  roots: string[];
} {
  const roots: string[] = [];

  return {
    roots,
    makeRoot: () => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
      roots.push(root);
      return root;
    },
    cleanup: () => {
      for (const root of roots.splice(0)) {
        fs.rmSync(root, { recursive: true, force: true });
      }
    }
  };
}
