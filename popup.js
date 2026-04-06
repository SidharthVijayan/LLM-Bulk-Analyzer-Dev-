let bulkResults = [];

document.getElementById("bulkAnalyzeBtn").addEventListener("click", async () => {
  const input = document.getElementById("urlInput").value;

  const urls = input
    .split("\n")
    .map(u => u.trim())
    .filter(Boolean);

  const status = document.getElementById("status");
  const progressFill = document.getElementById("progressFill");

  bulkResults = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];

    status.innerText = `Analyzing ${i + 1}/${urls.length}`;
    progressFill.style.width = `${((i + 1) / urls.length) * 100}%`;

    const data = await chrome.runtime.sendMessage({
      action: "analyze",
      url
    });

    bulkResults.push({
      url,
      score: data.score,
      achievable: data.achievable
    });
  }

  // sort by priority
  bulkResults.sort((a, b) => (a.score || 0) - (b.score || 0));

  renderResults();
});


function renderResults() {
  const container = document.getElementById("resultsTable");
  container.innerHTML = "";

  bulkResults.forEach(r => {
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
  let csv = "URL,Score,Achievable\n";

  bulkResults.forEach(r => {
    csv += `"${r.url}",${r.score},${r.achievable}\n`;
  });

  const blob = new Blob([csv]);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "analysis.csv";
  link.click();
});
