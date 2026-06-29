const assert = require("node:assert/strict");
const SummarizeThis = require("./summarizer-core");
const CardIntelligenceLedger = require("./card-intelligence-ledger");
const TrelloAdminConfig = require("./trello-admin-config");

const sample = SummarizeThis.sampleCardData();
const normalized = SummarizeThis.normalizeCardData(sample);

assert.equal(normalized.name, "Prepare launch checklist");
assert.equal(normalized.boardName, "Product Delivery");
assert.equal(normalized.checklistStats.total, 3);
assert.equal(normalized.checklistStats.complete, 1);
assert.equal(normalized.listContext.sampledCards, 4);
assert.equal(normalized.listContext.currentPosition, 2);
assert.ok(normalized.listContext.labelPatterns.some(item => item.label === "Launch" && item.count === 3));
const sensitiveSignals = SummarizeThis.detectSensitiveSignals(sample);
assert.equal(sensitiveSignals.requiresAiApproval, true);
assert.ok(sensitiveSignals.categories.includes("client"));
assert.ok(sensitiveSignals.categories.includes("financial"));

const local = SummarizeThis.buildRuleBasedAnalysis(sample, {
  now: new Date()
});

assert.equal(local.metadata.provider, "Local rules");
assert.ok(local.summary.about.includes("Prepare launch checklist"));
assert.ok(Array.isArray(local.summary.nextSteps));
assert.ok(local.summary.nextSteps.length >= 1);
assert.ok(local.qualityScore >= 60);
assert.ok(local.summary.insights.some(item => item.includes("List context includes")));

const prompt = SummarizeThis.buildAIPrompt(sample);
assert.ok(prompt.includes("Return only valid JSON"));
assert.ok(prompt.includes("robertDecisions"));
assert.ok(prompt.includes("vaReadyActions"));
assert.ok(prompt.includes("evidenceClaims"));
assert.ok(prompt.includes("Prepare launch checklist"));
assert.equal(SummarizeThis.normalizeOutputMode("risk-review"), "risk-review");
assert.equal(SummarizeThis.normalizeOutputMode("unknown-mode"), "operational-ledger");
assert.equal(SummarizeThis.getOutputModeLabel("meeting-brief"), "Meeting brief");

const riskPromptPayload = parsePromptPayload(SummarizeThis.buildAIPrompt(sample, {
  outputMode: "risk-review"
}));
assert.equal(riskPromptPayload.outputMode.key, "risk-review");
assert.ok(riskPromptPayload.outputMode.instruction.includes("risks"));
assert.equal(riskPromptPayload.listContext.sampledCards, 4);
assert.equal(riskPromptPayload.contextIncluded.listContextCards, 4);
assert.equal(riskPromptPayload.sensitiveSignals.requiresAiApproval, true);

const cardWithPriorFeedback = Object.assign({}, sample, {
  priorFeedback: [{
    rating: "wrong",
    correctionText: "The invoice amount is still missing; do not say billing is complete.",
    incorrectSections: ["risks"],
    createdAt: "2026-06-29T12:04:00.000Z"
  }]
});
const feedbackPromptPayload = parsePromptPayload(SummarizeThis.buildAIPrompt(cardWithPriorFeedback));
assert.equal(feedbackPromptPayload.priorFeedback.length, 1);
assert.ok(feedbackPromptPayload.priorFeedback[0].correctionText.includes("invoice amount"));
assert.equal(feedbackPromptPayload.contextIncluded.priorFeedbackItems, 1);

const feedbackLocal = SummarizeThis.buildRuleBasedAnalysis(cardWithPriorFeedback);
assert.ok(feedbackLocal.summary.history.includes("prior correction"));
assert.ok(feedbackLocal.summary.recommendations.some(item => item.includes("prior corrections")));

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
assert.equal(largePromptPayload.contextIncluded.commentLimit, 12);
assert.equal(largePromptPayload.contextIncluded.commentCharacters, 700);

const expandedPromptPayload = parsePromptPayload(SummarizeThis.buildAIPrompt(largeCard, {
  promptContext: {
    descriptionCharacters: 4000,
    commentLimit: 20,
    commentCharacters: 1200
  }
}));
assert.ok(expandedPromptPayload.description.length <= 4000);
assert.equal(expandedPromptPayload.comments.length, 20);
assert.ok(expandedPromptPayload.comments.every(comment => comment.text.length <= 1200));
assert.equal(expandedPromptPayload.contextIncluded.commentsAvailable, 25);
assert.equal(expandedPromptPayload.contextIncluded.commentsIncluded, 20);

