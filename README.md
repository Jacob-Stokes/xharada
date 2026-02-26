# Harada Method Tracker

A personal goal tracking application based on the Harada Method - a Japanese goal-setting framework using nested 64-square grids. Built for AI agent integration and continuous improvement tracking.

## 🎯 What is the Harada Method?

The Harada Method structures goals as:
- **1 Primary Goal** → **8 Sub-Goals** → **8 Actions each** = **64 total actions**
- Focus on **activity logging**, not completion checkboxes
- Continuous improvement through consistent tracking

## ✨ Features

### Core Functionality
- **Visual Grid Views**: 3x3 compact view and 9x9 full Harada grid
- **Activity Logging**: Track progress through continuous logging (not binary completion)
- **Markdown Descriptions**: Rich text descriptions for goals using markdown
- **Multiple Grid Modes**: Square and rectangle aspect ratios

### AI Agent Integration
- **Flexible API**: `/api/user/summary` with 4 detail levels (minimal, standard, detailed, full)
- **Guestbook System**: AI agents can leave comments at any level (user/goal/subgoal/action)
- **API Key Authentication**: Secure access for automated agents
- **Activity Metrics**: Track log counts and recency, not "completion"

### Authentication
- **Session-based** for web UI
- **API Keys** for AI agents and automation
- User management with registration/login

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 20+ (for local development)

### Running with Docker

