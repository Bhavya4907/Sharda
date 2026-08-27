"""
PDF parsing using pymupdf4llm / PyMuPDF with pypdf fallback.
Optimised for both local and serverless cloud environments.
"""
import io
import pymupdf
import pymupdf4llm


def parse_pdf(file_bytes: bytes) -> str:
    """Extract text from a PDF bytes object as clean Markdown or text."""
    # Attempt 1: pymupdf4llm markdown extraction
    try:
        doc = pymupdf.open(stream=file_bytes, filetype="pdf")
        md_text = pymupdf4llm.to_markdown(doc)
        doc.close()
        if md_text and md_text.strip():
            return md_text.strip()
    except Exception:
        pass

    # Attempt 2: PyMuPDF standard text extraction
    try:
        doc = pymupdf.open(stream=file_bytes, filetype="pdf")
        text = ""
        for page in doc:
            page_text = page.get_text("text") or ""
            text += page_text + "\n\n"
        doc.close()
        if text and text.strip():
            return text.strip()
    except Exception:
        pass

    # Attempt 3: pypdf pure Python fallback
    try:
        import pypdf
        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        text = ""
        for page in reader.pages:
            t = page.extract_text()
            if t:
                text += t + "\n\n"
        if text and text.strip():
            return text.strip()
    except Exception:
        pass

    return ""


def parse_text(raw: str) -> str:
    """Validate and clean pasted text input."""
    return raw.strip()
