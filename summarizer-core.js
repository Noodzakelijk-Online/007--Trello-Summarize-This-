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

  var DEFAULT_PROMPT_CONTEXT = {
    descriptionCharacters: 2500,
    commentLimit: 12,
    commentCharacters: 700
  };

  var OUTPUT_MODES = {
    "operational-ledger": {
      label: "Operational ledger",
      instruction: "Prioritize balanced card intelligence: status, blockers, next actions, Robert decisions, VA/team handoff, evidence, and validation."
    },
    "status-update": {
      label: "Status update",
      instruction: "Prioritize a concise async status update with current state, progress, top blocker, top next action, and confidence."
    },
    "risk-review": {
      label: "Risk review",
      instruction: "Prioritize deadline, client, financial, legal, quality, communication, missing-information, and unsupported-claim risks."
    },
    "meeting-brief": {
      label: "Meeting brief",
      instruction: "Prioritize a meeting-ready brief: context, what changed, discussion points, decisions needed, and follow-up actions."
    },
    "next-action-checklist": {
      label: "Next-action checklist",
      instruction: "Prioritize concrete next actions with owner, dependency, timing, and whether Robert approval is needed."
    },
    "client-friendly": {
      label: "Client-friendly summary",
      instruction: "Prioritize a clear external-safe summary, avoid internal uncertainty unless it affects the client, and keep wording professional."
    }
  };

  function boundedNumber(value, fallback, min, max) {
    var number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(Math.round(number), max));
  }

  function normalizePromptContext(options) {
    var input = options && options.promptContext ? options.promptContext : options || {};
    return {
      descriptionCharacters: boundedNumber(input.descriptionCharacters, DEFAULT_PROMPT_CONTEXT.descriptionCharacters, 500, 5000),
      commentLimit: boundedNumber(input.commentLimit, DEFAULT_PROMPT_CONTEXT.commentLimit, 0, 25),
      commentCharacters: boundedNumber(input.commentCharacters, DEFAULT_PROMPT_CONTEXT.commentCharacters, 200, 1500)
    };
  }

  function normalizeOutputMode(value) {
    var key = cleanText(value || "operational-ledger").toLowerCase();
    return OUTPUT_MODES[key] ? key : "operational-ledger";
  }

  function getOutputModeLabel(value) {
    var key = normalizeOutputMode(value);
    return OUTPUT_MODES[key].label;
  }

  function getOutputModeInstruction(value) {
    var key = normalizeOutputMode(value);
    return OUTPUT_MODES[key].instruction;
  }

  function compactCommentsForPrompt(comments, context) {
    var limits = normalizePromptContext(context);
    return toArray(comments).slice(0, limits.commentLimit).map(function (comment) {
      return {
        text: truncate(comment.text, limits.commentCharacters),
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

    card.listContext = normalizeListContext(base.listContext || base.boardListContext, card.id, card.listName);
    card.checklistStats = getChecklistStats(card);
    card.commentCount = card.comments.length || toNumber(card.badges.comments);
    card.attachmentCount = card.attachments.length || toNumber(card.badges.attachments);
    return card;
  }

  function normalizeListContext(input, currentCardId, currentListName) {
    var source = input || {};
    var rawCards = toArray(source.cards || source.listCards || source.neighborCards);
    var compactCards = rawCards.map(function (card) {
      return {
        id: cleanText(card.id),
        name: cleanText(card.name || card.title || "Untitled card"),
        labels: normalizeNamedItems(card.labels).slice(0, 6),
        due: card.due || null,
        dueComplete: Boolean(card.dueComplete),
        listName: cleanText(card.listName || getObjectName(card.list))
      };
    }).filter(function (card) {
      return card.name;
    }).slice(0, 25);

    var currentIndex = -1;
    if (currentCardId) {
      currentIndex = compactCards.findIndex(function (card) {
        return card.id === currentCardId;
      });
    }

    var neighbors = [];
    if (currentIndex >= 0) {
      neighbors = compactCards.slice(Math.max(0, currentIndex - 2), currentIndex)
        .concat(compactCards.slice(currentIndex + 1, currentIndex + 3));
    } else {
      neighbors = compactCards.slice(0, 4);
    }

    return {
      enabled: source.enabled !== false,
      listName: cleanText(source.listName || currentListName),
      totalCards: toNumber(source.totalCards) || compactCards.length,
      sampledCards: compactCards.length,
      currentPosition: currentIndex >= 0 ? currentIndex + 1 : null,
      neighboringCards: neighbors.map(function (card) {
        return {
          name: card.name,
          labels: card.labels.slice(0, 4),
          due: card.due,
          dueComplete: card.dueComplete
        };
      }),
      labelPatterns: topLabelsFromCards(compactCards),
      source: cleanText(source.source || "")
    };
  }

  function topLabelsFromCards(cards) {
    var counts = {};
    cards.forEach(function (card) {
      toArray(card.labels).forEach(function (label) {
        var key = cleanText(label);
        if (!key) return;
        counts[key] = (counts[key] || 0) + 1;
      });
    });
    return Object.keys(counts).sort(function (a, b) {
      return counts[b] - counts[a] || a.localeCompare(b);
    }).slice(0, 6).map(function (label) {
      return {
        label: label,
        count: counts[label]
      };
    });
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

  function detectSensitiveSignals(input) {
    var card = normalizeCardData(input);
    var source = [
      card.name,
      card.desc,
      card.boardName,
      card.listName,
      card.labels.join(" "),
      card.members.join(" "),
      card.attachments.map(function (attachment) { return attachment.name || ""; }).join(" "),
      card.comments.slice(0, 12).map(function (comment) { return comment.text || ""; }).join(" ")
    ].join(" ").toLowerCase();
    var categories = {
      client: ["client", "customer", "account", "proposal", "stakeholder"],
      financial: ["invoice", "payment", "billing", "budget", "amount", "bank", "tax", "credit", "debit", "subscription"],
      legal: ["legal", "contract", "gdpr", "privacy", "compliance", "terms", "lawsuit", "liability"],
      personal: ["personal", "password", "passport", "address", "phone", "email", "medical", "health", "hr", "salary"]
    };
    var matchedCategories = [];
    var matches = [];

    Object.keys(categories).forEach(function (category) {
      categories[category].forEach(function (word) {
        if (source.indexOf(word) === -1) return;
        if (matchedCategories.indexOf(category) === -1) matchedCategories.push(category);
        if (matches.indexOf(word) === -1) matches.push(word);
      });
    });

    return {
      requiresAiApproval: matchedCategories.length > 0,
      categories: matchedCategories,
      matches: matches.slice(0, 12),
      reason: matchedCategories.length
        ? "Card text or metadata contains " + matchedCategories.join(", ") + " signal(s)."
        : "No sensitive AI handoff signal detected."
    };
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
    if (card.listContext && card.listContext.sampledCards) {
      insights.push("List context includes " + card.listContext.sampledCards + " sampled card" + (card.listContext.sampledCards === 1 ? "" : "s") + " from " + (card.listContext.listName || "the current list") + ".");
      if (card.listContext.labelPatterns.length) {
        insights.push("Common list labels: " + card.listContext.labelPatterns.map(function (item) {
          return item.label + " (" + item.count + ")";
        }).join(", ") + ".");
      }
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
    if (!card.listContext || !card.listContext.sampledCards) {
      recommendations.push("Enable list context when this card needs sprint or neighboring-card comparison.");
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

  function buildAIPrompt(input, options) {
    var card = normalizeCardData(input);
    var context = normalizePromptContext(options);
    var outputMode = normalizeOutputMode(options && options.outputMode);
    var comments = compactCommentsForPrompt(card.comments, context);
    var payload = {
      outputMode: {
        key: outputMode,
        label: getOutputModeLabel(outputMode),
        instruction: getOutputModeInstruction(outputMode)
      },
      name: card.name,
      description: truncate(card.desc, context.descriptionCharacters),
      board: card.boardName,
      list: card.listName,
      labels: card.labels.slice(0, 25),
      members: card.members.slice(0, 25),
      due: card.due,
      dueComplete: card.dueComplete,
      listContext: card.listContext,
      sensitiveSignals: detectSensitiveSignals(input),
      checklistProgress: card.checklistStats,
      comments: comments,
      attachmentCount: card.attachmentCount,
      url: card.url,
      contextIncluded: {
        descriptionCharacters: Math.min(card.desc.length, context.descriptionCharacters),
        commentLimit: context.commentLimit,
        commentCharacters: context.commentCharacters,
        commentsAvailable: card.comments.length,
        commentsIncluded: comments.length,
        listContextCards: card.listContext ? card.listContext.sampledCards : 0
      }
    };

    return [
      "Analyze this Trello card as an evidence-backed operational intelligence ledger for Robert's Trello workflow.",
      "Output mode: " + getOutputModeLabel(outputMode) + ". " + getOutputModeInstruction(outputMode),
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
      "Use listContext only as lightweight board/list signal; do not infer hidden card details from neighboring card titles.",
      "If sensitiveSignals are present, keep the response operational and avoid exposing unnecessary private details.",
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
      listContext: {
        listName: "In Progress",
        totalCards: 5,
        source: "sample",
        cards: [
          { id: "sample-prior", name: "Confirm analytics baseline", labels: [{ name: "Launch" }] },
          { id: "sample-card", name: "Prepare launch checklist", labels: [{ name: "Launch" }, { name: "Client" }] },
          { id: "sample-next", name: "Draft support handoff", labels: [{ name: "Client" }, { name: "Support" }] },
          { id: "sample-later", name: "Review billing test run", labels: [{ name: "Billing" }, { name: "Launch" }] }
        ]
      },
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
    detectSensitiveSignals: detectSensitiveSignals,
    getOutputModeInstruction: getOutputModeInstruction,
    getOutputModeLabel: getOutputModeLabel,
    normalizeOutputMode: normalizeOutputMode,
    normalizePromptContext: normalizePromptContext,
    markdownForAnalysis: markdownForAnalysis,
    normalizeAIAnalysis: normalizeAIAnalysis,
    normalizeCardData: normalizeCardData,
    sampleCardData: sampleCardData
  };
}));
