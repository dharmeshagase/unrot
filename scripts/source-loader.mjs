import { readFile } from "node:fs/promises";

export async function loadSourceModule(filePath) {
  const source = await readFile(filePath, "utf8");
  const sourceUrl = `data:text/javascript;base64,${Buffer.from(source, "utf8").toString("base64")}`;
  return import(sourceUrl);
}
