"use strict";

/**
 * fake-provider.js
 *
 * Test-only fake AI provider for isolated unit and contract testing.
 * Never use in production. Produces deterministic, labeled responses.
 *
 * Phase 038 — Fake provider lab for tests only.
 */

const FAKE_PROVIDER_LABEL = "FakeProvider (test-only)";

/**
 * Builds a fake AI summary response in the same shape as real providers.
 * Accepts an optional scenario name to vary the output deterministically.
 */
function buildFakeResponse(cardData, options) {
  const scenario = (options && options.scenario) || "default";
  const cardName = (cardData && cardData.name) || "Test Card";

  const scenarios = {
    default: {
      about: `Test summary for: ${cardName}`,
      blockers: [],
      robertDecisions: [],
      vaReadyActions: ["Verify test output"],
      nextSteps: ["Review fake summary"],
      evidenceClaims: [],
      validationFindings: ["Fake provider — not real AI output"],
      unresolvedQuestions: [],
      waitingOn: [],
      unclearPoints: [],
      risks: ["This is test-only output; do not use in production"],
      insights: ["FakeProvider deterministic output"],
      history: "No real card activity analyzed.",
      status: `Card: ${cardName}`,
      recommendations: ["Replace with real provider for production use"]
    },
    error: null,
    timeout: null,
    empty: {
      about: "",
      blockers: [],
      robertDecisions: [],
      vaReadyActions: [],
      nextSteps: [],
      evidenceClaims: [],
      validationFindings: [],
      unresolvedQuestions: [],
      waitingOn: [],
      unclearPoints: [],
      risks: [],
      insights: [],
      history: "",
      status: "",
      recommendations: []
    },
    malformed: "THIS IS NOT JSON {{{{",
    large: {
      about: "A".repeat(2000),
      blockers: Array.from({ length: 50 }, (_, i) => `Blocker ${i + 1}`),
      robertDecisions: [],
      vaReadyActions: Array.from({ length: 50 }, (_, i) => `Action ${i + 1}`),
      nextSteps: Array.from({ length: 50 }, (_, i) => `Step ${i + 1}`),
      evidenceClaims: [],
      validationFindings: [],
      unresolvedQuestions: [],
      waitingOn: [],
      unclearPoints: [],
      risks: [],
      insights: [],
      history: "B".repeat(2000),
      status: "Large scenario",
      recommendations: []
    }
  };

  if (scenario === "error") {
    throw new Error("FakeProvider: simulated provider error");
  }
  if (scenario === "timeout") {
    throw new Error("FakeProvider: simulated timeout — request took too long");
  }

  const payload = scenarios[scenario] !== undefined ? scenarios[scenario] : scenarios.default;
  return JSON.stringify(payload);
}

/**
 * Simulates the full provider call interface used by ai-providers.js.
 * Returns a promise resolving to an object with { rawResponse, parsedJson, provider, model }.
 */
function callFakeProvider(cardData, options) {
  const scenario = (options && options.scenario) || "default";
  const delayMs = (options && options.delayMs) || 0;

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const rawResponse = buildFakeResponse(cardData, options);
        const parsedJson = scenario === "malformed" ? null : JSON.parse(rawResponse);
        resolve({
          rawResponse,
          parsedJson,
          provider: FAKE_PROVIDER_LABEL,
          model: "fake-model-v1",
          scenario,
          testOnly: true
        });
      } catch (error) {
        reject(error);
      }
    }, delayMs);
  });
}

/**
 * Returns the set of available test scenarios.
 */
function availableScenarios() {
  return ["default", "error", "timeout", "empty", "malformed", "large"];
}

module.exports = {
  FAKE_PROVIDER_LABEL,
  buildFakeResponse,
  callFakeProvider,
  availableScenarios
};
