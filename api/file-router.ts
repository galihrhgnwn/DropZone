import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { files } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";
import { cleanupExpiredFiles } from "./lib/session";

export const fileRouter = createRouter({
  list: publicQuery.query(async (opts) => {
    const db = getDb();
    const user = opts.ctx.user;
    
    // Get session from cookie
    const cookieHeader = opts.ctx.req.headers.get("cookie") || "";
    const sessionMatch = cookieHeader.match(/anon_sid=([^;]+)/);
    const sessionId = sessionMatch ? decodeURIComponent(sessionMatch[1]) : null;
    
    // Cleanup expired files first
    await cleanupExpiredFiles();
    
    const conditions = [];
    
    if (user) {
      conditions.push(eq(files.userId, user.id));
    } else if (sessionId) {
      conditions.push(eq(files.sessionId, sessionId));
    } else {
      return [];
    }
    
    const result = await db
      .select()
      .from(files)
      .where(and(...conditions))
      .orderBy(desc(files.createdAt));
    
    // Filter expired manually
    const now = new Date();
    return result.filter(f => {
      if (!f.expiresAt) return true;
      return new Date(f.expiresAt) > now;
    });
  }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async (opts) => {
      const db = getDb();
      const user = opts.ctx.user;
      const cookieHeader = opts.ctx.req.headers.get("cookie") || "";
      const sessionMatch = cookieHeader.match(/anon_sid=([^;]+)/);
      const sessionId = sessionMatch ? decodeURIComponent(sessionMatch[1]) : null;
      
      const existing = await db
        .select()
        .from(files)
        .where(eq(files.id, opts.input.id))
        .limit(1);
      
      if (!existing.length) return { success: false, error: "File not found" };
      
      const file = existing[0];
      
      // Check ownership
      const isOwner = user 
        ? file.userId === user.id 
        : (sessionId && file.sessionId === sessionId);
      
      if (!isOwner) {
        return { success: false, error: "Not authorized" };
      }
      
      await db.delete(files).where(eq(files.id, opts.input.id));
      return { success: true };
    }),
});
