import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { Paths } from "@contracts/constants";
import { generateSessionId, cleanupExpiredFiles, generateStoredName } from "./lib/session";
import { getDb } from "./queries/connection";
import { files } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  getTempPath,
  finalizeUpload,
  getFileStream,
  getFileStats,
  deleteFile,
  cleanupTemp,
} from "./lib/storage";

const app = new Hono<{ Bindings: HttpBindings }>();

// Anonymous session middleware
app.use("*", async (c, next) => {
  let anonSid = getCookie(c, "anon_sid");
  if (!anonSid) {
    anonSid = generateSessionId();
    setCookie(c, "anon_sid", anonSid, {
      httpOnly: true,
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
      sameSite: "Lax",
      secure: env.isProduction,
    });
  }
  await next();
});

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

// OAuth callback — only register if auth is configured
if (env.appId && env.appSecret && env.authUrl) {
  const { createOAuthCallbackHandler } = await import("./oauth/auth");
  app.get(Paths.oauthCallback, createOAuthCallbackHandler());
}

// Upload init - create upload session
app.post("/api/upload/init", async (c) => {
  try {
    const body = await c.req.json();
    const { originalName, size, mimeType, duration } = body;
    
    if (!originalName || !size) {
      return c.json({ error: "Missing required fields" }, 400);
    }
    
    const uploadId = generateSessionId();
    
    return c.json({
      uploadId,
      maxChunkSize: 5 * 1024 * 1024, // 5MB per chunk
      accepted: true,
    });
  } catch {
    return c.json({ error: "Invalid request" }, 400);
  }
});

// Upload chunk - accept binary data
app.post("/api/upload/chunk/:uploadId", bodyLimit({ maxSize: 6 * 1024 * 1024 }), async (c) => {
  const uploadId = c.req.param("uploadId");
  const chunkIndex = parseInt(c.req.header("x-chunk-index") || "0");
  const totalChunks = parseInt(c.req.header("x-total-chunks") || "1");
  
  try {
    const arrayBuffer = await c.req.arrayBuffer();
    const fs = await import("node:fs");
    const tempPath = getTempPath(uploadId);
    const buffer = Buffer.from(arrayBuffer);
    fs.appendFileSync(tempPath, buffer);
    
    return c.json({
      uploadId,
      chunkIndex,
      received: true,
      progress: Math.round(((chunkIndex + 1) / totalChunks) * 100),
    });
  } catch (e) {
    return c.json({ error: "Failed to process chunk", detail: String(e) }, 500);
  }
});

// Upload finalize - combine chunks and save to DB
app.post("/api/upload/finalize/:uploadId", async (c) => {
  const uploadId = c.req.param("uploadId");
  
  try {
    const body = await c.req.json();
    const { originalName, size, mimeType, duration } = body;
    
    if (!originalName || !mimeType) {
      return c.json({ error: "Missing metadata" }, 400);
    }
    
    const storedName = generateStoredName(originalName);
    const fs = await import("node:fs");
    const tempPath = getTempPath(uploadId);
    
    // Check if temp file exists
    if (!fs.existsSync(tempPath)) {
      return c.json({ error: "Upload not found" }, 404);
    }
    
    // Move temp file to final location
    finalizeUpload(uploadId, storedName);
    
    // Get user/session info
    const db = getDb();
    const cookieHeader = c.req.header("cookie") || "";
    const sessionMatch = cookieHeader.match(/anon_sid=([^;]+)/);
    const sessionId = sessionMatch ? decodeURIComponent(sessionMatch[1]) : null;
    
    // Check if user is authenticated
    let userId: number | null = null;
    try {
      const { authenticateRequest } = await import("./oauth/auth");
      const user = await authenticateRequest(c.req.raw.headers);
      if (user) userId = user.id;
    } catch {
      // anonymous
    }
    
    // Calculate expiration
    let expiresAt: Date | null = null;
    if (duration && duration !== "forever") {
      const hours = parseInt(duration);
      if (!isNaN(hours) && hours > 0) {
        expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
      }
    }
    
    // Insert to database
    const [fileRecord] = await db.insert(files).values({
      userId,
      sessionId,
      originalName,
      storedName,
      mimeType,
      size: parseInt(size) || 0,
      expiresAt,
    });
    
    return c.json({
      success: true,
      file: {
        id: Number(fileRecord.insertId),
        storedName,
        originalName,
        url: `/storage/${storedName}`,
      },
    });
  } catch (e) {
    cleanupTemp(uploadId);
    return c.json({ error: "Failed to finalize upload", detail: String(e) }, 500);
  }
});

// Serve file by stored name - shared handler
const serveFile = async (c: any, name: string) => {
  try {
    // Cleanup expired first
    await cleanupExpiredFiles();
    
    const db = getDb();
    const result = await db
      .select()
      .from(files)
      .where(eq(files.storedName, name))
      .limit(1);
    
    if (!result.length) {
      return c.json({ error: "File not found or expired" }, 404);
    }
    
    const file = result[0];
    
    // Check expiration
    if (file.expiresAt && new Date(file.expiresAt) < new Date()) {
      await db.delete(files).where(eq(files.id, file.id));
      deleteFile(file.storedName);
      return c.json({ error: "File expired" }, 404);
    }
    
    const stream = getFileStream(file.storedName);
    if (!stream) {
      return c.json({ error: "File data not found" }, 404);
    }
    
    const stats = getFileStats(file.storedName);
    c.header("Content-Type", file.mimeType);
    c.header("Content-Length", String(stats?.size || 0));
    c.header("Content-Disposition", `attachment; filename="${file.originalName}"`);
    
    return new Response(stream as any, { status: 200 });
  } catch (e) {
    return c.json({ error: "Failed to serve file" }, 500);
  }
};

// Routes for file serving
app.get("/f/:name", async (c) => serveFile(c, c.req.param("name")));
app.get("/storage/:name", async (c) => serveFile(c, c.req.param("name")));

// tRPC handler
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});

app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
