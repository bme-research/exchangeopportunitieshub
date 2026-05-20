/**
 * Exchange Opportunities Hub — app.js
 * ============================================================
 * Fetches CSV data (Google Sheets or local), parses it with
 * PapaParse, and renders a fully filterable, searchable list
 * of academic exchange opportunities.
 *
 * Architecture: pure vanilla JS, no frameworks, no build step.
 * ============================================================
 */

/* ──────────────────────────────────────────────────────────────
   CONFIGURATION — Replace CSV_URL with your Google Sheets URL:
   https://docs.google.com/spreadsheets/d/SHEET_ID/gviz/tq?tqx=out:csv&sheet=opportunities
   ────────────────────────────────────────────────────────────── */
const CONFIG = {
  CSV_URL: './data/sample.csv',   // ← change to your Google Sheets CSV export URL

  // Standard fixed schema fields (order defines render order in detail view)
  FIXED_FIELDS: [
    'institution', 'country', 'city', 'continent', 'level',
    'eligible_programs', 'scholarship', 'scholarship_details',
    'duration', 'language', 'requirements', 'english_test',
    'deadline', 'deadline_status', 'official_url', 'contact_email',
    'notes', 'active'
  ],

  // Human-readable labels for fixed fields
  FIELD_LABELS: {
    institution:         'Institution',
    country:             'Country',
    city:                'City',
    continent:           'Continent',
    level:               'Academic Level',
    eligible_programs:   'Eligible Programs',
    scholarship:         'Scholarship',
    scholarship_details: 'Scholarship Details',
    duration:            'Duration',
    language:            'Language of Instruction',
    requirements:        'Requirements',
    english_test:        'English Test Required',
    deadline:            'Application Deadline',
    deadline_status:     'Deadline Status',
    official_url:        'Official Website',
    contact_email:       'Contact Email',
    notes:               'Notes',
    active:              'Active Opportunity',
  },

  // Page size for rendering (loads all but renders in batches for large datasets)
  PAGE_SIZE: 50,

  // Refresh interval (0 = no auto-refresh)
  REFRESH_MS: 0,
};

/* ──────────────────────────────────────────────────────────────
   COUNTRY → EMOJI FLAG UTILITY
   ────────────────────────────────────────────────────────────── */
const COUNTRY_FLAGS = {
  'canada':           '🇨🇦',
  'switzerland':      '🇨🇭',
  'belgium':          '🇧🇪',
  'singapore':        '🇸🇬',
  'australia':        '🇦🇺',
  'united kingdom':   '🇬🇧',
  'uk':               '🇬🇧',
  'france':           '🇫🇷',
  'brazil':           '🇧🇷',
  'south africa':     '🇿🇦',
  'japan':            '🇯🇵',
  'italy':            '🇮🇹',
  'germany':          '🇩🇪',
  'new zealand':      '🇳🇿',
  'south korea':      '🇰🇷',
  'korea':            '🇰🇷',
  'united states':    '🇺🇸',
  'usa':              '🇺🇸',
  'netherlands':      '🇳🇱',
  'sweden':           '🇸🇪',
  'norway':           '🇳🇴',
  'denmark':          '🇩🇰',
  'finland':          '🇫🇮',
  'spain':            '🇪🇸',
  'portugal':         '🇵🇹',
  'china':            '🇨🇳',
  'india':            '🇮🇳',
  'mexico':           '🇲🇽',
  'argentina':        '🇦🇷',
  'chile':            '🇨🇱',
  'colombia':         '🇨🇴',
  'austria':          '🇦🇹',
  'poland':           '🇵🇱',
  'czech republic':   '🇨🇿',
  'hungary':          '🇭🇺',
  'ireland':          '🇮🇪',
  'israel':           '🇮🇱',
  'turkey':           '🇹🇷',
  'taiwan':           '🇹🇼',
  'hong kong':        '🇭🇰',
  'malaysia':         '🇲🇾',
  'thailand':         '🇹🇭',
  'indonesia':        '🇮🇩',
  'philippines':      '🇵🇭',
  'nigeria':          '🇳🇬',
  'kenya':            '🇰🇪',
  'ghana':            '🇬🇭',
  'egypt':            '🇪🇬',
  'morocco':          '🇲🇦',
};

