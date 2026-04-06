let bulkResults = [];

document.getElementById("bulkAnalyzeBtn").addEventListener("click", async () => {
  const input = document.getElementById("urlInput").value;

  const urls = input
    .split("\n")
    .map(u => u.trim())
    .filter(Boolean);

  if (urls.length === 0) return;

  const status = document.getElementById("status");
  const progressFill = document.getElementById("progressFill");

  bulkResults = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];

    status.innerText = `Analyzing ${i + 1} / ${urls.length}...`;
    progressFill.style.width = `${((i + 1) / urls.length) * 100}%`;

    try {
      const tab = await chrome.tabs.create({
        url,
        active: false
      });

      await waitForTabLoad(tab.id);
      await delay(1500); // 🔥 IMPORTANT FIX

      const data = await runAnalysis(tab.id);

      bulkResults.push({
        url,
        score: data.score || "N/A",
        achievable: data.achievable || "-"
      });

      chrome.tabs.remove(tab.id);

    } catch (err) {
      console.error(err);

      bulkResults.push({
        url,
        score: "Error",
        achievable: "-"
      });
    }
  }

  status.innerText = "Done ✅";

  // 🔥 PRIORITY SORTING (lowest score first)
  bulkResults.sort((a, b) => {
    return (a.score === "Blocked" ? 0 : a.score) - (b.score === "Blocked" ? 0 : b.score);
  });

  renderResults(bulkResults);
});


// WAIT FOR LOAD
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


// DELAY
function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}


// RUN ANALYSIS SAFELY
function runAnalysis(tabId) {
  return new Promise((resolve) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        func: () => {
          try {
            return analyzePage();
          } catch (e) {
            return { score: "Error", achievable: "-" };
          }
        }
      },
      (results) => {
        if (!results || !results[0] || !results[0].result) {
          resolve({ score: "Blocked", achievable: "-" });
        } else {
          resolve(results[0].result);
        }
      }
    );
  });
}


// RENDER RESULTS
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


// CSV EXPORT
document.getElementById("exportBtn").addEventListener("click", () => {
  if (!bulkResults.length) return;

  let csv = "URL,Score,Achievable\n";

  bulkResults.forEach(r => {
    csv += `"${r.url}",${r.score},${r.achievable}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "llm_bulk_analysis.csv";
  a.click();
});


// 🔥 CORE ANALYSIS
function analyzePage() {
  const h1 = document.querySelectorAll("h1").length;
  const h2 = document.querySelectorAll("h2").length;
  const lists = document.querySelectorAll("ul, ol").length;
  const paragraphs = document.querySelectorAll("p").length;

  let structure = Math.min((h1 + h2) * 10, 100);
  let extract = lists > 0 ? 70 : 30;
  let semantic = document.body.innerText.toLowerCase().includes("what is") ? 70 : 40;
  let clean = 80;
  let entity = Math.min(paragraphs * 2, 100);

  let score = Math.round(
    (structure + extract + semantic + clean + entity) / 5
  );

  let achievable = Math.min(score + 10, 95);

  return { score, achievable };
}
