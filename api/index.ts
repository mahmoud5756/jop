import { createApp } from '../server/app';

// Vercel serverless entry point.
// Vercel's Node runtime accepts an Express app directly as the default
// export — it will call it as (req, res) for every request matching the
// rewrite rule in vercel.json (all /api/* paths).
const app = createApp();

export default app;