/**
 * Returns emoji flag for a country name string.
 * Falls back to a globe emoji if not found.
 */
function getFlag(country) {
  if (!country) return '🌍';
  const key = country.trim().toLowerCase();
  return COUNTRY_FLAGS[key] || '🌍';
}

/* ──────────────────────────────────────────────────────────────
   APPLICATION STATE
   ────────────────────────────────────────────────────────────── */
const State = {
  raw:        [],       // all rows from CSV (objects)
  filtered:   [],       // current filtered+searched rows
  page:       1,        // current rendered page
  activeModal: null,    // currently shown opportunity

  filters: {
    keyword:    '',
    country:    '',
    continent:  '',
    level:      '',
    scholarship:'',
    deadline:   '',
    language:   '',
  },

  sortBy: 'institution', // field to sort by
};

/* ──────────────────────────────────────────────────────────────
   DOM REFERENCES
   ────────────────────────────────────────────────────────────── */
const DOM = {};

function cacheDOM() {
  DOM.resultsContainer = document.getElementById('results-container');
  DOM.resultsCount     = document.getElementById('results-count');
  DOM.searchInput      = document.getElementById('search-input');
  DOM.filterCountry    = document.getElementById('filter-country');
  DOM.filterContinent  = document.getElementById('filter-continent');
  DOM.filterLevel      = document.getElementById('filter-level');
  DOM.filterScholarship= document.getElementById('filter-scholarship');
  DOM.filterDeadline   = document.getElementById('filter-deadline');
  DOM.filterLanguage   = document.getElementById('filter-language');
  DOM.clearBtn         = document.getElementById('clear-filters');
  DOM.activeFilters    = document.getElementById('active-filters');
  DOM.sortSelect       = document.getElementById('sort-select');
  DOM.modalOverlay     = document.getElementById('modal-overlay');
  DOM.modal            = document.getElementById('detail-modal');
  DOM.heroCount        = document.getElementById('hero-count');
  DOM.notification     = document.getElementById('notification-bar');
  DOM.scrollTop        = document.getElementById('scroll-top');
  DOM.navToggle        = document.getElementById('nav-toggle');
  DOM.siteNav          = document.getElementById('site-nav');
}

/* ──────────────────────────────────────────────────────────────
   FETCH & PARSE CSV
   ────────────────────────────────────────────────────────────── */

/**
 * Loads CSV data from CONFIG.CSV_URL.
 * Uses PapaParse for robust RFC-4180 parsing (handles quoted commas etc.)
 */
async function loadData() {
  showLoading();

  try {
    // PapaParse remote fetch (works with local files and remote URLs)
    const result = await new Promise((resolve, reject) => {
      Papa.parse(CONFIG.CSV_URL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
        transform: (v) => v.trim(),
        complete: resolve,
        error: reject,
      });
    });

    if (result.errors && result.errors.length > 0) {
      console.warn('CSV parse warnings:', result.errors);
    }

    // Filter only active rows (active === 'TRUE' or 'true' or '1' or blank treated as active)
    const allRows = result.data;
    State.raw = allRows.filter(row => {
      const active = (row.active || '').toLowerCase();
      return active === '' || active === 'true' || active === '1';
    });

    console.log(`Loaded ${allRows.length} rows, ${State.raw.length} active.`);

    // Populate filter dropdowns from data
    populateFilters();

    // Update hero stats
    updateHeroStats();

    // Render
    applyFiltersAndRender();

  } catch (err) {
    console.error('Failed to load CSV:', err);
    showError(err);
  }
}

/* ──────────────────────────────────────────────────────────────
   FILTER POPULATION
   ────────────────────────────────────────────────────────────── */

