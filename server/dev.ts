import { serve } from "@hono/node-server";
import { app } from "./index.ts";

const PORT = Number(process.env.API_PORT ?? 8787);

serve({ fetch: app.fetch, port: PORT }, (info) => console.log(`architect api listening on http://localhost:${info.port}`));
