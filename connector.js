// Summarize This Trello Power-Up connector.
// Defines the card button, settings popup, and lightweight status badge.

/* global TrelloPowerUp */

(function () {
  "use strict";

  var POPUP_URL = "./popup.html";
  var SETTINGS_URL = "./settings-powerup.html";
  var ICON_URL = "./icon.svg";

  function hasAnyKey(settings) {
    var keys = settings && settings.apiKeys ? settings.apiKeys : {};
    return Boolean(keys.openai || keys.anthropic || keys.google);
  }

  function loadSettings(t) {
    return t.get("member", "private", "summarizeThisSettings")
      .then(function (settings) {
        return settings || {};
      })
      .catch(function () {
        return {};
      });
  }

  TrelloPowerUp.initialize({
    "card-buttons": function () {
      return [{
        icon: ICON_URL,
        text: "Summarize This",
        callback: function (t) {
          return t.popup({
            title: "Summarize This",
            url: POPUP_URL,
            height: 720
          });
        }
      }];
    },

    "card-detail-badges": function (t) {
      return loadSettings(t).then(function (settings) {
        var localMode = settings.analysisMode === "local";
        var ready = localMode || hasAnyKey(settings);

        return [{
          text: ready ? "Summary ready" : "Setup needed",
          color: ready ? "green" : "yellow",
          refresh: 300
        }];
      });
    },

    "show-settings": function (t) {
      return t.popup({
        title: "Summarize This Settings",
        url: SETTINGS_URL,
        height: 620
      });
    },

    "authorization-status": function (t) {
      return loadSettings(t).then(function (settings) {
        return {
          authorized: settings.analysisMode === "local" || hasAnyKey(settings)
        };
      });
    },

    "show-authorization": function (t) {
      return t.popup({
        title: "Summarize This Settings",
        url: SETTINGS_URL,
        height: 620
      });
    }
  });
})();
