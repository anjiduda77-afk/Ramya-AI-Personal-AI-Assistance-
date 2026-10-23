"""
Unit tests for Document parsing, local Vector Store, and RAG.
"""
import pytest
from pathlib import Path
from app.tools.documents import document_parser
from app.rag.vector_store import vector_store, compute_sparse_vector, cosine_similarity

def test_document_parser_txt(tmp_path: Path):
    doc_path = tmp_path / "test_notes.txt"
    doc_path.write_text("Ramya AI is an advanced personal desktop and mobile assistant designed for Windows and Android with Gemma 3 4B.")
    
    parsed = document_parser.parse_file(str(doc_path))
    assert parsed["success"] is True
    assert parsed["filename"] == "test_notes.txt"
    assert parsed["fileType"] == "txt"
    assert len(parsed["chunks"]) >= 1

def test_vector_similarity():
    v1 = compute_sparse_vector("ramya voice assistant architecture")
    v2 = compute_sparse_vector("voice assistant with ramya ai")
    v3 = compute_sparse_vector("completely unrelated culinary recipe for pasta")

    sim1_2 = cosine_similarity(v1, v2)
    sim1_3 = cosine_similarity(v1, v3)

    assert sim1_2 > 0.4
    assert sim1_3 < 0.1

def test_vector_store_indexing(tmp_path: Path):
    doc_data = {
        "filename": "quantum_computing.txt",
        "fileType": "txt",
        "fileSize": 1024,
        "totalPages": 1,
        "chunks": [
            {
                "pageOrSlide": 1,
                "text": "Qubits exhibit quantum superposition and entanglement, enabling exponential speedups in factoring and optimization."
            }
        ]
    }
    
    doc_id = vector_store.index_document(doc_data)
    assert doc_id is not None

    # Search for quantum concept
    results = vector_store.search("quantum superposition qubits")
    assert len(results) >= 1
    assert results[0]["filename"] == "quantum_computing.txt"
    assert results[0]["pageOrSlide"] == 1
    assert "superposition" in results[0]["content"]
