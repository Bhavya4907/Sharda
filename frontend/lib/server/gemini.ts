/**
 * Server-side Gemini REST API Helper for Next.js Route Handlers.
 * Zero external dependencies — uses standard fetch API with robust multi-model fallback.
 */
const CANDIDATE_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.7-flash",
];

export async function callGeminiRest(
  prompt: string,
  systemInstruction: string = "",
  jsonMode: boolean = false
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Please add GEMINI_API_KEY to your environment variables on Vercel."
    );
  }

  let lastError: Error | null = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const payload: any = {
        contents: [{ parts: [{ text: prompt }] }],
      };

      if (systemInstruction) {
        payload.systemInstruction = { parts: [{ text: systemInstruction }] };
      }

      const genConfig: any = { temperature: 0.3 };
      if (jsonMode) {
        genConfig.responseMimeType = "application/json";
      }

      payload.generationConfig = genConfig;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        lastError = new Error(`Gemini API error (${res.status}): ${errText}`);
        continue; // Try next candidate model
      }

      const data = await res.json();
      const candidates = data.candidates || [];
      if (candidates.length > 0) {
        const parts = candidates[0].content?.parts || [];
        if (parts.length > 0) {
          return parts[0].text.trim();
        }
      }
      return "";
    } catch (e: any) {
      lastError = e;
    }
  }

  throw lastError || new Error("Failed to generate content from all Gemini models.");
}

export async function generateJson<T>(
  prompt: string,
  systemInstruction: string = ""
): Promise<T> {
  const raw = await callGeminiRest(prompt, systemInstruction, true);
  const clean = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(clean) as T;
}

export async function extractTextFromPdfBase64(base64Data: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set.");
  }

  const cleanB64 = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
  const prompt = "Transcribe and extract all textual, conceptual, and lecture content from this PDF document into comprehensive, clean Markdown notes with proper headings, equations, and bullet points.";

  let lastError: Error | null = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: cleanB64,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        lastError = new Error(`Gemini PDF parse error (${res.status}): ${errText}`);
        continue;
      }

      const data = await res.json();
      const candidates = data.candidates || [];
      if (candidates.length > 0) {
        const parts = candidates[0].content?.parts || [];
        if (parts.length > 0) {
          const text = parts[0].text.trim();
          if (text.length > 10) return text;
        }
      }
    } catch (e: any) {
      lastError = e;
    }
  }

  throw lastError || new Error("Could not extract readable text from PDF.");
}
