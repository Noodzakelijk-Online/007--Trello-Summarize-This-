# Confidence and Validation Implementation Notes

This file keeps the historical filename for links from older documentation, but the current implementation should be understood as a confidence and validation system, not a proven accuracy guarantee.

The Power-Up calculates confidence from observable card data, flags missing or weak evidence, stores review feedback, and keeps Trello writeback behind explicit approval. A high confidence score is a review signal. It is not proof that an AI answer is factually correct, complete, or safe to act on.

## What Is Implemented

### Confidence Scoring

`accuracy-system.js` contains `ConfidenceScorer`, which evaluates:

- data completeness;
- analysis completeness;
- factual consistency checks against available card text;
- model-provided confidence when present;
- card complexity.

The score is used to decide whether the analysis should be reviewed. It should not be presented as real-world accuracy.

### Human Review

`accuracy-system.js` contains `HumanReviewSystem`, and the active popup stores current ledger review state privately. Reviews and corrections are user feedback, not verified Trello evidence. Later analysis can use compact correction guidance while still showing it separately from facts found on the card.

### Ground Truth Validation

`GroundTruthValidator` can compare analyses against known-good reference examples when such examples exist. Until a representative benchmark set is maintained, validation scores should be treated as internal quality signals only.

### Error and Validation Findings

`ErrorDetector` and the card intelligence ledger flag:

- unsupported or weakly supported claims;
- missing card context;
- incomplete sections;
- conflicting or unclear statements;
- attachment metadata-only states and extraction failures;
- decision items that require review before action.

### Card Intelligence Ledger

`card-intelligence-ledger.js` is the primary operational layer. It creates per-card analysis runs with:

- card snapshot metadata;
- provider/model/prompt profile metadata;
- structured summary sections;
- evidence claims;
- blockers, waiting-on items, next actions, Robert decisions, VA/team-ready actions, and unresolved questions;
- confidence and validation findings;
- review, feedback, export, and postback records.

## Current Safety Position

- The active popup shows confidence, source coverage, evidence, review warnings, and attachment facts.
- Metadata-only attachments are not treated as read content.
- Sensitive card signals require approval before AI handoff when the setting is enabled.
- Trello comment drafts require exact draft review, checkbox approval, and a confirmation before posting.
- Local preview strips API keys instead of persisting them in `localStorage`.
- Optional proxy mode lets provider keys stay server-side.

## What Remains Important

The system still depends on the quality of available Trello card data and any configured AI provider. Users should review output before:

- making Robert-only decisions;
- delegating VA/team work;
- exporting sensitive content;
- posting comments back to Trello;
- using output in Sneup, HAI, client, legal, financial, or personal workflows.

## Maintenance Rule

Do not describe the product as having guaranteed or proven numeric accuracy unless a representative benchmark, methodology, and current result are actually maintained in the repository. Public docs should use confidence, validation, evidence, source coverage, and review language.
