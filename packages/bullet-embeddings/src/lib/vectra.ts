import { LocalIndex } from "vectra";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdir, rename, stat } from "fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.BULLET_DATA_DIR ?? join(__dirname, "..", "..", "data");

const achievementsCache = new Map<string, LocalIndex>();
const bulletsCache = new Map<string, LocalIndex>();

async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function openIndex(path: string): Promise<LocalIndex> {
  await ensureDir(path);
  const idx = new LocalIndex(path);
  if (!(await idx.isIndexCreated())) {
    await idx.createIndex();
  }
  return idx;
}

export async function getAchievementsIndex(userId: string): Promise<LocalIndex> {
  let idx = achievementsCache.get(userId);
  if (!idx) {
    idx = await openIndex(join(DATA_DIR, userId, "achievements"));
    achievementsCache.set(userId, idx);
  }
  return idx;
}

export async function getBulletsIndex(userId: string): Promise<LocalIndex> {
  let idx = bulletsCache.get(userId);
  if (!idx) {
    idx = await openIndex(join(DATA_DIR, userId, "bullets"));
    bulletsCache.set(userId, idx);
  }
  return idx;
}

export async function initIndexes(userId: string): Promise<void> {
  await getAchievementsIndex(userId);
  await getBulletsIndex(userId);
}

// Pre-ADR-0005 layouts kept indexes at <DATA_DIR>/{achievements,bullets}.
// Move them once under <DATA_DIR>/<seedUserId>/ so the per-user lookup finds them.
export async function migrateLegacyLayout(seedUserId: string): Promise<void> {
  const legacyAch = join(DATA_DIR, "achievements");
  const legacyBul = join(DATA_DIR, "bullets");
  const userDir = join(DATA_DIR, seedUserId);
  const legacyAchExists = await pathExists(join(legacyAch, "index.json"));
  const legacyBulExists = await pathExists(join(legacyBul, "index.json"));
  if (!legacyAchExists && !legacyBulExists) return;

  await ensureDir(userDir);
  const userAchExists = await pathExists(join(userDir, "achievements", "index.json"));
  const userBulExists = await pathExists(join(userDir, "bullets", "index.json"));

  if (legacyAchExists && !userAchExists) {
    await rename(legacyAch, join(userDir, "achievements"));
  }
  if (legacyBulExists && !userBulExists) {
    await rename(legacyBul, join(userDir, "bullets"));
  }
}
