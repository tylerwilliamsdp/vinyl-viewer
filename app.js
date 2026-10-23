// ─────────────────────────────────────────────────────────
//  SET YOUR DISCOGS USERNAME HERE
// ─────────────────────────────────────────────────────────
const DISCOGS_USERNAME = 'tylerwilliamsdp';
// ─────────────────────────────────────────────────────────

const API_BASE   = 'https://api.discogs.com';
const HEADERS    = { 'User-Agent': 'VinylViewer/1.0' };
const CACHE_KEY  = `vinyl-cache-v3-${DISCOGS_USERNAME}`;
const CACHE_TTL  = 24 * 60 * 60 * 1000; // 24 hours

// ── State ──────────────────────────────────────────────────
let allRecords   = [];
let filteredRecs = [];
let activeGenre  = 'all';
let searchQuery  = '';
let activeSort   = 'artist';

// ── DOM refs ───────────────────────────────────────────────
const loader       = document.getElementById('loader');
const loaderText   = document.getElementById('loaderText');
const errorState   = document.getElementById('errorState');
const errorTitle   = document.getElementById('errorTitle');
const errorMsg     = document.getElementById('errorMsg');
const gridEl       = document.getElementById('grid');
const emptyState   = document.getElementById('emptyState');
const genreBar     = document.getElementById('genreBar');
const searchInput  = document.getElementById('search');
const sortSelect   = document.getElementById('sortSelect');
const modalOverlay = document.getElementById('modalOverlay');
const modalClose   = document.getElementById('modalClose');
const modalImg     = document.getElementById('modalImg');
const modalArtist  = document.getElementById('modalArtist');
const modalTitle   = document.getElementById('modalTitle');
const modalMeta    = document.getElementById('modalMeta');
const modalTags    = document.getElementById('modalTags');

// ── Cache ──────────────────────────────────────────────────
function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch { return null; }
}

function saveCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}

// ── Fetch all pages ────────────────────────────────────────
async function fetchCollection(username) {
  const releases = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url = `${API_BASE}/users/${username}/collection/folders/0/releases?sort=added&sort_order=desc&per_page=100&page=${page}`;
    const res = await fetch(url, { headers: HEADERS });

    if (res.status === 404) throw new Error('User not found. Check your Discogs username.');
    if (res.status === 401) throw new Error('Collection is private. Make your Discogs collection public in settings.');
    if (!res.ok) throw new Error(`Discogs API error: ${res.status}`);

    const data = await res.json();
    totalPages = data.pagination.pages;
    releases.push(...data.releases);

    loaderText.textContent = `Loading… ${releases.length} of ${data.pagination.items} records`;
    page++;

    if (page <= totalPages) await sleep(300);
  }

  return releases;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Normalize release data ─────────────────────────────────
function normalize(release) {
  const bi = release.basic_information;
  return {
    id:      release.id,
    title:   bi.title,
    artist:  bi.artists.map(a => a.name.replace(/ \(\d+\)$/, '')).join(', '),
    year:    bi.year || null,
    added:   release.date_added || '',
    labels:  (bi.labels || []).map(l => l.name),
    genres:  bi.genres  || [],
    styles:  bi.styles  || [],
    cover:   bi.cover_image || bi.thumb || '',
    thumb:   bi.thumb || bi.cover_image || '',
  };
}

// Strip leading "The ", "A ", "An " for sort purposes
function sortKey(str) {
  return str.replace(/^(the |a |an )/i, '').trim();
}

// ── Sort ───────────────────────────────────────────────────
function sortRecords(records) {
  const sorted = [...records];
  if (activeSort === 'artist') {
    sorted.sort((a, b) => sortKey(a.artist).localeCompare(sortKey(b.artist)));
  } else if (activeSort === 'title') {
    sorted.sort((a, b) => sortKey(a.title).localeCompare(sortKey(b.title)));
  } else if (activeSort === 'year-asc') {
    sorted.sort((a, b) => (a.year || 9999) - (b.year || 9999));
  } else if (activeSort === 'year-desc') {
    sorted.sort((a, b) => (b.year || 0) - (a.year || 0));
  } else if (activeSort === 'recent') {
    sorted.sort((a, b) => (b.added || '').localeCompare(a.added || ''));
  }
  return sorted;
}

// ── Build genre buttons ────────────────────────────────────
function buildGenreBar(records) {
  const counts = {};
  records.forEach(r => {
    r.genres.forEach(g => { counts[g] = (counts[g] || 0) + 1; });
  });

  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([g]) => g);

  sorted.forEach(genre => {
    const btn = document.createElement('button');
    btn.className = 'genre-btn';
    btn.dataset.genre = genre;
    btn.textContent = genre;
    genreBar.appendChild(btn);
  });
}

