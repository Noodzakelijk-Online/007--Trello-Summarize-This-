const assert = require("node:assert/strict");
const SummarizeThis = require("./summarizer-core");

const sample = SummarizeThis.sampleCardData();
const normalized = SummarizeThis.normalizeCardData(sample);

assert.equal(normalized.name, "Prepare launch checklist");
assert.equal(normalized.boardName, "Product Delivery");
assert.equal(normalized.checklistStats.total, 3);
assert.equal(normalized.checklistStats.complete, 1);

const local = SummarizeThis.buildRuleBasedAnalysis(sample, {
  now: new Date()
});

assert.equal(local.metadata.provider, "Local rules");
assert.ok(local.summary.about.includes("Prepare launch checklist"));
assert.ok(Array.isArray(local.summary.nextSteps));
assert.ok(local.summary.nextSteps.length >= 1);
assert.ok(local.qualityScore >= 60);

const prompt = SummarizeThis.buildAIPrompt(sample);
assert.ok(prompt.includes("Return only valid JSON"));
assert.ok(prompt.includes("Prepare launch checklist"));

const largeCard = Object.assign({}, sample, {
  desc: "Long description ".repeat(400),
  comments: Array.from({ length: 25 }, (_, index) => ({
    text: `Comment ${index + 1} ` + "detail ".repeat(250)
  }))
});
const largePromptPayload = JSON.parse(SummarizeThis.buildAIPrompt(largeCard).split("\n").slice(5).join("\n"));
assert.ok(largePromptPayload.description.length <= 2500);
assert.equal(largePromptPayload.comments.length, 12);
assert.ok(largePromptPayload.comments.every(comment => comment.text.length <= 700));

const fallback = local.summary;
const aiSummary = SummarizeThis.normalizeAIAnalysis({
  about: "AI about",
  history: "AI history",
  status: "AI status",
  nextSteps: ["Do the thing"],
  insights: ["Useful insight"],
  risks: [],
  recommendations: ["Keep moving"],
  confidence: "high"
}, fallback);

assert.equal(aiSummary.about, "AI about");
assert.deepEqual(aiSummary.nextSteps, ["Do the thing"]);
assert.equal(aiSummary.confidence, "high");

const markdown = SummarizeThis.markdownForAnalysis(sample, local);
assert.ok(markdown.includes("## Current status"));
assert.ok(markdown.includes("- Billing flow checked"));

console.log("All summarizer tests passed.");
