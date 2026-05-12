# IssueTracker — Ticket Management System

A clean, fast, Apple-designed internal ticket management system for tracking issues across Engineering, DevOps, HR, IT, and Finance teams.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16, TypeScript, Tailwind CSS v4, Recharts |
| **Backend** | FastAPI (Python 3.12), Motor (async MongoDB) |
| **Database** | MongoDB Atlas |
| **Deployment** | Docker, Nginx, Docker Compose |

---

## Features

- **Dashboard** — Live analytics (tickets by domain, status, priority) via Apple-style Recharts charts
- **Issue List** — Sortable on every column, filterable by domain/priority/status, full-text search with pagination
- **Issue Detail** — Split-pane detail with inline status/priority editing and audit event timeline
- **StatusStepper** — Delivery-tracker style activity history for every ticket
- **Keyboard Shortcuts** — `⌘K` to search, `⌘C` to create issue
- **Dark Mode** — Apple HIG dark color palette, SF Pro font stack

---

## Local Development

### Prerequisites
- Python 3.12+ and `pip`
- Node.js 20+
- MongoDB Atlas account (free tier works)

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r essential-req.txt

# Fill in your MongoDB Atlas URI
cp .env .env.local
# Edit .env and set MONGODB_URI

uvicorn app.main:app --reload
# → http://localhost:8000
# → Swagger: http://localhost:8000/docs
```

### Frontend

```bash
cd frontend
npm install

# Set API URL
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1" > .env.local

npm run dev
# → http://localhost:3000
```

---

## Deployment (Docker)

```bash
# Fill in your MongoDB URI in backend/.env first
docker compose up -d
```

This starts:
- `backend` → FastAPI on internal port 8000
- `frontend` → Next.js on internal port 3000
- `nginx` → Reverse proxy on port 80

**Domains:**
- `quanta.kunaldutta.com` → Frontend
- `api.quanta.kunaldutta.com` → Backend API

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/tickets/` | Create ticket |
| `GET` | `/api/v1/tickets/` | List tickets (filter, sort, paginate) |
| `GET` | `/api/v1/tickets/summary` | Analytics summary |
| `GET` | `/api/v1/tickets/{id}` | Get single ticket |
| `PATCH` | `/api/v1/tickets/{id}` | Update ticket |
| `DELETE` | `/api/v1/tickets/{id}` | Delete ticket |

Full Swagger docs available at: `http://localhost:8000/docs`

---

## Project Structure

```
issue-tracker/
├── backend/
│   ├── app/
│   │   ├── api/v1/ticket/    ← controller, service, repository, model, schema
│   │   ├── core/config.py    ← pydantic-settings
│   │   ├── db/session.py     ← Motor singleton
│   │   └── main.py           ← FastAPI app factory
│   ├── essential-req.txt
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── dashboard/        ← Analytics charts
│   │   ├── issues/           ← Split-pane issue list + detail
│   │   └── components/       ← Sidebar, CommandPalette, IssueTable, etc.
│   └── lib/                  ← types.ts, api.ts
├── nginx/nginx.conf
└── docker-compose.yml
```

---

## Assumptions & Limitations

- Single admin user — no authentication (per project spec)
- Deadline validation: must be a future date at creation time
- Events audit log tracks `status` and `priority` changes only
- SF Pro self-hosting requires downloading fonts from Apple's developer site

---

## AI Tool Usage

This project was scaffolded and developed with the assistance of **Antigravity (Google DeepMind)** — an AI coding assistant. The AI was used to:

- Generate boilerplate for the FastAPI component structure (controller/service/repository pattern)
- Write the MongoDB `$facet` aggregation pipeline for analytics
- Build Recharts chart configurations with Apple color palette
- Set up the Tailwind v4 CSS design token system

All code was reviewed, understood, and verified for correctness before inclusion.
