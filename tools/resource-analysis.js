const fs = require("node:fs");
const path = require("node:path");
const SummarizeThis = require("../summarizer-core");

const repoRoot = path.resolve(__dirname, "..");
const runtimeFiles = [
  "manifest.json",
  "connector.js",
  "popup.html",
  "settings-powerup.html",
  "trello-setup.html",
  "trello-admin-config.js",
  "summarizer-core.js",
  "card-intelligence-ledger.js",
  "icon.svg",
  "index.html",
  "index-original.html",
  "settings.html",
  "popup-999-accuracy.html",
  "popup-enhanced.html",
  "popup-nextgen.html",
  "popup-original.html"
];

function fileSize(file) {
  return fs.statSync(path.join(repoRoot, file)).size;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "dist") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else {
      files.push(full);
    }
  }
  return files;
}

const runtimeTotal = runtimeFiles.reduce((sum, file) => sum + fileSize(file), 0);
const sourceFiles = walk(repoRoot);
const sourceTotal = sourceFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0);
const activeLoad = ["popup.html", "summarizer-core.js", "card-intelligence-ledger.js", "icon.svg"].reduce((sum, file) => sum + fileSize(file), 0);

const largeCard = Object.assign({}, SummarizeThis.sampleCardData(), {
  desc: "Long description ".repeat(400),
  comments: Array.from({ length: 25 }, (_, index) => ({
    text: `Comment ${index + 1} ` + "detail ".repeat(250)
  }))
});

const prompt = SummarizeThis.buildAIPrompt(largeCard);
const payload = JSON.parse(prompt.slice(prompt.lastIndexOf("\n{") + 1));

const report = {
  activePopupInitialLoad: formatBytes(activeLoad),
  installerRuntimePayload: formatBytes(runtimeTotal),
  repositorySourceFootprint: formatBytes(sourceTotal),
  promptCharactersForLargeCard: prompt.length,
  promptCommentCount: payload.comments.length,
  longestPromptCommentCharacters: Math.max(...payload.comments.map(comment => comment.text.length)),
  descriptionCharacters: payload.description.length,
  runtimeFiles: runtimeFiles.map(file => ({
    file,
    size: formatBytes(fileSize(file))
  }))
};

console.log(JSON.stringify(report, null, 2));
