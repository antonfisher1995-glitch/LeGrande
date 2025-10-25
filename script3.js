async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return await res.json();
}

let bibleData = [];
let quranData = [];

async function init() {
  try {
    bibleData = await loadJSON("Bible.json");
    quranData = await loadJSON("Quran.json");
    renderResults("");
  } catch (err) {
    document.getElementById("results").innerHTML =
      `<p style="color:red">Error loading JSON files.<br>${err}</p>`;
  }
}

function renderResults(query) {
  const results = document.getElementById("results");
  results.innerHTML = "";

  const q = query.trim().toLowerCase();

  const filteredBible = q
    ? bibleData.filter(v => v.Text.toLowerCase().includes(q))
    : bibleData.slice(0, 20);
  const filteredQuran = q
    ? quranData.filter(a => a.ayah_en.toLowerCase().includes(q))
    : quranData.slice(0, 20);

  const length = Math.min(filteredBible.length, filteredQuran.length);
  for (let i = 0; i < length; i++) {
    const b = filteredBible[i];
    const qv = filteredQuran[i];

    const pair = document.createElement("div");
    pair.className = "pair";
    pair.innerHTML = `
      <div class="section">
        <h3>📖 ${b["Book Name"]} ${b.Chapter}:${b.Verse}</h3>
        <p>${b.Text}</p>
      </div>
      <div class="section">
        <h3>🕋 ${qv.surah_name_en} ${qv.ayah_no_surah}/${qv.total_ayah_surah}</h3>
        <p class="arabic">${qv.ayah_ar}</p>
        <p>${qv.ayah_en}</p>
      </div>
    `;
    results.appendChild(pair);
  }

  if (length === 0) {
    results.innerHTML = `<p>No matches found for “${query}”.</p>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  init();
  const box = document.getElementById("searchBox");
  box.addEventListener("input", e => renderResults(e.target.value));
});