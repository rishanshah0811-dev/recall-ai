import os
import logging
from typing import Generator
import google.generativeai as genai
from memory import search_memory

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are Recall, a thoughtful and perceptive AI assistant. You listen carefully, remember everything meaningful, and over time develop a genuine understanding of the person you're talking to.

You have a persistent memory system. Below are things you know about this person from past conversations:

{memories}

How to use memories:
- Weave what you know into your responses naturally, the way a close friend would
- Do NOT prefix every response with "I remember you said..." — that feels mechanical
- Only explicitly reference a specific memory when it is directly and importantly relevant
- If you know their name, use it occasionally but not in every message
- If a memory is relevant to their question, use that context to give a more personalized answer
- If no memories are relevant to the current message, just respond naturally without forcing references

Your personality:
- Warm but not saccharine — genuine, not performative
- Curious — you ask follow-up questions that show you were actually listening
- Concise — you don't ramble. Short paragraphs, clear thinking
- You have opinions when asked, but you present them as your perspective, not as truth
- You occasionally use humor when it fits naturally

If this is the very first conversation and you have no memories yet, introduce yourself briefly and invite the person to share something about themselves. Keep it natural, not like a form."""


def _format_memories(memories: list) -> str:
    if not memories:
        return "No memories stored yet — this appears to be a new conversation."

    lines = []
    for mem in memories:
        text = mem.get("memory", "") if isinstance(mem, dict) else str(mem)
        if text:
            lines.append(f"- {text}")
    return "\n".join(lines) if lines else "No relevant memories found."


def stream_chat_response(
    user_message: str,
    conversation_history: list[dict],
    user_id: str | None = None,
) -> Generator[str, None, str]:
    genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

    relevant_memories = search_memory(user_message, user_id=user_id, limit=5)
    all_memories_for_context = search_memory("", user_id=user_id, limit=20)

    combined = {m.get("id", str(i)): m for i, m in enumerate(all_memories_for_context)}
    for m in relevant_memories:
        combined[m.get("id", "")] = m
    memory_list = list(combined.values())

    formatted_memories = _format_memories(memory_list)
    system_prompt = SYSTEM_PROMPT.format(memories=formatted_memories)

    gemini_history = []
    for msg in conversation_history[-12:]:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role == "assistant":
            gemini_history.append({"role": "model", "parts": [content]})
        else:
            gemini_history.append({"role": "user", "parts": [content]})

    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash",
        system_instruction=system_prompt,
    )
    chat = model.start_chat(history=gemini_history)

    full_response = ""
    try:
        response = chat.send_message(user_message, stream=True)
        for chunk in response:
            if chunk.text:
                full_response += chunk.text
                yield chunk.text
    except Exception as e:
        logger.error(f"Gemini streaming error: {e}")
        error_msg = "I hit a snag processing that. Could you try again?"
        full_response = error_msg
        yield error_msg

    return full_response
