// ---------------------------------------------------------------------------
// lib/analysis/bob-client.ts
// Server-only LLM call wrapper for Bob inference.
//
// REQ-015: all auth/header details are isolated in bobFetch() so they can
// be adjusted in one place during live integration testing.
//
// SEC-601 / SEC-603: this module MUST NOT be imported from any 'use client'
// component. It reads process.env and makes server-side fetch calls only.
//
// SEC-602: BOB_API_KEY is never logged, serialised, or returned to the client.
//
// API format: OpenAI-compatible chat/completions.
// Endpoint: POST {BOB_API_URL}/chat/completions
// Auth: Authorization: Bearer {BOB_API_KEY}
// No IBM Cloud IAM token exchange. No watsonx.ai format. No provider detection.
// ---------------------------------------------------------------------------

import type { AllowedSourcesMap } from "@/lib/analysis/allowlist";
import { buildSystemPrompt, buildUserMessage } from "@/lib/analysis/prompt";

// ---------------------------------------------------------------------------
// BobConfig — resolved from environment variables
// ---------------------------------------------------------------------------

interface BobConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
}

function resolveBobConfig(): BobConfig | null {
  const apiUrl = process.env.BOB_API_URL?.trim();
  const apiKey = process.env.BOB_API_KEY?.trim();
  const model = process.env.BOB_MODEL?.trim() ?? "ibm/granite-3-3-8b-instruct";

  if (!apiUrl || !apiKey) return null;

  return { apiUrl, apiKey, model };
}

// Export for use in route handler to check configuration
export function isBobConfigured(): boolean {
  return resolveBobConfig() !== null;
}

// ---------------------------------------------------------------------------
// bobFetch — the single isolated HTTP adapter
//
// All authentication and endpoint details live here.
// Adjust this function for live integration testing without touching any
// other file.
// ---------------------------------------------------------------------------

async function bobFetch(config: BobConfig, body: unknown): Promise<unknown> {
  const url = `${config.apiUrl.replace(/\/$/, "")}/chat/completions`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // SEC-601: key goes into Authorization header only — never in response body
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new BobApiError(
      `Bob API returned HTTP ${response.status}: ${text.slice(0, 200)}`,
      response.status
    );
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// BobApiError — typed error for non-OK HTTP responses
// ---------------------------------------------------------------------------

export class BobApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "BobApiError";
  }
}

// ---------------------------------------------------------------------------
// callBobAnalysis — the public API of this module
//
// Returns the raw parsed JSON from Bob's response content field.
// Callers MUST validate through AnalysisBundleWireSchema.safeParse()
// before accessing any field.
// ---------------------------------------------------------------------------

export async function callBobAnalysis(sources: AllowedSourcesMap): Promise<unknown> {
  const config = resolveBobConfig();
  if (!config) {
    throw new BobApiError("Bob API is not configured (BOB_API_URL or BOB_API_KEY missing)", 503);
  }

  const requestBody = {
    model: config.model,
    messages: [
      {
        role: "system",
        content: buildSystemPrompt(),
      },
      {
        role: "user",
        content: buildUserMessage(sources),
      },
    ],
    // Request JSON output where supported by the model
    response_format: { type: "json_object" },
    temperature: 0,
  };

  const raw = await bobFetch(config, requestBody);

  // Extract content from OpenAI-compatible response shape:
  // { choices: [{ message: { content: "<json string>" } }] }
  if (
    raw !== null &&
    typeof raw === "object" &&
    "choices" in raw &&
    Array.isArray((raw as Record<string, unknown>).choices) &&
    (raw as { choices: unknown[] }).choices.length > 0
  ) {
    const choices = (raw as { choices: { message?: { content?: unknown } }[] }).choices;
    const content = choices[0]?.message?.content;

    if (typeof content === "string") {
      // Parse the JSON string from the model's content field
      try {
        return JSON.parse(content);
      } catch {
        throw new BobApiError(
          "Bob returned non-JSON content in message",
          422
        );
      }
    }

    // Some providers return the parsed object directly in content
    if (content !== null && typeof content === "object") {
      return content;
    }
  }

  throw new BobApiError(
    "Bob response did not contain expected choices[0].message.content",
    422
  );
}
