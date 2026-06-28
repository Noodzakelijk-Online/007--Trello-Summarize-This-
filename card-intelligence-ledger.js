// Card intelligence ledger helpers for the active Trello Power-Up runtime.

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CardIntelligenceLedger = factory();
  }
}(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var BLOCKER_WORDS = [
    "blocked", "blocker", "waiting", "stuck", "missing", "cannot", "can't",
    "dependency", "issue", "problem", "need approval", "needs approval",
    "pending", "no response", "external", "invoice", "payment"
  ];
  var ROBERT_DECISION_WORDS = [
    "robert", "approve", "approval", "decision", "decide", "confirm",
    "permission", "budget", "payment", "invoice", "legal", "client",
    "yes/no", "go/no-go", "sign off", "sign-off"
  ];
  var VA_ACTION_WORDS = [
    "collect", "prepare", "draft", "follow up", "follow-up", "update",
    "attach", "screenshot", "check", "verify", "document", "status",
    "send", "schedule", "organize", "clean", "copy"
  ];

  function cleanText(value) {
    if (value === null || value === undefined) return "";
    return String(value).replace(/\s+/g, " ").trim();
  }

  function toArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function toNumber(value) {
    var number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function shortHash(value) {
    var text = cleanText(value);
    var hash = 2166136261;
    for (var i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return ("00000000" + (hash >>> 0).toString(16)).slice(-8);
  }

  function nowIso(options) {
    return options && options.now ? new Date(options.now).toISOString() : new Date().toISOString();
  }

  function normalizeName(value) {
    if (!value) return "";
    if (typeof value === "string") return cleanText(value);
    return cleanText(value.name || value.fullName || value.username || value.color || value.id);
  }

  function normalizeNames(items) {
    return toArray(items).map(normalizeName).filter(Boolean);
  }

  function normalizeComments(comments) {
    return toArray(comments).map(function (comment, index) {
      if (typeof comment === "string") {
        return {
          id: "comment-" + (index + 1),
          text: cleanText(comment),
          date: "",
          author: ""
        };
      }

      var data = comment.data || {};
      var creator = comment.memberCreator || {};
      return {
        id: cleanText(comment.id || "comment-" + (index + 1)),
        text: cleanText(comment.text || data.text || comment.comment),
        date: comment.date || comment.createdAt || "",
        author: cleanText(creator.fullName || creator.username || comment.author)
      };
    }).filter(function (comment) {
      return comment.text;
    });
  }

  function normalizeChecklists(checklists) {
    return toArray(checklists).map(function (checklist, checklistIndex) {
      return {
        id: cleanText(checklist.id || "checklist-" + (checklistIndex + 1)),
        name: cleanText(checklist.name || "Checklist"),
        items: toArray(checklist.checkItems || checklist.items).map(function (item, itemIndex) {
          return {
            id: cleanText(item.id || "checkitem-" + (checklistIndex + 1) + "-" + (itemIndex + 1)),
            name: cleanText(item.name || item.text || "Checklist item"),
            complete: item.state === "complete" || item.checked === true
          };
        })
      };
    });
  }

  function normalizeAttachments(attachments) {
    return toArray(attachments).map(function (attachment, index) {
      return {
        id: cleanText(attachment.id || "attachment-" + (index + 1)),
        name: cleanText(attachment.name || "Attachment"),
        mimeType: cleanText(attachment.mimeType || attachment.type),
        bytes: toNumber(attachment.bytes || attachment.size),
        processed: attachment.processed === true,
        extractedTextAvailable: Boolean(cleanText(attachment.extractedText || attachment.text)),
        error: cleanText(attachment.error),
        url: cleanText(attachment.url)
      };
    });
  }

  function getObjectId(value) {
    if (!value) return "";
    if (typeof value === "string") return "";
    return cleanText(value.id);
  }

  function getChecklistSummary(checklists) {
    var total = 0;
    var complete = 0;
    var incompleteItems = [];

    checklists.forEach(function (checklist) {
      checklist.items.forEach(function (item) {
        total += 1;
        if (item.complete) {
          complete += 1;
        } else {
          incompleteItems.push(item.name);
        }
      });
    });

    return {
      total: total,
      complete: complete,
      incomplete: Math.max(total - complete, 0),
      percent: total ? Math.round((complete / total) * 100) : null,
      incompleteItems: incompleteItems.slice(0, 10)
    };
  }

  function normalizeCard(input) {
    var raw = input || {};
    var base = raw.card && typeof raw.card === "object"
      ? Object.assign({}, raw.card, raw)
      : Object.assign({}, raw);
    delete base.card;

    var checklists = normalizeChecklists(base.checklists);
    var attachments = normalizeAttachments(base.attachments || base.attachmentDetails);
    var comments = normalizeComments(base.comments);
    var badges = base.badges || {};
    var checklistSummary = getChecklistSummary(checklists);

    if (!checklistSummary.total && badges.checkItems) {
      checklistSummary.total = toNumber(badges.checkItems);
      checklistSummary.complete = toNumber(badges.checkItemsChecked);
      checklistSummary.incomplete = Math.max(checklistSummary.total - checklistSummary.complete, 0);
      checklistSummary.percent = checklistSummary.total
        ? Math.round((checklistSummary.complete / checklistSummary.total) * 100)
        : null;
    }

    return {
      id: cleanText(base.id),
      boardId: getObjectId(base.board) || cleanText(base.idBoard || base.boardId),
      listId: getObjectId(base.list) || cleanText(base.idList || base.listId),
      title: cleanText(base.name || base.title || "Untitled Trello card"),
      description: cleanText(base.desc || base.description),
      labels: normalizeNames(base.labels),
      members: normalizeNames(base.members),
      boardName: normalizeName(base.board) || cleanText(base.boardName),
      listName: normalizeName(base.list) || cleanText(base.listName),
      due: base.due || null,
      dueComplete: Boolean(base.dueComplete),
      url: cleanText(base.url || base.shortUrl || base.shortLink),
      dateLastActivity: base.dateLastActivity || base.lastActivity || null,
      checklists: checklists,
      comments: comments,
      attachments: attachments,
      actions: toArray(base.actions),
      checklistSummary: checklistSummary,
      commentCount: comments.length || toNumber(badges.comments),
      attachmentCount: attachments.length || toNumber(badges.attachments),
      customFields: toArray(base.customFields || base.customFieldItems)
    };
  }

  function createCardSnapshot(input, options) {
    var card = normalizeCard(input);
    return {
      cardId: card.id,
      boardId: card.boardId,
      listId: card.listId,
      capturedAt: nowIso(options),
      title: card.title,
      descriptionHash: shortHash(card.description),
      descriptionPresent: Boolean(card.description),
      checklistSummary: card.checklistSummary,
      commentCount: card.commentCount,
      attachmentCount: card.attachmentCount,
      due: card.due,
      dueComplete: card.dueComplete,
      labels: card.labels.slice(0, 25),
      members: card.members.slice(0, 25),
      boardName: card.boardName,
      listName: card.listName,
      url: card.url,
      sourceCompleteness: scoreSourceCompleteness(card),
      sourceCoverage: createSourceCoverage(input)
    };
  }

  function createSourceCoverage(input) {
    var card = normalizeCard(input);
    var raw = input || {};
    var status = raw.__sourceStatus || {};
    var items = [];

    addCoverage(items, "card", "Card fields", statusFromRead(status.card, Boolean(card.id || card.title), "Card title, description, labels, due date, and badges were available."));
    addCoverage(items, "description", "Description", card.description
      ? coverage("available", "Description text was included.")
      : coverage("missing", "No description text was available."));
    addCoverage(items, "board", "Board", statusFromRead(status.board, Boolean(card.boardName), card.boardName ? "Board context: " + card.boardName + "." : "Board context was not available."));
    addCoverage(items, "list", "List", statusFromRead(status.list, Boolean(card.listName), card.listName ? "List context: " + card.listName + "." : "List context was not available."));
    addCoverage(items, "members", "Members", card.members.length
      ? coverage("available", card.members.length + " member(s) included.")
      : coverage("missing", "No assigned members were visible."));
    addCoverage(items, "labels", "Labels", card.labels.length
      ? coverage("available", card.labels.length + " label(s) included.")
      : coverage("missing", "No labels were visible."));
    addCoverage(items, "due", "Due date", card.due
      ? coverage("available", card.dueComplete ? "Due date is complete." : "Due date is present.")
      : coverage("missing", "No due date was set."));
    addCoverage(items, "checklists", "Checklists", collectionCoverage(
      card.checklists.length,
      card.checklistSummary.total,
      "checklist",
      "checklist item",
      "No checklist details were available."
    ));
    addCoverage(items, "comments", "Comments", sourceCollectionCoverage(
      status.comments,
      card.comments.length,
      card.commentCount,
      "comment",
      "No comments were available, so history may be incomplete."
    ));
    addCoverage(items, "attachments", "Attachments", attachmentCoverage(card));
    addCoverage(items, "customFields", "Custom fields", sourceCollectionCoverage(
      status.customFields,
      card.customFields.length,
      card.customFields.length,
      "custom field",
      "No custom fields were available."
    ));

    return items;
  }

  function coverage(status, detail) {
    return {
      status: status,
      detail: cleanText(detail)
    };
  }

  function addCoverage(items, key, label, value) {
    items.push({
      key: key,
      label: label,
      status: value.status,
      detail: value.detail
    });
  }

  function statusFromRead(readStatus, hasData, availableDetail) {
    if (readStatus && readStatus.ok === false) {
      return coverage("failed", readStatus.error || "Source could not be read.");
    }
    if (hasData) {
      return coverage("available", availableDetail);
    }
    return coverage("missing", availableDetail);
  }

  function collectionCoverage(collectionCount, reportedCount, collectionLabel, itemLabel, emptyDetail) {
    if (collectionCount > 0) {
      return coverage("available", collectionCount + " " + collectionLabel + "(s), " + reportedCount + " " + itemLabel + "(s) included.");
    }
    if (reportedCount > 0) {
      return coverage("partial", "Trello reported " + reportedCount + " " + itemLabel + "(s), but detailed " + collectionLabel + " data was not loaded.");
    }
    return coverage("missing", emptyDetail);
  }

  function sourceCollectionCoverage(readStatus, loadedCount, reportedCount, label, emptyDetail) {
    if (readStatus && readStatus.ok === false) {
      return coverage("failed", readStatus.error || label + " data could not be read.");
    }
    if (loadedCount > 0) {
      return coverage("available", loadedCount + " " + label + "(s) included.");
    }
    if (reportedCount > 0) {
      return coverage("partial", "Trello reported " + reportedCount + " " + label + "(s), but details were not loaded.");
    }
    return coverage("missing", emptyDetail);
  }

  function attachmentCoverage(card) {
    var extracted = card.attachments.filter(function (attachment) {
      return attachment.extractedTextAvailable;
    }).length;
    var failed = card.attachments.filter(function (attachment) {
      return attachment.error;
    }).length;

    if (card.attachments.length > 0 && extracted > 0) {
      return coverage("available", card.attachments.length + " attachment(s) included; " + extracted + " had extracted text.");
    }
    if (card.attachments.length > 0) {
      return coverage("partial", card.attachments.length + " attachment(s) included as metadata only; " + failed + " failed extraction.");
    }
    if (card.attachmentCount > 0) {
      return coverage("partial", "Trello reported " + card.attachmentCount + " attachment(s), but attachment details were not loaded.");
    }
    return coverage("missing", "No attachments were available.");
  }

  function createEvidenceMap(input) {
    var card = normalizeCard(input);
    var evidence = [];

    addEvidence(evidence, "title", "Card title", card.title, "card.title");
    addEvidence(evidence, "description", "Card description", card.description, "card.description");
    addEvidence(evidence, "board", "Board", card.boardName, "card.board");
    addEvidence(evidence, "list", "Current list", card.listName, "card.list");
    addEvidence(evidence, "due", "Due date", card.due ? card.due + (card.dueComplete ? " (complete)" : "") : "", "card.due");

    card.labels.forEach(function (label, index) {
      addEvidence(evidence, "label", "Label", label, "card.labels[" + index + "]");
    });

    card.members.forEach(function (member, index) {
      addEvidence(evidence, "member", "Member", member, "card.members[" + index + "]");
    });

    card.checklists.forEach(function (checklist, checklistIndex) {
      checklist.items.forEach(function (item, itemIndex) {
        addEvidence(
          evidence,
          "checklist",
          checklist.name,
          (item.complete ? "Complete: " : "Open: ") + item.name,
          "card.checklists[" + checklistIndex + "].items[" + itemIndex + "]"
        );
      });
    });

    card.comments.slice(0, 12).forEach(function (comment, index) {
      addEvidence(
        evidence,
        "comment",
        comment.author ? "Comment by " + comment.author : "Comment",
        comment.text,
        "card.comments[" + index + "]"
      );
    });

    card.attachments.forEach(function (attachment, index) {
      var detail = attachment.name;
      if (attachment.extractedTextAvailable) detail += " (text extracted)";
      else if (attachment.processed) detail += " (metadata only)";
      else if (attachment.error) detail += " (failed: " + attachment.error + ")";
      else detail += " (not extracted)";
      addEvidence(evidence, "attachment", "Attachment", detail, "card.attachments[" + index + "]");
    });

    return evidence;
  }

  function addEvidence(evidence, type, label, excerpt, path) {
    var text = cleanText(excerpt);
    if (!text) return;
    evidence.push({
      id: "ev-" + (evidence.length + 1),
      type: type,
      label: cleanText(label),
      excerpt: text.length > 220 ? text.slice(0, 217).trim() + "..." : text,
      path: path
    });
  }

  function findEvidenceIds(evidence, types) {
    return evidence.filter(function (item) {
      return types.indexOf(item.type) !== -1;
    }).slice(0, 6).map(function (item) {
      return item.id;
    });
  }

  function createEvidenceClaims(summary, evidence) {
    var claims = [];
    var sections = [
      { key: "about", title: "Card overview", types: ["title", "description", "label"] },
      { key: "history", title: "History", types: ["comment", "checklist", "attachment"] },
      { key: "status", title: "Current status", types: ["list", "due", "checklist", "member"] }
    ];

    sections.forEach(function (section) {
      var text = cleanText(summary && summary[section.key]);
      if (!text) return;
      var support = findEvidenceIds(evidence, section.types);
      claims.push({
        id: "claim-" + section.key,
        section: section.key,
        claim: text.length > 260 ? text.slice(0, 257).trim() + "..." : text,
        support: support,
        confidence: support.length ? "supported" : "uncertain"
      });
    });

    toArray(summary && summary.evidenceClaims).forEach(function (item, index) {
      var claim = typeof item === "string" ? cleanText(item) : cleanText(item && item.claim);
      if (!claim) return;
      claims.push({
        id: "claim-ai-" + (index + 1),
        section: "ai-evidence",
        claim: claim.length > 260 ? claim.slice(0, 257).trim() + "..." : claim,
        support: findEvidenceIds(evidence, ["title", "description", "comment", "checklist", "attachment", "due", "label", "member"]),
        confidence: cleanText(item && item.confidence) || "uncertain",
        source: cleanText(item && item.source)
      });
    });

    return claims;
  }

  function includesAny(text, words) {
    var lower = cleanText(text).toLowerCase();
    return words.some(function (word) {
      return lower.indexOf(word) !== -1;
    });
  }

  function makeItem(id, text, sourceIds, extra) {
    return Object.assign({
      id: id,
      text: cleanText(text),
      sourceIds: toArray(sourceIds)
    }, extra || {});
  }

  function extractBlockers(input, summary, evidence) {
    var card = normalizeCard(input);
    var blockers = [];
    var sourceText = [
      card.title,
      card.description,
      toArray(summary && summary.blockers).join(" "),
      toArray(summary && summary.risks).join(" "),
      card.comments.map(function (comment) { return comment.text; }).join(" ")
    ].join(" ");

    toArray(summary && summary.blockers).forEach(function (text, index) {
      blockers.push(makeItem("blocker-ai-" + (index + 1), text, findEvidenceIds(evidence, ["description", "comment", "checklist", "attachment"]), {
        severity: includesAny(text, ["legal", "payment", "invoice", "overdue", "client"]) ? "high" : "medium",
        type: "ai-structured"
      }));
    });

    if (includesAny(sourceText, BLOCKER_WORDS)) {
      blockers.push(makeItem("blocker-text", "Card text or comments mention a blocker, waiting state, missing item, or external dependency.", findEvidenceIds(evidence, ["description", "comment"]), {
        severity: "medium",
        type: "text-signal"
      }));
    }

    if (!card.description) {
      blockers.push(makeItem("blocker-description", "Missing description makes scope, acceptance criteria, and handoff unclear.", findEvidenceIds(evidence, ["title"]), {
        severity: "medium",
        type: "missing-context"
      }));
    }

    if (!card.members.length) {
      blockers.push(makeItem("blocker-owner", "No visible owner is assigned.", findEvidenceIds(evidence, ["title", "list"]), {
        severity: "medium",
        type: "missing-owner"
      }));
    }

    var dueState = getDueState(card);
    if (dueState === "overdue") {
      blockers.push(makeItem("blocker-overdue", "The card is overdue and needs priority review.", findEvidenceIds(evidence, ["due"]), {
        severity: "high",
        type: "deadline"
      }));
    }

    if (card.checklistSummary.incomplete > 0 && card.checklistSummary.percent !== null && card.checklistSummary.percent < 50) {
      blockers.push(makeItem("blocker-progress", "Less than half of the checklist is complete.", findEvidenceIds(evidence, ["checklist"]), {
        severity: "medium",
        type: "progress"
      }));
    }

    card.attachments.forEach(function (attachment, index) {
      if (attachment.error || (attachment.processed && !attachment.extractedTextAvailable)) {
        blockers.push(makeItem("blocker-attachment-" + index, "Attachment content was not fully extracted: " + attachment.name + ".", findEvidenceIds(evidence, ["attachment"]), {
          severity: "low",
          type: "attachment"
        }));
      }
    });

    return dedupeItems(blockers);
  }

  function getDueState(card) {
    if (!card.due || card.dueComplete) return "none";
    var due = new Date(card.due);
    if (Number.isNaN(due.getTime())) return "unknown";
    return due.getTime() < Date.now() ? "overdue" : "scheduled";
  }

  function extractNextActions(input, summary, evidence) {
    var card = normalizeCard(input);
    var actions = [];
    toArray(summary && summary.nextSteps).forEach(function (step, index) {
      actions.push(makeItem("next-" + (index + 1), step, findEvidenceIds(evidence, ["checklist", "description", "comment"]), {
        owner: detectOwner(step, card),
        priority: index === 0 ? "high" : "normal"
      }));
    });

    card.checklistSummary.incompleteItems.slice(0, 5).forEach(function (item, index) {
      if (!actions.some(function (action) { return action.text.toLowerCase() === item.toLowerCase(); })) {
        actions.push(makeItem("next-checklist-" + (index + 1), item, findEvidenceIds(evidence, ["checklist"]), {
          owner: detectOwner(item, card),
          priority: "normal"
        }));
      }
    });

    return actions.length ? actions.slice(0, 8) : [
      makeItem("next-confirm", "Confirm whether the card is complete or add the next concrete action.", findEvidenceIds(evidence, ["title", "list"]), {
        owner: card.members[0] || "",
        priority: "normal"
      })
    ];
  }

  function detectOwner(text, card) {
    var lower = cleanText(text).toLowerCase();
    if (lower.indexOf("robert") !== -1) return "Robert";
    if (lower.indexOf("va") !== -1 || lower.indexOf("assistant") !== -1) return "VA/team";
    return card.members[0] || "";
  }

  function extractRobertDecisions(input, summary, evidence) {
    var sources = []
      .concat(toArray(summary && summary.robertDecisions))
      .concat(toArray(summary && summary.nextSteps))
      .concat(toArray(summary && summary.recommendations))
      .concat(toArray(summary && summary.risks));
    var decisions = [];

    sources.forEach(function (text, index) {
      if (!includesAny(text, ROBERT_DECISION_WORDS)) return;
      var cleaned = cleanText(text);
      decisions.push(makeItem("decision-" + (index + 1), "Approve: Yes/No - " + cleaned, findEvidenceIds(evidence, ["description", "comment", "due", "attachment"]), {
        requiredBy: "Robert",
        reason: "Contains approval, decision, client, financial, legal, or Robert-specific wording.",
        riskLevel: includesAny(cleaned, ["payment", "invoice", "budget", "legal", "client"]) ? "high" : "medium"
      }));
    });

    return dedupeItems(decisions).slice(0, 5);
  }

  function extractVaReadyActions(input, summary, evidence) {
    var actions = [];
    toArray(summary && summary.vaReadyActions).forEach(function (text, index) {
      var cleaned = cleanText(text);
      if (!cleaned) return;
      actions.push(makeItem("va-ai-" + (index + 1), cleaned, findEvidenceIds(evidence, ["checklist", "description", "comment"]), {
        owner: "VA/team",
        needsRobert: false
      }));
    });

    toArray(summary && summary.nextSteps).forEach(function (text, index) {
      var cleaned = cleanText(text);
      if (!cleaned || includesAny(cleaned, ROBERT_DECISION_WORDS)) return;
      if (!includesAny(cleaned, VA_ACTION_WORDS)) return;
      actions.push(makeItem("va-" + (index + 1), cleaned, findEvidenceIds(evidence, ["checklist", "description", "comment"]), {
        owner: "VA/team",
        needsRobert: false
      }));
    });

    return dedupeItems(actions).slice(0, 6);
  }

  function createValidationFindings(input, summary, evidence, blockers, decisions) {
    var card = normalizeCard(input);
    var findings = [];

    toArray(summary && summary.validationFindings).forEach(function (text, index) {
      findings.push(finding("ai-validation-" + (index + 1), includesAny(text, ["unsupported", "conflict", "sensitive", "legal", "financial"]) ? "high" : "medium", text, findEvidenceIds(evidence, ["title", "description", "comment", "checklist", "attachment"])));
    });

    if (!card.description) {
      findings.push(finding("missing-description", "medium", "Card has no description; analysis is based on weaker context.", findEvidenceIds(evidence, ["title"])));
    }
    if (!card.commentCount) {
      findings.push(finding("no-comments", "low", "No comments were available, so history may be incomplete.", findEvidenceIds(evidence, ["title", "description"])));
    }
    if (card.attachmentCount && !card.attachments.some(function (attachment) { return attachment.extractedTextAvailable; })) {
      findings.push(finding("attachments-metadata-only", "medium", "Attachments are present but no attachment text was verified as extracted.", findEvidenceIds(evidence, ["attachment"])));
    }
    if (!toArray(summary && summary.nextSteps).length) {
      findings.push(finding("missing-next-actions", "medium", "Analysis did not provide specific next actions.", findEvidenceIds(evidence, ["title", "description"])));
    }
    if (!blockers.length && (!summary || !toArray(summary.risks).length)) {
      findings.push(finding("no-blockers-reviewed", "low", "No blockers were detected; review manually if the card is messy or high-risk.", findEvidenceIds(evidence, ["title", "description", "comment"])));
    }
    if (decisions.length) {
      findings.push(finding("decision-review", "high", "Robert decision items should be reviewed before acting.", decisions[0].sourceIds));
    }

    return findings;
  }

  function finding(id, severity, text, sourceIds) {
    return {
      id: id,
      severity: severity,
      text: text,
      sourceIds: toArray(sourceIds)
    };
  }

  function scoreSourceCompleteness(card) {
    var score = 20;
    if (card.title && card.title !== "Untitled Trello card") score += 10;
    if (card.description) score += 20;
    if (card.labels.length) score += 8;
    if (card.members.length) score += 10;
    if (card.due) score += 8;
    if (card.listName || card.boardName) score += 8;
    if (card.checklistSummary.total) score += 14;
    if (card.commentCount) score += 12;
    if (card.attachmentCount) score += 5;
    return Math.min(score, 100);
  }

  function calculateConfidence(input, summary, operational) {
    var card = normalizeCard(input);
    var dataCompleteness = scoreSourceCompleteness(card);
    var evidenceCoverage = operational.evidenceClaims.length
      ? Math.round((operational.evidenceClaims.filter(function (claim) { return claim.support.length > 0; }).length / operational.evidenceClaims.length) * 100)
      : 40;
    var actionSpecificity = operational.nextActions.filter(function (action) {
      return action.text.length > 12 && !/^confirm whether/i.test(action.text);
    }).length ? 80 : 45;
    var validationPenalty = operational.validationFindings.reduce(function (penalty, item) {
      if (item.severity === "high") return penalty + 15;
      if (item.severity === "medium") return penalty + 8;
      return penalty + 3;
    }, 0);
    var modelBoost = summary && summary.confidence === "high" ? 5 : 0;
    var overall = Math.round((dataCompleteness * 0.4) + (evidenceCoverage * 0.25) + (actionSpecificity * 0.25) + 10 + modelBoost - validationPenalty);
    overall = Math.max(25, Math.min(overall, 95));

    return {
      overall: overall,
      level: overall >= 80 ? "high" : overall >= 60 ? "medium" : "low",
      factors: {
        dataCompleteness: dataCompleteness,
        evidenceCoverage: evidenceCoverage,
        actionSpecificity: actionSpecificity,
        validationPenalty: validationPenalty
      },
      reviewNeeded: overall < 70 || operational.validationFindings.some(function (item) { return item.severity === "high"; }),
      explanation: buildConfidenceExplanation(dataCompleteness, evidenceCoverage, validationPenalty)
    };
  }

  function buildConfidenceExplanation(dataCompleteness, evidenceCoverage, validationPenalty) {
    var parts = [];
    parts.push("Data completeness " + dataCompleteness + "%.");
    parts.push("Evidence coverage " + evidenceCoverage + "%.");
    if (validationPenalty) parts.push("Validation findings reduce confidence.");
    return parts.join(" ");
  }

  function dedupeItems(items) {
    var seen = {};
    return items.filter(function (item) {
      var key = item.text.toLowerCase();
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function createOperationalAnalysis(input, summary) {
    var evidence = createEvidenceMap(input);
    var normalizedSummary = summary || {};
    var blockers = extractBlockers(input, normalizedSummary, evidence);
    var nextActions = extractNextActions(input, normalizedSummary, evidence);
    var robertDecisions = extractRobertDecisions(input, normalizedSummary, evidence);
    var vaReadyActions = extractVaReadyActions(input, normalizedSummary, evidence);
    var evidenceClaims = createEvidenceClaims(normalizedSummary, evidence);
    var operational = {
      blockers: blockers,
      nextActions: nextActions,
      robertDecisions: robertDecisions,
      vaReadyActions: vaReadyActions,
      evidence: evidence,
      evidenceClaims: evidenceClaims,
      validationFindings: []
    };
    operational.validationFindings = createValidationFindings(input, normalizedSummary, evidence, blockers, robertDecisions);
    operational.confidence = calculateConfidence(input, normalizedSummary, operational);
    return operational;
  }

  function createAnalysisRun(input, analysis, options) {
    var card = normalizeCard(input);
    var summary = (analysis && analysis.summary) || analysis || {};
    var operational = createOperationalAnalysis(card, summary);
    var timestamp = nowIso(options);
    var runId = "run-" + shortHash(card.id + timestamp + JSON.stringify(summary));

    return {
      id: runId,
      cardId: card.id,
      boardId: card.boardId,
      provider: (analysis && analysis.metadata && analysis.metadata.provider) || "Unknown",
      model: (analysis && analysis.metadata && analysis.metadata.model) || "",
      promptTemplateId: (options && options.promptTemplateId) || "operational-ledger-v1",
      startedAt: timestamp,
      completedAt: timestamp,
      status: (options && options.status) || "completed",
      errorMessage: (options && options.errorMessage) || "",
      tokenEstimate: analysis && analysis.metadata ? toNumber(analysis.metadata.tokens) : 0,
      costEstimate: analysis && analysis.metadata ? toNumber(analysis.metadata.cost) : 0,
      inputHash: shortHash(JSON.stringify(createCardSnapshot(card, options))),
      cardSnapshot: createCardSnapshot(card, options),
      result: {
        about: cleanText(summary.about),
        history: cleanText(summary.history),
        currentStatus: cleanText(summary.status || summary.currentStatus),
        completedWork: toArray(summary.completedWork).length
          ? toArray(summary.completedWork)
          : card.checklistSummary.complete ? [card.checklistSummary.complete + " checklist item(s) complete."] : [],
        blockers: operational.blockers,
        nextActions: operational.nextActions,
        robertDecisions: operational.robertDecisions,
        vaReadyActions: operational.vaReadyActions,
        risks: toArray(summary.risks),
        missingInfo: toArray(summary.missingInfo).map(function (item, index) {
          return finding("ai-missing-" + (index + 1), "medium", item, findEvidenceIds(operational.evidence, ["title", "description", "comment", "attachment"]));
        }).concat(operational.validationFindings.filter(function (item) {
          return item.id.indexOf("missing") === 0 || item.id === "no-comments" || item.id === "attachments-metadata-only";
        })),
        confidence: operational.confidence,
        confidenceReason: cleanText(summary.confidenceReason),
        evidenceClaims: operational.evidenceClaims,
        validationFindings: operational.validationFindings,
        evidence: operational.evidence
      },
      auditEvents: [{
        type: "analysis-created",
        createdAt: timestamp,
        actor: "power-up"
      }]
    };
  }

  function createLedgerEntry(input, analysis, options) {
    return {
      version: 1,
      cardId: normalizeCard(input).id,
      updatedAt: nowIso(options),
      lastRun: createAnalysisRun(input, analysis, options),
      feedback: [],
      exports: []
    };
  }

  function mergeLedgerHistory(existing, entry, limit) {
    var history = Array.isArray(existing) ? existing.slice() : [];
    var run = entry && entry.lastRun ? entry.lastRun : entry;
    if (!run || !run.id) return history;

    history = history.filter(function (item) {
      return item.id !== run.id;
    });
    history.unshift(run);
    return history.slice(0, limit || 25);
  }

  function summarizeRunChange(currentRun, previousRun) {
    if (!currentRun) {
      return {
        text: "No analysis run is available yet.",
        changes: [],
        confidenceTrend: "unknown"
      };
    }

    if (!previousRun) {
      return {
        text: "First saved analysis for this card.",
        changes: ["No previous analysis to compare."],
        confidenceTrend: "new"
      };
    }

    var changes = [];
    var currentSnapshot = currentRun.cardSnapshot || {};
    var previousSnapshot = previousRun.cardSnapshot || {};
    var currentResult = currentRun.result || {};
    var previousResult = previousRun.result || {};
    var currentConfidence = currentResult.confidence ? toNumber(currentResult.confidence.overall) : 0;
    var previousConfidence = previousResult.confidence ? toNumber(previousResult.confidence.overall) : 0;

    if (currentRun.inputHash && previousRun.inputHash && currentRun.inputHash !== previousRun.inputHash) {
      changes.push("Card source data changed since the previous analysis.");
    }

    if (currentSnapshot.descriptionHash && previousSnapshot.descriptionHash && currentSnapshot.descriptionHash !== previousSnapshot.descriptionHash) {
      changes.push("Card description changed.");
    }

    compareNumber("Checklist completed items", currentSnapshot.checklistSummary && currentSnapshot.checklistSummary.complete, previousSnapshot.checklistSummary && previousSnapshot.checklistSummary.complete, changes);
    compareNumber("Open checklist items", currentSnapshot.checklistSummary && currentSnapshot.checklistSummary.incomplete, previousSnapshot.checklistSummary && previousSnapshot.checklistSummary.incomplete, changes);
    compareNumber("Comment count", currentSnapshot.commentCount, previousSnapshot.commentCount, changes);
    compareNumber("Attachment count", currentSnapshot.attachmentCount, previousSnapshot.attachmentCount, changes);
    compareNumber("Detected blocker count", toArray(currentResult.blockers).length, toArray(previousResult.blockers).length, changes);
    compareNumber("Robert decision count", toArray(currentResult.robertDecisions).length, toArray(previousResult.robertDecisions).length, changes);
    compareNumber("VA/team-ready action count", toArray(currentResult.vaReadyActions).length, toArray(previousResult.vaReadyActions).length, changes);

    if (currentConfidence !== previousConfidence) {
      changes.push("Confidence changed from " + previousConfidence + "% to " + currentConfidence + "%.");
    }

    if (!changes.length) {
      changes.push("No material ledger changes detected.");
    }

    return {
      text: changes[0],
      changes: changes,
      confidenceTrend: currentConfidence > previousConfidence
        ? "up"
        : currentConfidence < previousConfidence
          ? "down"
          : "flat"
    };
  }

  function compareNumber(label, currentValue, previousValue, changes) {
    var currentNumber = toNumber(currentValue);
    var previousNumber = toNumber(previousValue);
    if (currentNumber === previousNumber) return;
    changes.push(label + " changed from " + previousNumber + " to " + currentNumber + ".");
  }

  function createHumanFeedback(analysisRunId, feedback, options) {
    return {
      id: "feedback-" + shortHash(analysisRunId + nowIso(options) + JSON.stringify(feedback || {})),
      analysisRunId: analysisRunId,
      rating: cleanText(feedback && feedback.rating),
      correctionText: cleanText(feedback && feedback.correctionText),
      incorrectSections: toArray(feedback && feedback.incorrectSections).map(cleanText).filter(Boolean),
      acceptedAt: feedback && feedback.acceptedAt ? feedback.acceptedAt : null,
      createdAt: nowIso(options)
    };
  }

  function createExportRecord(analysisRunId, exportType, destination, options) {
    return {
      id: "export-" + shortHash(analysisRunId + exportType + destination + nowIso(options)),
      analysisRunId: analysisRunId,
      exportType: cleanText(exportType || "markdown"),
      destination: cleanText(destination || "clipboard"),
      createdAt: nowIso(options)
    };
  }

  function markdownForLedgerRun(run) {
    var result = run.result || {};
    var lines = [
      "# " + (run.cardSnapshot && run.cardSnapshot.title ? run.cardSnapshot.title : "Trello card analysis"),
      "",
      "## Card overview",
      result.about || "",
      "",
      "## Current status",
      result.currentStatus || "",
      "",
      "## Blockers"
    ];

    appendItems(lines, result.blockers, "No blockers detected.");
    lines.push("", "## Next actions");
    appendItems(lines, result.nextActions, "No next actions detected.");
    lines.push("", "## Robert decisions");
    appendItems(lines, result.robertDecisions, "No Robert-specific decision detected.");
    lines.push("", "## VA/team-ready actions");
    appendItems(lines, result.vaReadyActions, "No VA/team-ready actions detected.");
    lines.push("", "## Validation");
    appendItems(lines, result.validationFindings, "No validation findings.");
    lines.push("", "## Confidence");
    lines.push((result.confidence ? result.confidence.overall + "% " + result.confidence.level : "Unknown") + ".");
    return lines.join("\n");
  }

  function plainTextForLedgerRun(run) {
    var result = run && run.result ? run.result : {};
    var title = run && run.cardSnapshot && run.cardSnapshot.title ? run.cardSnapshot.title : "Trello card analysis";
    var lines = [
      "Trello Card Intelligence",
      "Card: " + title,
      "",
      "Card overview:",
      cleanText(result.about || "No overview available."),
      "",
      "Current status:",
      cleanText(result.currentStatus || "No current status available."),
      "",
      "Blockers:"
    ];

    appendItems(lines, result.blockers, "No blockers detected.");
    lines.push("", "Next actions:");
    appendItems(lines, result.nextActions, "No next actions detected.");
    lines.push("", "Robert decisions:");
    appendItems(lines, result.robertDecisions, "No Robert-specific decision detected.");
    lines.push("", "VA/team-ready actions:");
    appendItems(lines, result.vaReadyActions, "No VA/team-ready actions detected.");
    lines.push("", "Missing information:");
    appendItems(lines, result.missingInfo, "No missing information detected.");
    lines.push("", "Confidence:");
    lines.push(result.confidence ? result.confidence.overall + "% " + result.confidence.level : "Unknown");
    return lines.join("\n");
  }

  function statusUpdateForLedgerRun(run) {
    var result = run && run.result ? run.result : {};
    var title = run && run.cardSnapshot && run.cardSnapshot.title ? run.cardSnapshot.title : "Trello card";
    var confidence = result.confidence ? result.confidence.overall + "% " + result.confidence.level : "Unknown";
    var lines = [
      "Status update: " + title,
      "",
      "Current status: " + cleanText(result.currentStatus || result.about || "No current status available."),
      "",
      "Top next action: " + firstItemText(result.nextActions, "No next action detected."),
      "Main blocker: " + firstItemText(result.blockers, "No blocker detected."),
      "Robert decision: " + firstItemText(result.robertDecisions, "No Robert-specific decision detected."),
      "VA/team handoff: " + firstItemText(result.vaReadyActions, "No VA/team-ready action detected."),
      "",
      "Confidence: " + confidence + "."
    ];

    if (result.confidenceReason) {
      lines.push("Confidence note: " + cleanText(result.confidenceReason));
    }
    return lines.join("\n");
  }

  function jsonForLedgerRun(run, options) {
    var exportObject = {
      schemaVersion: "summarize-this-card-intelligence-export-v1",
      exportedAt: nowIso(options),
      source: "Summarize This Trello Power-Up",
      analysisRun: {
        id: run && run.id,
        provider: run && run.provider,
        model: run && run.model,
        promptTemplateId: run && run.promptTemplateId,
        completedAt: run && run.completedAt,
        inputHash: run && run.inputHash
      },
      cardSnapshot: run && run.cardSnapshot ? run.cardSnapshot : {},
      result: run && run.result ? run.result : {}
    };
    return JSON.stringify(exportObject, null, 2);
  }

  function createTrelloCommentDraft(run) {
    var result = run && run.result ? run.result : {};
    var cardTitle = run && run.cardSnapshot && run.cardSnapshot.title
      ? run.cardSnapshot.title
      : "Trello card";
    var confidence = result.confidence
      ? result.confidence.overall + "% " + result.confidence.level
      : "Unknown";
    var reason = result.confidenceReason || (result.confidence && result.confidence.reason) || "";
    var lines = [
      "Summarize This - Card Intelligence",
      "",
      "Card: " + cardTitle,
      "",
      "Current status:",
      cleanText(result.currentStatus || result.about || "No current status available."),
      "",
      "Blockers:"
    ];

    appendItems(lines, result.blockers, "No blockers detected.");
    lines.push("", "Next actions:");
    appendItems(lines, result.nextActions, "No next actions detected.");
    lines.push("", "Robert decisions:");
    appendItems(lines, result.robertDecisions, "No Robert-specific decision detected.");
    lines.push("", "VA/team-ready actions:");
    appendItems(lines, result.vaReadyActions, "No VA/team-ready actions detected.");
    lines.push("", "Confidence: " + confidence + ".");
    if (reason) {
      lines.push("Confidence note: " + cleanText(reason));
    }
    lines.push("", "Review note: this draft was generated by Summarize This and should be reviewed before use.");
    return lines.join("\n").slice(0, 4000);
  }

  function firstItemText(items, fallback) {
    var values = toArray(items);
    if (!values.length) return fallback;
    return cleanText(values[0].text || values[0].claim || values[0]);
  }

  function appendItems(lines, items, fallback) {
    var values = toArray(items);
    if (!values.length) {
      lines.push("- " + fallback);
      return;
    }
    values.forEach(function (item) {
      lines.push("- " + cleanText(item.text || item.claim || item));
    });
  }

  return {
    createAnalysisRun: createAnalysisRun,
    createCardSnapshot: createCardSnapshot,
    createEvidenceMap: createEvidenceMap,
    createExportRecord: createExportRecord,
    createHumanFeedback: createHumanFeedback,
    createSourceCoverage: createSourceCoverage,
    createTrelloCommentDraft: createTrelloCommentDraft,
    createLedgerEntry: createLedgerEntry,
    createOperationalAnalysis: createOperationalAnalysis,
    jsonForLedgerRun: jsonForLedgerRun,
    markdownForLedgerRun: markdownForLedgerRun,
    mergeLedgerHistory: mergeLedgerHistory,
    normalizeCard: normalizeCard,
    plainTextForLedgerRun: plainTextForLedgerRun,
    statusUpdateForLedgerRun: statusUpdateForLedgerRun,
    summarizeRunChange: summarizeRunChange
  };
}));
