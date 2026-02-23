# Harada Method App - Architecture

## Overview
A Docker-compatible web application for creating and managing Harada Method goal frameworks with API-first design for AI accessibility.

## Core Objectives
1. **Intelligible Data Structure**: Clean, accessible data model for Harada Method
2. **API Accessibility**: RESTful API for future AI instances to query goals/progress
3. **Visual Interface**: Web UI for creating and managing Harada squares
4. **Docker Deployment**: Containerized for easy deployment and development

## Technology Stack

### Backend
- **Runtime**: Node.js 20+
- **Language**: TypeScript
- **Framework**: Express
- **Database**: SQLite 3 (via `better-sqlite3`)
- **API Style**: REST
- **No ORM**: Direct SQL queries for simplicity

### Frontend
- **Framework**: React + TypeScript (or Next.js - TBD)
- **Styling**: Tailwind CSS
- **UI Components**: TBD (shadcn/ui, MUI, or custom)

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Development**: Hot reload for both frontend and backend
- **Production Reverse Proxy**: nginx (configured on server, not in app)

## Data Model

### Entity Hierarchy
```
Primary Goals (multiple per app instance)
  └─> Sub-Goals (1:8) - the 8 surrounding squares
      └─> Action Items (1:8) - detailed tasks for each sub-goal
          └─> Activity Logs (many) - track progress, notes, evidence
```

### Schema (Conceptual)

#### PrimaryGoal
- `id`: UUID
- `title`: string
- `description`: text (optional)
- `targetDate`: date (optional)
- `status`: enum (active, completed, archived)
- `createdAt`: timestamp
- `updatedAt`: timestamp

#### SubGoal
- `id`: UUID
- `primaryGoalId`: UUID (FK)
- `position`: int (1-8, represents position in the grid)
- `title`: string
- `description`: text (optional)
- `createdAt`: timestamp
- `updatedAt`: timestamp

#### ActionItem
- `id`: UUID
- `subGoalId`: UUID (FK)
- `position`: int (1-8)
- `title`: string
- `description`: text (optional)
- `completed`: boolean
- `completedAt`: timestamp (nullable)
- `dueDate`: date (optional)
- `createdAt`: timestamp
- `updatedAt`: timestamp

## API Design

### Base URL
- Development: `http://localhost:3000/api`
- Production: `https://harada.jacobstokes.com/api`

### Endpoints (Draft)

#### User
- `GET /user/summary` - Overview of all goals for AI consumption

#### Primary Goals
- `GET /goals` - List all primary goals for user
- `POST /goals` - Create new primary goal
- `GET /goals/:goalId` - Get specific goal with full tree structure
- `PUT /goals/:goalId` - Update primary goal
- `DELETE /goals/:goalId` - Delete primary goal
- `GET /goals/:goalId/tree` - Full nested structure (goals → sub-goals → actions)

#### Sub-Goals
- `GET /goals/:goalId/subgoals` - List all sub-goals for a primary goal
- `GET /subgoals/:subgoalId` - Get specific sub-goal with actions
- `POST /goals/:goalId/subgoals` - Create sub-goal
- `PUT /subgoals/:subgoalId` - Update sub-goal
- `DELETE /subgoals/:subgoalId` - Delete sub-goal

#### Action Items
- `GET /subgoals/:subgoalId/actions` - List all actions for a sub-goal
- `GET /actions/:actionId` - Get specific action item
- `POST /subgoals/:subgoalId/actions` - Create action item
- `PUT /actions/:actionId` - Update action item
- `PATCH /actions/:actionId/complete` - Mark action as complete/incomplete
- `DELETE /actions/:actionId` - Delete action item

### API Response Format
```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

## Docker Architecture

### Services
1. **api** - Node.js/Express backend (includes SQLite database file)
2. **frontend** - React application (or Next.js if we go that route)

### docker-compose.yml Structure
```yaml
services:
  api:
    build: ./backend
    ports:
      - "3001:3001"
    volumes:
      - ./data:/app/data  # SQLite database persistence
      - ./backend/src:/app/src  # Hot reload in dev
    environment:
      DATABASE_URL: file:/app/data/harada.db
      NODE_ENV: development

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    volumes:
      - ./frontend/src:/app/src  # Hot reload in dev
    depends_on:
      - api
    environment:
      VITE_API_URL: http://localhost:3001
```

**Note**: nginx/reverse proxy setup is handled on the production server separately, not part of the app containers.

## Project Structure (Proposed)
```
harada/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── db/
│   │   │   ├── init.sql
│   │   │   └── database.ts
│   │   ├── controllers/
│   │   ├── middleware/
│   │   └── index.ts
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── api/ (API client)
│   │   └── App.tsx
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── data/
│   └── harada.db (SQLite database - gitignored)
├── docker-compose.yml
├── docker-compose.dev.yml
├── ARCHITECTURE.md
└── README.md
```

## Decisions Made

### Authentication & Access
- ✅ **No authentication for v1** - Keep it simple
- ✅ **Single-user app** - Personal use
- ✅ **SQLite database** - Simple, file-based
- ✅ **No ORM** - Direct SQL with better-sqlite3
- ✅ **Express backend** - Lightweight REST API

## Open Questions

### Frontend Framework
- [ ] Next.js (SSR, API routes, all-in-one) vs separate React SPA?
- [ ] UI component library preference?

### Features & Scope (v1)
- [ ] Progress tracking/analytics?
- [ ] Calendar integration for due dates?
- [ ] Export functionality (PDF, JSON)?
- [ ] Sharing/collaboration features?

### Deployment
- [ ] Hosting platform? (DigitalOcean, AWS, self-hosted?)
- [ ] CI/CD pipeline needed?
- [ ] SSL/domain setup requirements?

## Next Steps
1. Answer open questions above
2. Finalize tech stack decisions
3. Set up project scaffolding
4. Define Prisma schema
5. Create Docker development environment
6. Build API endpoints
7. Build frontend UI