const clampedContext = SummarizeThis.normalizePromptContext({
  descriptionCharacters: 999999,
  commentLimit: 999,
  commentCharacters: 999999
});
assert.equal(clampedContext.descriptionCharacters, 5000);
assert.equal(clampedContext.commentLimit, 25);
assert.equal(clampedContext.commentCharacters, 1500);

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
assert.ok(snapshot.sourceCoverage.some(item => item.key === "comments" && item.status === "available"));
assert.ok(snapshot.listContext);
assert.ok(snapshot.sourceCoverage.some(item => item.key === "listContext" && item.status === "available"));

const feedbackSnapshot = CardIntelligenceLedger.createCardSnapshot(cardWithPriorFeedback, {
  now: "2026-06-29T12:00:15.000Z"
});
assert.equal(feedbackSnapshot.priorFeedbackCount, 1);
assert.ok(feedbackSnapshot.sourceCoverage.some(item => item.key === "priorFeedback" && item.status === "available"));

const partialCoverage = CardIntelligenceLedger.createSourceCoverage(Object.assign({}, sample, {
  comments: [],
  checklists: [],
  attachments: [],
  badges: {
    comments: 3,
    checkItems: 2,
    checkItemsChecked: 1,
    attachments: 1
  },
  __sourceStatus: {
    comments: { ok: false, error: "Comment API was not available." },
    board: { ok: false, error: "Board read failed." },
    list: { ok: true }
  }
}));
assert.ok(partialCoverage.some(item => item.key === "comments" && item.status === "failed"));
assert.ok(partialCoverage.some(item => item.key === "checklists" && item.status === "partial"));
assert.ok(partialCoverage.some(item => item.key === "attachments" && item.status === "partial"));
assert.ok(partialCoverage.some(item => item.key === "board" && item.detail.includes("Board read failed")));

const run = CardIntelligenceLedger.createAnalysisRun(operationalCard, operationalAnalysis, {
  now: "2026-06-29T12:00:00.000Z",
  outputMode: "meeting-brief"
});
assert.equal(run.status, "completed");
assert.equal(run.outputMode, "meeting-brief");
assert.ok(run.result.blockers.length >= 2);
assert.ok(run.result.robertDecisions.length >= 1);
assert.ok(run.result.vaReadyActions.length >= 1);
assert.ok(run.result.evidenceClaims.every(claim => Array.isArray(claim.support)));
assert.ok(run.result.validationFindings.some(finding => finding.id === "decision-review"));
assert.ok(run.result.confidence.overall >= 25);
assert.ok(run.result.trustSignals.basedOn.some(item => item.key === "description"));
assert.ok(run.result.trustSignals.basedOn.some(item => item.key === "comments"));
assert.ok(run.result.trustSignals.basedOn.some(item => item.key === "listContext"));
assert.ok(run.result.trustSignals.needsReview.some(item => item.key === "missing-members"));
assert.ok(run.result.trustSignals.whyScore.some(item => item.includes("Data completeness")));

const sparseTrustSignals = CardIntelligenceLedger.createAnalysisRun(Object.assign({}, sample, {
  desc: "",
  comments: [],
  members: [],
  checklists: [],
  due: null,
  badges: {
    comments: 0,
    checkItems: 0,
    checkItemsChecked: 0,
    attachments: 0
  }
}), operationalAnalysis, {
  now: "2026-06-29T12:00:30.000Z"
}).result.trustSignals;
assert.ok(sparseTrustSignals.needsReview.some(item => item.label === "No description"));
assert.ok(sparseTrustSignals.needsReview.some(item => item.label === "No owner"));
assert.ok(sparseTrustSignals.needsReview.some(item => item.label === "No comments"));

const failedReadRun = CardIntelligenceLedger.createAnalysisRun(Object.assign({}, sample, {
  __sourceStatus: {
    comments: { ok: false, error: "Comment API was not available." }
  }
}), operationalAnalysis, {
  now: "2026-06-29T12:00:45.000Z"
});
assert.ok(failedReadRun.cardSnapshot.sourceCoverage.some(item => item.key === "comments" && item.status === "failed"));
assert.ok(failedReadRun.result.trustSignals.needsReview.some(item => item.key === "comments-failed"));

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
  incorrectSections: ["risks"],
  cardId: run.cardId,
  cardTitle: run.cardSnapshot.title
}, {
  now: "2026-06-29T12:05:00.000Z"
});
assert.equal(feedback.analysisRunId, run.id);
assert.equal(feedback.correctionText, "The invoice amount is still missing.");
assert.equal(feedback.cardId, run.cardId);

