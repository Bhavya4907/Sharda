/**
 * Server-side Gemini REST API Helper for Next.js Route Handlers.
 * Zero external dependencies — uses standard fetch API.
 */
const GEMINI_MODEL = "gemini-1.5-flash";

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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

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
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
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
}

export async function generateJson<T>(
  prompt: string,
  systemInstruction: string = ""
): Promise<T> {
  const raw = await callGeminiRest(prompt, systemInstruction, true);
  const clean = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(clean) as T;
}
