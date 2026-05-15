import { getDb } from "../queries/connection";
import { files } from "@db/schema";
import { eq, and, or, lt, sql } from "drizzle-orm";

export function generateSessionId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateStoredName(originalName: string): string {
  const timestamp = Date.now();
  const lastDotIndex = originalName.lastIndexOf(".");
  if (lastDotIndex === -1) {
    return `${originalName}_${timestamp}`;
  }
  const name = originalName.slice(0, lastDotIndex);
  const ext = originalName.slice(lastDotIndex);
  return `${name}_${timestamp}${ext}`;
}

export async function cleanupExpiredFiles() {
  const db = getDb();
  const now = new Date();
  const expired = await db
    .select()
    .from(files)
    .where(
      and(
        or(eq(files.expiresAt, sql`NULL`), lt(files.expiresAt, now)),
        sql`${files.expiresAt} IS NOT NULL AND ${files.expiresAt} < ${now}`
      )
    );
  
  // Note: In production, we'd delete actual files from disk here too
  await db
    .delete(files)
    .where(
      and(
        sql`${files.expiresAt} IS NOT NULL`,
        lt(files.expiresAt, now)
      )
    );
  
  return expired.length;
}
