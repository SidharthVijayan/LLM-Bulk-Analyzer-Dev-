document.getElementById("bulkAnalyzeBtn").addEventListener("click", async () => {
  const input = document.getElementById("urlInput").value;

  const urls = input
    .split("\n")
    .map(u => u.trim())
    .filter(Boolean);

  if (urls.length === 0) return;

  const results = [];
  const status = document.getElementById("status");

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];

    status.innerText = `Analyzing ${i + 1} / ${urls.length}...`;

    try {
      const tab = await chrome.tabs.create({
        url,
        active: false
      });

      await waitForTabLoad(tab.id);

      const data = await runAnalysis(tab.id);

      results.push({
        url,
        score: data.score || "N/A",
        achievable: data.achievable || "-"
      });

      chrome.tabs.remove(tab.id);

    } catch (err) {
      console.error(err);

      results.push({
        url,
        score: "Error",
        achievable: "-"
      });
    }
  }

  status.innerText = "Done ✅";

  renderResults(results);
});


// Wait for tab to fully load
function waitForTabLoad(tabId) {
  return new Promise(resolve => {
    chrome.tabs.onUpdated.addListener(function listener(id, info) {
      if (id === tabId && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    });
  });
}


// Inject analysis script
function runAnalysis(tabId) {
  return new Promise(resolve => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        func: analyzePage
      },
      (results) => {
        if (!results || !results[0]) {
          resolve({});
        } else {
          resolve(results[0].result);
        }
      }
    );
  });
}


// Render results
function renderResults(results) {
  const container = document.getElementById("resultsTable");

  container.innerHTML = "";

  results.forEach(r => {
    container.innerHTML += `
      <div class="row">
        <strong>${r.score}</strong> (Achievable: ${r.achievable})
        <div class="url">${r.url}</div>
      </div>
    `;
  });
}


// 🔥 SAME ANALYSIS FUNCTION (SELF-CONTAINED)
function analyzePage() {

  let fixes = [];
  let breakdown = [];

  const h1 = document.querySelectorAll("h1").length;
  const h2 = document.querySelectorAll("h2").length;
  const lists = document.querySelectorAll("ul, ol").length;
  const paragraphs = document.querySelectorAll("p").length;

  // STRUCTURE
  let structure = Math.min((h1 + h2) * 10, 100);
  if (h1 === 0) {
    structure -= 20;
    fixes.push("Add H1");
  }

  // EXTRACTABILITY
  let extract = lists > 0 ? 70 : 30;
  if (lists === 0) fixes.push("Add lists");

  // SEMANTIC
  let text = document.body.innerText.toLowerCase();
  let semantic = text.includes("what is") ? 70 : 40;

  // HTML
  let clean = 80;

  // ENTITY
  let entity = Math.min(paragraphs * 2, 100);

  let score = Math.round(
    (structure + extract + semantic + clean + entity) / 5
  );

  let achievable = Math.min(score + fixes.length * 5, 95);

  return { score, achievable };
}