```bash
# Start the application
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

Access:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

### First Time Setup

1. Visit http://localhost:3000
2. Register an account
3. Create your first goal
4. Generate an API key in Settings for AI agents

## 📡 API Overview

### Authentication

**Web UI**: Session cookies (automatic after login)

**AI Agents**: API Key in header
```bash
curl -H "x-api-key: YOUR-KEY-HERE" http://localhost:3001/api/user/summary
```

### Summary Endpoint (AI Agents Start Here)

`GET /api/user/summary`

**Query Parameters:**
- `level`: `minimal` | `standard` | `detailed` | `full` (default: `standard`)
- `include_logs`: `true` | `false` (include actual log entries, only with `level=full`)
- `include_guestbook`: `true` | `false` (include AI agent comments)

**Examples:**

Quick overview:
```bash
GET /api/user/summary?level=minimal
```

Daily check-in (default):
```bash
GET /api/user/summary
```

Full context for AI coaching:
```bash
GET /api/user/summary?level=full&include_logs=true&include_guestbook=true
```

### Guestbook API

AI agents can leave comments:

```bash
POST /api/guestbook
{
  "agent_name": "Coach AI",
  "comment": "Great progress this week!",
  "target_type": "user",  # or "goal", "subgoal", "action"
  "target_id": "optional-uuid"
}
```

## 🏗️ Tech Stack

- **Backend**: Node.js 20 + TypeScript + Express + SQLite (better-sqlite3)
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Database**: SQLite (file-based, no setup required)
- **Container**: Docker + Docker Compose
- **Authentication**: express-session + bcrypt

## 📂 Project Structure

```
harada/
├── backend/
│   ├── src/
│   │   ├── db/              # Database schema and migrations
│   │   ├── routes/          # API endpoints
│   │   ├── middleware/      # Auth middleware
│   │   └── index.ts         # Express server
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/           # React pages
│   │   ├── components/      # Reusable components
│   │   └── api/             # API client
│   ├── Dockerfile
│   └── package.json
├── data/                    # SQLite database (gitignored)
├── docker-compose.yml
└── README.md
```

## 🔧 Local Development

### Backend
```bash
cd backend
npm install
npm run dev  # Runs on port 3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev  # Runs on port 3000
```

## 🗄️ Database

SQLite database stored at `./data/harada.db` (automatically created, not in git).

### Entity Relationship Diagram

```mermaid
erDiagram
    users ||--o{ api_keys : "has many"
    users ||--o{ primary_goals : "has many"
    users ||--o{ guestbook : "receives"

    primary_goals ||--o{ sub_goals : "contains 8"
    sub_goals ||--o{ action_items : "contains 8"
    action_items ||--o{ activity_logs : "has many"

    users {
        TEXT id PK
        TEXT username UK
        TEXT password_hash
        TEXT email
        TEXT created_at
        TEXT updated_at
    }

    api_keys {
        TEXT id PK
        TEXT user_id FK
        TEXT key_hash
        TEXT name
        TEXT last_used_at
        TEXT created_at
        TEXT expires_at
    }

    primary_goals {
        TEXT id PK
        TEXT user_id FK
        TEXT title
        TEXT description
        TEXT target_date
        TEXT status "active|completed|archived"
        TEXT created_at
        TEXT updated_at
    }

    sub_goals {
        TEXT id PK
        TEXT primary_goal_id FK
        INTEGER position "1-8, UNIQUE per goal"
        TEXT title
        TEXT description
        TEXT created_at
        TEXT updated_at
    }

    action_items {
        TEXT id PK
        TEXT sub_goal_id FK
        INTEGER position "1-8, UNIQUE per sub-goal"
        TEXT title
        TEXT description
        INTEGER completed "0|1"
        TEXT completed_at
        TEXT due_date
        TEXT created_at
        TEXT updated_at
    }

    activity_logs {
        TEXT id PK
        TEXT action_item_id FK
        TEXT log_type "note|progress|completion|media|link"
        TEXT content
        TEXT log_date
        INTEGER duration_minutes
        REAL metric_value
        TEXT metric_unit
        TEXT media_url
        TEXT media_type "image|video|document|audio"
        TEXT external_link
        TEXT mood "motivated|challenged|accomplished|frustrated|neutral"
        TEXT tags
        TEXT created_at
        TEXT updated_at
    }

    guestbook {
        TEXT id PK
        TEXT user_id FK
        TEXT agent_name
        TEXT comment
        TEXT target_type "user|goal|subgoal|action"
        TEXT target_id
        TEXT created_at
    }
```

### Schema Overview
- **users** - User accounts with authentication
- **api_keys** - API keys for AI agents (hashed, expires after configured period)
- **primary_goals** - Top-level goals (1 per Harada grid)
- **sub_goals** - 8 sub-goals per primary goal (positions 1-8)
- **action_items** - 8 actions per sub-goal (64 total per goal, positions 1-8)
- **activity_logs** - Activity tracking logs with metrics, media, and mood
- **guestbook** - AI agent comments and feedback at any level

### Key Relationships
- **1:8:64 Harada Structure**: 1 goal → 8 sub-goals → 8 actions each = 64 actions
- **Cascade Deletes**: Deleting a goal removes all sub-goals, actions, and logs
- **Position Constraints**: Sub-goals and actions use UNIQUE(parent_id, position) to enforce grid structure
- **Flexible Guestbook**: Comments can target user, goal, sub-goal, or action level

## 🤖 AI Agent Integration Examples

### Daily Check-in Agent
```bash
# Get summary and identify neglected areas
SUMMARY=$(curl -H "x-api-key: $API_KEY" \
  "http://localhost:3001/api/user/summary?level=standard")

# Leave encouraging comment
curl -X POST -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"agent_name":"Daily Coach","comment":"Keep going!","target_type":"user"}' \
  http://localhost:3001/api/guestbook
```

### Progress Analyzer
```bash
# Get full detail with logs
curl -H "x-api-key: $API_KEY" \
  "http://localhost:3001/api/user/summary?level=full&include_logs=true"
```

## 📝 Philosophy

This app follows the Harada Method's core principle: **Progress is tracked through continuous activity logging, not completion status.**

- ❌ No checkboxes or "done" states
- ✅ Log what you did, when you did it
- ✅ Frequency and consistency matter
- ✅ AI agents provide insights based on activity patterns

## 🔒 Security Notes

- Database stored locally (not exposed)
- API keys hashed with bcrypt
- Passwords hashed with bcrypt
- Session secrets configurable via `SESSION_SECRET` env var
- All routes protected with authentication middleware

## 📄 License

MIT

## 🙏 Credits

Based on the Harada Method - a goal-setting framework developed by Takashi Harada.
