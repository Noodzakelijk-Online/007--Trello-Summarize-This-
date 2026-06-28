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

  function normalizeBaseUrl(input, locationLike) {
    var value = clean(input);
    if (!value && locationLike && locationLike.protocol === "https:") {
      value = locationLike.origin || "";
    }
    return (value || "https://your-hosted-site.example").replace(/\/+$/, "");
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
      "Icon URL: " + values.iconUrl,
      "Capabilities: " + values.capabilities.join(", ")
    ].join("\n");
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

  function clean(value) {
    return String(value == null ? "" : value).trim();
  }

  function toArray(value) {
    return Array.isArray(value) ? value : [];
  }

  return {
    normalizeBaseUrl: normalizeBaseUrl,
    buildHostedUrl: buildHostedUrl,
    createAdminConfig: createAdminConfig,
    makeAdminValuesText: makeAdminValuesText,
    createAdminAutofillScript: createAdminAutofillScript,
    createAdminBookmarklet: createAdminBookmarklet
  };
}));
