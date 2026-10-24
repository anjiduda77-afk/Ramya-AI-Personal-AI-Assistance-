"""
Ramya AI — Main FastAPI Application Entrypoint.
Initializes database migrations, middleware, routes, and WebSocket endpoints.
"""
import sys
import logging
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Ensure parent directory is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.core.config import settings
from app.database.db import db
from app.api.routes import api_router
from app.api.ws import websocket_endpoint

# Configure structured logging
logging.basicConfig(
    level=logging.INFO if settings.DEBUG else logging.WARNING,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("ramya.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Run SQLite migrations
    logger.info("Initializing Ramya AI system...")
    applied = db.run_migrations()
    logger.info(f"Database ready. Applied {len(applied)} migration(s).")
    yield
    # Shutdown
    logger.info("Shutting down Ramya AI services.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Intelligent voice-first personal assistant backend for Windows and Android.",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
app.include_router(api_router, prefix="/api")

# Mount WebSocket endpoint
app.add_api_websocket_route("/ws/assistant", websocket_endpoint)

# Global safe exception handler: prevents internal stack traces from leaking to client
from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server exception on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "status": "attention_required",
            "message": "I encountered an issue processing your request. Please try again shortly.",
            "spoken_response": "I encountered an issue processing your request. Please try again."
        }
    )

@app.get("/")
async def root():
    return {
        "project": settings.PROJECT_NAME,
        "tagline": settings.TAGLINE,
        "version": settings.VERSION,
        "status": "online",
        "docs": "/docs",
        "health": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
