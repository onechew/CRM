# Future Buildings CRM

Simple local CRM UI for **Josh Schwartz · Future Buildings Inc.**  
Contacts, templates, scheduled follow-ups, and a Today view. Persists in browser `localStorage`. No live email/SMS APIs.

## Live

GitHub Pages (free): after first deploy —  
`https://onechew.github.io/CRM/`

## Start locally

```bash
npm install
VITE_BASE=/ npm run dev
```

Open the URL Vite prints (usually http://localhost:5173/).

## Notes

- Contact list starts **empty** — add real contacts only.
- Email/SMS actions open `mailto:` / `sms:` drafts or copy text — nothing auto-sends.
- CASL consent flag on each contact; SMS STOP note shown for later real sends.
- “Mark reply received” stops remaining items in that contact’s sequence and notifies Today.
- Reset data: `localStorage.removeItem('fbi-crm-v2')` then reload.
