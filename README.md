# Stitch Mail

A full-stack MERN email client with inbox management, compose, search, settings, and multi-account unified switcher.

## Stack
- **Backend**: Node.js · Express.js · MongoDB (Mongoose) · JWT auth · Nodemailer · node-cron · Multer
- **Frontend**: React 18 · Vite · React Router v6 · Axios · CSS custom properties

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB running locally (`mongod`) or a MongoDB Atlas connection string

### 1. Install dependencies

```bash
# Server
cd server && npm install

# Client
cd ../client && npm install
```

### 2. Configure environment

```bash
cp .env.example server/.env
```

Edit `server/.env` with your MongoDB URI and SMTP credentials. For testing, MongoDB defaults to `mongodb://localhost:27017/stitch-mail`.

### 3. Seed demo data

```bash
cd server && npm run seed
```

This creates:
- **User**: `david.chen@atelier.com` / `password123`
- 14+ demo emails across all folders (inbox, sent, drafts, starred, spam, archive)
- Threaded conversations

### 4. Start the servers

Open **two terminals**:

```bash
# Terminal 1 — Backend (port 5000)
cd server && npm run dev

# Terminal 2 — Frontend (port 5173)
cd client && npm run dev
```

Then open **http://localhost:5173**

## Project Structure

```
stitch-mail/
├── server/
│   ├── src/
│   │   ├── models/         # User, Email, Thread schemas
│   │   ├── routes/         # auth, emails, threads, settings, accounts
│   │   ├── controllers/    # Business logic
│   │   ├── middleware/     # JWT auth, Multer upload
│   │   └── jobs/           # node-cron scheduled send
│   ├── uploads/            # Attachment files (served statically)
│   └── seed.js             # Demo data seeder
└── client/
    └── src/
        ├── api/            # Axios API client
        ├── context/        # Auth, Email, UI contexts
        ├── components/     # AppShell, Sidebar, Topbar, ComposeModal
        ├── pages/          # All 7 views
        └── styles/         # Global CSS design system
```

## API Reference

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login (sets httpOnly cookie) |
| POST | `/api/auth/logout` | Clear session |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/emails?folder=inbox&page=1` | List emails |
| GET | `/api/emails/search?q=&sender=&hasAttachment=` | Search |
| POST | `/api/emails/send` | Send email (multipart/form-data) |
| POST | `/api/emails/draft` | Save draft |
| PATCH | `/api/emails/:id` | Update (read/star/folder) |
| DELETE | `/api/emails/:id` | Delete / move to trash |
| POST | `/api/emails/:id/schedule` | Schedule send |
| GET | `/api/threads/:threadId` | Get full thread |
| GET | `/api/settings` | Get preferences + signature |
| PATCH | `/api/settings` | Update settings |
| GET | `/api/accounts` | List email accounts |
| GET | `/api/accounts/unified-inbox` | Unified inbox |

## Features

- 📥 **Inbox** — Tab switcher (Primary/Social/Promotions), email list, upcoming tasks, weekly summary
- 📖 **Reader** — Full email view, archive/star/delete/reply actions
- ✍️ **Compose** — Recipient chips, Cc/Bcc, attachment upload, scheduled send
- 🔍 **Search** — Full-text search with filter chips (sender, attachment, unread)
- ⚙️ **Settings** — Theme cards (Light/Dark/System), interaction toggles, signature editor
- 📭 **Inbox Zero** — Animated empty state with quick actions
- 🔄 **Accounts** — Unified switcher with workload chart and stats

## Environment Variables

See [`.env.example`](.env.example) for all required variables.

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `SMTP_HOST/PORT/USER/PASS` | SMTP server credentials |
| `CLIENT_URL` | Frontend URL for CORS (default: http://localhost:5173) |
