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

  function normalizeActions(actions) {
    return toArray(actions).map(function (action, index) {
      if (typeof action === "string") {
        return {
          id: "activity-" + (index + 1),
          type: "activity",
          text: truncate(action, 220),
          date: "",
          author: ""
        };
      }

      var data = action.data || {};
      var creator = action.memberCreator || {};
      var type = cleanText(action.type || data.type || "activity");
      var text = cleanText(
        action.text ||
        data.text ||
        data.comment ||
        ((data.card && data.card.name) || "") ||
        action.summary ||
        action.name ||
        type
      );

      return {
        id: cleanText(action.id || "activity-" + (index + 1)),
        type: type,
        text: truncate(text, 220),
        date: action.date || action.createdAt || "",
        author: cleanText(creator.fullName || creator.username || action.author)
      };
    }).filter(function (action) {
      return action.text || action.type;
    }).slice(0, 25);
  }

  function getAttachmentExtension(attachment) {
    var source = cleanText((attachment && (attachment.name || attachment.url)) || attachment);
    var path = source.split("?")[0].split("#")[0];
    var match = /\.([a-z0-9]{1,8})$/i.exec(path);
    return match ? match[1].toLowerCase() : "";
  }

  function classifyAttachment(attachment) {
    var name = cleanText((attachment && attachment.name) || attachment).toLowerCase();
    var mime = cleanText(attachment && (attachment.mimeType || attachment.type)).toLowerCase();
    var extension = getAttachmentExtension(attachment);

    if (/transcript|captions?|subtitle|minutes|meeting notes/.test(name) || ["vtt", "srt", "txt"].indexOf(extension) !== -1) return "transcript";
    if (/recording|video|audio|zoom|meet|teams|loom|call/.test(name) || /^video\//.test(mime) || /^audio\//.test(mime) || ["mp4", "mov", "m4v", "webm", "mp3", "m4a", "wav", "aac"].indexOf(extension) !== -1) return "recording";
    if (/spreadsheet|excel|csv/.test(mime) || ["xls", "xlsx", "csv", "tsv"].indexOf(extension) !== -1) return "spreadsheet";
    if (/presentation|powerpoint/.test(mime) || ["ppt", "pptx", "key"].indexOf(extension) !== -1) return "presentation";
    if (/pdf|word|document|text/.test(mime) || ["pdf", "doc", "docx", "rtf", "md"].indexOf(extension) !== -1) return "document";
    if (/^image\//.test(mime) || ["png", "jpg", "jpeg", "gif", "webp", "svg"].indexOf(extension) !== -1) return "image";
    if (cleanText(attachment && attachment.url)) return "link";
    return "file";
  }

  function normalizeAttachments(attachments) {
    return toArray(attachments).map(function (attachment, index) {
      if (typeof attachment === "string") {
        attachment = { name: attachment };
      }
      var name = cleanText(attachment.name || "Attachment");
      var mimeType = cleanText(attachment.mimeType || attachment.type);
      var error = cleanText(attachment.error);
      var extractedTextAvailable = Boolean(cleanText(attachment.extractedText || attachment.text));
      var processed = attachment.processed === true;
      var status = error ? "failed" : extractedTextAvailable ? "text-extracted" : processed ? "metadata-only" : "not-extracted";
      return {
        id: cleanText(attachment.id || "attachment-" + (index + 1)),
        name: truncate(name, 160),
        mimeType: mimeType,
        extension: getAttachmentExtension(attachment),
        category: classifyAttachment(attachment),
        bytes: toNumber(attachment.bytes || attachment.size),
        processed: processed,
        extractedTextAvailable: extractedTextAvailable,
        status: status,
        error: error
      };
    }).filter(function (attachment) {
      return attachment.name;
    }).slice(0, 25);
  }

  function summarizeAttachmentCategories(attachments) {
    var counts = {};
    toArray(attachments).forEach(function (attachment) {
      var category = attachment.category || "file";
      counts[category] = (counts[category] || 0) + 1;
    });
    var parts = Object.keys(counts).sort().map(function (category) {
      return counts[category] + " " + category + (counts[category] === 1 ? "" : "s");
    });
    return parts.length ? parts.join(", ") : "no attachment metadata";
  }

  function compactAttachmentsForPrompt(attachments) {
    return toArray(attachments).slice(0, 12).map(function (attachment) {
      return {
        name: attachment.name,
        category: attachment.category,
        extension: attachment.extension,
        mimeType: attachment.mimeType,
        status: attachment.status,
        extractedTextAvailable: attachment.extractedTextAvailable,
        error: attachment.error
      };
    });
  }

  function valueFromCustomField(item) {
    if (!item || typeof item !== "object") return cleanText(item);
    var value = item.value || {};
    if (value.text !== undefined) return cleanText(value.text);
    if (value.number !== undefined) return cleanText(value.number);
    if (value.date !== undefined) return cleanText(value.date);
    if (value.checked !== undefined) return value.checked === "true" || value.checked === true ? "Yes" : "No";
    if (item.valueText !== undefined) return cleanText(item.valueText);
    if (item.valueNumber !== undefined) return cleanText(item.valueNumber);
    if (item.valueDate !== undefined) return cleanText(item.valueDate);
    if (item.valueChecked !== undefined) return item.valueChecked ? "Yes" : "No";
    if (item.value !== undefined && typeof item.value !== "object") return cleanText(item.value);
    if (item.option && item.option.value) return valueFromCustomField(item.option);
    if (item.idValue) return cleanText(item.idValue);
    return "";
  }

  function normalizeCustomFields(fields) {
    return toArray(fields).map(function (field, index) {
      var definition = field.customField || field.field || {};
      var name = cleanText(field.name || field.fieldName || definition.name || field.idCustomField || field.id || "Custom field " + (index + 1));
      var value = valueFromCustomField(field);
      return {
        id: cleanText(field.id || field.idCustomField || "custom-field-" + (index + 1)),
        name: name,
        type: cleanText(field.type || definition.type),
        value: truncate(value, 180)
      };
    }).filter(function (field) {
      return field.name || field.value;
    }).slice(0, 25);
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

  var OUTPUT_LANGUAGES = {
    en: {
      label: "English",
      instruction: "Write all user-facing summary values in English."
    },
    nl: {
      label: "Dutch",
      instruction: "Write all user-facing summary values in Dutch."
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

  function normalizeOutputLanguage(value) {
    var key = cleanText(value || "en").toLowerCase();
    if (key === "english") key = "en";
    if (key === "dutch" || key === "nederlands" || key === "nl-nl") key = "nl";
    return OUTPUT_LANGUAGES[key] ? key : "en";
  }

  function getOutputLanguageLabel(value) {
    var key = normalizeOutputLanguage(value);
    return OUTPUT_LANGUAGES[key].label;
  }

  function getOutputLanguageInstruction(value) {
    var key = normalizeOutputLanguage(value);
    return OUTPUT_LANGUAGES[key].instruction;
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

  function normalizePriorFeedback(records) {
    return toArray(records).map(function (record) {
      return {
        rating: cleanText(record.rating),
        correctionText: truncate(record.correctionText, 260),
        incorrectSections: toArray(record.incorrectSections).map(cleanText).filter(Boolean).slice(0, 8),
        createdAt: record.createdAt || "",
        acceptedAt: record.acceptedAt || null
      };
    }).filter(function (record) {
      return record.rating || record.correctionText || record.incorrectSections.length;
    }).slice(0, 5);
  }

  function normalizeCustomInstructions(value) {
    return truncate(value, 600);
  }

  function normalizePromptTemplates(records) {
    var seen = {};
    return toArray(records).map(function (record, index) {
      var instructions = normalizeCustomInstructions(
        record && (record.instructions || record.customInstructions || record.text)
      );
      var name = truncate(record && record.name ? record.name : "Template " + (index + 1), 60);
      var id = cleanText(record && record.id)
        .replace(/[^a-zA-Z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);
      if (!id) id = "template-" + (index + 1);
      if (seen[id]) id = id + "-" + (index + 1);
      seen[id] = true;
      return {
        id: id,
        name: name,
        instructions: instructions,
        createdAt: cleanText(record && record.createdAt),
        updatedAt: cleanText(record && record.updatedAt)
      };
    }).filter(function (record) {
      return record.name && record.instructions;
    }).slice(0, 10);
  }

  function normalizePromptTemplateSettings(settings) {
    var source = settings || {};
    var templates = normalizePromptTemplates(source.promptTemplates);
    var selectedId = cleanText(source.selectedPromptTemplateId);
    var selected = templates.filter(function (template) {
      return template.id === selectedId;
    })[0] || null;
    var customInstructions = normalizeCustomInstructions(source.customInstructions);
    if (!customInstructions && selected) customInstructions = selected.instructions;

    return {
      customInstructions: customInstructions,
      selectedPromptTemplateId: selected ? selected.id : "",
      selectedPromptTemplateName: selected ? selected.name : "",
      promptTemplates: templates
    };
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
      attachments: normalizeAttachments(base.attachments || base.attachmentDetails),
      checklists: toArray(base.checklists),
      comments: normalizeComments(base.comments),
      actions: normalizeActions(base.actions || base.activity),
      customFields: normalizeCustomFields(base.customFields || base.customFieldItems),
      badges: base.badges || {},
      boardName: cleanText(base.boardName || getObjectName(base.board)),
      listName: cleanText(base.listName || getObjectName(base.list)),
      url: cleanText(base.url || base.shortUrl || base.shortLink),
      dateLastActivity: base.dateLastActivity || base.lastActivity || null
    };

    card.priorFeedback = normalizePriorFeedback(base.priorFeedback || base.feedback || base.previousFeedback);
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
      sampledCardPreview: compactCards.slice(0, 12).map(function (card) {
        return {
          id: card.id,
          name: card.name,
          labels: card.labels.slice(0, 4),
          due: card.due,
          dueComplete: card.dueComplete
        };
      }),
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

  function createListPlanningBrief(input, options) {
    var card = normalizeCardData(input);
    var context = card.listContext || {};
    var previewCards = toArray(context.sampledCardPreview);
    var neighbors = toArray(context.neighboringCards);
    var now = options && options.now ? new Date(options.now) : new Date();
    if (Number.isNaN(now.getTime())) now = new Date();
    var dueCards = previewCards.filter(function (item) {
      return item && item.due && !item.dueComplete;
    }).map(function (item) {
      return {
        name: item.name,
        due: item.due,
        overdue: new Date(item.due).getTime() < now.getTime()
      };
    }).slice(0, 8);
    var labelPatterns = toArray(context.labelPatterns).slice(0, 6);
    var nextFocus = [];

    if (dueCards.some(function (item) { return item.overdue; })) {
      nextFocus.push("Review overdue cards in this list before adding new work.");
    }
    if (labelPatterns.length) {
      nextFocus.push("Use common labels to group related handoff work: " + labelPatterns.map(function (item) {
        return item.label + " (" + item.count + ")";
      }).join(", ") + ".");
    }
    if (card.name && context.currentPosition) {
      nextFocus.push("Current card position: " + context.currentPosition + " of " + (context.totalCards || context.sampledCards) + ".");
    }
    if (!nextFocus.length) {
      nextFocus.push("Use this as a lightweight list overview; detailed card bodies were not read.");
    }

    return {
      schemaVersion: "summarize-this-list-planning-brief-v1",
      listName: context.listName || card.listName || "",
      currentCard: card.name,
      currentPosition: context.currentPosition || null,
      totalCards: context.totalCards || context.sampledCards || 0,
      sampledCards: context.sampledCards || previewCards.length || 0,
      neighboringCards: neighbors.map(function (item) {
        return {
          name: item.name,
          labels: toArray(item.labels).slice(0, 4),
          due: item.due || null,
          dueComplete: Boolean(item.dueComplete)
        };
      }).slice(0, 8),
      labelPatterns: labelPatterns,
      dueCards: dueCards,
      nextFocus: nextFocus,
      source: context.source || "",
      privacyNote: "This brief uses bounded list metadata only: card names, labels, due states, and current position. It does not include neighboring card descriptions, comments, attachments, or AI output."
    };
  }

  function markdownForListPlanningBrief(brief) {
    var source = brief || {};
    var lines = [
      "# List planning brief",
      "",
      "List: " + (source.listName || "current list"),
      "Current card: " + (source.currentCard || "unknown"),
      "Sampled cards: " + (source.sampledCards || 0) + " of " + (source.totalCards || source.sampledCards || 0)
    ];

    if (source.currentPosition) {
      lines.push("Current position: " + source.currentPosition + " of " + (source.totalCards || source.sampledCards || 0));
    }

    lines.push("", "## Next focus");
    toArray(source.nextFocus).forEach(function (item) {
      lines.push("- " + item);
    });

    lines.push("", "## Nearby cards");
    if (toArray(source.neighboringCards).length) {
      toArray(source.neighboringCards).forEach(function (item) {
        var labels = toArray(item.labels).map(function (label) { return cleanText(label); }).filter(Boolean);
        lines.push("- " + item.name + (labels.length ? " [" + labels.join(", ") + "]" : ""));
      });
    } else {
      lines.push("- No nearby cards were available in the bounded sample.");
    }

    lines.push("", "## Common labels");
    if (toArray(source.labelPatterns).length) {
      toArray(source.labelPatterns).forEach(function (item) {
        lines.push("- " + item.label + ": " + item.count);
      });
    } else {
      lines.push("- No label patterns were available.");
    }

    if (toArray(source.dueCards).length) {
      lines.push("", "## Due signals");
      toArray(source.dueCards).forEach(function (item) {
        lines.push("- " + item.name + ": " + item.due + (item.overdue ? " (overdue)" : ""));
      });
    }

    lines.push("", "Privacy: " + source.privacyNote);
    return lines.join("\n");
  }

  function createBatchAnalysisPlan(input, options) {
    var card = normalizeCardData(input);
    var context = card.listContext || {};
    var now = options && options.now ? new Date(options.now) : new Date();
    if (Number.isNaN(now.getTime())) now = new Date();
    var dueSoonDays = toNumber(options && options.dueSoonDays) || 7;
    var dueSoonMs = dueSoonDays * 86400000;
    var previewCards = toArray(context.sampledCardPreview).slice(0, 12);
    var commonLabels = toArray(context.labelPatterns).slice(0, 6);
    var commonLabelNames = commonLabels.map(function (item) { return item.label; });
    var queue = previewCards.map(function (item, index) {
      var labels = toArray(item.labels).slice(0, 4);
      var dueDate = item.due ? new Date(item.due) : null;
      var dueTime = dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate.getTime() : null;
      var signals = [];

      if (card.name && item.name === card.name) signals.push("current-card");
      if (item.due && !item.dueComplete) {
        if (dueTime && dueTime < now.getTime()) {
          signals.push("overdue");
        } else if (dueTime && dueTime - now.getTime() <= dueSoonMs) {
          signals.push("due-soon");
        } else {
          signals.push("due-open");
        }
      }
      labels.forEach(function (label) {
        if (commonLabelNames.indexOf(label) !== -1) {
          signals.push("common-label:" + label);
        }
      });

      return {
        queuePosition: index + 1,
        cardId: cleanText(item.id),
        name: cleanText(item.name),
        labels: labels,
        due: item.due || null,
        dueComplete: Boolean(item.dueComplete),
        signals: signals.slice(0, 6),
        requiredApproval: "Review this queue item before any full-card AI analysis or Trello write.",
        recommendedMode: signals.indexOf("overdue") !== -1 || signals.indexOf("due-soon") !== -1
          ? "risk-review"
          : "operational-ledger"
      };
    }).filter(function (item) {
      return item.name;
    });

    var approvalChecklist = [
      "Review selected cards before running batch analysis.",
      "Approve AI handoff explicitly before sending card bodies, comments, or attachments to a provider.",
      "Keep concurrency at 1 until Trello/API rate limits are visible.",
      "Do not post summaries back to Trello without exact draft review and approval."
    ];

    return {
      schemaVersion: "summarize-this-batch-analysis-plan-v1",
      listName: context.listName || card.listName || "",
      currentCard: card.name,
      totalCards: context.totalCards || context.sampledCards || queue.length,
      sampledCards: context.sampledCards || queue.length,
      queueSize: queue.length,
      queue: queue,
      commonLabels: commonLabels,
      approvalRequired: true,
      aiHandoffDefault: "off",
      recommendedConcurrency: 1,
      recommendedDelaySeconds: 2,
      nextSteps: queue.length ? [
        "Use this as the reviewed queue seed for a future full-card batch run.",
        "Start with overdue or due-soon cards, then process common-label groups.",
        "Open each card for full evidence-backed analysis before exporting or posting results."
      ] : [
        "Enable list context in settings before building a batch analysis plan."
      ],
      approvalChecklist: approvalChecklist,
      privacyNote: "This batch plan uses bounded list metadata only: card names, optional ids, labels, due states, and current position. It does not include card descriptions, comments, attachments, or AI output."
    };
  }

  function markdownForBatchAnalysisPlan(plan) {
    var source = plan || {};
    var lines = [
      "# Batch analysis plan",
      "",
      "List: " + (source.listName || "current list"),
      "Current card: " + (source.currentCard || "unknown"),
      "Queue size: " + (source.queueSize || 0) + " of " + (source.totalCards || source.sampledCards || 0),
      "AI handoff default: " + (source.aiHandoffDefault || "off"),
      "Recommended concurrency: " + (source.recommendedConcurrency || 1),
      "Recommended delay: " + (source.recommendedDelaySeconds || 2) + " seconds",
      "",
      "## Queue"
    ];

    if (toArray(source.queue).length) {
      toArray(source.queue).forEach(function (item) {
        var labels = toArray(item.labels).map(function (label) { return cleanText(label); }).filter(Boolean);
        var signals = toArray(item.signals).map(function (signal) { return cleanText(signal); }).filter(Boolean);
        lines.push("- " + item.queuePosition + ". " + item.name
          + (labels.length ? " [" + labels.join(", ") + "]" : "")
          + (item.due ? " due " + item.due : "")
          + (signals.length ? " (" + signals.join(", ") + ")" : ""));
      });
    } else {
      lines.push("- No queue items were available in the bounded list sample.");
    }

    lines.push("", "## Approval checklist");
    toArray(source.approvalChecklist).forEach(function (item) {
      lines.push("- " + item);
    });

    lines.push("", "## Next steps");
    toArray(source.nextSteps).forEach(function (item) {
      lines.push("- " + item);
    });

    lines.push("", "Privacy: " + source.privacyNote);
    return lines.join("\n");
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
      card.customFields.map(function (field) { return [field.name, field.value].join(" "); }).join(" "),
      card.attachments.map(function (attachment) { return [attachment.name, attachment.category, attachment.status].join(" "); }).join(" "),
      card.comments.slice(0, 12).map(function (comment) { return comment.text || ""; }).join(" "),
      card.actions.slice(0, 12).map(function (action) { return [action.type, action.text, action.author].join(" "); }).join(" "),
      card.priorFeedback.map(function (item) { return item.correctionText || ""; }).join(" ")
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
      historyParts.push(card.actions.length + " recent activity item" + (card.actions.length === 1 ? "" : "s") + " were included.");
    }
    if (card.priorFeedback.length) {
      historyParts.push(card.priorFeedback.length + " prior correction" + (card.priorFeedback.length === 1 ? "" : "s") + " from review feedback " + (card.priorFeedback.length === 1 ? "is" : "are") + " available for this run.");
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
      insights.push("Attachment metadata includes: " + summarizeAttachmentCategories(card.attachments) + ".");
      if (card.attachments.some(function (attachment) { return !attachment.extractedTextAvailable; })) {
        risks.push("Attachment contents were not verified; only attachment metadata is available for one or more file(s).");
      }
    }
    if (card.actions.length) {
      insights.push("Recent activity included: " + card.actions.slice(0, 3).map(function (action) {
        return action.type + (action.author ? " by " + action.author : "");
      }).join("; ") + ".");
    }
    if (card.listContext && card.listContext.sampledCards) {
      insights.push("List context includes " + card.listContext.sampledCards + " sampled card" + (card.listContext.sampledCards === 1 ? "" : "s") + " from " + (card.listContext.listName || "the current list") + ".");
      if (card.listContext.labelPatterns.length) {
        insights.push("Common list labels: " + card.listContext.labelPatterns.map(function (item) {
          return item.label + " (" + item.count + ")";
        }).join(", ") + ".");
      }
    }
    if (card.customFields.length) {
      insights.push("Custom fields included: " + card.customFields.slice(0, 5).map(function (field) {
        return field.name + (field.value ? " = " + field.value : "");
      }).join("; ") + ".");
    }
    if (card.priorFeedback.length) {
      insights.push("Prior user feedback is available and should be reviewed before treating this analysis as final.");
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
    if (card.priorFeedback.length) {
      recommendations.push("Check prior corrections and avoid repeating previously flagged mistakes.");
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
    if (card.actions.length) score += 3;
    if (card.attachmentCount) score += 4;
    if (card.customFields.length) score += 4;
    if (card.boardName || card.listName) score += 5;
    return Math.max(35, Math.min(score, 95));
  }

  function buildAIPrompt(input, options) {
    var card = normalizeCardData(input);
    var context = normalizePromptContext(options);
    var outputMode = normalizeOutputMode(options && options.outputMode);
    var outputLanguage = normalizeOutputLanguage(options && options.outputLanguage);
    var promptTemplateSettings = normalizePromptTemplateSettings(options);
    var customInstructions = promptTemplateSettings.customInstructions;
    var comments = compactCommentsForPrompt(card.comments, context);
    var payload = {
      outputMode: {
        key: outputMode,
        label: getOutputModeLabel(outputMode),
        instruction: getOutputModeInstruction(outputMode)
      },
      outputLanguage: {
        key: outputLanguage,
        label: getOutputLanguageLabel(outputLanguage),
        instruction: getOutputLanguageInstruction(outputLanguage)
      },
      promptTemplate: promptTemplateSettings.selectedPromptTemplateId ? {
        id: promptTemplateSettings.selectedPromptTemplateId,
        name: promptTemplateSettings.selectedPromptTemplateName
      } : null,
      customInstructions: customInstructions,
      name: card.name,
      description: truncate(card.desc, context.descriptionCharacters),
      board: card.boardName,
      list: card.listName,
      labels: card.labels.slice(0, 25),
      members: card.members.slice(0, 25),
      due: card.due,
      dueComplete: card.dueComplete,
      listContext: card.listContext,
      customFields: card.customFields,
      activity: card.actions.slice(0, 12),
      attachments: compactAttachmentsForPrompt(card.attachments),
      sensitiveSignals: detectSensitiveSignals(input),
      priorFeedback: card.priorFeedback,
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
        activityItemsAvailable: card.actions.length,
        activityItemsIncluded: Math.min(card.actions.length, 12),
        attachmentsAvailable: card.attachments.length,
        attachmentsIncluded: Math.min(card.attachments.length, 12),
        listContextCards: card.listContext ? card.listContext.sampledCards : 0,
        customFieldsIncluded: card.customFields.length,
        priorFeedbackItems: card.priorFeedback.length
      }
    };

    return [
      "Analyze this Trello card as an evidence-backed operational intelligence ledger for Robert's Trello workflow.",
      "Output mode: " + getOutputModeLabel(outputMode) + ". " + getOutputModeInstruction(outputMode),
      "Output language: " + getOutputLanguageLabel(outputLanguage) + ". " + getOutputLanguageInstruction(outputLanguage) + " Keep JSON field names exactly as specified in the schema.",
      customInstructions ? "User guidance: " + customInstructions : "User guidance: none configured.",
      "Apply user guidance only when it does not conflict with evidence requirements, privacy safeguards, or Trello write-approval rules.",
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
      "  \"unresolvedQuestions\": [\"question that must be answered before acting or delegating\"],",
      "  \"recommendations\": [\"practical recommendation\"],",
      "  \"evidenceClaims\": [{\"claim\":\"factual claim\",\"source\":\"title|description|comment|activity|checklist|label|member|due|attachment|custom-field\",\"confidence\":\"supported|uncertain\"}],",
      "  \"validationFindings\": [\"unsupported, conflicting, incomplete, or attachment-extraction issue\"],",
      "  \"confidence\": \"high|medium|low\",",
      "  \"confidenceReason\": \"brief explanation from data completeness and evidence coverage\"",
      "}",
      "Be concrete. Prefer short operational sentences. Do not invent dates, people, amounts, attachment contents, or history.",
      "If attachments are present but text is not provided, say attachment contents were not verified.",
      "Use listContext only as lightweight board/list signal; do not infer hidden card details from neighboring card titles.",
      "If sensitiveSignals are present, keep the response operational and avoid exposing unnecessary private details.",
      "Use priorFeedback as user correction guidance only. Pay attention to incorrectSections when revising those output areas, and do not treat corrections as verified Trello facts unless card evidence also supports them.",
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
      unresolvedQuestions: ensureList(source.unresolvedQuestions || source.unresolved_questions, fallback.unresolvedQuestions),
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

  function clampNumber(value, fallback, min, max) {
    var number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, number));
  }

  function normalizeBudgetSettings(input) {
    var source = input || {};
    var limits = source.providerMonthlyLimits || source.monthlyLimits || {};
    return {
      warningPercent: clampNumber(source.warningPercent, 80, 50, 100),
      providerMonthlyLimits: {
        openai: clampNumber(limits.openai, 0, 0, 10000),
        google: clampNumber(limits.google, 0, 0, 10000),
        anthropic: clampNumber(limits.anthropic, 0, 0, 10000)
      }
    };
  }

  function createCostRecord(metadata, options) {
    var source = metadata || {};
    var providerKey = normalizeProviderKey(source.provider);
    var cost = Math.max(0, Number(source.cost) || 0);
    return {
      analysisRunId: options && options.analysisRunId ? String(options.analysisRunId) : "",
      cardId: options && options.cardId ? String(options.cardId) : "",
      cardTitle: truncate(String(options && options.cardTitle ? options.cardTitle : ""), 120),
      provider: source.provider || "Unknown",
      providerKey: providerKey,
      model: source.model || "",
      cost: Number(cost.toFixed(6)),
      tokens: Math.max(0, Number(source.tokens) || 0),
      createdAt: isoTimestamp(options && options.now)
    };
  }

  function evaluateBudgetAlert(records, metadata, budgetSettings, options) {
    var budget = normalizeBudgetSettings(budgetSettings);
    var record = createCostRecord(metadata || {}, options || {});
    var providerKey = record.providerKey;
    var limit = budget.providerMonthlyLimits[providerKey] || 0;
    var monthKey = currentMonthKey(options && options.now);
    var existingTotal = summarizeMonthlyProviderCosts(records, monthKey)[providerKey] || 0;
    var projectedTotal = existingTotal + record.cost;
    var warningAmount = limit * (budget.warningPercent / 100);

    var result = {
      status: "disabled",
      providerKey: providerKey,
      provider: providerLabel(providerKey),
      monthKey: monthKey,
      monthlyLimit: limit,
      warningPercent: budget.warningPercent,
      existingTotal: Number(existingTotal.toFixed(6)),
      runCost: record.cost,
      projectedTotal: Number(projectedTotal.toFixed(6)),
      message: ""
    };

    if (!limit || providerKey === "local" || providerKey === "unknown") {
      result.message = "No monthly budget alert is configured for this provider.";
      return result;
    }

    if (projectedTotal > limit) {
      result.status = "exceeded";
      result.message = providerLabel(providerKey) + " monthly budget would be exceeded: $" +
        projectedTotal.toFixed(4) + " of $" + limit.toFixed(2) + ".";
      return result;
    }

    if (projectedTotal >= warningAmount) {
      result.status = "warning";
      result.message = providerLabel(providerKey) + " monthly budget warning: $" +
        projectedTotal.toFixed(4) + " of $" + limit.toFixed(2) + " used.";
      return result;
    }

    result.status = "ok";
    result.message = providerLabel(providerKey) + " monthly budget is within limit: $" +
      projectedTotal.toFixed(4) + " of $" + limit.toFixed(2) + ".";
    return result;
  }

  function summarizeMonthlyProviderCosts(records, monthKey) {
    var targetMonth = monthKey || currentMonthKey();
    return (Array.isArray(records) ? records : []).reduce(function (totals, record) {
      if (!record || String(record.createdAt || "").slice(0, 7) !== targetMonth) return totals;
      var providerKey = normalizeProviderKey(record.providerKey || record.provider);
      if (providerKey === "local" || providerKey === "unknown") return totals;
      totals[providerKey] = (totals[providerKey] || 0) + Math.max(0, Number(record.cost) || 0);
      return totals;
    }, {});
  }

  function normalizeProviderKey(value) {
    var text = String(value || "").toLowerCase();
    if (text.indexOf("openai") !== -1) return "openai";
    if (text.indexOf("google") !== -1 || text.indexOf("gemini") !== -1) return "google";
    if (text.indexOf("anthropic") !== -1 || text.indexOf("claude") !== -1) return "anthropic";
    if (text.indexOf("local") !== -1) return "local";
    return text || "unknown";
  }

  function providerLabel(providerKey) {
    var labels = {
      openai: "OpenAI",
      google: "Google AI",
      anthropic: "Anthropic",
      local: "Local rules"
    };
    return labels[providerKey] || "Unknown provider";
  }

  function currentMonthKey(now) {
    var date = now ? new Date(now) : new Date();
    if (Number.isNaN(date.getTime())) date = new Date();
    return date.toISOString().slice(0, 7);
  }

  function createRuntimeTimingRecord(stages, options) {
    var values = (Array.isArray(stages) ? stages : []).map(function (stage) {
      return {
        key: truncate(String(stage && stage.key ? stage.key : "stage"), 40),
        label: truncate(String(stage && stage.label ? stage.label : "Stage"), 80),
        durationMs: roundDuration(stage && stage.durationMs)
      };
    }).filter(function (stage) {
      return stage.durationMs >= 0;
    });
    var total = options && options.totalMs != null
      ? roundDuration(options.totalMs)
      : values.reduce(function (sum, stage) { return sum + stage.durationMs; }, 0);

    return {
      analysisRunId: options && options.analysisRunId ? String(options.analysisRunId) : "",
      cardId: options && options.cardId ? String(options.cardId) : "",
      provider: options && options.provider ? String(options.provider) : "",
      source: options && options.source ? String(options.source) : "",
      totalMs: roundDuration(total),
      stages: values.slice(0, 12),
      createdAt: isoTimestamp(options && options.now)
    };
  }

  function summarizeRuntimeTimingRecords(records) {
    var values = (Array.isArray(records) ? records : [])
      .map(function (record) { return Math.max(0, Number(record && record.totalMs) || 0); })
      .filter(function (value) { return value > 0; });
    var total = values.reduce(function (sum, value) { return sum + value; }, 0);
    return {
      count: values.length,
      averageMs: values.length ? roundDuration(total / values.length) : 0,
      latestMs: values.length ? roundDuration(values[0]) : 0,
      maxMs: values.length ? roundDuration(Math.max.apply(Math, values)) : 0
    };
  }

  function roundDuration(value) {
    var number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(0, Math.round(number));
  }

  function isoTimestamp(value) {
    var date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) date = new Date();
    return date.toISOString();
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
      actions: [{
        id: "activity-1",
        type: "updateCard",
        date: new Date().toISOString(),
        memberCreator: { fullName: "Maya" },
        data: { card: { name: "Prepare launch checklist" } }
      }],
      attachments: [
        { name: "launch-plan.pdf", mimeType: "application/pdf" },
        { name: "kickoff-transcript.txt", mimeType: "text/plain" },
        { name: "demo-recording.mp4", mimeType: "video/mp4" }
      ],
      customFields: [
        { name: "Priority", value: { text: "High" } },
        { name: "Release window", value: { text: "This week" } }
      ]
    };
  }

  return {
    buildAIPrompt: buildAIPrompt,
    buildRuleBasedAnalysis: buildRuleBasedAnalysis,
    createBatchAnalysisPlan: createBatchAnalysisPlan,
    createCostRecord: createCostRecord,
    createListPlanningBrief: createListPlanningBrief,
    createRuntimeTimingRecord: createRuntimeTimingRecord,
    detectSensitiveSignals: detectSensitiveSignals,
    evaluateBudgetAlert: evaluateBudgetAlert,
    getOutputModeInstruction: getOutputModeInstruction,
    getOutputModeLabel: getOutputModeLabel,
    getOutputLanguageInstruction: getOutputLanguageInstruction,
    getOutputLanguageLabel: getOutputLanguageLabel,
    normalizeBudgetSettings: normalizeBudgetSettings,
    normalizeOutputMode: normalizeOutputMode,
    normalizeOutputLanguage: normalizeOutputLanguage,
    normalizeCustomFields: normalizeCustomFields,
    normalizeCustomInstructions: normalizeCustomInstructions,
    normalizePromptTemplates: normalizePromptTemplates,
    normalizePromptTemplateSettings: normalizePromptTemplateSettings,
    normalizeProviderKey: normalizeProviderKey,
    normalizePriorFeedback: normalizePriorFeedback,
    normalizePromptContext: normalizePromptContext,
    markdownForBatchAnalysisPlan: markdownForBatchAnalysisPlan,
    markdownForAnalysis: markdownForAnalysis,
    normalizeAIAnalysis: normalizeAIAnalysis,
    normalizeActions: normalizeActions,
    normalizeAttachments: normalizeAttachments,
    normalizeCardData: normalizeCardData,
    markdownForListPlanningBrief: markdownForListPlanningBrief,
    sampleCardData: sampleCardData,
    summarizeMonthlyProviderCosts: summarizeMonthlyProviderCosts,
    summarizeRuntimeTimingRecords: summarizeRuntimeTimingRecords
  };
}));
