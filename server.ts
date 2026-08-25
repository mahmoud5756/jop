import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createApp } from './server/app.ts';

// Local development / traditional Node hosting entry point.
// For Vercel serverless deployment, see api/index.ts instead — that file
// imports the same createApp() and does NOT call app.listen().
async function startServer() {
  const app = createApp();
  const PORT = Number(process.env.PORT) || 3000;

  // =========================================================================
  // FRONTEND STATIC SERVING & SPA FALLBACK (local/dev/traditional hosting only)
  // =========================================================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BOB WICH HR Supabase Data Access Layer running on port ${PORT}`);
  });
}

startServer();
