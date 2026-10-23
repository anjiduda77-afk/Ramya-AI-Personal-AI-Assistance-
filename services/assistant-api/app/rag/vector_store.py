"""
Local Vector Store and Semantic Search for Ramya AI.
Stores document chunks and embedding vectors in SQLite.
"""
import uuid
import json
import math
import logging
from typing import List, Dict, Any, Tuple
from app.database.db import db

logger = logging.getLogger("ramya.rag.store")

def compute_sparse_vector(text: str) -> Dict[str, float]:
    """Computes a normalized term-frequency sparse vector for text."""
    words = [w.lower().strip(".,!?:;\"'()[]{}") for w in text.split()]
    words = [w for w in words if len(w) > 2]
    if not words:
        return {}
    counts: Dict[str, int] = {}
    for w in words:
        counts[w] = counts.get(w, 0) + 1
    
    # L2 normalize
    norm = math.sqrt(sum(c * c for c in counts.values()))
    if norm == 0:
        return {}
    return {w: c / norm for w, c in counts.items()}

def cosine_similarity(v1: Dict[str, float], v2: Dict[str, float]) -> float:
    """Computes cosine similarity between two sparse term vectors."""
    score = 0.0
    for w, val in v1.items():
        if w in v2:
            score += val * v2[w]
    return score

class VectorStore:
    def index_document(self, doc_data: Dict[str, Any]) -> str:
        """Indexes parsed document and its chunks into SQLite."""
        doc_id = str(uuid.uuid4())[:8]
        filename = doc_data["filename"]
        file_type = doc_data["fileType"]
        file_size = doc_data["fileSize"]
        total_pages = doc_data.get("totalPages", 1)
        chunks = doc_data.get("chunks", [])

        with db.get_connection() as conn:
            # Insert document record
            conn.execute(
                """
                INSERT INTO documents (id, filename, file_type, file_size, total_pages, chunk_count, summary)
                VALUES (?, ?, ?, ?, ?, ?, ?);
                """,
                (doc_id, filename, file_type, file_size, total_pages, len(chunks), f"Document with {len(chunks)} sections")
            )

            # Insert chunks with sparse vector embeddings
            for idx, ch in enumerate(chunks):
                chunk_id = str(uuid.uuid4())[:8]
                vec = compute_sparse_vector(ch["text"])
                conn.execute(
                    """
                    INSERT INTO document_chunks (id, document_id, chunk_index, page_or_slide, content, embedding_json)
                    VALUES (?, ?, ?, ?, ?, ?);
                    """,
                    (chunk_id, doc_id, idx, ch.get("pageOrSlide", 1), ch["text"], json.dumps(vec))
                )

        logger.info(f"Indexed document '{filename}' ({len(chunks)} chunks).")
        return doc_id

    def search(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """Retrieves top-k most relevant chunks using vector cosine similarity."""
        query_vec = compute_sparse_vector(query)
        if not query_vec:
            return []

        results: List[Tuple[float, Dict[str, Any]]] = []

        with db.get_connection() as conn:
            rows = conn.execute(
                """
                SELECT c.id, c.document_id, c.chunk_index, c.page_or_slide, c.content, c.embedding_json, d.filename
                FROM document_chunks c
                JOIN documents d ON c.document_id = d.id;
                """
            ).fetchall()

            for r in rows:
                try:
                    chunk_vec = json.loads(r["embedding_json"])
                    sim = cosine_similarity(query_vec, chunk_vec)
                    if sim > 0.05:
                        results.append((
                            sim,
                            {
                                "chunkId": r["id"],
                                "documentId": r["document_id"],
                                "filename": r["filename"],
                                "pageOrSlide": r["page_or_slide"],
                                "content": r["content"],
                                "score": round(sim, 3)
                            }
                        ))
                except Exception:
                    continue

        results.sort(key=lambda x: x[0], reverse=True)
        return [item[1] for item in results[:top_k]]

    def list_documents(self) -> List[Dict[str, Any]]:
        with db.get_connection() as conn:
            rows = conn.execute("SELECT * FROM documents ORDER BY indexed_at DESC;").fetchall()
            return [dict(r) for r in rows]

vector_store = VectorStore()
