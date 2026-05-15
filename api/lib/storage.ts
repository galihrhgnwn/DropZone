import fs from "node:fs";
import path from "node:path";
import { env } from "./env";

const UPLOADS_DIR = path.join(process.cwd(), "storage");
const TEMP_DIR = path.join(process.cwd(), "storage", "temp");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

export function getUploadsDir(): string {
  return UPLOADS_DIR;
}

export function getTempDir(): string {
  return TEMP_DIR;
}

export function getTempPath(uploadId: string): string {
  return path.join(TEMP_DIR, uploadId);
}

export function getFinalPath(storedName: string): string {
  return path.join(UPLOADS_DIR, storedName);
}

export function appendChunk(uploadId: string, chunkData: ArrayBuffer): void {
  const tempPath = getTempPath(uploadId);
  const buffer = Buffer.from(chunkData);
  fs.appendFileSync(tempPath, buffer);
}

export function finalizeUpload(uploadId: string, storedName: string): void {
  const tempPath = getTempPath(uploadId);
  const finalPath = getFinalPath(storedName);
  
  if (fs.existsSync(tempPath)) {
    fs.renameSync(tempPath, finalPath);
  }
}

export function readFile(storedName: string): Buffer | null {
  const finalPath = getFinalPath(storedName);
  if (fs.existsSync(finalPath)) {
    return fs.readFileSync(finalPath);
  }
  return null;
}

export function getFileStream(storedName: string): fs.ReadStream | null {
  const finalPath = getFinalPath(storedName);
  if (fs.existsSync(finalPath)) {
    return fs.createReadStream(finalPath);
  }
  return null;
}

export function getFileStats(storedName: string): fs.Stats | null {
  const finalPath = getFinalPath(storedName);
  if (fs.existsSync(finalPath)) {
    return fs.statSync(finalPath);
  }
  return null;
}

export function deleteFile(storedName: string): void {
  const finalPath = getFinalPath(storedName);
  if (fs.existsSync(finalPath)) {
    fs.unlinkSync(finalPath);
  }
}

export function cleanupTemp(uploadId: string): void {
  const tempPath = getTempPath(uploadId);
  if (fs.existsSync(tempPath)) {
    fs.unlinkSync(tempPath);
  }
}
