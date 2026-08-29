// ---------------------------------------------------------------------------
// lib/analysis/bob-client.ts
// Server-only Bob Shell transport for Legacy Lens analysis.
//
// REQ-015 (revised): transport uses IBM Bob Shell via child_process.spawn —
// NOT raw HTTP fetch. All transport details are isolated in bobSpawn() so they
// can be adjusted without touching any other file.
//
// SEC-601 / SEC-603: this module MUST NOT be imported from any 'use client'
// component. It uses Node.js child_process and reads process.env server-side
// only.
//
// SEC-602: BOB_API_KEY is never logged, serialised, or returned to the client.
// It is passed to Bob Shell through the server process environment only.
//
// Transport: child_process.spawn('bob', [...args], { shell: false, env })
// Stdin: complete analysis prompt piped as UTF-8 text
// Stdout: bob --format json produces { type, status, last_message, ... }
// ---------------------------------------------------------------------------

import { spawn } from "child_process";
import type { AllowedSourcesMap } from "@/lib/analysis/allowlist";
import { buildSystemPrompt, buildUserMessage } from "@/lib/analysis/prompt";

// ---------------------------------------------------------------------------
// isBobConfigured — exported for the route handler pre-flight check
//
// Bob Shell requires only BOB_API_KEY (passed via env).
// BOB_API_URL and BOB_MODEL are not required by the Shell transport.
// ---------------------------------------------------------------------------

export function isBobConfigured(): boolean {
  return Boolean(process.env.BOB_API_KEY?.trim());
}

// ---------------------------------------------------------------------------
// BobShellError — typed error for Bob Shell failures
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
// BobShellResult — the wrapper object emitted by bob run --format json
// ---------------------------------------------------------------------------

interface BobShellResult {
  type: string;
  status: string;
  last_message: string | null;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// bobSpawn — the single isolated transport adapter
//
// Spawns `bob run` with fixed arguments, pipes the prompt to stdin, and
// resolves with the parsed JSON wrapper. All transport details live here.
//
// Security:
//   - shell: false — no shell interpolation
//   - args are a hard-coded literal array — no user input reaches argv
//   - BOB_API_KEY is forwarded from the server process environment only
// ---------------------------------------------------------------------------

async function bobSpawn(prompt: string): Promise<BobShellResult> {
  return new Promise((resolve, reject) => {
    const args = [
      "run",
      "--mode", "ask",
      "--format", "json",
      "--max-cost", "5",
      "--max-turns", "1",
      "--disable-mcp",
      "--disable-subagents",
      "--disable-tool-groups", "read,edit,execute",
      "--log-level", "silent",
    ];

    // SEC-602: forward only the server process env — BOB_API_KEY is already
    // present there; never construct or log it explicitly.
    const child = spawn("bob", args, {
      shell: false,
      env: process.env as NodeJS.ProcessEnv,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (err: Error) => {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        reject(
          new BobApiError(
            "Bob executable not found — install bobshell globally (npm i -g bobshell)",
            503
          )
        );
      } else {
        reject(new BobApiError(`Failed to spawn Bob: ${err.message}`, 502));
      }
    });

    child.on("close", (code: number | null) => {
      if (code !== 0) {
        // Non-zero exit — capture first 300 chars of stderr for diagnostics
        const detail = stderr.slice(0, 300).trim();
        reject(
          new BobApiError(
            `Bob exited with code ${code ?? "null"}${detail ? `: ${detail}` : ""}`,
            502
          )
        );
        return;
      }

      // Parse the JSON wrapper emitted on stdout
      let parsed: unknown;
      try {
        parsed = JSON.parse(stdout.trim());
      } catch {
        reject(
          new BobApiError(
            "Bob produced non-JSON output on stdout",
            502
          )
        );
        return;
      }

      resolve(parsed as BobShellResult);
    });

    // Pipe the complete prompt to Bob's stdin, then close the stream
    child.stdin.write(prompt, "utf8");
    child.stdin.end();
  });
}

// ---------------------------------------------------------------------------
// callBobAnalysis — the public API of this module
//
// Builds the complete analysis prompt, invokes Bob Shell, validates the
// wrapper object, then returns the parsed last_message as an unknown value.
// Callers MUST validate through AnalysisBundleWireSchema.safeParse()
// before accessing any field.
// ---------------------------------------------------------------------------

export async function callBobAnalysis(sources: AllowedSourcesMap): Promise<unknown> {
  if (!isBobConfigured()) {
    throw new BobApiError("Bob API is not configured (BOB_API_KEY missing)", 503);
  }

  // Build the complete prompt from allowed source context
  const systemPrompt = buildSystemPrompt();
  const userMessage = buildUserMessage(sources);
  // Combine into a single stdin message for Bob Shell ask mode
  const fullPrompt = `${systemPrompt}\n\n---\n\n${userMessage}`;

  const wrapper = await bobSpawn(fullPrompt);

  // Validate the wrapper object structure
  if (wrapper.type !== "result") {
    throw new BobApiError(
      `Bob returned unexpected wrapper type: ${String(wrapper.type)}`,
      502
    );
  }

  if (wrapper.status !== "success") {
    throw new BobApiError(
      `Bob reported non-success status: ${String(wrapper.status)}`,
      502
    );
  }

  if (typeof wrapper.last_message !== "string" || wrapper.last_message.trim() === "") {
    throw new BobApiError(
      "Bob returned an empty or missing last_message",
      422
    );
  }

  // Parse last_message as the Legacy Lens JSON payload
  try {
    return JSON.parse(wrapper.last_message);
  } catch {
    throw new BobApiError(
      "Bob last_message is not valid JSON — cannot parse Legacy Lens output",
      422
    );
  }
}
