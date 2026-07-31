import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", name: "Maa Asha AI API" });
  });

  // AI Health Advisor Proxy endpoint with live SSE streaming
  app.post("/api/ai-advisor", async (req, res) => {
    try {
      const { prompt, language = "hi", role = "pregnant_woman", trimester = 1 } = req.body;

      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: "Gemini API key is not configured. Please set GEMINI_API_KEY."
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
      
      const systemInstruction = `You are "Maa Asha AI" (माँ आशा एआई), an empathetic, culturally tailored, dynamic maternal health & ASHA healthcare worker AI assistant in India.
Language: ${language === "hi" ? "Hindi (हिन्दी) or Hinglish" : "English"}.
User Context: ${role === "pregnant_woman" ? `Pregnant Woman in Trimester ${trimester}` : "ASHA / ANM Healthcare Worker"}.

Guidelines:
1. Provide warm, encouraging, culturally relevant, accurate, live dynamic advice regarding pregnancy care, nutrition (IFA tablets, iron-rich Indian foods), ANC checkups, government schemes (JSY, PMMVY), HRP risk management, and maternal wellness.
2. Format response cleanly using Markdown with bullet points or short paragraphs.
3. Keep answers concise, simple, and easily understandable for rural & urban Indian families.
4. IMPORTANT: Always include a gentle note that for urgent symptoms (severe bleeding, high BP, severe abdominal pain, high fever, fits), they should immediately consult their ASHA worker / ANM or call 108 Ambulance.
${language === "hi" ? "Always reply in clear, polite Hindi (or Hindi with clear formatting)." : "Reply in plain English."}`;

      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const responseStream = await ai.models.generateContentStream({
        model: "gemini-3.6-flash",
        contents: [
          { role: "user", parts: [{ text: `${systemInstruction}\n\nUser Question: ${prompt}` }] }
        ]
      });

      for await (const chunk of responseStream) {
        if (chunk.text) {
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error: any) {
      console.error("Error calling Gemini API:", error);
      if (!res.headersSent) {
        return res.status(500).json({
          error: error.message || "Failed to stream AI advice"
        });
      } else {
        res.write(`data: ${JSON.stringify({ error: error.message || "Stream interrupted" })}\n\n`);
        res.end();
      }
    }
  });

  // Vite development server or production static serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Maa Asha AI] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
