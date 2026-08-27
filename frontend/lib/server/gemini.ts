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

export function safeJsonParse<T>(raw: string): T {
  let str = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();

  // Extract outermost json structure
  const firstBrace = str.indexOf("{");
  const firstBracket = str.indexOf("[");
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    const lastBrace = str.lastIndexOf("}");
    if (lastBrace !== -1) str = str.slice(firstBrace, lastBrace + 1);
  } else if (firstBracket !== -1) {
    const lastBracket = str.lastIndexOf("]");
    if (lastBracket !== -1) str = str.slice(firstBracket, lastBracket + 1);
  }

  // Attempt 1: Direct JSON.parse
  try {
    return JSON.parse(str) as T;
  } catch {}

  // Attempt 2: Walk string and fix unescaped control chars and invalid backslash escapes (like \alpha, \frac)
  let inString = false;
  let sanitized = "";

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const prev = i > 0 ? str[i - 1] : "";

    if (char === '"' && prev !== "\\") {
      inString = !inString;
      sanitized += char;
      continue;
    }

    if (inString) {
      if (char === "\\") {
        const nextChar = i + 1 < str.length ? str[i + 1] : "";
        const isHexEscape = nextChar === "u" && /^[0-9a-fA-F]{4}/.test(str.slice(i + 2, i + 6));
        const isValidJsonEscape = ['"', "\\", "/", "b", "f", "n", "r", "t"].includes(nextChar) || isHexEscape;

        if (!isValidJsonEscape) {
          // Double the backslash so \alpha or \frac becomes \\alpha or \\frac (valid JSON)
          sanitized += "\\\\";
          continue;
        }
      }

      if (char === "\n") {
        sanitized += "\\n";
        continue;
      }
      if (char === "\r") {
        sanitized += "\\r";
        continue;
      }
      if (char === "\t") {
        sanitized += "\\t";
        continue;
      }
      if (char.charCodeAt(0) < 32) {
        sanitized += " ";
        continue;
      }
    }

    sanitized += char;
  }

  try {
    return JSON.parse(sanitized) as T;
  } catch {}

  // Attempt 3: Strip non-printable ASCII characters
  const stripped = sanitized.replace(/[\x00-\x1F\x7F-\x9F]/g, " ");
  return JSON.parse(stripped) as T;
}

export async function generateJson<T>(
  prompt: string,
  systemInstruction: string = ""
): Promise<T> {
  const raw = await callGeminiRest(prompt, systemInstruction, true);
  return safeJsonParse<T>(raw);
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
