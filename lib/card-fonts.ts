import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type CardFont = {
  name: string;
  data: Buffer;
  weight: 400 | 600;
  style: "normal";
};

let cached: Promise<CardFont[]> | null = null;

export function loadCardFonts() {
  if (!cached) {
    cached = load().catch((err) => {
      cached = null;
      throw err;
    });
  }
  return cached;
}

async function load(): Promise<CardFont[]> {
  const dir = join(process.cwd(), "assets/fonts");
  const [fraunces, fredoka, inter, interSemi] = await Promise.all([
    readFile(join(dir, "Fraunces-600.woff")),
    readFile(join(dir, "Fredoka-600.woff")),
    readFile(join(dir, "Inter-400.woff")),
    readFile(join(dir, "Inter-600.woff")),
  ]);
  return [
    { name: "Fraunces", data: fraunces, weight: 600, style: "normal" },
    { name: "Fredoka", data: fredoka, weight: 600, style: "normal" },
    { name: "Inter", data: inter, weight: 400, style: "normal" },
    { name: "Inter", data: interSemi, weight: 600, style: "normal" },
  ];
}
