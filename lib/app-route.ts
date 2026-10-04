import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const PAGE_FILES = ["page.tsx", "page.ts", "page.jsx", "page.js"];

/** True when an App Router page file is present for this URL, including route groups. */
export function appRouteExists(urlPath: string, appDir = join(process.cwd(), "app")) {
  const segments = urlPath.split("/").filter(Boolean);
  return hasPage(appDir, segments);
}

function hasPage(dir: string, segments: string[]): boolean {
  if (!existsSync(dir)) return false;
  if (segments.length === 0) {
    return PAGE_FILES.some((name) => existsSync(join(dir, name)));
  }
  const [head, ...rest] = segments;
  if (hasPage(join(dir, head), rest)) return true;
  let groups: string[] = [];
  try {
    groups = readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("(") && entry.name.endsWith(")"))
      .map((entry) => entry.name);
  } catch {
    return false;
  }
  return groups.some((name) => hasPage(join(dir, name), segments));
}
