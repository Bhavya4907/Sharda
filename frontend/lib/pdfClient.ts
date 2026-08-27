/**
 * Pure JavaScript Client-Side PDF Text Extractor.
 * Extracts text inside browser without server-side binary dependencies or size limits.
 */
export async function extractTextFromPDFClient(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder("latin1");
    const rawString = decoder.decode(bytes);

    let extractedParts: string[] = [];

    // Match text blocks inside PDF streams (BT ... ET)
    const streamRegex = /BT[\s\S]*?ET/g;
    let match: RegExpExecArray | null;

    while ((match = streamRegex.exec(rawString)) !== null) {
      const block = match[0];
      // Extract strings inside (text) Tj or [(text)] TJ
      const stringRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*Tj/g;
      let strMatch: RegExpExecArray | null;
      while ((strMatch = stringRegex.exec(block)) !== null) {
        const unescaped = strMatch[1]
          .replace(/\\([()\\])/g, "$1")
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, "\r")
          .replace(/\\t/g, "\t");
        extractedParts.push(unescaped);
      }

      // TJ array format: [ (string1) -10 (string2) ] TJ
      const tjArrayRegex = /\[\s*((?:\([^()\\]*(?:\\.[^()\\]*)*\)\s*[-0-9\s]*)+)\]\s*TJ/g;
      let tjMatch: RegExpExecArray | null;
      while ((tjMatch = tjArrayRegex.exec(block)) !== null) {
        const inner = tjMatch[1];
        const innerStrRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)/g;
        let innerMatch: RegExpExecArray | null;
        while ((innerMatch = innerStrRegex.exec(inner)) !== null) {
          extractedParts.push(innerMatch[1].replace(/\\([()\\])/g, "$1"));
        }
      }
    }

    let result = extractedParts.join(" ").trim();

    // Fallback: search for readable printable words if stream regex was sparse
    if (!result || result.length < 50) {
      const cleanStr = rawString.replace(/[^\x20-\x7E\n\r]/g, " ");
      const words = cleanStr
        .split(/\s+/)
        .filter((w) => w.length >= 2 && /^[a-zA-Z0-9.,!?'"-]+$/.test(w));
      result = words.join(" ");
    }

    return result.trim();
  } catch {
    return "";
  }
}
