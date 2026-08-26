"""
PDF parsing using pymupdf4llm — produces clean Markdown optimised for LLMs.
Falls back to raw text extraction if the library fails.
"""
import io
import pymupdf4llm
import pymupdf


def parse_pdf(file_bytes: bytes) -> str:
    """Extract text from a PDF bytes object as clean Markdown."""
    try:
        doc = pymupdf.open(stream=file_bytes, filetype="pdf")
        md_text = pymupdf4llm.to_markdown(doc)
        doc.close()
        return md_text.strip()
    except Exception:
        # fallback: raw text
        doc = pymupdf.open(stream=file_bytes, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text.strip()


def parse_text(raw: str) -> str:
    """Validate and clean pasted text input."""
    return raw.strip()
