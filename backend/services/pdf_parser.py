"""
PDF parsing using pypdf — pure Python, lightweight, <1MB footprint.
Optimised for Vercel / serverless deployments.
"""
import io


def parse_pdf(file_bytes: bytes) -> str:
    """Extract text from a PDF bytes object as clean text."""
    # Primary: pypdf pure Python (ultra-lightweight <1MB for Vercel)
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

    # Secondary: PyMuPDF if available in local env
    try:
        import pymupdf
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

    return ""


def parse_text(raw: str) -> str:
    """Validate and clean pasted text input."""
    return raw.strip()
