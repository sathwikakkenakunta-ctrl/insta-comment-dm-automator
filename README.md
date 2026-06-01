# Insta Comment DM Automator

A clean vanilla frontend for managing Instagram comment-to-DM automation rules.

## Stack

- HTML
- CSS
- Vanilla JavaScript ES modules
- localStorage
- No backend, no React, no Instagram API calls

## Structure

```text
/
├── index.html
├── css/
│   ├── base.css
│   ├── layout.css
│   ├── components.css
│   ├── pages.css
│   └── responsive.css
├── js/
│   ├── app.js
│   ├── router.js
│   ├── storage.js
│   ├── data.js
│   ├── components.js
│   ├── dashboard.js
│   ├── rules.js
│   ├── comments.js
│   ├── logs.js
│   └── settings.js
└── assets/
    ├── icons/
    └── images/
```

## Run Locally

Because the app uses ES modules, serve the folder over HTTP:

```bash
python -m http.server 5173
```

Then open `http://localhost:5173`.

## Notes

- `storage.js` is the only module that reads or writes `localStorage`.
- `data.js` contains sample data only.
- `components.js` contains reusable UI helpers, modals, toasts, badges, empty states, and formatting.
- Page modules own their rendering and actions.
- The current DM send flow is a local simulation and prevents duplicate sends for the same comment.