function populateFilters() {
  // Collect unique values for each filter dimension
  const countries    = new Set();
  const continents   = new Set();
  const levels       = new Set();
  const languages    = new Set();

  State.raw.forEach(row => {
    if (row.country)    countries.add(row.country.trim());
    if (row.continent)  continents.add(row.continent.trim());

    // Level can be semicolon-separated (e.g. "Undergraduate;Graduate")
    if (row.level) {
      row.level.split(';').forEach(l => levels.add(l.trim()));
    }

    // Language can be semicolon-separated
    if (row.language) {
      row.language.split(';').forEach(lang => languages.add(lang.trim()));
    }
  });

  populateSelect(DOM.filterCountry,   [...countries].sort());
  populateSelect(DOM.filterContinent, [...continents].sort());
  populateSelect(DOM.filterLevel,     [...levels].sort());
  populateSelect(DOM.filterLanguage,  [...languages].sort());
}

function populateSelect(selectEl, values) {
  if (!selectEl) return;
  // Preserve existing placeholder
  const placeholder = selectEl.options[0];
  selectEl.innerHTML = '';
  selectEl.appendChild(placeholder);

  values.forEach(val => {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = val;
    selectEl.appendChild(opt);
  });
}

/* ──────────────────────────────────────────────────────────────
   FILTERING & SEARCH LOGIC
   ────────────────────────────────────────────────────────────── */

function applyFiltersAndRender() {
  const { keyword, country, continent, level, scholarship, deadline, language } = State.filters;
  const kw = keyword.toLowerCase();

  State.filtered = State.raw.filter(row => {
    // Keyword search across multiple fields
    if (kw) {
      const searchable = [
        row.institution, row.country, row.city, row.level,
        row.eligible_programs, row.notes, row.language,
        row.requirements, row.scholarship_details
      ].join(' ').toLowerCase();
      if (!searchable.includes(kw)) return false;
    }

    // Country exact match
    if (country && row.country !== country) return false;

    // Continent exact match
    if (continent && row.continent !== continent) return false;

    // Level: row may have multiple levels separated by ";"
    if (level) {
      const rowLevels = (row.level || '').split(';').map(l => l.trim());
      if (!rowLevels.includes(level)) return false;
    }

    // Scholarship
    if (scholarship) {
      const rowScholarship = (row.scholarship || '').toLowerCase().trim();
      if (scholarship === 'yes' && rowScholarship !== 'yes') return false;
      if (scholarship === 'partial' && rowScholarship !== 'partial') return false;
      if (scholarship === 'no' && rowScholarship !== 'no') return false;
    }

    // Deadline status
    if (deadline) {
      const rowDeadline = (row.deadline_status || '').toLowerCase().trim();
      if (deadline === 'open' && rowDeadline !== 'open') return false;
      if (deadline === 'closing' && !rowDeadline.includes('closing')) return false;
      if (deadline === 'closed' && rowDeadline !== 'closed') return false;
    }

    // Language
    if (language) {
      const rowLangs = (row.language || '').split(';').map(l => l.trim());
      if (!rowLangs.includes(language)) return false;
    }

    return true;
  });

  // Sort
  sortResults();

  // Render
  State.page = 1;
  renderResults();
  updateFiltersUI();
}

function sortResults() {
  const key = State.sortBy;
  State.filtered.sort((a, b) => {
    const aVal = (a[key] || '').toLowerCase();
    const bVal = (b[key] || '').toLowerCase();
    if (aVal < bVal) return -1;
    if (aVal > bVal) return 1;
    return 0;
  });
}

/* ──────────────────────────────────────────────────────────────
   RENDERING — CARDS
   ────────────────────────────────────────────────────────────── */

