/**
 * Server-side File & In-Memory Storage Helper for Next.js Route Handlers.
 * Combines globalThis memory cache with /tmp/sharda_storage for instant access.
 */
import fs from "fs";
import path from "path";
import os from "os";

const STORAGE_DIR = path.join(os.tmpdir(), "sharda_storage");

// In-memory cache across function invocations within the same container
const memCache = (globalThis as any).__sharda_mem_cache__ || new Map<string, any>();
(globalThis as any).__sharda_mem_cache__ = memCache;

function ensureDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

export function saveSession(session: any): void {
  if (!session || !session.id) return;
  memCache.set(session.id, session);
  try {
    ensureDir();
    const filePath = path.join(STORAGE_DIR, `${session.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(session, null, 2), "utf-8");
  } catch {}
}

export function loadSession(sessionId: string): any | null {
  if (memCache.has(sessionId)) {
    return memCache.get(sessionId);
  }
  try {
    ensureDir();
    const filePath = path.join(STORAGE_DIR, `${sessionId}.json`);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(content);
      memCache.set(sessionId, data);
      return data;
    }
  } catch {}
  return null;
}
