import os
import json
import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

required_vars = ["GEMINI_API_KEY", "QDRANT_URL", "QDRANT_API_KEY"]
missing = [v for v in required_vars if not os.environ.get(v)]
if missing:
    logger.warning(f"Missing environment variables: {', '.join(missing)}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Recall backend starting up")
    yield
    logger.info("Recall backend shutting down")


app = FastAPI(title="Recall API", lifespan=lifespan)

frontend_url = os.environ.get("FRONTEND_URL", "")
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:4000",
]
if frontend_url:
    allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://(.*\.vercel\.app|.*\.hf\.space)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    conversation_history: list[dict] = []
    user_id: str | None = None


class DeleteResponse(BaseModel):
    success: bool
    memory_id: str


def _run_memory_add(user_message: str, ai_response: str, user_id: str | None):
    from memory import add_memory

    messages = [
        {"role": "user", "content": user_message},
        {"role": "assistant", "content": ai_response},
    ]
    add_memory(messages, user_id=user_id)


@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    from chat import stream_chat_response

    def event_generator():
        full_response_parts = []
        try:
            generator = stream_chat_response(
                user_message=request.message,
                conversation_history=request.conversation_history,
                user_id=request.user_id,
            )
            for token in generator:
                full_response_parts.append(token)
                data = json.dumps({"token": token})
                yield f"event: token\ndata: {data}\n\n"

            yield f"event: done\ndata: {json.dumps({'status': 'complete'})}\n\n"

        except Exception as e:
            logger.error(f"Stream error: {e}")
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
        finally:
            full_text = "".join(full_response_parts)
            if full_text:
                import threading
                threading.Thread(
                    target=_run_memory_add,
                    args=(request.message, full_text, request.user_id),
                    daemon=True,
                ).start()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/memories")
async def get_memories(user_id: str | None = None):
    from memory import get_all_memories

    memories = get_all_memories(user_id)
    return {"memories": memories}


@app.delete("/memories/{memory_id}")
async def delete_memory_route(memory_id: str, user_id: str | None = None):
    from memory import delete_memory

    success = delete_memory(memory_id, user_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete memory")
    return DeleteResponse(success=True, memory_id=memory_id)


@app.get("/memories/count")
async def get_memory_count(user_id: str | None = None):
    from memory import get_memory_count, get_default_user_id

    uid = user_id or get_default_user_id()
    count = get_memory_count(uid)
    return {"total": count, "user_id": uid}


@app.get("/health")
async def health_check():
    from memory import check_qdrant_connection

    qdrant_ok = check_qdrant_connection()
    return {"status": "ok", "qdrant_connected": qdrant_ok}


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)
