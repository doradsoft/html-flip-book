# Download assets (EN)

- **Real ebook split** – The app uses the split chapter PDFs under `assets/pages_data/en/pdf/` (e.g. `000-introduction.pdf`, `001-databases.pdf`, …). These are merged on the fly when the user downloads the entire book or a page range.
- If those assets are missing or merge fails, the app falls back to in-browser jsPDF export.
- The optional script `npm run generate:en-pdf` still generates per-page PDFs under `public/downloads/en/` for other use; the in-app download uses the asset PDFs above.
