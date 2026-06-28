// Shared summarization helpers for the Trello Power-Up and Node tests.

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.SummarizeThis = factory();
  }
}(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var STOP_WORDS = {
    a: true, an: true, and: true, are: true, as: true, at: true, be: true,
    by: true, for: true, from: true, has: true, have: true, in: true,
    into: true, is: true, it: true, of: true, on: true, or: true, that: true,
    the: true, this: true, to: true, with: true, we: true, will: true
  };

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

  function truncate(value, maxLength) {
    var text = cleanText(value);
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 1).trim() + ".";
  }

  function firstSentences(value, count) {
    var text = cleanText(value);
    if (!text) return "";
    var parts = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
    return truncate(parts.slice(0, count).join(" "), 420);
  }

  function normalizeNamedItems(items) {
    return toArray(items).map(function (item) {
      if (typeof item === "string") return cleanText(item);
      return cleanText(item.name || item.fullName || item.username || item.color);
    }).filter(Boolean);
  }

  function normalizeComments(comments) {
    return toArray(comments).map(function (comment) {
      if (typeof comment === "string") {
        return { text: cleanText(comment) };
      }

      var data = comment.data || {};
      var creator = comment.memberCreator || {};
      return {
        text: cleanText(comment.text || data.text || comment.comment),
        date: comment.date || comment.createdAt || "",
        author: cleanText(creator.fullName || creator.username || comment.author)
      };
    }).filter(function (comment) {
      return comment.text;
    });
  }

  function compactCommentsForPrompt(comments) {
    return toArray(comments).slice(0, 12).map(function (comment) {
      return {
        text: truncate(comment.text, 700),
        date: comment.date || "",
        author: comment.author || ""
      };
    });
  }

  function getObjectName(value) {
    if (!value) return "";
    if (typeof value === "string") return cleanText(value);
    return cleanText(value.name || value.fullName || value.id);
  }

  function normalizeCardData(input) {
    var raw = input || {};
    var base = raw.card && typeof raw.card === "object"
      ? Object.assign({}, raw.card, raw)
      : Object.assign({}, raw);

    delete base.card;

    var card = {
      id: cleanText(base.id),
      name: cleanText(base.name || base.title || "Untitled Trello card"),
      desc: cleanText(base.desc || base.description),
      due: base.due || null,
      dueComplete: Boolean(base.dueComplete),
      labels: normalizeNamedItems(base.labels),
      members: normalizeNamedItems(base.members),
      attachments: toArray(base.attachments || base.attachmentDetails),
      checklists: toArray(base.checklists),
      comments: normalizeComments(base.comments),
      actions: toArray(base.actions),
      badges: base.badges || {},
      boardName: cleanText(base.boardName || getObjectName(base.board)),
      listName: cleanText(base.listName || getObjectName(base.list)),
      url: cleanText(base.url || base.shortUrl || base.shortLink),
      dateLastActivity: base.dateLastActivity || base.lastActivity || null
    };

    card.checklistStats = getChecklistStats(card);
    card.commentCount = card.comments.length || toNumber(card.badges.comments);
    card.attachmentCount = card.attachments.length || toNumber(card.badges.attachments);
    return card;
  }

  function getChecklistStats(card) {
    var total = 0;
    var complete = 0;
    var incompleteItems = [];

    toArray(card.checklists).forEach(function (checklist) {
      toArray(checklist.checkItems || checklist.items).forEach(function (item) {
        total += 1;
        if (item.state === "complete" || item.checked === true) {
          complete += 1;
        } else {
          incompleteItems.push(cleanText(item.name || item.text || "Checklist item"));
        }
      });
    });

    if (total === 0 && card.badges) {
      total = toNumber(card.badges.checkItems);
      complete = toNumber(card.badges.checkItemsChecked);
    }

    var percent = total > 0 ? Math.round((complete / total) * 100) : null;
    return {
      total: total,
      complete: complete,
      incomplete: Math.max(total - complete, 0),
      percent: percent,
      incompleteItems: incompleteItems.slice(0, 8)
    };
  }

  function getDueInfo(card, now) {
    if (!card.due) {
      return {
        hasDue: false,
        text: "No due date is set.",
        state: "none"
      };
    }

    var dueDate = new Date(card.due);
    if (Number.isNaN(dueDate.getTime())) {
      return {
        hasDue: false,
        text: "The due date could not be read.",
        state: "unknown"
      };
    }

    if (card.dueComplete) {
      return {
        hasDue: true,
        text: "The due date is marked complete.",
        state: "complete",
        date: dueDate
      };
    }

    var today = now || new Date();
    var days = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000);
    if (days < 0) {
      return {
        hasDue: true,
        text: "This card is overdue by " + Math.abs(days) + " day" + (Math.abs(days) === 1 ? "" : "s") + ".",
        state: "overdue",
        days: days,
        date: dueDate
      };
    }
    if (days === 0) {
      return {
        hasDue: true,
        text: "This card is due today.",
        state: "due-today",
        days: days,
        date: dueDate
      };
    }
    return {
      hasDue: true,
      text: "This card is due in " + days + " day" + (days === 1 ? "" : "s") + ".",
      state: days <= 3 ? "soon" : "scheduled",
      days: days,
      date: dueDate
    };
  }

  function extractKeywords(card) {
    var source = [card.name, card.desc].join(" ").toLowerCase();
    var counts = {};

    source.replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).forEach(function (word) {
      if (word.length < 4 || STOP_WORDS[word]) return;
      counts[word] = (counts[word] || 0) + 1;
    });

    return Object.keys(counts).sort(function (a, b) {
      return counts[b] - counts[a];
    }).slice(0, 6);
  }

  function buildRuleBasedAnalysis(input, options) {
    var card = normalizeCardData(input);
    var due = getDueInfo(card, options && options.now);
    var checklist = card.checklistStats;
    var keywords = extractKeywords(card);
    var nextSteps = [];
    var insights = [];
    var risks = [];
    var recommendations = [];

    var about = card.desc
      ? "This card, \"" + card.name + "\", is about " + firstSentences(card.desc, 2)
      : "This card is titled \"" + card.name + "\" but does not yet include a description, so the analysis is based on the title and available metadata.";

    if (card.labels.length) {
      about += " Labels indicate: " + card.labels.join(", ") + ".";
    }

    var historyParts = [];
    if (card.dateLastActivity) {
      historyParts.push("Last activity was recorded on " + new Date(card.dateLastActivity).toLocaleDateString() + ".");
    }
    if (card.commentCount) {
      historyParts.push(card.commentCount + " comment" + (card.commentCount === 1 ? "" : "s") + " " + (card.commentCount === 1 ? "is" : "are") + " available for context.");
    }
    if (card.actions.length) {
      historyParts.push(card.actions.length + " recent action" + (card.actions.length === 1 ? "" : "s") + " were included.");
    }
    if (checklist.total) {
      historyParts.push(checklist.complete + " of " + checklist.total + " checklist item" + (checklist.total === 1 ? "" : "s") + " " + (checklist.complete === 1 ? "is" : "are") + " complete.");
    }
    var history = historyParts.length
      ? historyParts.join(" ")
      : "There is limited activity history available from Trello for this card.";

    var statusParts = [];
    if (card.boardName) statusParts.push("Board: " + card.boardName + ".");
    if (card.listName) statusParts.push("Current list: " + card.listName + ".");
    statusParts.push(due.text);
    if (checklist.total) {
      statusParts.push("Checklist progress is " + checklist.percent + "% complete.");
    }
    var status = statusParts.join(" ");

    if (checklist.incompleteItems.length) {
      nextSteps = checklist.incompleteItems.slice(0, 5);
    }
    if (!card.desc) {
      nextSteps.push("Add a short description that states the goal, owner, and expected outcome.");
    }
    if (!card.members.length) {
      nextSteps.push("Assign an owner so the next action is clear.");
    }
    if (!card.due && checklist.incomplete > 0) {
      nextSteps.push("Set a due date or target review date for the remaining work.");
    }
    if (nextSteps.length === 0) {
      nextSteps.push("Confirm the card is complete or add the next concrete action.");
    }

    if (keywords.length) {
      insights.push("Main themes detected: " + keywords.join(", ") + ".");
    }
    if (checklist.total) {
      insights.push("Checklist completion is " + checklist.percent + "%, with " + checklist.incomplete + " item" + (checklist.incomplete === 1 ? "" : "s") + " remaining.");
    }
    if (card.attachmentCount) {
      insights.push(card.attachmentCount + " attachment" + (card.attachmentCount === 1 ? "" : "s") + " may contain supporting detail.");
    }
    if (insights.length === 0) {
      insights.push("The card has sparse metadata, so the summary should be treated as a starting point.");
    }

    if (due.state === "overdue" || due.state === "due-today") {
      risks.push(due.text);
    }
    if (!card.desc) {
      risks.push("Missing description makes scope and acceptance criteria unclear.");
    }
    if (!card.members.length) {
      risks.push("No visible owner is assigned.");
    }
    if (checklist.total && checklist.percent < 50) {
      risks.push("Less than half of the checklist is complete.");
    }

    recommendations.push("Use the next steps as the immediate action list for this card.");
    if (!card.desc) {
      recommendations.push("Add a concise card description before relying on AI analysis for decisions.");
    }
    if (card.commentCount === 0) {
      recommendations.push("Add a status comment when meaningful context lives outside the card.");
    }
    if (due.state === "overdue") {
      recommendations.push("Reconfirm priority and update the due date after the owner reviews the card.");
    }

    var qualityScore = scoreDataQuality(card);
    var qualityLevel = qualityScore >= 80 ? "high" : qualityScore >= 60 ? "medium" : "low";

    return {
      summary: {
        about: about,
        history: history,
        status: status,
        nextSteps: nextSteps,
        insights: insights,
        risks: risks,
        recommendations: recommendations,
        confidence: qualityLevel
      },
      metadata: {
        provider: "Local rules",
        model: "built-in summarizer",
        tokens: 0,
        cost: 0
      },
      qualityScore: qualityScore,
      qualityLevel: qualityLevel,
      source: "local"
    };
  }

  function scoreDataQuality(card) {
    var score = 35;
    if (card.name && card.name !== "Untitled Trello card") score += 5;
    if (card.desc) score += 20;
    if (card.labels.length) score += 8;
    if (card.members.length) score += 8;
    if (card.due) score += 8;
    if (card.checklistStats.total) score += 12;
    if (card.commentCount) score += 7;
    if (card.attachmentCount) score += 4;
    if (card.boardName || card.listName) score += 5;
    return Math.max(35, Math.min(score, 95));
  }

  function buildAIPrompt(input) {
    var card = normalizeCardData(input);
    var payload = {
      name: card.name,
      description: truncate(card.desc, 2500),
      board: card.boardName,
      list: card.listName,
      labels: card.labels.slice(0, 25),
      members: card.members.slice(0, 25),
      due: card.due,
      dueComplete: card.dueComplete,
      checklistProgress: card.checklistStats,
      comments: compactCommentsForPrompt(card.comments),
      attachmentCount: card.attachmentCount,
      url: card.url
    };

    return [
      "Analyze this Trello card as an evidence-backed operational intelligence ledger for Robert's Trello workflow.",
      "Return only valid JSON. Do not include markdown or commentary outside JSON.",
      "Use this schema:",
      "{",
      "  \"about\": \"what the card is about and why it matters\",",
      "  \"history\": \"what happened so far, based only on card data\",",
      "  \"currentStatus\": \"current list/stage, progress, owner, due state, and waiting state\",",
      "  \"completedWork\": [\"specific completed work\"],",
      "  \"blockers\": [\"specific blocker, missing information, or waiting state\"],",
      "  \"nextSteps\": [\"specific next action with owner if detectable\"],",
      "  \"robertDecisions\": [\"Yes/No decision that needs Robert, including why\"],",
      "  \"vaReadyActions\": [\"delegable VA/team action that does not need Robert approval\"],",
      "  \"insights\": [\"important operational insight\"],",
      "  \"risks\": [\"deadline, quality, communication, financial, legal, or client-sensitive risk\"],",
      "  \"missingInfo\": [\"missing data that limits confidence\"],",
      "  \"recommendations\": [\"practical recommendation\"],",
      "  \"evidenceClaims\": [{\"claim\":\"factual claim\",\"source\":\"title|description|comment|checklist|label|member|due|attachment\",\"confidence\":\"supported|uncertain\"}],",
      "  \"validationFindings\": [\"unsupported, conflicting, incomplete, or attachment-extraction issue\"],",
      "  \"confidence\": \"high|medium|low\",",
      "  \"confidenceReason\": \"brief explanation from data completeness and evidence coverage\"",
      "}",
      "Be concrete. Prefer short operational sentences. Do not invent dates, people, amounts, attachment contents, or history.",
      "If attachments are present but text is not provided, say attachment contents were not verified.",
      "If Robert is mentioned or approval/client/financial/legal risk appears, create a Robert Yes/No decision.",
      "If an action can be delegated without Robert, include it in vaReadyActions.",
      "",
      JSON.stringify(payload, null, 2)
    ].join("\n");
  }

  function parseMaybeJson(value) {
    if (typeof value === "object" && value !== null) return value;
    var text = cleanText(value);
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch (error) {
      var match = text.match(/\{[\s\S]*\}/);
      if (!match) return {};
      try {
        return JSON.parse(match[0]);
      } catch (innerError) {
        return {};
      }
    }
  }

  function ensureString(value, fallback) {
    var text = cleanText(value);
    return text || fallback || "";
  }

  function itemText(value) {
    if (typeof value === "string") return cleanText(value);
    if (!value || typeof value !== "object") return cleanText(value);
    return cleanText(
      value.text ||
      value.action ||
      value.claim ||
      value.summary ||
      value.description ||
      value.question ||
      value.reason ||
      value.title ||
      value.name
    );
  }

  function ensureList(value, fallback) {
    if (Array.isArray(value)) {
      return value.map(itemText).filter(Boolean);
    }
    if (typeof value === "string") {
      var lines = value.split(/\n|;|\d+\.\s+/).map(cleanText).filter(Boolean);
      if (lines.length) return lines;
    }
    return Array.isArray(fallback) ? fallback.slice() : [];
  }

  function ensureEvidenceClaims(value, fallback) {
    if (!Array.isArray(value)) {
      return Array.isArray(fallback) ? fallback.slice() : [];
    }

    return value.map(function (item) {
      if (typeof item === "string") {
        return {
          claim: cleanText(item),
          source: "",
          confidence: "uncertain"
        };
      }

      if (!item || typeof item !== "object") return null;
      var claim = cleanText(item.claim || item.text || item.summary);
      if (!claim) return null;
      return {
        claim: claim,
        source: cleanText(item.source || item.evidence || item.path),
        confidence: cleanText(item.confidence || "uncertain").toLowerCase()
      };
    }).filter(Boolean);
  }

  function normalizeAIAnalysis(rawValue, fallbackSummary) {
    var raw = parseMaybeJson(rawValue);
    var source = raw.summary || raw;
    var fallback = fallbackSummary || {};

    return {
      about: ensureString(source.about, fallback.about),
      history: ensureString(source.history || source.whatHappened, fallback.history),
      status: ensureString(source.status || source.currentStatus, fallback.status),
      currentStatus: ensureString(source.currentStatus || source.status, fallback.currentStatus || fallback.status),
      completedWork: ensureList(source.completedWork || source.completed_work, fallback.completedWork),
      blockers: ensureList(source.blockers, fallback.blockers),
      nextSteps: ensureList(source.nextSteps || source.next_steps, fallback.nextSteps),
      robertDecisions: ensureList(source.robertDecisions || source.robert_decisions, fallback.robertDecisions),
      vaReadyActions: ensureList(source.vaReadyActions || source.va_ready_actions, fallback.vaReadyActions),
      insights: ensureList(source.insights, fallback.insights),
      risks: ensureList(source.risks || source.blockers, fallback.risks),
      missingInfo: ensureList(source.missingInfo || source.missing_info, fallback.missingInfo),
      recommendations: ensureList(source.recommendations, fallback.recommendations),
      evidenceClaims: ensureEvidenceClaims(source.evidenceClaims || source.evidence_claims, fallback.evidenceClaims),
      validationFindings: ensureList(source.validationFindings || source.validation_findings, fallback.validationFindings),
      confidenceReason: ensureString(source.confidenceReason || source.confidence_reason, fallback.confidenceReason),
      confidence: cleanText(source.confidence || fallback.confidence || "medium").toLowerCase()
    };
  }

  function markdownForAnalysis(input, analysis) {
    var card = normalizeCardData(input);
    var summary = analysis.summary || analysis;
    var lines = [
      "# " + card.name,
      "",
      "## What this card is about",
      summary.about || "",
      "",
      "## What has happened",
      summary.history || "",
      "",
      "## Current status",
      summary.status || "",
      "",
      "## Next steps"
    ];

    ensureList(summary.nextSteps).forEach(function (item) {
      lines.push("- " + item);
    });

    lines.push("", "## Key insights");
    ensureList(summary.insights).forEach(function (item) {
      lines.push("- " + item);
    });

    lines.push("", "## Risks and blockers");
    ensureList(summary.risks).forEach(function (item) {
      lines.push("- " + item);
    });

    lines.push("", "## Recommendations");
    ensureList(summary.recommendations).forEach(function (item) {
      lines.push("- " + item);
    });

    return lines.join("\n");
  }

  function sampleCardData() {
    return {
      id: "sample-card",
      name: "Prepare launch checklist",
      desc: "Finalize the launch checklist for the new client dashboard. Confirm analytics, billing, onboarding copy, and support handoff before the release.",
      due: new Date(Date.now() + 3 * 86400000).toISOString(),
      dueComplete: false,
      labels: [{ name: "Launch" }, { name: "Client" }],
      members: [{ fullName: "Alex" }],
      board: { name: "Product Delivery" },
      list: { name: "In Progress" },
      checklists: [{
        name: "Launch tasks",
        checkItems: [
          { name: "Analytics events reviewed", state: "complete" },
          { name: "Billing flow checked", state: "incomplete" },
          { name: "Support handoff written", state: "incomplete" }
        ]
      }],
      comments: [{
        text: "QA found one issue in the billing flow.",
        date: new Date().toISOString(),
        memberCreator: { fullName: "Jamie" }
      }],
      attachments: [{ name: "launch-plan.pdf" }]
    };
  }

  return {
    buildAIPrompt: buildAIPrompt,
    buildRuleBasedAnalysis: buildRuleBasedAnalysis,
    markdownForAnalysis: markdownForAnalysis,
    normalizeAIAnalysis: normalizeAIAnalysis,
    normalizeCardData: normalizeCardData,
    sampleCardData: sampleCardData
  };
}));