function renderResults() {
  if (!DOM.resultsContainer) return;

  const total = State.filtered.length;

  // Update count
  if (DOM.resultsCount) {
    DOM.resultsCount.innerHTML = `Showing <strong>${total}</strong> opportunit${total === 1 ? 'y' : 'ies'}`;
  }

  if (total === 0) {
    showEmptyState();
    return;
  }

  // Render cards
  const toRender = State.filtered.slice(0, State.page * CONFIG.PAGE_SIZE);
  const grid = document.createElement('div');
  grid.className = 'cards-grid';
  grid.id = 'cards-grid';

  toRender.forEach(row => {
    grid.appendChild(buildCard(row));
  });

  DOM.resultsContainer.innerHTML = '';
  DOM.resultsContainer.appendChild(grid);

  // Load more button if needed
  if (toRender.length < total) {
    const loadMore = document.createElement('div');
    loadMore.style.textAlign = 'center';
    loadMore.style.marginTop = '32px';
    loadMore.innerHTML = `
      <button class="btn btn-outline btn-lg" id="load-more-btn">
        Load more opportunities (${total - toRender.length} remaining)
      </button>
    `;
    DOM.resultsContainer.appendChild(loadMore);

    document.getElementById('load-more-btn').addEventListener('click', () => {
      State.page++;
      renderResults();
    });
  }
}

function buildCard(row) {
  const card = document.createElement('div');
  card.className = 'opp-card';
  card.setAttribute('role', 'article');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `Exchange opportunity at ${row.institution}`);

  const flag        = getFlag(row.country);
  const scholarBadge= buildScholarshipBadge(row.scholarship);
  const deadlineBadge = buildDeadlineBadge(row.deadline_status);
  const levels      = (row.level || '').split(';').map(l => l.trim()).filter(Boolean);
  const deadline    = row.deadline ? formatDate(row.deadline) : 'See website';

  card.innerHTML = `
    <div class="card-header">
      <div class="card-flag" aria-hidden="true">${flag}</div>
      <div class="card-institution-info">
        <div class="card-institution">${escHtml(row.institution || '—')}</div>
        <div class="card-location">${escHtml(row.city || '')}${row.city && row.country ? ', ' : ''}${escHtml(row.country || '')}</div>
      </div>
    </div>
    <div class="card-body">
      <div class="card-meta-row">
        ${levels.map(l => `<span class="badge badge-level">${escHtml(l)}</span>`).join('')}
        ${scholarBadge}
      </div>
      <div class="card-deadline-row">
        <span class="deadline-label">Deadline</span>
        <span class="deadline-value">${escHtml(deadline)}</span>
      </div>
      <div class="card-meta-row">
        ${deadlineBadge}
        ${row.language ? `<span class="badge" style="background:var(--color-gray-100);color:var(--color-gray-700);">🗣 ${escHtml(row.language.split(';')[0].trim())}</span>` : ''}
      </div>
    </div>
    <div class="card-footer">
      <button class="btn btn-primary btn-sm" data-action="details">View Details</button>
      ${row.official_url ? `<a class="btn btn-outline btn-sm" href="${escHtml(row.official_url)}" target="_blank" rel="noopener noreferrer" aria-label="Official website for ${escHtml(row.institution)}" onclick="event.stopPropagation()">Official Site ↗</a>` : ''}
    </div>
  `;

  // Click / keyboard to open modal
  const openModal = () => openDetailModal(row);
  card.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') return; // let link clicks pass through
    openModal();
  });
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openModal();
    }
  });

  card.querySelector('[data-action="details"]').addEventListener('click', (e) => {
    e.stopPropagation();
    openModal();
  });

  return card;
}

function buildScholarshipBadge(scholarship) {
  const s = (scholarship || '').toLowerCase().trim();
  if (s === 'yes') return `<span class="badge badge-scholarship-yes">🎓 Full Scholarship</span>`;
  if (s === 'partial') return `<span class="badge badge-scholarship-partial">🎓 Partial Scholarship</span>`;
  return `<span class="badge badge-scholarship-no">No Scholarship</span>`;
}

