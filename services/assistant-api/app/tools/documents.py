"""
Document Parser and Text Extractor for Ramya AI.
Supports PDF, DOCX, PPTX, TXT, CSV, and Markdown.
"""
import io
import os
import csv
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
import pypdf
import docx
from pptx import Presentation

logger = logging.getLogger("ramya.tools.documents")

class DocumentParser:
    def parse_file(self, file_path: str) -> Dict[str, Any]:
        """Extracts text and page/slide structure from a document file."""
        path = Path(file_path)
        if not path.exists():
            return {"success": False, "error": f"File not found: {file_path}"}

        ext = path.suffix.lower()
        chunks: List[Dict[str, Any]] = []
        total_pages = 1

        try:
            if ext == ".pdf":
                reader = pypdf.PdfReader(str(path))
                total_pages = len(reader.pages)
                for idx, page in enumerate(reader.pages):
                    text = page.extract_text() or ""
                    if text.strip():
                        chunks.append({
                            "pageOrSlide": idx + 1,
                            "text": text.strip()
                        })

            elif ext == ".docx":
                doc = docx.Document(str(path))
                paras = [p.text for p in doc.paragraphs if p.text.strip()]
                # Group every ~5 paragraphs as a chunk
                group_size = 5
                for i in range(0, len(paras), group_size):
                    chunk_text = "\n".join(paras[i:i + group_size])
                    chunks.append({
                        "pageOrSlide": (i // group_size) + 1,
                        "text": chunk_text
                    })
                total_pages = max(1, len(chunks))

            elif ext == ".pptx":
                prs = Presentation(str(path))
                total_pages = len(prs.slides)
                for idx, slide in enumerate(prs.slides):
                    slide_texts = []
                    for shape in slide.shapes:
                        if hasattr(shape, "text") and shape.text.strip():
                            slide_texts.append(shape.text.strip())
                    if slide_texts:
                        chunks.append({
                            "pageOrSlide": idx + 1,
                            "text": "\n".join(slide_texts)
                        })

            elif ext in [".txt", ".md"]:
                with open(path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                # Split into 500-word blocks
                words = content.split()
                chunk_size = 250
                for i in range(0, len(words), chunk_size):
                    chunk_text = " ".join(words[i:i + chunk_size])
                    chunks.append({
                        "pageOrSlide": (i // chunk_size) + 1,
                        "text": chunk_text
                    })
                total_pages = max(1, len(chunks))

            elif ext == ".csv":
                with open(path, "r", encoding="utf-8", errors="ignore") as f:
                    reader = csv.reader(f)
                    rows = [", ".join(r) for r in reader]
                chunks.append({
                    "pageOrSlide": 1,
                    "text": "\n".join(rows[:50])
                })
                total_pages = 1

            else:
                return {
                    "success": False,
                    "error": f"Unsupported file type: {ext}. Supported: .pdf, .docx, .pptx, .txt, .csv, .md"
                }

            file_size = path.stat().st_size
            return {
                "success": True,
                "filename": path.name,
                "fileType": ext.lstrip("."),
                "fileSize": file_size,
                "totalPages": total_pages,
                "chunks": chunks
            }
        except Exception as e:
            logger.error(f"Error parsing document {path.name}: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": f"Failed to extract document contents: {str(e)}"
            }

document_parser = DocumentParser()
