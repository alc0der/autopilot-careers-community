import { LocalIndex } from "vectra";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdir } from "fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "..", "data");

let achievementsIndex: LocalIndex | null = null;
let bulletsIndex: LocalIndex | null = null;

async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

export async function getAchievementsIndex(): Promise<LocalIndex> {
  if (!achievementsIndex) {
    const path = join(DATA_DIR, "achievements");
    await ensureDir(path);
    achievementsIndex = new LocalIndex(path);
    if (!(await achievementsIndex.isIndexCreated())) {
      await achievementsIndex.createIndex();
    }
  }
  return achievementsIndex;
}

export async function getBulletsIndex(): Promise<LocalIndex> {
  if (!bulletsIndex) {
    const path = join(DATA_DIR, "bullets");
    await ensureDir(path);
    bulletsIndex = new LocalIndex(path);
    if (!(await bulletsIndex.isIndexCreated())) {
      await bulletsIndex.createIndex();
    }
  }
  return bulletsIndex;
}

export async function initIndexes(): Promise<void> {
  await getAchievementsIndex();
  await getBulletsIndex();
}