function buildDeadlineBadge(deadlineStatus) {
  const s = (deadlineStatus || '').toLowerCase().trim();
  if (s === 'open') return `<span class="badge badge-deadline-open">✓ Open</span>`;
  if (s.includes('closing')) return `<span class="badge badge-deadline-closing">⚠ Closing Soon</span>`;
  if (s === 'closed') return `<span class="badge badge-deadline-closed">✕ Closed</span>`;
  return `<span class="badge" style="background:var(--color-gray-100);color:var(--color-gray-500);">${escHtml(deadlineStatus || 'Check Website')}</span>`;
}

/* ──────────────────────────────────────────────────────────────
   RENDERING — DETAIL MODAL
   ────────────────────────────────────────────────────────────── */

function openDetailModal(row) {
  if (!DOM.modalOverlay || !DOM.modal) return;

  State.activeModal = row;
  DOM.modal.innerHTML = buildModalHTML(row);

  // Wire close button
  DOM.modal.querySelector('.modal-close').addEventListener('click', closeModal);

  // Wire footer buttons
  const footerUrl = DOM.modal.querySelector('[data-modal-url]');
  if (footerUrl) {
    footerUrl.href = row.official_url;
  }

  DOM.modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Focus trap
  setTimeout(() => {
    const first = DOM.modal.querySelector('button, a, [tabindex]');
    if (first) first.focus();
  }, 50);
}

function closeModal() {
  if (!DOM.modalOverlay) return;
  DOM.modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
  State.activeModal = null;
}

