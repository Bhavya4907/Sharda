/**
 * Server-side File Storage Helper for Next.js Route Handlers.
 * Uses system temp directory (/tmp/sharda_storage) for 100% serverless compatibility.
 */
import fs from "fs";
import path from "path";
import os from "os";

const STORAGE_DIR = path.join(os.tmpdir(), "sharda_storage");

function ensureDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

export function saveSession(session: any): void {
  ensureDir();
  const filePath = path.join(STORAGE_DIR, `${session.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(session, null, 2), "utf-8");
}

export function loadSession(sessionId: string): any | null {
  ensureDir();
  const filePath = path.join(STORAGE_DIR, `${sessionId}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}
