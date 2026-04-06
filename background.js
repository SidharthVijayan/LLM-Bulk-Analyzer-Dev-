chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {

  if (msg.action === "analyze") {
    try {
      const res = await fetch(msg.url, { mode: "cors" });
      const html = await res.text();

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      const result = analyze(doc);

      sendResponse(result);

    } catch (e) {
      sendResponse({ score: "Blocked", achievable: "-" });
    }

    return true;
  }
});


function analyze(doc) {
  const h1 = doc.querySelectorAll("h1").length;
  const h2 = doc.querySelectorAll("h2").length;
  const lists = doc.querySelectorAll("ul, ol").length;
  const paragraphs = doc.querySelectorAll("p").length;

  let structure = Math.min((h1 + h2) * 10, 100);
  let extract = lists > 0 ? 70 : 30;
  let semantic = doc.body.innerText.toLowerCase().includes("what is") ? 70 : 40;
  let clean = 80;
  let entity = Math.min(paragraphs * 2, 100);

  let score = Math.round(
    (structure + extract + semantic + clean + entity) / 5
  );

  let achievable = Math.min(score + 10, 95);

  return { score, achievable };
}