function buildModalHTML(row) {
  const flag   = getFlag(row.country);
  const levels = (row.level || '').split(';').map(l => l.trim()).filter(Boolean);
  const langs  = (row.language || '').split(';').map(l => l.trim()).filter(Boolean);

  // Detect dynamic (extra) fields not in FIXED_FIELDS
  const dynamicFields = Object.keys(row).filter(
    k => !CONFIG.FIXED_FIELDS.includes(k) && k !== '' && row[k] !== ''
  );

  const programs = (row.eligible_programs || '').split(';').map(p => p.trim()).filter(Boolean);

  return `
    <div class="modal-header">
      <button class="modal-close" aria-label="Close details">✕</button>
      <div class="modal-header-top">
        <div class="modal-flag" aria-hidden="true">${flag}</div>
        <div>
          <div class="modal-institution">${escHtml(row.institution || '—')}</div>
          <div class="modal-location">
            ${[row.city, row.country, row.continent].filter(Boolean).map(escHtml).join(' · ')}
          </div>
        </div>
      </div>
      <div class="modal-badges">
        ${levels.map(l => `<span class="badge badge-level">${escHtml(l)}</span>`).join('')}
        ${buildScholarshipBadge(row.scholarship)}
        ${buildDeadlineBadge(row.deadline_status)}
      </div>
    </div>

    <div class="modal-body">

      <!-- Academic Details -->
      <div class="detail-section">
        <div class="detail-section-title">Academic Details</div>
        <div class="detail-grid">
          <div class="detail-item">
            <div class="detail-item-label">Academic Level</div>
            <div class="detail-item-value">${levels.join(', ') || '—'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-item-label">Eligible Programs</div>
            <div class="detail-item-value">${programs.join(', ') || '—'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-item-label">Duration</div>
            <div class="detail-item-value">${escHtml(row.duration || '—')}</div>
          </div>
          <div class="detail-item">
            <div class="detail-item-label">Language of Instruction</div>
            <div class="detail-item-value">${langs.join(', ') || '—'}</div>
          </div>
        </div>
      </div>

      <!-- Scholarship & Funding -->
      <div class="detail-section">
        <div class="detail-section-title">Scholarship & Funding</div>
        <div class="detail-grid">
          <div class="detail-item">
            <div class="detail-item-label">Scholarship Available</div>
            <div class="detail-item-value">${escHtml(row.scholarship || '—')}</div>
          </div>
          <div class="detail-item" style="grid-column: 1 / -1;">
            <div class="detail-item-label">Scholarship Details</div>
            <div class="detail-item-value">${escHtml(row.scholarship_details || 'No scholarship information provided.')}</div>
          </div>
        </div>
      </div>

      <!-- Requirements & Application -->
      <div class="detail-section">
        <div class="detail-section-title">Requirements & Application</div>
        <div class="detail-grid">
          <div class="detail-item" style="grid-column: 1 / -1;">
            <div class="detail-item-label">Requirements</div>
            <div class="detail-item-value">${escHtml(row.requirements || '—')}</div>
          </div>
          <div class="detail-item">
            <div class="detail-item-label">English Test</div>
            <div class="detail-item-value">${escHtml(row.english_test || '—')}</div>
          </div>
          <div class="detail-item">
            <div class="detail-item-label">Application Deadline</div>
            <div class="detail-item-value">${row.deadline ? formatDate(row.deadline) : '—'} ${buildDeadlineBadge(row.deadline_status)}</div>
          </div>
        </div>
      </div>

      <!-- Contact & Links -->
      <div class="detail-section">
        <div class="detail-section-title">Contact & Links</div>
        <div class="detail-grid">
          <div class="detail-item">
            <div class="detail-item-label">Official Website</div>
            <div class="detail-item-value">
              ${row.official_url
                ? `<a href="${escHtml(row.official_url)}" target="_blank" rel="noopener noreferrer">${escHtml(row.official_url)}</a>`
                : '—'}
            </div>
          </div>
          <div class="detail-item">
            <div class="detail-item-label">Contact Email</div>
            <div class="detail-item-value">
              ${row.contact_email
                ? `<a href="mailto:${escHtml(row.contact_email)}">${escHtml(row.contact_email)}</a>`
                : '—'}
            </div>
          </div>
        </div>
      </div>

      <!-- Notes -->
      ${row.notes ? `
      <div class="detail-section">
        <div class="detail-section-title">Additional Notes</div>
        <div class="detail-grid">
          <div class="detail-item" style="grid-column: 1 / -1;">
            <div class="detail-item-value">${escHtml(row.notes)}</div>
          </div>
        </div>
      </div>` : ''}

      <!-- Dynamic / Extra Fields (automatically detected) -->
      ${dynamicFields.length > 0 ? `
      <div class="detail-section">
        <div class="detail-section-title">Additional Information</div>
        <div class="detail-grid">
          ${dynamicFields.map(field => `
            <div class="detail-item">
              <div class="detail-item-label">${escHtml(humanizeFieldName(field))}</div>
              <div class="detail-item-value">${escHtml(row[field] || '—')}</div>
            </div>
          `).join('')}
        </div>
      </div>` : ''}

    </div><!-- /modal-body -->

    <div class="modal-footer">
      ${row.official_url
        ? `<a class="btn btn-primary" href="${escHtml(row.official_url)}" target="_blank" rel="noopener noreferrer" data-modal-url>Visit Official Website ↗</a>`
        : ''}
      ${row.contact_email
        ? `<a class="btn btn-outline" href="mailto:${escHtml(row.contact_email)}">Contact Institution</a>`
        : ''}
      <button class="btn btn-ghost" onclick="closeModal()">Close</button>
    </div>
  `;
}

// Expose closeModal globally for onclick attribute usage
window.closeModal = closeModal;

/* ──────────────────────────────────────────────────────────────
   UI STATE: LOADING / EMPTY / ERROR
   ────────────────────────────────────────────────────────────── */

function showLoading() {
  if (!DOM.resultsContainer) return;
  DOM.resultsContainer.innerHTML = `
    <div class="state-container">
      <div class="spinner" aria-hidden="true"></div>
      <div class="state-title">Loading opportunities…</div>
      <div class="state-description">Fetching the latest data. This should only take a moment.</div>
    </div>
  `;
  if (DOM.resultsCount) DOM.resultsCount.innerHTML = '';
}

