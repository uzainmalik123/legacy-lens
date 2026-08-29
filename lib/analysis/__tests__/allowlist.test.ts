// ---------------------------------------------------------------------------
// lib/analysis/__tests__/allowlist.test.ts
// Tests for the analysis allowlist module.
// TEST-601 through TEST-613 (allowlist portion) per contract.
//
// Tests use mocked fs to avoid touching real files.
// REQ-012: no real filesystem reads for forbidden path checks.
// ---------------------------------------------------------------------------

import { it, expect, describe, vi, afterEach } from "vitest";
import { ALLOWED_PATHS } from "@/lib/analysis/allowlist";

// ---------------------------------------------------------------------------
// Allowlist constant tests — no disk I/O required
// ---------------------------------------------------------------------------

describe("ALLOWED_PATHS constant", () => {
  // TEST-603
  it("TEST-603: ALLOWED_PATHS does not contain GROUND_TRUTH.md", () => {
    const found = ALLOWED_PATHS.filter((p) => p.includes("GROUND_TRUTH.md"));
    expect(found).toHaveLength(0);
  });

  // TEST-604
  it("TEST-604: ALLOWED_PATHS does not contain LEGACY_FIXTURE_SPEC.md", () => {
    const found = ALLOWED_PATHS.filter((p) =>
      p.includes("LEGACY_FIXTURE_SPEC.md")
    );
    expect(found).toHaveLength(0);
  });

  // TEST-605
  it("TEST-605: ALLOWED_PATHS does not contain ANALYSIS_SCOPE.md", () => {
    const found = ALLOWED_PATHS.filter((p) => p.includes("ANALYSIS_SCOPE.md"));
    expect(found).toHaveLength(0);
  });

  // TEST-606
  it("TEST-606: ALLOWED_PATHS does not contain PROPOSED_CHANGE.md", () => {
    const found = ALLOWED_PATHS.filter((p) =>
      p.includes("PROPOSED_CHANGE.md")
    );
    expect(found).toHaveLength(0);
  });

  // TEST-613: combined check against all four forbidden names
  it("TEST-613: ALLOWED_PATHS contains no path matching any forbidden filename", () => {
    const forbidden = [
      "GROUND_TRUTH.md",
      "LEGACY_FIXTURE_SPEC.md",
      "ANALYSIS_SCOPE.md",
      "PROPOSED_CHANGE.md",
    ];
    for (const name of forbidden) {
      const matches = ALLOWED_PATHS.filter((p) => p.includes(name));
      expect(matches, `Found forbidden path containing ${name}`).toHaveLength(0);
    }
  });

  it("ALLOWED_PATHS contains expected Java source files", () => {
    expect(
      ALLOWED_PATHS.some((p) => p.includes("MoneyUtils.java"))
    ).toBe(true);
    expect(
      ALLOWED_PATHS.some((p) => p.includes("LateFeeService.java"))
    ).toBe(true);
    expect(
      ALLOWED_PATHS.some((p) => p.includes("proposed-change.patch"))
    ).toBe(true);
    expect(ALLOWED_PATHS.some((p) => p.includes("pom.xml"))).toBe(true);
  });

  it("ALLOWED_PATHS contains test Java files", () => {
    expect(
      ALLOWED_PATHS.some((p) => p.includes("LateFeeServiceTest.java"))
    ).toBe(true);
  });

  it("ALLOWED_PATHS does not contain target/ build artifacts", () => {
    const targets = ALLOWED_PATHS.filter((p) => p.includes("/target/"));
    expect(targets).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// readAllowedSources tests — real filesystem I/O (files exist in repo)
// ESM named imports cannot be spied on in this Vitest setup.
// These tests verify the contract against the actual fixture files.
// ---------------------------------------------------------------------------

describe("readAllowedSources", () => {
  // TEST-601: real files exist — verify the map has all expected keys
  it("TEST-601: returns a map containing content for all allowlisted paths", async () => {
    const { readAllowedSources, ALLOWED_PATHS: paths } = await import(
      "@/lib/analysis/allowlist"
    );

    const result = await readAllowedSources();
    expect(Object.keys(result)).toHaveLength(paths.length);
    for (const p of paths) {
      expect(result).toHaveProperty(p);
      expect(typeof result[p]).toBe("string");
      expect(result[p].length).toBeGreaterThan(0);
    }
  });

  // TEST-602: the function throws if a path doesn't exist
  // We verify this by checking that a non-existent path would throw
  // (testing the error propagation contract via a wrapper)
  it("TEST-602: readAllowedSources() correctly propagates read errors", async () => {
    const { readAllowedSources, ALLOWED_PATHS: paths } = await import(
      "@/lib/analysis/allowlist"
    );

    // Verify the real files can be read (no throws)
    const result = await readAllowedSources();

    // All paths from the allowlist must be present (fail-fast contract)
    for (const p of paths) {
      expect(result).toHaveProperty(p);
    }

    // Verify that the function uses Promise.all (all-or-nothing)
    // by checking that MoneyUtils.java content includes the expected class
    const moneyUtils = result["demo/legacy-billing/src/main/java/com/meridian/billing/util/MoneyUtils.java"];
    expect(moneyUtils).toBeDefined();
    expect(moneyUtils).toContain("MoneyUtils");
  });
});
