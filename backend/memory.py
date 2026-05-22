import os
import logging
from mem0 import Memory

logger = logging.getLogger(__name__)

CUSTOM_FACT_EXTRACTION_PROMPT = """You are a Personal Memory Manager for an AI assistant called Recall. Your job is to extract important facts from conversations and store them as concise declarative sentences.

Analyze the conversation and extract facts that fall into these categories:

1. **Personal**: Name, location, age, family, background, nationality, languages spoken
2. **Professional**: Job title, company, skills, projects, education, career history, industry
3. **Preferences**: Likes, dislikes, habits, routines, favorite things, opinions
4. **Goals**: What they want to achieve, what they're working on, aspirations, plans, deadlines

Rules:
- Extract ONLY factual information explicitly stated or strongly implied
- Store each fact as a single concise declarative sentence
- If a new fact contradicts an existing memory, the new fact should UPDATE the old one
- Do not extract pleasantries, greetings, or conversational filler
- Do not infer or assume facts not supported by the conversation
- Prioritize actionable, identifying, and preference-related information

Here are the messages from the conversation:
{messages}

Extract the facts as a JSON list of objects with "fact" and "category" fields.
"""

CUSTOM_UPDATE_PROMPT = """You are a Memory Update Manager. You have an existing set of memories and new facts extracted from a recent conversation.

Existing memories:
{existing_memories}

New facts:
{new_facts}

Your job:
1. If a new fact is genuinely new information, ADD it
2. If a new fact updates or corrects an existing memory, UPDATE the existing memory
3. If a new fact contradicts an existing memory, REPLACE the old memory with the new fact
4. If an existing memory is no longer true based on the conversation, DELETE it
5. Do NOT create duplicate memories — merge overlapping facts

Return the final list of memory operations (ADD, UPDATE, DELETE) as JSON.
"""


def get_memory_client():
    config = {
        "llm": {
            "provider": "gemini",
            "config": {
                "model": "gemini-2.0-flash",
                "api_key": os.environ.get("GEMINI_API_KEY"),
                "temperature": 0.1,
            },
        },
        "embedder": {
            "provider": "gemini",
            "config": {
                "model": "models/text-embedding-004",
                "api_key": os.environ.get("GEMINI_API_KEY"),
            },
        },
        "vector_store": {
            "provider": "qdrant",
            "config": {
                "collection_name": "recall_memories",
                "url": os.environ.get("QDRANT_URL"),
                "api_key": os.environ.get("QDRANT_API_KEY"),
            },
        },
        "custom_fact_extraction_prompt": CUSTOM_FACT_EXTRACTION_PROMPT,
        "custom_update_memory_prompt": CUSTOM_UPDATE_PROMPT,
        "version": "v1.1",
    }
    return Memory.from_config(config)


_memory_client = None


def _get_client():
    global _memory_client
    if _memory_client is None:
        _memory_client = get_memory_client()
    return _memory_client


def get_default_user_id():
    return os.environ.get("DEFAULT_USER_ID", "default_user")


def add_memory(messages: list[dict], user_id: str | None = None):
    uid = user_id or get_default_user_id()
    client = _get_client()
    try:
        result = client.add(messages, user_id=uid)
        logger.info(f"Memory add result for {uid}: {result}")
        return result
    except Exception as e:
        logger.error(f"Failed to add memory: {e}")
        return None


def search_memory(query: str, user_id: str | None = None, limit: int = 5):
    uid = user_id or get_default_user_id()
    client = _get_client()
    try:
        results = client.search(query, user_id=uid, limit=limit)
        return results.get("results", []) if isinstance(results, dict) else results
    except Exception as e:
        logger.error(f"Failed to search memory: {e}")
        return []


def get_all_memories(user_id: str | None = None):
    uid = user_id or get_default_user_id()
    client = _get_client()
    try:
        results = client.get_all(user_id=uid)
        memories = results.get("results", []) if isinstance(results, dict) else results
        memories.sort(key=lambda m: m.get("created_at", ""), reverse=True)
        return memories
    except Exception as e:
        logger.error(f"Failed to get all memories: {e}")
        return []


def delete_memory(memory_id: str, user_id: str | None = None):
    client = _get_client()
    try:
        client.delete(memory_id)
        return True
    except Exception as e:
        logger.error(f"Failed to delete memory {memory_id}: {e}")
        return False


def get_memory_count(user_id: str | None = None):
    memories = get_all_memories(user_id)
    return len(memories)


def check_qdrant_connection():
    try:
        from qdrant_client import QdrantClient

        client = QdrantClient(
            url=os.environ.get("QDRANT_URL"),
            api_key=os.environ.get("QDRANT_API_KEY"),
            timeout=5,
            check_compatibility=False,
        )
        client.get_collections()
        return True
    except Exception as e:
        logger.warning(f"Qdrant connection check failed: {e}")
        return False