function showEmptyState() {
  if (!DOM.resultsContainer) return;
  const hasFilters = Object.values(State.filters).some(v => v !== '');
  DOM.resultsContainer.innerHTML = `
    <div class="state-container">
      <div class="state-icon">🔍</div>
      <div class="state-title">No opportunities found</div>
      <div class="state-description">
        ${hasFilters
          ? 'No results match your current filters. Try adjusting or clearing your search criteria.'
          : 'There are currently no active opportunities to display.'}
      </div>
      ${hasFilters ? `<button class="btn btn-primary" style="margin-top:16px" onclick="clearAllFilters()">Clear all filters</button>` : ''}
    </div>
  `;
}

function showError(err) {
  if (!DOM.resultsContainer) return;
  DOM.resultsContainer.innerHTML = `
    <div class="state-container">
      <div class="state-icon">⚠️</div>
      <div class="state-title">Unable to load data</div>
      <div class="state-description">
        The opportunity data could not be fetched. This may be a temporary network issue.<br>
        Please try refreshing the page, or contact the site administrator if the problem persists.
        <br><br>
        <small style="color:var(--color-gray-500);">Technical details: ${escHtml(String(err))}</small>
      </div>
      <button class="btn btn-outline" style="margin-top:16px" onclick="location.reload()">Retry</button>
    </div>
  `;

  if (DOM.notification) {
    DOM.notification.textContent = '⚠ Could not load opportunity data. Showing a cached or demo version if available.';
    DOM.notification.classList.add('visible');
  }
}

/* ──────────────────────────────────────────────────────────────
   FILTER UI UPDATES (active chips, clear button)
   ────────────────────────────────────────────────────────────── */

function updateFiltersUI() {
  if (!DOM.activeFilters || !DOM.clearBtn) return;

  const active = [];
  const { keyword, country, continent, level, scholarship, deadline, language } = State.filters;

  if (keyword)    active.push({ key: 'keyword',    label: `Search: "${keyword}"` });
  if (country)    active.push({ key: 'country',    label: `Country: ${country}` });
  if (continent)  active.push({ key: 'continent',  label: `Continent: ${continent}` });
  if (level)      active.push({ key: 'level',      label: `Level: ${level}` });
  if (scholarship)active.push({ key: 'scholarship',label: `Scholarship: ${scholarship}` });
  if (deadline)   active.push({ key: 'deadline',   label: `Deadline: ${deadline}` });
  if (language)   active.push({ key: 'language',   label: `Language: ${language}` });

  if (active.length > 0) {
    DOM.clearBtn.classList.add('visible');
    DOM.activeFilters.innerHTML = active.map(f => `
      <span class="filter-chip">
        ${escHtml(f.label)}
        <button aria-label="Remove filter ${escHtml(f.label)}" onclick="removeFilter('${f.key}')">✕</button>
      </span>
    `).join('');
  } else {
    DOM.clearBtn.classList.remove('visible');
    DOM.activeFilters.innerHTML = '';
  }
}

function removeFilter(key) {
  State.filters[key] = '';
  // Also reset the DOM element
  const elMap = {
    keyword:    DOM.searchInput,
    country:    DOM.filterCountry,
    continent:  DOM.filterContinent,
    level:      DOM.filterLevel,
    scholarship:DOM.filterScholarship,
    deadline:   DOM.filterDeadline,
    language:   DOM.filterLanguage,
  };
  if (elMap[key]) elMap[key].value = '';
  applyFiltersAndRender();
}

function clearAllFilters() {
  Object.keys(State.filters).forEach(k => State.filters[k] = '');
  if (DOM.searchInput)      DOM.searchInput.value = '';
  if (DOM.filterCountry)    DOM.filterCountry.value = '';
  if (DOM.filterContinent)  DOM.filterContinent.value = '';
  if (DOM.filterLevel)      DOM.filterLevel.value = '';
  if (DOM.filterScholarship)DOM.filterScholarship.value = '';
  if (DOM.filterDeadline)   DOM.filterDeadline.value = '';
  if (DOM.filterLanguage)   DOM.filterLanguage.value = '';
  applyFiltersAndRender();
}