function setGenre(genre, btn) {
  activeGenre = genre;
  document.querySelectorAll('.genre-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  applyFilters();
}

// ── Filtering + Sorting ────────────────────────────────────
function applyFilters() {
  const q = searchQuery.toLowerCase();

  filteredRecs = allRecords.filter(r => {
    const genreMatch = activeGenre === 'all' || r.genres.includes(activeGenre);
    const searchMatch = !q || [r.title, r.artist, ...r.genres, ...r.styles]
      .some(s => s.toLowerCase().includes(q));
    return genreMatch && searchMatch;
  });

  renderGrid(sortRecords(filteredRecs));
}

// ── Render grid ────────────────────────────────────────────
function renderGrid(records) {
  gridEl.innerHTML = '';

  if (records.length === 0) {
    gridEl.style.display = 'none';
    emptyState.style.display = 'flex';
    return;
  }

  emptyState.style.display = 'none';
  gridEl.style.display = 'grid';

  records.forEach(r => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-art">
        ${r.thumb
          ? `<img src="${escHtml(r.thumb)}" alt="${escHtml(r.title)}" loading="lazy" class="loading">`
          : `<div class="card-placeholder">&#9679;</div>`}
      </div>
      <div class="card-body">
        <div class="card-title">${escHtml(r.title)}</div>
        <div class="card-artist">${escHtml(r.artist)}</div>
        ${r.year ? `<div class="card-year">${r.year}</div>` : ''}
      </div>
    `;

    const img = card.querySelector('img');
    if (img) {
      img.addEventListener('load',  () => img.classList.remove('loading'));
      img.addEventListener('error', () => {
        img.parentElement.innerHTML = '<div class="card-placeholder">&#9679;</div>';
      });
    }

    card.addEventListener('click', () => openModal(r));
    gridEl.appendChild(card);
  });
}

// ── Modal (Now Playing style) ──────────────────────────────
function openModal(r) {
  modalImg.src = r.cover || r.thumb || '';
  modalImg.alt = r.title;

  // Color backdrop from album art
  modalOverlay.style.backgroundImage = r.cover
    ? `linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.92) 60%), url(${escHtml(r.cover)})`
    : '';
  modalOverlay.style.backgroundSize = 'cover';
  modalOverlay.style.backgroundPosition = 'center';

  modalArtist.textContent = r.artist;
  modalTitle.textContent  = r.title;

  const metaParts = [];
  if (r.year)          metaParts.push(`<span><strong>Year</strong>  ${r.year}</span>`);
  if (r.labels.length) metaParts.push(`<span><strong>Label</strong>  ${escHtml(r.labels.join(', '))}</span>`);
  modalMeta.innerHTML = metaParts.join('');

  const tags = [
    ...r.genres.map(g => `<span class="tag genre">${escHtml(g)}</span>`),
    ...r.styles.map(s => `<span class="tag">${escHtml(s)}</span>`),
  ];
  modalTags.innerHTML = tags.join('');

  modalOverlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalOverlay.style.display = 'none';
  modalOverlay.style.backgroundImage = '';
  document.body.style.overflow = '';
}

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// Genre bar — event delegation
genreBar.addEventListener('click', e => {
  const btn = e.target.closest('.genre-btn');
  if (!btn) return;
  setGenre(btn.dataset.genre, btn);
});

// Sort
sortSelect.addEventListener('change', e => {
  activeSort = e.target.value;
  applyFilters();
});

// ── Search ─────────────────────────────────────────────────
searchInput.addEventListener('input', e => {
  searchQuery = e.target.value;
  applyFilters();
});

// ── Helper ─────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Show error ─────────────────────────────────────────────
function showError(title, msg) {
  loader.style.display = 'none';
  errorTitle.textContent = title;
  errorMsg.innerHTML = msg;
  errorState.style.display = 'flex';
}

// ── Init ───────────────────────────────────────────────────
async function init() {
  if (!DISCOGS_USERNAME || DISCOGS_USERNAME === 'YOUR_USERNAME_HERE') {
    showError(
      'Username not set',
      'Open <code>app.js</code> and set <code>DISCOGS_USERNAME</code> at the top of the file to your Discogs username.'
    );
    return;
  }

  try {
    // Try cache first
    const cached = loadCache();
    if (cached) {
      loaderText.textContent = 'Loading from cache…';
      allRecords = cached;
      buildGenreBar(allRecords);
      loader.style.display = 'none';
      filteredRecs = [...allRecords];
      renderGrid(sortRecords(filteredRecs));
      return;
    }

    const releases = await fetchCollection(DISCOGS_USERNAME);

    if (releases.length === 0) {
      showError('Collection is empty', 'No records found in your Discogs collection. Add some records and try again.');
      return;
    }

    allRecords = releases.map(normalize);
    saveCache(allRecords);

    buildGenreBar(allRecords);

    loader.style.display = 'none';
    filteredRecs = [...allRecords];
    renderGrid(sortRecords(filteredRecs));

  } catch (err) {
    showError('Failed to load collection', escHtml(err.message));
  }
}

init();
