import express from "express";
import path from "path";
import { spawn } from "child_process";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Start FastAPI backend if needed
  const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
  const spawnBackend = process.env.SPAWN_BACKEND !== "false" && (BACKEND_URL.includes("localhost") || BACKEND_URL.includes("127.0.0.1"));

  if (spawnBackend) {
    const isWindows = process.platform === "win32";
    const pythonCmd = isWindows ? path.join("backend", "venv", "Scripts", "python.exe") : "python3";
    const pythonProcess = spawn(pythonCmd, ["-m", "uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]);
    
    pythonProcess.stdout.on('data', (data) => console.log(`FastAPI: ${data}`));
    pythonProcess.stderr.on('data', (data) => console.error(`FastAPI Error: ${data}`));
  }

  app.use(express.json());

  // Proxy API requests to FastAPI
  app.use("/api", async (req, res) => {
    try {
      const target = `${BACKEND_URL}${req.originalUrl}`;
      
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(req.headers)) {
        if (value && key.toLowerCase() !== 'host') {
          headers[key] = Array.isArray(value) ? value.join(', ') : value;
        }
      }

      // Ensure content-type is set for write requests
      if (req.method !== 'GET' && !headers['content-type']) {
        headers['content-type'] = 'application/json';
      }

      const fetchOptions: RequestInit = {
        method: req.method,
        headers: headers as HeadersInit,
      };

      if (req.method !== 'GET' && req.body) {
        fetchOptions.body = JSON.stringify(req.body);
      }

      const response = await fetch(target, fetchOptions);
      const contentType = response.headers.get("content-type") || "";

      res.status(response.status);
      
      if (contentType) {
        res.setHeader("content-type", contentType);
      }

      if (contentType.includes("application/json")) {
        const data = await response.json();
        res.json(data);
      } else {
        const arrayBuffer = await response.arrayBuffer();
        res.send(Buffer.from(arrayBuffer));
      }
    } catch (err) {
      console.error("Express proxy error:", err);
      res.status(500).json({ error: "Failed to connect to FastAPI backend." });
    }
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express bridge server running on http://localhost:${PORT}`);
  });
}

startServer();
