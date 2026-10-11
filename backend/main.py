import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

from db import db_manager
from routes import auth, command, users, notes, whatsapp, features

load_dotenv()

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[VoxWeb] Starting server and initializing database connection...")
    await db_manager.connect()
    yield
    if db_manager.client:
        db_manager.client.close()
        print("[VoxWeb] MongoDB connection closed.")


app = FastAPI(
    title="VoxWeb – Intelligent Voice Website Assistant API",
    description="Backend services for voice command routing, OpenAI/Gemini LLM responses, authentication, and chat history.",
    version="1.0.0",
    lifespan=lifespan
)

# Robust CORS configuration supporting all local ports and origins
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:4173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "http://127.0.0.1:4173",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    FRONTEND_ORIGIN
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", tags=["Health"])
async def health_check():
    """Health check endpoint to verify backend status."""
    return {
        "status": "online",
        "service": "VoxWeb Voice AI Backend",
        "database": "Live MongoDB" if db_manager.is_real_mongo else "Resilient Memory DB",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# Register API routes
app.include_router(auth.router)
app.include_router(command.router)
app.include_router(users.router)
app.include_router(notes.router)
app.include_router(whatsapp.router)
app.include_router(features.router)

# Mount frontend dist static files if built
dist_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
assets_dir = os.path.join(dist_dir, "assets")

if os.path.exists(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")


@app.get("/{full_path:path}", include_in_schema=False)
async def serve_spa_frontend(full_path: str):
    """Fallback router to serve the React Single Page App from port 8000."""
    if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
        return JSONResponse(status_code=404, content={"detail": "API endpoint not found."})

    target_file = os.path.join(dist_dir, full_path)
    if full_path and os.path.exists(target_file) and os.path.isfile(target_file):
        return FileResponse(target_file)

    index_html = os.path.join(dist_dir, "index.html")
    if os.path.exists(index_html):
        return FileResponse(index_html)

    return JSONResponse(status_code=404, content={"detail": "Frontend assets not found."})


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    print(f"[VoxWeb Server Error] {request.method} {request.url}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "VoxWeb encountered an internal error. Please try again later."}
    )


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
