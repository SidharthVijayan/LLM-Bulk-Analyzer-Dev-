// Button click
document.getElementById("analyzeBtn").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript(
    {
      target: { tabId: tab.id },
      func: analyzePage
    },
    (results) => {
      // ✅ SAFE HANDLING
      if (!results || !results[0] || !results[0].result) {
        console.error("Script injection failed or no data returned");
        document.getElementById("label").innerText = "Error analyzing page ❌";
        return;
      }

      const data = results[0].result;
      renderUI(data);
    }
  );
});

// Render UI
function renderUI(data) {
  document.getElementById("score").innerText = data.score;
  document.getElementById("label").innerText = data.label;

  document.getElementById("achievable").innerText =
    `Achievable: ${data.achievable} (+${data.achievable - data.score})`;

  const breakdown = document.getElementById("breakdown");
  breakdown.innerHTML = "";

  data.breakdown.forEach(item => {
    breakdown.innerHTML += `
      <div class="bar">
        <span>${item.name}</span>
        <div class="progress">
          <div class="fill" style="width:${item.value}%"></div>
        </div>
      </div>
    `;
  });

  const fixList = document.getElementById("fixList");
  fixList.innerHTML = "";

  data.fixes.forEach(fix => {
    fixList.innerHTML += `<li>+ ${fix}</li>`;
  });

  document.getElementById("traffic").innerText =
    `Estimated Visibility Lift: ${data.traffic}`;
}

// 🔥 CORE ANALYSIS FUNCTION (RUNS INSIDE PAGE)
function analyzePage() {
  console.log("Analyzing page...");

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
    fixes.push("Add H1 heading (+5)");
  }
  breakdown.push({ name: "Structure", value: structure });

  // EXTRACTABILITY
  let extract = lists > 0 ? 70 : 30;
  if (lists === 0) fixes.push("Add bullet points (+6)");
  breakdown.push({ name: "Extractability", value: extract });

  // SEMANTIC
  let text = document.body.innerText.toLowerCase();
  let semantic = text.includes("what is") ? 70 : 40;
  if (semantic < 50) fixes.push("Add definition section (+8)");
  breakdown.push({ name: "Semantic", value: semantic });

  // HTML CLEAN
  let clean = 80;
  breakdown.push({ name: "HTML", value: clean });

  // ENTITY
  let entity = Math.min(paragraphs * 2, 100);
  breakdown.push({ name: "Entity", value: entity });

  // FINAL SCORE
  let score = Math.round(
    (structure + extract + semantic + clean + entity) / 5
  );

  let achievable = Math.min(score + fixes.length * 5, 95);

  let traffic =
    score > 75
      ? "+20% to +40%"
      : score > 50
      ? "+5% to +20%"
      : "Low";

  return {
    score,
    achievable,
    fixes,
    breakdown,
    traffic,
    label:
      score > 75
        ? "High AI Readiness 🚀"
        : score > 50
        ? "Moderate ⚠️"
        : "Low ❌"
  };
}
