"""
Privacy-respecting, Free and Legal Web Search Engine for Ramya AI.
Integrates DuckDuckGo Instant Answer API and Wikipedia REST API
for real-time world knowledge without tracking or API key requirements.
"""
import httpx
import logging
import urllib.parse
from typing import Dict, Any, List, Optional

logger = logging.getLogger("ramya.tools.web_search")

class WebSearchEngine:
    async def is_online(self) -> bool:
        """Checks if external internet connectivity is functional."""
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get("https://en.wikipedia.org", follow_redirects=True)
                return res.status_code in [200, 301, 302]
        except Exception:
            return False

    async def search(self, query: str) -> Dict[str, Any]:
        """
        Executes free and legal web information search.
        Queries DuckDuckGo Instant Answer and Wikipedia Summary.
        """
        clean_q = query.strip()
        if not clean_q:
            return {"status": "error", "message": "Query cannot be empty."}

        # 1. Try DuckDuckGo Instant Answers
        try:
            encoded = urllib.parse.quote(clean_q)
            ddg_url = f"https://api.duckduckgo.com/?q={encoded}&format=json&no_html=1&skip_disambig=1"
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(ddg_url)
                if res.status_code == 200:
                    data = res.json()
                    abstract = data.get("AbstractText", "").strip()
                    heading = data.get("Heading", clean_q)
                    source_url = data.get("AbstractURL", "")
                    
                    if abstract:
                        return {
                            "status": "success",
                            "title": heading,
                            "snippet": abstract,
                            "url": source_url,
                            "source": "DuckDuckGo Instant Knowledge",
                            "spoken_response": abstract[:200]
                        }

                    # Check RelatedTopics if direct abstract is empty
                    related = data.get("RelatedTopics", [])
                    if related and isinstance(related[0], dict) and "Text" in related[0]:
                        first_text = related[0].get("Text", "")
                        first_url = related[0].get("FirstURL", "")
                        return {
                            "status": "success",
                            "title": heading,
                            "snippet": first_text,
                            "url": first_url,
                            "source": "DuckDuckGo",
                            "spoken_response": first_text[:200]
                        }
        except Exception as e:
            logger.warning(f"DuckDuckGo search error: {e}")

        # 2. Try Wikipedia Summary as second knowledge source
        try:
            clean_term = clean_q.replace("who is", "").replace("what is", "").replace("tell me about", "").strip()
            encoded_term = urllib.parse.quote(clean_term)
            wiki_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{encoded_term}"
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(wiki_url, headers={"User-Agent": "RamyaAI/1.0 (Personal Assistant)"})
                if res.status_code == 200:
                    wdata = res.json()
                    extract = wdata.get("extract", "").strip()
                    title = wdata.get("title", clean_term)
                    page_url = wdata.get("content_urls", {}).get("desktop", {}).get("page", "")
                    if extract:
                        return {
                            "status": "success",
                            "title": title,
                            "snippet": extract,
                            "url": page_url,
                            "source": "Wikipedia",
                            "spoken_response": extract[:200]
                        }
        except Exception as e:
            logger.warning(f"Wikipedia search error: {e}")

        return {
            "status": "no_results",
            "message": f"I couldn't find verified live information for '{clean_q}'.",
            "spoken_response": f"I couldn't find live search results for {clean_q}."
        }

web_search_engine = WebSearchEngine()
