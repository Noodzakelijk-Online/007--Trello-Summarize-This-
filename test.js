const assert = require("node:assert/strict");
const SummarizeThis = require("./summarizer-core");
const CardIntelligenceLedger = require("./card-intelligence-ledger");

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
assert.ok(prompt.includes("robertDecisions"));
assert.ok(prompt.includes("vaReadyActions"));
assert.ok(prompt.includes("evidenceClaims"));
assert.ok(prompt.includes("Prepare launch checklist"));

function parsePromptPayload(promptText) {
  return JSON.parse(promptText.slice(promptText.lastIndexOf("\n{") + 1));
}

const largeCard = Object.assign({}, sample, {
  desc: "Long description ".repeat(400),
  comments: Array.from({ length: 25 }, (_, index) => ({
    text: `Comment ${index + 1} ` + "detail ".repeat(250)
  }))
});
const largePromptPayload = parsePromptPayload(SummarizeThis.buildAIPrompt(largeCard));
assert.ok(largePromptPayload.description.length <= 2500);
assert.equal(largePromptPayload.comments.length, 12);
assert.ok(largePromptPayload.comments.every(comment => comment.text.length <= 700));

const fallback = local.summary;
const aiSummary = SummarizeThis.normalizeAIAnalysis({
  about: "AI about",
  history: "AI history",
  status: "AI status",
  nextSteps: ["Do the thing"],
  blockers: [{ text: "Waiting on Robert approval" }],
  robertDecisions: [{ question: "Approve VA follow-up? Yes/No" }],
  vaReadyActions: [{ action: "VA collect the missing screenshot" }],
  insights: ["Useful insight"],
  risks: [],
  missingInfo: ["Invoice amount is not in the card"],
  evidenceClaims: [{
    claim: "Billing is still open",
    source: "checklist",
    confidence: "supported"
  }],
  validationFindings: ["Attachment contents were not verified"],
  confidenceReason: "Description and checklist are present.",
  recommendations: ["Keep moving"],
  confidence: "high"
}, fallback);

assert.equal(aiSummary.about, "AI about");
assert.deepEqual(aiSummary.nextSteps, ["Do the thing"]);
assert.deepEqual(aiSummary.blockers, ["Waiting on Robert approval"]);
assert.deepEqual(aiSummary.robertDecisions, ["Approve VA follow-up? Yes/No"]);
assert.deepEqual(aiSummary.vaReadyActions, ["VA collect the missing screenshot"]);
assert.deepEqual(aiSummary.missingInfo, ["Invoice amount is not in the card"]);
assert.equal(aiSummary.evidenceClaims[0].claim, "Billing is still open");
assert.equal(aiSummary.validationFindings[0], "Attachment contents were not verified");
assert.equal(aiSummary.confidenceReason, "Description and checklist are present.");
assert.equal(aiSummary.confidence, "high");

const markdown = SummarizeThis.markdownForAnalysis(sample, local);
assert.ok(markdown.includes("## Current status"));
assert.ok(markdown.includes("- Billing flow checked"));

const operationalCard = Object.assign({}, sample, {
  id: "card-robert-va",
  desc: "Client launch is waiting on invoice approval. Robert must approve whether the VA may send the follow-up today.",
  due: new Date(Date.now() - 86400000).toISOString(),
  members: [],
  comments: [{
    text: "Blocked until Robert confirms yes/no on sending the payment reminder.",
    date: new Date().toISOString(),
    memberCreator: { fullName: "Jamie" }
  }],
  attachments: [{
    id: "invoice",
    name: "invoice.pdf",
    processed: true,
    extractedText: "",
    error: ""
  }]
});
const operationalAnalysis = {
  summary: {
    about: "Client launch follow-up needs payment reminder approval.",
    history: "The latest comment says the card is blocked until Robert confirms.",
    status: "Waiting on Robert approval and overdue.",
    nextSteps: [
      "Robert approve whether VA may send the follow-up message.",
      "VA collect the missing screenshot and update the card."
    ],
    insights: ["Payment and client communication need review."],
    risks: ["Blocked by approval.", "Invoice attachment content was not verified."],
    recommendations: ["Approve: Yes/No for VA follow-up."]
  },
  metadata: {
    provider: "Local rules",
    model: "built-in summarizer",
    tokens: 0,
    cost: 0
  }
};
const snapshot = CardIntelligenceLedger.createCardSnapshot(operationalCard, {
  now: "2026-06-29T12:00:00.000Z"
});
assert.equal(snapshot.cardId, "card-robert-va");
assert.equal(snapshot.descriptionPresent, true);
assert.ok(snapshot.descriptionHash);
assert.equal(snapshot.description, undefined);

