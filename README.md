# S3 Browser (Frontend-Only)

Small React + Vite app to browse an S3 bucket from the browser.

It lets you:
- connect with endpoint URL, region, access key, and secret key
- navigate directories with breadcrumbs
- view and download files

Credentials are stored in `localStorage` in the browser. There is no backend in this project.

## Requirements

- Node.js `24.13.0` (see `.nvmrc`)
- npm

## Start Locally

1. Install dependencies:

```bash
npm install
```

2. Start the dev server:

```bash
npm run dev
```

3. Open the URL printed by Vite (usually `http://localhost:5173`).

4. In the app, click `Connection` and enter your S3 connection details.

5. Click `Test`, then `Connect`.
