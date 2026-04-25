import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

let aiClient: GoogleGenAI | null = null;

export const getGeminiClient = () => {
  if (!aiClient) {
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured in environment variables.");
    }
    aiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }
  return aiClient;
};

/**
 * Generates an image based on a prompt using Gemini.
 */
export const generateImage = async (
  prompt: string, 
  aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" = "1:1",
  model: string = "gemini-2.5-flash-image",
  quality: "512px" | "1K" | "2K" | "4K" = "1K"
) => {
  const client = getGeminiClient();
  
  try {
    const isNanoBanana = model.includes("image");
    
    if (isNanoBanana) {
      const config: any = {
        imageConfig: {
          aspectRatio,
        }
      };

      // imageSize is only for Pro and Flash Image models (not 2.5 flash image usually, but let's check skill)
      // Skill says gemini-3.1-flash-image-preview and gemini-3-pro-image-preview support it.
      if (model.includes("3") || model.includes("pro")) {
        config.imageConfig.imageSize = quality;
      }

      const response = await client.models.generateContent({
        model,
        contents: [{ parts: [{ text: prompt }] }],
        config
      });

      if (!response.candidates?.[0]?.content?.parts) {
        throw new Error("No candidates returned from Gemini image generation.");
      }

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64Data = part.inlineData.data;
          return `data:${part.inlineData.mimeType};base64,${base64Data}`;
        }
      }
    } else if (model.includes("imagen")) {
      // Imagen models use generateImages
      const response = await client.models.generateImages({
        model,
        prompt,
        config: {
          numberOfImages: 1,
          aspectRatio,
          // outputMimeType: 'image/jpeg',
        },
      });

      if (response.generatedImages?.[0]?.image?.imageBytes) {
        const base64Data = response.generatedImages[0].image.imageBytes;
        return `data:image/png;base64,${base64Data}`;
      }
    }

    throw new Error("No image data found in Gemini response.");
  } catch (error) {
    console.error("GeminiService: Erro ao gerar imagem:", error);
    throw error;
  }
};

/**
 * Refines a base prompt into 3 professional options.
 * Prioritizes Pollinations as requested by the user, with Gemini as a secondary fallback.
 */
export const refinePromptOptions = async (prompt: string): Promise<string[]> => {
  // Strategy: Try Pollinations first as requested by the user to avoid Vercel/Gemini API issues.
  try {
    const systemPrompt = "You are a prompt engineer. Refine the user input into 3 professional, detailed image generation prompts in English. Return ONLY a JSON array of 3 strings. Each string should be a full prompt. Do not include markdown formatting or extra text.";
    const userPrompt = `Refine this draft prompt for image generation: "${prompt}"`;
    
    const response = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        jsonMode: true,
        seed: Math.floor(Math.random() * 1000)
      })
    });

    if (response.ok) {
      const text = await response.text();
      // Handle potential extra text from LLM
      const jsonMatch = text.match(/\[.*\]/s);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }
  } catch (err) {
    console.warn("GeminiService: Falha no Pollinations, tentando Gemini...", err);
  }

  // Secondary Fallback to Gemini
  try {
    const client = getGeminiClient();
    const response = await client.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analise este rascunho de prompt para geração de imagens: "${prompt}". 
      Crie TRÊS versões profissionais, detalhadas e distintas em INGLÊS. 
      Responda APENAS um array JSON contendo as 3 strings.`,
    });

    const text = response.text?.trim() || "";
    const jsonMatch = text.match(/\[.*\]/s);
    if (jsonMatch) {
       return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error("GeminiService: Erro ao refinar prompt:", error);
  }

  return [prompt, prompt, prompt];
};

/**
 * Legado para manter compatibilidade se necessário, mas prefira refinePromptOptions.
 */
export const refinePrompt = async (prompt: string) => {
  const options = await refinePromptOptions(prompt);
  return options[0];
};