const run = CardIntelligenceLedger.createAnalysisRun(operationalCard, operationalAnalysis, {
  now: "2026-06-29T12:00:00.000Z"
});
assert.equal(run.status, "completed");
assert.ok(run.result.blockers.length >= 2);
assert.ok(run.result.robertDecisions.length >= 1);
assert.ok(run.result.vaReadyActions.length >= 1);
assert.ok(run.result.evidenceClaims.every(claim => Array.isArray(claim.support)));
assert.ok(run.result.validationFindings.some(finding => finding.id === "decision-review"));
assert.ok(run.result.confidence.overall >= 25);

const aiStructuredRun = CardIntelligenceLedger.createAnalysisRun(operationalCard, {
  summary: aiSummary,
  metadata: {
    provider: "OpenAI",
    model: "gpt-4o-mini",
    tokens: 500,
    cost: 0.001
  }
}, {
  now: "2026-06-29T12:01:00.000Z"
});
assert.ok(aiStructuredRun.result.blockers.some(item => item.text.includes("Waiting on Robert approval")));
assert.ok(aiStructuredRun.result.robertDecisions.some(item => item.text.includes("Approve: Yes/No")));
assert.ok(aiStructuredRun.result.vaReadyActions.some(item => item.text.includes("VA collect the missing screenshot")));
assert.ok(aiStructuredRun.result.missingInfo.some(item => item.text.includes("Invoice amount")));
assert.ok(aiStructuredRun.result.evidenceClaims.some(item => item.claim.includes("Billing is still open")));
assert.ok(aiStructuredRun.result.validationFindings.some(item => item.text.includes("Attachment contents")));
assert.equal(aiStructuredRun.result.confidenceReason, "Description and checklist are present.");

const history = CardIntelligenceLedger.mergeLedgerHistory([], { lastRun: run }, 25);
assert.equal(history.length, 1);
assert.equal(history[0].id, run.id);

const changedRun = CardIntelligenceLedger.createAnalysisRun(Object.assign({}, operationalCard, {
  desc: operationalCard.desc + " The VA added a new screenshot request.",
  comments: operationalCard.comments.concat([{
    text: "VA can collect the screenshot after Robert approves the message.",
    date: "2026-06-29T12:10:00.000Z",
    memberCreator: { fullName: "Sam" }
  }])
}), operationalAnalysis, {
  now: "2026-06-29T12:10:00.000Z"
});
const changedHistory = CardIntelligenceLedger.mergeLedgerHistory(history, changedRun, 25);
assert.equal(changedHistory.length, 2);
const runChange = CardIntelligenceLedger.summarizeRunChange(changedHistory[0], changedHistory[1]);
assert.ok(runChange.changes.some(change => change.includes("Card source data changed")));
assert.ok(runChange.changes.some(change => change.includes("Comment count changed")));
assert.ok(["up", "down", "flat"].includes(runChange.confidenceTrend));

const firstRunChange = CardIntelligenceLedger.summarizeRunChange(run, null);
assert.equal(firstRunChange.confidenceTrend, "new");
assert.ok(firstRunChange.text.includes("First saved analysis"));

const feedback = CardIntelligenceLedger.createHumanFeedback(run.id, {
  rating: "wrong",
  correctionText: "The invoice amount is still missing.",
  incorrectSections: ["risks"]
}, {
  now: "2026-06-29T12:05:00.000Z"
});
assert.equal(feedback.analysisRunId, run.id);
assert.equal(feedback.correctionText, "The invoice amount is still missing.");

const exportRecord = CardIntelligenceLedger.createExportRecord(run.id, "markdown", "clipboard", {
  now: "2026-06-29T12:06:00.000Z"
});
assert.equal(exportRecord.destination, "clipboard");

const ledgerMarkdown = CardIntelligenceLedger.markdownForLedgerRun(run);
assert.ok(ledgerMarkdown.includes("## Robert decisions"));
assert.ok(ledgerMarkdown.includes("VA collect"));

const trelloCommentDraft = CardIntelligenceLedger.createTrelloCommentDraft(run);
assert.ok(trelloCommentDraft.includes("Summarize This - Card Intelligence"));
assert.ok(trelloCommentDraft.includes("Robert decisions:"));
assert.ok(trelloCommentDraft.includes("VA/team-ready actions:"));
assert.ok(trelloCommentDraft.includes("Confidence:"));
assert.ok(trelloCommentDraft.includes("Review note:"));
assert.ok(trelloCommentDraft.length <= 4000);

console.log("All summarizer tests passed.");