window.removeFilter = removeFilter;
window.clearAllFilters = clearAllFilters;

/* ──────────────────────────────────────────────────────────────
   HERO STATS
   ────────────────────────────────────────────────────────────── */

function updateHeroStats() {
  if (!DOM.heroCount) return;
  DOM.heroCount.textContent = State.raw.length;

  // Update continent count
  const continentEl = document.getElementById('hero-continents');
  if (continentEl) {
    const continents = new Set(State.raw.map(r => r.continent).filter(Boolean));
    continentEl.textContent = continents.size;
  }

  // Update country count
  const countryEl = document.getElementById('hero-countries');
  if (countryEl) {
    const countries = new Set(State.raw.map(r => r.country).filter(Boolean));
    countryEl.textContent = countries.size;
  }
}

/* ──────────────────────────────────────────────────────────────
   EVENT LISTENERS
   ────────────────────────────────────────────────────────────── */

function initEventListeners() {
  // Debounced search
  let searchTimeout;
  if (DOM.searchInput) {
    DOM.searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        State.filters.keyword = e.target.value.trim();
        applyFiltersAndRender();
      }, 280);
    });
  }

  // Dropdown filters
  const filterMap = [
    [DOM.filterCountry,     'country'],
    [DOM.filterContinent,   'continent'],
    [DOM.filterLevel,       'level'],
    [DOM.filterScholarship, 'scholarship'],
    [DOM.filterDeadline,    'deadline'],
    [DOM.filterLanguage,    'language'],
  ];

  filterMap.forEach(([el, key]) => {
    if (!el) return;
    el.addEventListener('change', (e) => {
      State.filters[key] = e.target.value;
      applyFiltersAndRender();
    });
  });

  // Clear all filters
  if (DOM.clearBtn) {
    DOM.clearBtn.addEventListener('click', clearAllFilters);
  }

  // Sort
  if (DOM.sortSelect) {
    DOM.sortSelect.addEventListener('change', (e) => {
      State.sortBy = e.target.value;
      applyFiltersAndRender();
    });
  }

  // Modal overlay click-outside to close
  if (DOM.modalOverlay) {
    DOM.modalOverlay.addEventListener('click', (e) => {
      if (e.target === DOM.modalOverlay) closeModal();
    });
  }

  // Keyboard ESC to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && State.activeModal) closeModal();
  });

  // Scroll-to-top button
  if (DOM.scrollTop) {
    window.addEventListener('scroll', () => {
      DOM.scrollTop.classList.toggle('visible', window.scrollY > 500);
    });
    DOM.scrollTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Mobile nav toggle
  if (DOM.navToggle && DOM.siteNav) {
    DOM.navToggle.addEventListener('click', () => {
      const isOpen = DOM.siteNav.classList.toggle('open');
      DOM.navToggle.setAttribute('aria-expanded', isOpen);
    });
  }
}

/* ──────────────────────────────────────────────────────────────
   UTILITY FUNCTIONS
   ────────────────────────────────────────────────────────────── */

/**
 * Escapes HTML special characters to prevent XSS.
 */
function escHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Formats ISO date string (YYYY-MM-DD) to human-readable form.
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    // Handle YYYY-MM-DD without time zone issues
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

/**
 * Converts snake_case field names to Title Case for display.
 */
function humanizeFieldName(fieldName) {
  return fieldName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

/* ──────────────────────────────────────────────────────────────
   INIT
   ────────────────────────────────────────────────────────────── */

function init() {
  cacheDOM();
  initEventListeners();

  // Only load data on the homepage (index.html has results container)
  if (DOM.resultsContainer) {
    loadData();

    // Optional auto-refresh
    if (CONFIG.REFRESH_MS > 0) {
      setInterval(loadData, CONFIG.REFRESH_MS);
    }
  }

  // Mark active nav link
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}

// Run after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
