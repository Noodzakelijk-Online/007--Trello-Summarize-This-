// Trello Power-Up admin configuration helpers shared by the setup page and tests.
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.TrelloAdminConfig = factory();
  }
}(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var DEFAULT_MANIFEST = {
    name: "Summarize This",
    details: "AI-assisted Trello card summarization with a local fallback summary when no AI provider is configured.",
    author: "Summarize This Team",
    author_email: "support@summarizethis.com",
    author_url: "https://summarizethis.com",
    overview_url: "https://summarizethis.com/trello",
    icon: { url: "./icon.svg" },
    capabilities: [
      "card-buttons",
      "card-detail-badges",
      "show-settings",
      "authorization-status",
      "show-authorization"
    ]
  };

  function createDeploymentPresets(options) {
    var source = options || {};
    var owner = clean(source.githubOwner || "YOUR-GITHUB-USER");
    var repo = clean(source.githubRepo || "YOUR-REPOSITORY");
    var githubOwner = owner.toLowerCase();
    var githubRepo = repo.replace(/^\/+|\/+$/g, "");

    return [
      {
        id: "github-pages",
        label: "GitHub Pages",
        baseUrl: "https://" + githubOwner + ".github.io/" + githubRepo,
        help: "Use after GitHub Pages is enabled for this repository."
      },
      {
        id: "netlify",
        label: "Netlify",
        baseUrl: "https://" + clean(source.netlifySite || "YOUR-SITE") + ".netlify.app",
        help: "Replace YOUR-SITE with the Netlify site name."
      },
      {
        id: "vercel",
        label: "Vercel",
        baseUrl: "https://" + clean(source.vercelProject || "YOUR-PROJECT") + ".vercel.app",
        help: "Replace YOUR-PROJECT with the Vercel project name."
      },
      {
        id: "custom",
        label: "Custom HTTPS",
        baseUrl: "https://your-hosted-site.example",
        help: "Use any public HTTPS URL that serves these static files."
      }
    ];
  }

  function normalizeBaseUrl(input, locationLike) {
    var value = clean(input);
    if (!value && locationLike && locationLike.protocol === "https:") {
      value = locationLike.origin || "";
    }
    return (value || "https://your-hosted-site.example").replace(/\/+$/, "");
  }

  function validateHostedBaseUrl(input, locationLike) {
    var normalizedBase = normalizeBaseUrl(input, locationLike);
    var result = {
      baseUrl: normalizedBase,
      isHttps: false,
      isLocal: false,
      isPlaceholder: false,
      isReadyForTrello: false,
      message: "Enter a public HTTPS URL where these static files are hosted."
    };

    if (/^file:/i.test(normalizedBase)) {
      result.message = "Trello cannot load a file:// or local Windows path as a Power-Up connector.";
      return result;
    }

    var parsed;
    try {
      parsed = new URL(normalizedBase);
    } catch (error) {
      result.message = "Enter a valid hosted site URL, for example https://example.netlify.app.";
      return result;
    }

    result.isHttps = parsed.protocol === "https:";
    result.isLocal = /^(localhost|127\.0\.0\.1|\[?::1\]?)$/i.test(parsed.hostname);
    result.isPlaceholder = /(^your-|^your\.|^your$|example$|example\.|your-hosted-site|your-site|your-project|your-repository|your-github-user)/i.test(parsed.hostname) ||
      /\/(YOUR-|your-)/.test(parsed.pathname);

    if (!result.isHttps) {
      result.message = "Trello requires a public HTTPS connector URL.";
    } else if (result.isLocal) {
      result.message = "Localhost works for preview only; Trello needs a public HTTPS URL.";
    } else if (result.isPlaceholder) {
      result.message = "Replace the placeholder with your real deployed site URL before saving in Trello.";
    } else {
      result.isReadyForTrello = true;
      result.message = "Ready for Trello admin after this URL is deployed and publicly reachable.";
    }

    return result;
  }

  function buildHostedUrl(baseUrl, fileName) {
    var base = normalizeBaseUrl(baseUrl);
    var path = clean(fileName).replace(/^\/+/, "");
    return base + "/" + path;
  }

  function createAdminConfig(manifest, baseUrl) {
    var source = Object.assign({}, DEFAULT_MANIFEST, manifest || {});
    var normalizedBase = normalizeBaseUrl(baseUrl);
    return {
      appName: clean(source.name || DEFAULT_MANIFEST.name),
      details: clean(source.details || DEFAULT_MANIFEST.details),
      author: clean(source.author || DEFAULT_MANIFEST.author),
      authorEmail: clean(source.author_email || DEFAULT_MANIFEST.author_email),
      authorUrl: clean(source.author_url || DEFAULT_MANIFEST.author_url),
      overviewUrl: clean(source.overview_url || DEFAULT_MANIFEST.overview_url),
      connectorUrl: buildHostedUrl(normalizedBase, "connector.js"),
      manifestUrl: buildHostedUrl(normalizedBase, "manifest.json"),
      iconUrl: absoluteManifestUrl(normalizedBase, source.icon && source.icon.url, "icon.svg"),
      capabilities: toArray(source.capabilities || DEFAULT_MANIFEST.capabilities).map(clean).filter(Boolean)
    };
  }

  function makeAdminValuesText(config) {
    var values = config || createAdminConfig(DEFAULT_MANIFEST, "");
    return [
      "Summarize This Trello Power-Up setup",
      "",
      "App name: " + values.appName,
      "Author: " + values.author,
      "Author email: " + values.authorEmail,
      "Author URL: " + values.authorUrl,
      "Overview URL: " + values.overviewUrl,
      "Details: " + values.details,
      "iframe Connector URL: " + values.connectorUrl,
      "Manifest URL: " + values.manifestUrl,
      "Icon URL: " + values.iconUrl,
      "Capabilities: " + values.capabilities.join(", ")
    ].join("\n");
  }

  function createAdminReadinessChecklist(config, validation) {
    var values = config || createAdminConfig(DEFAULT_MANIFEST, "");
    var status = validation || validateHostedBaseUrl(values.connectorUrl.replace(/\/connector\.js$/i, ""));
    var capabilities = toArray(values.capabilities);
    var connectorValidation = validateAbsoluteHttps(values.connectorUrl);
    var manifestValidation = validateAbsoluteHttps(values.manifestUrl);
    var iconValidation = validateAbsoluteHttps(values.iconUrl);
    return [
      {
        key: "hosted-base-url",
        label: "Hosted base URL is public HTTPS",
        ok: Boolean(status.isReadyForTrello),
        detail: status.message
      },
      {
        key: "connector-url",
        label: "iframe Connector URL is HTTPS",
        ok: connectorValidation.ok,
        detail: connectorValidation.message
      },
      {
        key: "manifest-url",
        label: "Manifest URL is HTTPS",
        ok: manifestValidation.ok,
        detail: manifestValidation.message
      },
      {
        key: "icon-url",
        label: "Icon URL is HTTPS",
        ok: iconValidation.ok,
        detail: iconValidation.message
      },
      {
        key: "required-capabilities",
        label: "Required capabilities are listed",
        ok: capabilities.indexOf("card-buttons") !== -1 && capabilities.indexOf("show-settings") !== -1,
        detail: "Required: card-buttons and show-settings. Current: " + capabilities.join(", ")
      },
      {
        key: "manual-save",
        label: "Manual Trello admin save is still required",
        ok: true,
        detail: "The helper can fill matching fields, but it never saves or submits the Trello admin form."
      }
    ];
  }

  function makeAdminRunbookText(config, validation) {
    var values = config || createAdminConfig(DEFAULT_MANIFEST, "");
    var checklist = createAdminReadinessChecklist(values, validation);
    return [
      "Summarize This Trello Power-Up admin runbook",
      "",
      makeAdminValuesText(values),
      "",
      "Readiness checklist:",
      checklist.map(function (item) {
        return "- [" + (item.ok ? "x" : " ") + "] " + item.label + " - " + item.detail;
      }).join("\n"),
      "",
      "Manual steps:",
      "1. Open https://trello.com/power-ups/admin.",
      "2. Create or edit the Summarize This Power-Up.",
      "3. Paste the admin values above, or run the autofill bookmarklet and review every field.",
      "4. Confirm the capabilities match the list above.",
      "5. Save manually in Trello only after review.",
      "",
      "Safety: The autofill helper fills matching fields only. It does not save, submit, create API keys, change Trello boards, or post to Trello cards."
    ].join("\n");
  }

  function createAdminSetupPackage(config, validation, options) {
    var values = config || createAdminConfig(DEFAULT_MANIFEST, "");
    var status = validation || validateHostedBaseUrl(values.connectorUrl.replace(/\/connector\.js$/i, ""));
    var now = options && options.now ? options.now : new Date().toISOString();
    return {
      schemaVersion: "summarize-this-trello-admin-setup-v1",
      generatedAt: now,
      validation: status,
      adminValues: {
        appName: values.appName,
        author: values.author,
        authorEmail: values.authorEmail,
        authorUrl: values.authorUrl,
        overviewUrl: values.overviewUrl,
        details: values.details,
        connectorUrl: values.connectorUrl,
        manifestUrl: values.manifestUrl,
        iconUrl: values.iconUrl,
        capabilities: values.capabilities
      },
      readinessChecklist: createAdminReadinessChecklist(values, status),
      manualSteps: [
        "Open https://trello.com/power-ups/admin.",
        "Create or edit the Summarize This Power-Up.",
        "Paste the admin values or use the autofill bookmarklet.",
        "Review every populated field.",
        "Save manually in Trello."
      ],
      safetyNotes: [
        "The helper does not save or submit the Trello admin page.",
        "The connector URL must be public HTTPS; localhost and file URLs are not Trello-ready.",
        "No API keys or Trello tokens are included in this setup package."
      ],
      autofillBookmarklet: createAdminBookmarklet(values)
    };
  }

  function createAdminBookmarklet(config) {
    return "javascript:" + createAdminAutofillScript(config).replace(/\s+/g, " ");
  }

  function createAdminAutofillScript(config) {
    var values = config || createAdminConfig(DEFAULT_MANIFEST, "");
    var payload = JSON.stringify({
      appName: values.appName,
      details: values.details,
      author: values.author,
      authorEmail: values.authorEmail,
      authorUrl: values.authorUrl,
      overviewUrl: values.overviewUrl,
      connectorUrl: values.connectorUrl,
      manifestUrl: values.manifestUrl,
      iconUrl: values.iconUrl,
      capabilities: values.capabilities
    });

    return "(function(){'use strict';var config=" + payload + ";" +
      "function norm(value){return String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}" +
      "function esc(value){return String(value).replace(/\\\\/g,'\\\\\\\\').replace(/\"/g,'\\\\\"');}" +
      "function textFor(el){var parts=[];if(el.id){document.querySelectorAll('label[for=\"'+esc(el.id)+'\"]').forEach(function(label){parts.push(label.textContent);});}var label=el.closest&&el.closest('label');if(label)parts.push(label.textContent);['aria-label','placeholder','name','id'].forEach(function(name){parts.push(el.getAttribute(name));});return norm(parts.join(' '));}" +
      "function candidates(){return Array.prototype.slice.call(document.querySelectorAll('input,textarea'));}" +
      "function setField(labels,value){var wanted=labels.map(norm);var field=candidates().find(function(el){var type=(el.type||'').toLowerCase();if(type==='checkbox'||type==='radio'||type==='submit'||type==='button'||type==='hidden')return false;var text=textFor(el);return wanted.some(function(label){return text.indexOf(label)!==-1;});});if(!field)return false;field.focus();field.value=value;field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));field.style.outline='2px solid #1f845a';return true;}" +
      "function setCapability(capability){var readable=norm(capability);var compact=readable.replace(/ /g,'');var boxes=Array.prototype.slice.call(document.querySelectorAll('input[type=\"checkbox\"]'));var box=boxes.find(function(el){var text=textFor(el);return text.indexOf(readable)!==-1||text.replace(/ /g,'').indexOf(compact)!==-1;});if(!box)return false;if(!box.checked){box.checked=true;box.dispatchEvent(new Event('input',{bubbles:true}));box.dispatchEvent(new Event('change',{bubbles:true}));}box.style.outline='2px solid #1f845a';return true;}" +
      "var result=[];" +
      "result.push(['Power-Up name',setField(['power up name','power-up name','app name','name'],config.appName)]);" +
      "result.push(['Details',setField(['details','description','short description','summary'],config.details)]);" +
      "result.push(['Author',setField(['author','company'],config.author)]);" +
      "result.push(['Author email',setField(['author email','support email','contact email'],config.authorEmail)]);" +
      "result.push(['Author URL',setField(['author url','author website','website'],config.authorUrl)]);" +
      "result.push(['Overview URL',setField(['overview url','iframe overview url','privacy policy url'],config.overviewUrl)]);" +
      "result.push(['iframe Connector URL',setField(['iframe connector url','connector url','iframe url'],config.connectorUrl)]);" +
      "result.push(['Manifest URL',setField(['manifest url'],config.manifestUrl)]);" +
      "result.push(['Icon URL',setField(['icon url','icon'],config.iconUrl)]);" +
      "config.capabilities.forEach(function(capability){result.push([capability,setCapability(capability)]);});" +
      "var banner=document.getElementById('summarize-this-admin-autofill-status');if(!banner){banner=document.createElement('div');banner.id='summarize-this-admin-autofill-status';banner.style.cssText='position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483647;background:#172b4d;color:#fff;padding:12px 14px;border-radius:8px;font:14px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;box-shadow:0 8px 24px rgba(9,30,66,.25)';document.body.appendChild(banner);}var filled=result.filter(function(item){return item[1];}).length;banner.textContent='Summarize This filled '+filled+' admin value(s). Review every field in Trello, then save manually.';console.table(result.map(function(item){return{field:item[0],filled:item[1]};}));" +
    "}());";
  }

  function absoluteManifestUrl(baseUrl, manifestUrl, fallbackFile) {
    var value = clean(manifestUrl);
    if (/^https:\/\//i.test(value)) return value;
    return buildHostedUrl(baseUrl, value.replace(/^\.\//, "") || fallbackFile);
  }

  function validateAbsoluteHttps(value) {
    var text = clean(value);
    try {
      var parsed = new URL(text);
      var ok = parsed.protocol === "https:" && !/^(localhost|127\.0\.0\.1|\[?::1\]?)$/i.test(parsed.hostname);
      return {
        ok: ok,
        message: ok ? text : "Use a public HTTPS URL, not " + text
      };
    } catch (error) {
      return {
        ok: false,
        message: "Invalid URL: " + text
      };
    }
  }

  function clean(value) {
    return String(value == null ? "" : value).trim();
  }

  function toArray(value) {
    return Array.isArray(value) ? value : [];
  }

  return {
    createDeploymentPresets: createDeploymentPresets,
    normalizeBaseUrl: normalizeBaseUrl,
    validateHostedBaseUrl: validateHostedBaseUrl,
    buildHostedUrl: buildHostedUrl,
    createAdminConfig: createAdminConfig,
    createAdminReadinessChecklist: createAdminReadinessChecklist,
    createAdminSetupPackage: createAdminSetupPackage,
    makeAdminValuesText: makeAdminValuesText,
    makeAdminRunbookText: makeAdminRunbookText,
    createAdminAutofillScript: createAdminAutofillScript,
    createAdminBookmarklet: createAdminBookmarklet
  };
}));
