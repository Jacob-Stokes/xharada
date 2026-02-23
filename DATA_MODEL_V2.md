# Harada Method - Enhanced Data Model v2

## Current Structure
```
Primary Goal
  └─> Sub-Goals (8)
      └─> Action Items (8 each)
```

## Proposed Enhancement: Activity Logs

### New Entity: ActivityLog

Activity logs capture progress, reflections, and evidence for action items.

```
Primary Goal
  └─> Sub-Goals (8)
      └─> Action Items (8 each)
          └─> Activity Logs (many) ← NEW
```

## ActivityLog Schema

### Core Fields
- `id`: UUID
- `action_item_id`: UUID (FK to action_items)
- `log_type`: enum ('note', 'progress', 'completion', 'media', 'link')
- `content`: TEXT (note content, description)
- `log_date`: DATE (when the activity occurred - can be backdated)
- `created_at`: TIMESTAMP (when the log was created)
- `updated_at`: TIMESTAMP

### Optional/Extended Fields
- `duration_minutes`: INTEGER (time spent on this activity)
- `metric_value`: DECIMAL (quantifiable progress, e.g., "ran 5km" = 5.0)
- `metric_unit`: TEXT (km, lbs, hours, etc.)
- `media_url`: TEXT (link to uploaded file/image)
- `media_type`: enum ('image', 'video', 'document', 'audio')
- `external_link`: TEXT (URL to related resource)
- `mood`: enum ('motivated', 'challenged', 'accomplished', 'frustrated', 'neutral')
- `tags`: TEXT (comma-separated or JSON array)

## Log Types Explained

### 1. `note` - General reflection/note
- Quick thoughts, observations, learnings
- "Felt great after today's run"
- "Struggled with meal prep, need simpler recipes"

### 2. `progress` - Measurable progress update
- Quantifiable updates
- "Ran 5km in 28 minutes"
- "Saved $500 this month"
- Uses `metric_value` and `metric_unit`

### 3. `completion` - Evidence of completing the action
- Proof of doing the task
- "Completed meditation session"
- Auto-created when action is marked complete (optional)

### 4. `media` - Attached photo/video/document
- Progress photos
- Certificates, receipts
- Before/after images
- Uses `media_url` and `media_type`

### 5. `link` - External resource/reference
- Articles read
- YouTube videos watched
- Course completed
- Uses `external_link`

## Use Cases

### Progress Tracking Over Time
```sql
-- See all running progress for the year
SELECT log_date, metric_value, content
FROM activity_logs
WHERE action_item_id = 'run-3x-week-id'
  AND log_type = 'progress'
ORDER BY log_date DESC
```

### Streaks & Consistency
- Count logs per week to see consistency
- Visualize activity heatmap (like GitHub contributions)

### Evidence & Reflection
- Look back at what you did on specific dates
- See patterns (e.g., "I always skip gym on Mondays")
- Build a timeline of your journey

### AI Context
When an AI asks "How's your fitness goal going?", it can read:
- Action: "Run 3x per week"
- Logs: 12 entries in last month showing actual runs
- Latest: "Ran 8km, feeling stronger!"

## API Endpoints (New)

### Activity Logs
- `GET /api/actions/:actionId/logs` - Get all logs for an action
- `GET /api/actions/:actionId/logs?startDate=X&endDate=Y` - Filter by date range
- `POST /api/actions/:actionId/logs` - Create new log entry
- `PUT /api/logs/:logId` - Update log entry
- `DELETE /api/logs/:logId` - Delete log entry
- `GET /api/logs/:logId` - Get specific log

### Analytics/Aggregates
- `GET /api/actions/:actionId/stats` - Get stats (total logs, avg metric, streak)
- `GET /api/goals/:goalId/activity` - Timeline of all activity across goal
- `GET /api/user/activity/calendar` - Calendar heatmap data

## UI Implications

### Action Item View (Modal)
Current:
```
[ ] Action Item Title
    [Toggle Complete]
```

Enhanced:
```
[ ] Action Item Title
    [Toggle Complete] [+ Log Activity]

    Recent Logs:
    - 2026-02-20: Ran 5km (28 min) 🏃
    - 2026-02-18: Easy recovery run, 3km
    - 2026-02-15: Interval training - tough!

    [View All Logs] [Add Log]
```

### New: Log Entry Form
```
Log Activity for "Run 3x per week"

Date: [____] (defaults to today, can backdate)
Type: [Progress ▼]

Note: [________________________]

□ Track metric
  Value: [___] Unit: [km ▼]

□ Attach media
  [Upload file...]

□ Add link
  URL: [________________________]

How did it feel? [Accomplished ▼]

[Cancel] [Save Log]
```

### Timeline View
```
February 2026
════════════════════════════════════════

Feb 22 (Today)
  💪 Physical Health > Run 3x per week
     Progress: Ran 5km in 28 minutes
     "New personal best!"

Feb 20
  💰 Financial Growth > Save 20% income
     Note: "Transferred $800 to savings"

  📚 Learning & Skills > Read 2 books monthly
     Completed: Finished 'Atomic Habits'
     ⭐⭐⭐⭐⭐
```

## Database Migration

Add new table:
```sql
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  action_item_id TEXT NOT NULL,
  log_type TEXT NOT NULL CHECK(log_type IN ('note', 'progress', 'completion', 'media', 'link')),
  content TEXT,
  log_date TEXT NOT NULL,
  duration_minutes INTEGER,
  metric_value REAL,
  metric_unit TEXT,
  media_url TEXT,
  media_type TEXT,
  external_link TEXT,
  mood TEXT,
  tags TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (action_item_id) REFERENCES action_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action_item_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON activity_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON activity_logs(log_type);
```

## Benefits

1. **Accountability**: Written record of what you actually did
2. **Motivation**: See progress over time, celebrate wins
3. **Learning**: Reflect on what works and what doesn't
4. **AI Context**: Rich data for AI to understand your journey
5. **Proof**: Evidence for completed certifications, workouts, etc.
6. **Patterns**: Identify when you're most productive
7. **Streaks**: Gamification through consistency tracking

## Future Enhancements

- **Reminders**: "You haven't logged running in 5 days"
- **Habits**: Auto-create recurring logs for daily habits
- **Templates**: Quick log templates per action type
- **Sharing**: Share progress with accountability partner
- **Export**: Generate progress reports, charts
- **Integrations**: Auto-import from Strava, Mint, etc.