const reviewRecord = CardIntelligenceLedger.createReviewRecord(run.id, {
  state: "needs-follow-up",
  note: "Robert should review the approval wording before use.",
  cardId: run.cardId,
  cardTitle: run.cardSnapshot.title,
  reviewNeededAtCreation: run.result.confidence.reviewNeeded,
  confidence: run.result.confidence
}, {
  now: "2026-06-29T12:05:30.000Z"
});
assert.equal(reviewRecord.analysisRunId, run.id);
assert.equal(reviewRecord.state, "needs-follow-up");
assert.equal(reviewRecord.label, "Needs follow-up");
assert.equal(reviewRecord.cardId, run.cardId);
assert.equal(reviewRecord.createdAt, "2026-06-29T12:05:30.000Z");

const summarizedReviews = CardIntelligenceLedger.summarizeReviewRecords([
  reviewRecord,
  CardIntelligenceLedger.createReviewRecord("other-run", { state: "accepted" }, {
    now: "2026-06-29T12:05:35.000Z"
  }),
  CardIntelligenceLedger.createReviewRecord(run.id, { state: "accepted" }, {
    now: "2026-06-29T12:05:40.000Z"
  })
], [run.id], 5);
assert.equal(summarizedReviews.length, 2);
assert.equal(summarizedReviews[0].state, "accepted");
assert.equal(summarizedReviews[1].state, "needs-follow-up");

const exportRecord = CardIntelligenceLedger.createExportRecord(run.id, "markdown", "clipboard", {
  now: "2026-06-29T12:06:00.000Z"
});
assert.equal(exportRecord.destination, "clipboard");
assert.equal(exportRecord.sensitiveReview, null);

const blockedSensitiveExport = CardIntelligenceLedger.createSensitiveActionReview(sensitiveSignals, "ledger-json", false, {
  now: "2026-06-29T12:06:30.000Z"
});
assert.equal(blockedSensitiveExport.required, true);
assert.equal(blockedSensitiveExport.requiresApproval, true);
assert.ok(blockedSensitiveExport.categories.includes("client"));

const approvedSensitiveExport = CardIntelligenceLedger.createSensitiveActionReview(sensitiveSignals, "ledger-json", true, {
  now: "2026-06-29T12:06:45.000Z"
});
assert.equal(approvedSensitiveExport.requiresApproval, false);
assert.equal(approvedSensitiveExport.approved, true);
assert.equal(approvedSensitiveExport.reviewedAt, "2026-06-29T12:06:45.000Z");

const sensitiveExportRecord = CardIntelligenceLedger.createExportRecord(run.id, "ledger-json", "download", {
  now: "2026-06-29T12:06:50.000Z",
  sensitiveReview: approvedSensitiveExport,
  cardId: run.cardId,
  cardTitle: run.cardSnapshot.title
});
assert.equal(sensitiveExportRecord.sensitiveReview.required, true);
assert.equal(sensitiveExportRecord.sensitiveReview.approved, true);
assert.ok(sensitiveExportRecord.sensitiveReview.categories.includes("financial"));
assert.equal(sensitiveExportRecord.cardId, run.cardId);

const summarizedExports = CardIntelligenceLedger.summarizeExportRecords([
  sensitiveExportRecord,
  CardIntelligenceLedger.createExportRecord("other-run", "markdown", "clipboard", {
    now: "2026-06-29T12:06:55.000Z"
  }),
  CardIntelligenceLedger.createExportRecord(run.id, "trello-comment", "trello-comment", {
    now: "2026-06-29T12:07:05.000Z",
    cardId: run.cardId
  })
], [run.id], 5);
assert.equal(summarizedExports.length, 2);
assert.equal(summarizedExports[0].exportLabel, "Trello comment");
assert.equal(summarizedExports[0].destinationLabel, "posted to Trello");
assert.equal(summarizedExports[1].exportLabel, "Ledger JSON");
assert.equal(summarizedExports[1].sensitiveReviewApproved, true);

const ledgerMarkdown = CardIntelligenceLedger.markdownForLedgerRun(run);
assert.ok(ledgerMarkdown.includes("## Robert decisions"));
assert.ok(ledgerMarkdown.includes("VA collect"));
assert.ok(ledgerMarkdown.includes("## Evidence-backed claims"));
assert.ok(ledgerMarkdown.includes("## Source coverage"));
assert.ok(ledgerMarkdown.includes("Attachments (partial):"));

