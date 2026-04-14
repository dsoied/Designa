import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API Proxy for Gemini Image Generation
  app.post("/api/generate-image", async (req, res) => {
    try {
      const { prompt, negativePrompt, aspectRatio, style } = req.body;
      
      if (!process.env.GEMINI_API_KEY) {
        console.error("Server: GEMINI_API_KEY não encontrada no ambiente.");
        return res.status(500).json({ error: "GEMINI_API_KEY não configurada no servidor. Se você estiver no Vercel, adicione esta variável de ambiente nas configurações do projeto." });
      }

      console.log(`Server: Iniciando geração de imagem com chave que começa com: ${process.env.GEMINI_API_KEY.substring(0, 6)}...`);
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      let styleDescription = style;
      if (style === 'none') {
        styleDescription = '';
      } else if (style === 'pixar') {
        styleDescription = 'Pixar 3D style';
      } else if (style === 'photorealistic') {
        styleDescription = 'photorealistic 8k';
      } else if (style === 'digital_art') {
        styleDescription = 'digital art';
      } else if (style === 'anime') {
        styleDescription = 'anime style';
      } else if (style === 'oil_painting') {
        styleDescription = 'oil painting';
      } else if (style === '3d_render') {
        styleDescription = '3D render';
      } else if (style === 'sketch') {
        styleDescription = 'pencil sketch';
      }

      const fullPrompt = style === 'none' 
        ? `${prompt}. ${negativePrompt ? `Avoid: ${negativePrompt}.` : ''} Aspect: ${aspectRatio}.`
        : `${styleDescription} of: ${prompt}. ${negativePrompt ? `Avoid: ${negativePrompt}.` : ''} Aspect: ${aspectRatio}.`;
      
      // @ts-ignore - Using the specific image generation pattern from the app
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: fullPrompt }],
        },
        config: {
          candidateCount: 1,
          imageConfig: {
            aspectRatio: aspectRatio as any,
          }
        }
      });
      
      res.json(response);
    } catch (error) {
      console.error("Server: Erro na geração de imagem:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Erro interno no servidor" });
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
