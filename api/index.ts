import { handle } from "hono/vercel";
import { app } from "../server/index.ts";

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
