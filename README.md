# 🌐 Exchange Opportunities Hub

A professional, fully static website listing international academic exchange opportunities for students. Data is managed via Google Sheets — no code changes needed by collaborators.

**Live site target:** [https://exchangeopportunitieshub](https://exchangeopportunitieshub)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Project Structure](#project-structure)
3. [Deploy on GitHub Pages](#deploy-on-github-pages)
4. [Connecting Your Google Sheet](#connecting-your-google-sheet)
5. [Google Sheets Setup for Collaborators](#google-sheets-setup-for-collaborators)
6. [Data Schema Reference](#data-schema-reference)
7. [Dynamic / Extra Fields](#dynamic--extra-fields)
8. [Customisation](#customisation)
9. [Local Development](#local-development)
10. [FAQ](#faq)

---

## Project Overview

| Feature | Detail |
|---|---|
| **Hosting** | GitHub Pages (free, zero cost) |
| **Backend** | None — 100% static frontend |
| **Database** | None — Google Sheets CSV export |
| **Frameworks** | None — pure HTML + CSS + JavaScript |
| **Data editing** | Non-technical collaborators edit Google Sheets only |
| **Update mechanism** | Browser fetches CSV on every page load |
| **CSV parser** | [PapaParse](https://www.papaparse.com/) (loaded from CDN) |
| **Scale** | Designed for 15–30 entries, scales to 100+ |

---

## Project Structure

```
exchange_opportunities_hub/
├── index.html          # Homepage: hero, filters, opportunity cards
├── about.html          # About page: purpose, instructions, disclaimer
├── styles.css          # All styles — institutional design system
├── app.js              # All application logic — fetch, parse, filter, render
├── README.md           # This file
├── assets/
│   └── .gitkeep        # Placeholder for future images/icons
└── data/
    └── sample.csv      # Sample data for local development/testing
```

---

## Deploy on GitHub Pages

### Step 1 — Create the GitHub repository

The repository name must match exactly for GitHub Pages to serve it at the root domain:

1. Log in to GitHub
2. Click **New repository**
3. Set repository name to: `exchangeopportunitieshub`
4. Set visibility to **Public**
5. Do NOT initialise with a README (you'll push your own files)
6. Click **Create repository**

### Step 2 — Push the project files

```bash
# In your project directory:
git init
git add .
git commit -m "Initial commit — Exchange Opportunities Hub"
git branch -M main
git remote add origin https://github.com/bme-research/exchangeopportunitieshub
git push -u origin main
```

### Step 3 — Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** (top menu)
3. In the left sidebar, click **Pages**
4. Under **Source**, select **Deploy from a branch**
5. Under **Branch**, select `main` and folder `/ (root)`
6. Click **Save**

GitHub Pages will build and deploy your site. It will be live at:
**`https://exchangeopportunitieshub`**

> ⏱ First deployment typically takes 1–3 minutes. Subsequent updates after a `git push` usually deploy within 60 seconds.

### Step 4 — Verify deployment

Visit your URL. You should see the homepage with sample data loaded from `data/sample.csv`.

---

## Connecting Your Google Sheet

### Step 1 — Create your Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet
2. Rename the sheet tab (bottom of the screen) to: **opportunities**
3. Add column headers in row 1, exactly as listed in the [Data Schema Reference](#data-schema-reference)
4. Add your opportunity data starting from row 2

### Step 2 — Make the sheet publicly readable

1. Click the **Share** button (top right)
2. Under "General access", change from "Restricted" to **"Anyone with the link"**
3. Ensure the permission level is set to **Viewer** (not Editor)
4. Copy the share link (you don't need it directly, but note the Sheet ID)

### Step 3 — Get the CSV export URL

Your Google Sheet URL looks like:
```
https://docs.google.com/spreadsheets/d/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/edit
```

Your **CSV export URL** will be:
```
https://docs.google.com/spreadsheets/d/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/gviz/tq?tqx=out:csv&sheet=opportunities
```

Replace the `XXXXXXXXXX` with your actual Sheet ID (the long string in your sheet's URL).

### Step 4 — Update app.js

Open `app.js` and find the configuration block near the top:

```javascript
const CONFIG = {
  CSV_URL: './data/sample.csv',   // ← Replace this line
  ...
};
```

Replace `./data/sample.csv` with your Google Sheets CSV URL:

```javascript
const CONFIG = {
  CSV_URL: 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/gviz/tq?tqx=out:csv&sheet=opportunities',
  ...
};
```

### Step 5 — Push the change

```bash
git add app.js
git commit -m "Connect Google Sheets data source"
git push
```

The site will redeploy within a minute and start pulling live data.

---

## Google Sheets Setup for Collaborators

### Permission model

| Role | Access Level | How |
|---|---|---|
| Public visitors (students) | Read-only | Sheet is "Anyone with link can view" |
| Collaborators (coordinators, staff) | Edit access | Explicitly shared with their Google account as Editor |
| Site administrator | Edit access + code access | GitHub repository access |

### Sharing with collaborators

1. Open the Google Sheet
2. Click **Share**
3. Enter the collaborator's Google account email address
4. Set their permission to **Editor**
5. Click **Send**

They can now edit data. They cannot change the public sharing setting (only the owner can).

### Collaborator workflow (no technical knowledge required)

1. Open the Google Sheet in a browser (log in with Google account if needed)
2. To **add** an opportunity: fill in a new row
3. To **edit** an opportunity: click the cell and type
4. To **deactivate** an opportunity (hide it without deleting): set the `active` column to `FALSE`
5. Google Sheets saves automatically — changes appear on the website within seconds

---

## Data Schema Reference

Column headers in your Google Sheet must match these names exactly (lowercase, underscores):

| Column | Description | Format | Required |
|---|---|---|---|
| `institution` | Full name of the university | University of Toronto | ✅ Yes |
| `country` | Country where institution is located | Canada | ✅ Yes |
| `city` | City of the campus | Toronto | ✅ Yes |
| `continent` | Continent (for filtering) | Americas | ✅ Yes |
| `level` | Academic levels. Semicolons for multiple. | `Undergraduate;Graduate` | ✅ Yes |
| `eligible_programs` | Programs or faculties accepted | `All programs` or `Engineering;Science` | Recommended |
| `scholarship` | Scholarship available | `Yes` / `Partial` / `No` | ✅ Yes |
| `scholarship_details` | Full scholarship description | Full tuition + CAD 1500/month | Recommended |
| `duration` | Length of the exchange | `1 semester` / `1 academic year` | Recommended |
| `language` | Language(s) of instruction. Semicolons for multiple. | `English;French` | ✅ Yes |
| `requirements` | Admission requirements | Minimum GPA 3.0; 2 reference letters | Recommended |
| `english_test` | English proficiency requirement | `IELTS 6.5 or TOEFL 90` | Recommended |
| `deadline` | Application deadline in ISO format | `2025-03-15` | ✅ Yes |
| `deadline_status` | Current status | `Open` / `Closing Soon` / `Closed` | ✅ Yes |
| `official_url` | Link to official program page | `https://www.university.edu/exchange` | ✅ Yes |
| `contact_email` | Contact email | `exchange@university.edu` | Recommended |
| `notes` | Free-text notes for students | Any helpful guidance | Optional |
| `active` | Whether this opportunity is shown | `TRUE` / `FALSE` | ✅ Yes |

---

## Dynamic / Extra Fields

Any column you add to the Google Sheet **beyond** the standard fields above will automatically appear in the "Additional Information" section of each opportunity's detail view.

No code changes required. Just add the column.

**Examples of useful extra fields:**

| Column Name | Example Value |
|---|---|
| `housing_support` | Yes — on-campus housing available |
| `visa_support` | Yes — pre-arrival guidance provided |
| `application_fee` | No application fee |
| `interview_required` | Yes — online interview for shortlisted candidates |
| `lab_rotation` | 3 lab rotations across departments |
| `mentor_contact` | prof.smith@university.edu |
| `gpa_requirement` | Minimum 3.2/4.0 |
| `max_students` | 5 students per year |

Column names will be automatically converted to human-readable labels (e.g., `housing_support` → "Housing Support").

---

## Customisation

### Change the site title / branding

Edit the `<title>` tags and logo text in `index.html` and `about.html`.

### Change the colour scheme

All colours are CSS custom properties at the top of `styles.css`:

```css
:root {
  --color-primary:  #0D2B5E;   /* main navy blue */
  --color-accent:   #C8922A;   /* gold accent */
  /* ... */
}
```

### Change the data source URL

Edit the `CSV_URL` in `app.js` — one line change.

### Change which fields appear on cards vs. detail view

The card display is built in the `buildCard()` function in `app.js`. The detail modal is built in `buildModalHTML()`. Both are documented with comments.

### Add a custom domain

1. In your GitHub repository, go to **Settings → Pages**
2. Under "Custom domain", enter your domain (e.g., `opportunities.youruniversity.edu`)
3. Create a `CNAME` file in the root of your repo with your domain
4. Configure your DNS with a CNAME record pointing to `exchangeopportunitieshub`

---

## Local Development

Since this is a static site, you can open `index.html` directly in a browser — but fetching the CSV will fail due to browser CORS restrictions on `file://` protocol.

Use a simple local server instead:

**Option A — Python (built-in):**
```bash
cd exchange_opportunities_hub
python3 -m http.server 8080
# Visit http://localhost:8080
```

**Option B — Node.js (npx):**
```bash
cd exchange_opportunities_hub
npx serve .
# Visit http://localhost:3000
```

**Option C — VS Code Live Server extension:**
Right-click `index.html` → Open with Live Server.

During local development, `CSV_URL` in `app.js` is set to `./data/sample.csv`, which will work with any local server.

---

## FAQ

**Q: How often is the data refreshed?**
A: The browser fetches the CSV on every page load. There is no caching beyond the browser's default HTTP cache. Changes to the Google Sheet are visible immediately on the next page load.

**Q: Can the site work without internet?**
A: No. The CSV fetch requires internet access. If the fetch fails, an error state is shown.

**Q: What happens if a column is missing from the CSV?**
A: Missing fields display as "—". The application handles missing values gracefully throughout.

**Q: Can I use multiple sheet tabs?**
A: Currently the app fetches a single CSV URL. To use multiple tabs, you would need to update `app.js` to make multiple fetch calls and merge the results (requires minor code change).

**Q: Is student data collected?**
A: No. The site has no forms that submit data, no analytics, no cookies, and no tracking. It only reads from the public Google Sheet.

**Q: Can I add a search index or full-text search?**
A: The current keyword search scans all relevant fields client-side. For 100+ entries this is fast enough. For thousands of entries, consider integrating [Lunr.js](https://lunrjs.com/) for indexed client-side search.

**Q: The Google Sheets URL stops working — why?**
A: This can happen if the sheet sharing settings are changed to private, or if Google temporarily throttles the export endpoint. Make sure the sheet is set to "Anyone with the link can view."

---

## License

MIT License. Free to use, fork, and adapt for any educational institution.

---

*Exchange Opportunities Hub — Built for academic international mobility offices.*
