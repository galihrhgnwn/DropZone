import { authRouter } from "./auth-router";
import { fileRouter } from "./file-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  file: fileRouter,
});

export type AppRouter = typeof appRouter;
