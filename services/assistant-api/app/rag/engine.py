"""
Retrieval-Augmented Generation (RAG) Engine for Ramya AI.
Provides grounded question-answering with exact document citations.
"""
import logging
from typing import Dict, Any, List
from app.rag.vector_store import vector_store
from app.providers.router import router

logger = logging.getLogger("ramya.rag.engine")

class RAGEngine:
    async def answer_query(self, query: str) -> Dict[str, Any]:
        """Performs semantic search across indexed documents and produces grounded response."""
        chunks = vector_store.search(query, top_k=3)
        
        if not chunks:
            return {
                "answer": "I checked your indexed documents, but they do not contain sufficient information regarding your query.",
                "citations": [],
                "sufficientEvidence": False,
                "message": "No matching document content found."
            }

        # Build context with citations
        context_blocks = []
        citations = []
        for ch in chunks:
            ref = f"[{ch['filename']} - Page/Slide {ch['pageOrSlide']}]"
            context_blocks.append(f"{ref}:\n{ch['content']}")
            citations.append({
                "documentId": ch["documentId"],
                "filename": ch["filename"],
                "pageOrSlideNumber": ch["pageOrSlide"],
                "snippet": ch["content"][:200] + "..." if len(ch["content"]) > 200 else ch["content"],
                "relevanceScore": ch["score"]
            })

        context_text = "\n\n".join(context_blocks)
        system_prompt = (
            "You are Ramya AI's Grounded Document Research Assistant.\n"
            "Answer the user's question STRICTLY based on the provided document excerpts.\n"
            "Include citations to the filename and page number where appropriate.\n"
            "If the excerpts do not contain the answer, explicitly state that the documents do not provide this information."
        )

        answer_text, provider_name, model_name, _ = await router.generate(
            prompt=query,
            system_prompt=system_prompt,
            context=context_text
        )

        return {
            "answer": answer_text,
            "citations": citations,
            "sufficientEvidence": True,
            "providerUsed": provider_name,
            "modelUsed": model_name,
            "message": f"Retrieved {len(citations)} citation(s) from your knowledge base."
        }

rag_engine = RAGEngine()