const ledgerPlainText = CardIntelligenceLedger.plainTextForLedgerRun(run);
assert.ok(ledgerPlainText.includes("Trello Card Intelligence"));
assert.ok(ledgerPlainText.includes("Missing information:"));
assert.ok(ledgerPlainText.includes("Robert decisions:"));
assert.ok(ledgerPlainText.includes("Evidence-backed claims:"));
assert.ok(ledgerPlainText.includes("Source coverage:"));

const ledgerStatusUpdate = CardIntelligenceLedger.statusUpdateForLedgerRun(run);
assert.ok(ledgerStatusUpdate.includes("Status update:"));
assert.ok(ledgerStatusUpdate.includes("Top next action:"));
assert.ok(ledgerStatusUpdate.includes("VA/team handoff:"));
assert.ok(ledgerStatusUpdate.includes("Source coverage:"));

const meetingBrief = CardIntelligenceLedger.modeBriefForLedgerRun(run);
assert.ok(meetingBrief.includes("Meeting brief:"));
assert.ok(meetingBrief.includes("Decisions to cover:"));
assert.ok(meetingBrief.includes("Source coverage:"));

const riskBrief = CardIntelligenceLedger.modeBriefForLedgerRun(run, "risk-review");
assert.ok(riskBrief.includes("Risk review:"));
assert.ok(riskBrief.includes("Validation findings:"));
assert.ok(riskBrief.includes("Evidence-backed claims:"));

const checklistBrief = CardIntelligenceLedger.modeBriefForLedgerRun(run, "next-action-checklist");
assert.ok(checklistBrief.includes("Next-action checklist:"));
assert.ok(checklistBrief.includes("- [ ]"));
assert.ok(checklistBrief.includes("Evidence-backed claims:"));

const ledgerJson = JSON.parse(CardIntelligenceLedger.jsonForLedgerRun(run, {
  now: "2026-06-29T12:07:00.000Z"
}));
assert.equal(ledgerJson.schemaVersion, "summarize-this-card-intelligence-export-v1");
assert.equal(ledgerJson.exportedAt, "2026-06-29T12:07:00.000Z");
assert.equal(ledgerJson.analysisRun.id, run.id);
assert.equal(ledgerJson.analysisRun.outputMode, "meeting-brief");
assert.equal(ledgerJson.cardSnapshot.description, undefined);
assert.ok(Array.isArray(ledgerJson.result.blockers));

const trelloCommentDraft = CardIntelligenceLedger.createTrelloCommentDraft(run);
assert.ok(trelloCommentDraft.includes("Summarize This - Card Intelligence"));
assert.ok(trelloCommentDraft.includes("Robert decisions:"));
assert.ok(trelloCommentDraft.includes("VA/team-ready actions:"));
assert.ok(trelloCommentDraft.includes("Confidence:"));
assert.ok(trelloCommentDraft.includes("Evidence notes:"));
assert.ok(trelloCommentDraft.includes("Source coverage:"));
assert.ok(trelloCommentDraft.includes("Review note:"));
assert.ok(trelloCommentDraft.length <= 4000);

const adminConfig = TrelloAdminConfig.createAdminConfig({
  name: "Summarize This",
  details: "Evidence-backed Trello card intelligence.",
  author: "Noodzakelijk Online",
  author_email: "support@example.com",
  author_url: "https://example.com",
  overview_url: "https://example.com/trello",
  icon: { url: "./icon.svg" },
  capabilities: ["card-buttons", "show-settings"]
}, "https://powerup.example.com/app/");
assert.equal(adminConfig.connectorUrl, "https://powerup.example.com/app/connector.js");
assert.equal(adminConfig.iconUrl, "https://powerup.example.com/app/icon.svg");
assert.deepEqual(adminConfig.capabilities, ["card-buttons", "show-settings"]);

const adminValuesText = TrelloAdminConfig.makeAdminValuesText(adminConfig);
assert.ok(adminValuesText.includes("iframe Connector URL: https://powerup.example.com/app/connector.js"));
assert.ok(adminValuesText.includes("Capabilities: card-buttons, show-settings"));

const adminAutofillScript = TrelloAdminConfig.createAdminAutofillScript(adminConfig);
assert.ok(adminAutofillScript.includes("https://powerup.example.com/app/connector.js"));
assert.ok(adminAutofillScript.includes("Review every field in Trello"));
assert.doesNotMatch(adminAutofillScript, /form\.submit|submit\s*\(/i);
assert.doesNotMatch(adminAutofillScript, /save\s*\(/i);

const adminBookmarklet = TrelloAdminConfig.createAdminBookmarklet(adminConfig);
assert.ok(adminBookmarklet.startsWith("javascript:"));
assert.ok(adminBookmarklet.length < 9000);

console.log("All summarizer tests passed.");
