import OpenAI from "openai";
import type { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";

/**
 * NVIDIA NIM, OpenAI-compatible. Used only for extraction (Stage 3) and
 * drafting (Stage 8) — this client must never be imported by anything in
 * lib/engine/, which is where eligibility is actually decided.
 */
// The OpenAI SDK throws AT CONSTRUCTION if apiKey is falsy — meaning the
// whole app (or a test importing this module for its pure helpers) would
// crash on import, not just fail the specific AI call, if the env var were
// ever unset. Falling back to a placeholder keeps construction safe; a
// real call with no real key simply fails with a clear 401 at request
// time instead of an import-time crash.
export const aiClient = new OpenAI({
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey: process.env.NVIDIA_API_KEY || "unset-see-NVIDIA_API_KEY-in-.env",
});

// nemotron-3-nano-30b-a3b: MoE, ~3B active params per token — chosen for
// low latency/cost on a daily batch job over many documents, not a single
// interactive request.
export const AI_MODEL = "nvidia/nemotron-3-nano-30b-a3b";

/**
 * This model "thinks out loud" by default (its reasoning shows up inline in
 * `message.content`, e.g. "The user wants... Must output..."), which breaks
 * JSON parsing for extraction. `chat_template_kwargs` must be a TOP-LEVEL
 * field on the request — NVIDIA's docs show `extra_body: {...}` but that's
 * Python-SDK-only syntax; the JS SDK has no such wrapper. Confirmed by a
 * smoke test: wrapping in extra_body gets a 400 ("Unsupported parameter"),
 * passing it directly gives clean output and a null `reasoning_content`.
 *
 * Always call chat completions through this helper, not `aiClient` directly,
 * so nothing accidentally ships without this.
 */
export function createChatCompletion(
  params: ChatCompletionCreateParamsNonStreaming
) {
  return aiClient.chat.completions.create({
    ...params,
    // @ts-expect-error - NVIDIA-specific field, not in the OpenAI type
    chat_template_kwargs: { enable_thinking: false },
  });
}
