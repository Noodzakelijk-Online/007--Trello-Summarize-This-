// Public Trello Power-Up identity used only for the Trello REST API client.
// Trello API keys identify the Power-Up in browser requests; they are not
// member tokens and must never be used as a secret.
(function (root) {
  "use strict";

  root.SummarizeThisTrelloConfig = Object.freeze({
    appKey: "710f51778ec3e0eff7be947779695aed",
    appName: "Summarize this!",
    appAuthor: "Noodzakelijk Online"
  });
}(typeof window !== "undefined" ? window : this));
