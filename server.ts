import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to get buffer from base64 or URL
async function getImageBuffer(input: string): Promise<Buffer> {
  if (input.startsWith('http')) {
    const response = await fetch(input);
    if (!response.ok) throw new Error(`Falha ao baixar imagem da URL: ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
  
  const base64Data = input.replace(/^data:image\/\w+;base64,/, "");
  return Buffer.from(base64Data, 'base64');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });


  // iLoveIMG API Proxy
  app.post("/api/remove-background", async (req, res) => {
    try {
      const { image, engine = 'iloveimg' } = req.body; // base64 image or URL
      
      if (!image) {
        return res.status(400).json({ error: "Nenhuma imagem fornecida." });
      }

      const buffer = await getImageBuffer(image);

      if (engine === 'iloveimg') {
        const publicKey = req.body.publicKey || process.env.ILOVE_API_PUBLIC_KEY;
        const secretKey = req.body.secretKey || process.env.ILOVE_API_SECRET_KEY;

        if (!publicKey || !secretKey) {
          return res.status(500).json({ error: "Configuração do iLoveIMG incompleta no servidor." });
        }

        console.log("Server: Removendo fundo com iLoveIMG...");

        // 1. Auth
        const authRes = await fetch('https://api.iloveimg.com/v1/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ public_key: publicKey, secret_key: secretKey })
        });
        if (!authRes.ok) throw new Error("Falha na autenticação iLoveIMG");
        const { token } = await authRes.json() as any;

        // 2. Start
        const startRes = await fetch('https://api.iloveimg.com/v1/start/removebackground', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!startRes.ok) throw new Error("Falha ao iniciar tarefa iLoveIMG");
        const { server, task } = await startRes.json() as any;

        // 3. Upload
        const uploadFormData = new FormData();
        uploadFormData.append('task', task);
        uploadFormData.append('file', new Blob([buffer], { type: 'image/png' }), 'image.png');

        const uploadRes = await fetch(`https://${server}/v1/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: uploadFormData
        });
        if (!uploadRes.ok) throw new Error("Falha no upload iLoveIMG");
        const { server_filename } = await uploadRes.json() as any;

        // 4. Process
        const processRes = await fetch(`https://${server}/v1/process`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            task,
            tool: 'removebackground',
            files: [{ server_filename, filename: 'image.png' }]
          })
        });
        if (!processRes.ok) throw new Error("Falha no processamento iLoveIMG");

        // 5. Download
        const downloadRes = await fetch(`https://${server}/v1/download/${task}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!downloadRes.ok) throw new Error("Falha no download iLoveIMG");

        const resultBuffer = await downloadRes.arrayBuffer();
        const resultBase64 = Buffer.from(resultBuffer).toString('base64');
        return res.json({ image: `data:image/png;base64,${resultBase64}` });
      }

      res.status(400).json({ error: "Engine de remoção de fundo inválida." });
    } catch (error) {
      console.error("Server: Erro no remove-background proxy:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Erro ao remover fundo" });
    }
  });


  // DynaPictures Proxy
  app.post("/api/dynapictures/generate", async (req, res) => {
    try {
      const { apiKey, designId, params } = req.body;
      if (!apiKey) return res.status(400).json({ error: "Missing API Key" });
      if (!designId) return res.status(400).json({ error: "Missing Design ID" });

      console.log(`Server: Gerando imagem com DynaPictures (Design: ${designId})...`);

      const response = await fetch(`https://api.dynapictures.com/v1/design/${designId}/generate`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({ params })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.errorMessage || err.message || `DynaPictures Error: ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
       console.error("Server: Erro no DynaPictures:", error);
       res.status(500).json({ error: error instanceof Error ? error.message : "Erro no DynaPictures" });
    }
  });

  app.get("/api/dynapictures/designs", async (req, res) => {
    try {
      const { apiKey } = req.query;
      if (!apiKey) return res.status(400).json({ error: "Missing API Key" });

      const response = await fetch("https://api.dynapictures.com/v1/design", {
        headers: { "Authorization": `Bearer ${apiKey}` }
      });

      if (!response.ok) throw new Error(`DynaPictures Error: ${response.status}`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar designs do DynaPictures" });
    }
  });

  // Pexels Proxy
  app.get("/api/pexels/search", async (req, res) => {
    try {
      const { apiKey, query, page = 1, per_page = 20, type = 'photos' } = req.query;
      if (!apiKey) return res.status(400).json({ error: "Missing API Key" });
      if (!query) return res.status(400).json({ error: "Missing query" });

      const endpoint = type === 'videos' ? 'videos/search' : 'v1/search';
      console.log(`Server: Buscando ${type} no Pexels: "${query}"...`);

      const response = await fetch(`https://api.pexels.com/${endpoint}?query=${encodeURIComponent(query as string)}&page=${page}&per_page=${per_page}`, {
        headers: { "Authorization": apiKey as string }
      });

      if (!response.ok) {
        throw new Error(`Pexels Error: ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Server: Erro no Pexels:", error);
      res.status(500).json({ error: "Erro ao buscar imagens no Pexels" });
    }
  });

  // PayPal Order Capture Proxy
  app.post("/api/paypal/capture-order", async (req, res) => {
    try {
      const { orderID } = req.body;
      const clientId = process.env.VITE_PAYPAL_CLIENT_ID;
      const clientSecret = process.env.PAYPAL_SECRET;

      if (!clientId || !clientSecret) {
        return res.status(500).json({ error: "Configuração do PayPal incompleta no servidor." });
      }

      // 1. Get Access Token
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
      const tokenResponse = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
        method: "POST",
        body: "grant_type=client_credentials",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      const { access_token } = await tokenResponse.json() as any;

      // 2. Capture Order
      const captureResponse = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderID}/capture`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`,
        },
      });

      const data = await captureResponse.json() as any;
      
      if (data.status === "COMPLETED") {
        res.json({ status: "COMPLETED", order: data });
      } else {
        res.status(400).json({ error: "Pagamento não concluído", details: data });
      }
    } catch (error) {
      console.error("Server: Erro ao capturar pedido PayPal:", error);
      res.status(500).json({ error: "Erro ao processar pagamento no servidor." });
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
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
