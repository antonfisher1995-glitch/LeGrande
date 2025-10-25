
(function() {
  // Expect global cannabisData from cannabis-data.js
  if (typeof cannabisData === 'undefined' || !Array.isArray(cannabisData)) {
    console.error('cannabisData is missing or invalid.');
    return;
  }

  function $(id) { return document.getElementById(id); }

  const resultsEl = $('results');
  const searchEl = $('searchBox');
  const suggEl = $('suggestions');

  function renderResults(items) {
    resultsEl.innerHTML = '';
    if (!items || items.length === 0) {
      resultsEl.innerHTML = '<p style="text-align:center;color:#999;margin-top:40px;">No matching strains found.</p>';
      return;
    }
    for (const item of items) {
      const card = document.createElement('div');
      card.className = 'card';
      let html = '<div class="strain-name">' + (item['Strain'] || 'Unknown Strain') + '</div>';
      for (const key of Object.keys(item)) {
        if (key === 'Strain') continue;
        const val = String(item[key] ?? '');
        if (val.trim()) {
          html += '<div class="property"><strong>' + key + ':</strong> ' + val + '</div>';
        }
      }
      card.innerHTML = html;
      resultsEl.appendChild(card);
    }
  }

  function filterData(query) {
    const q = query.trim().toLowerCase();
    if (!q) return cannabisData;
    const words = q.split(/\s+/);
    return cannabisData.filter(obj => {
      const text = Object.values(obj).map(v => String(v || '')).join(' ').toLowerCase();
      return words.every(w => text.includes(w));
    });
  }

  function updateSuggestions(q) {
    suggEl.innerHTML = '';
    if (!q) return;
    const ql = q.toLowerCase();
    const matches = cannabisData
      .map(o => o['Strain'])
      .filter(n => n && n.toLowerCase().includes(ql));

    // Unique & first 12
    const seen = new Set();
    const list = [];
    for (const m of matches) {
      if (!seen.has(m)) {
        seen.add(m);
        list.push(m);
        if (list.length >= 12) break;
      }
    }
    list.forEach(name => {
      const li = document.createElement('li');
      li.textContent = name;
      li.addEventListener('click', () => {
        searchEl.value = name;
        suggEl.innerHTML = '';
        renderResults(filterData(name));
      });
      suggEl.appendChild(li);
    });
  }

  // Live search
  searchEl.addEventListener('input', e => {
    const val = e.target.value;
    updateSuggestions(val);
    renderResults(filterData(val));
  });

  // Enter key triggers search
  searchEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      suggEl.innerHTML = '';
      renderResults(filterData(searchEl.value));
    }
  });

  // Click outside closes suggestions
  document.addEventListener('click', e => {
    if (!e.target.closest('.search-container')) suggEl.innerHTML = '';
  });

  // Initial render
  renderResults(cannabisData);
})();
