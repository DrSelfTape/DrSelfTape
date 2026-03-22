# Dr Self Tape — Claude.ai Project Context

## What This Is
Full-stack actor platform. React + Vite frontend, Django + Daphne backend.

## Stack
- **Frontend:** React 18, Vite, Redux Toolkit, TailwindCSS, react-router-dom v6
- **Backend:** Django 5, Daphne (ASGI), PostgreSQL, Django Channels (WebSocket)
- **AI:** OpenAI GPT-4o, Whisper, ElevenLabs TTS
- **Video:** Daily.co (live rehearsal rooms)
- **Auth:** JWT (Simple JWT)

## Running Servers
- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- Demo login: demo@drselftape.com / Demo1234!

---

## Frontend Structure

### Key Directories
```
src/
  panels/Dashboard/          # All main app panels (lazy loaded)
    Home/                    # Dashboard home with stats + badges
    Auditions/               # Kanban audition tracker
    CDSim/                   # CD Sim — GPT-4o feedback + ElevenLabs
    SceneStudy/              # Scene study + Live Scene Mode
    LiveRehearsals/          # Daily.co video rooms
    Community/               # Posts, likes, comments
    Scripts/                 # Script library
    Submissions/             # Tape submissions tracker
    Reports/                 # Career reports
    Insights/                # AI career insights
    Membership/              # Plans + upgrade
    BookSession/             # Studio session booking
    Bookings/                # Booking history
    Profile/                 # Actor profile
    AuditionGenerator/       # AI scene generator
    AgentPortal/             # Talent agent portal
  components/
    AuditionBadges.jsx       # 12 achievement badges
    PermissionsModal.jsx     # Branded camera/mic permission UI
  redux/
    constant.js              # All API endpoint URLs
    store.js                 # Redux store + all reducers
    features/                # All Redux slices
      auditions/auditionsSlice.js
      bookings/bookingsSlice.js
      auth/authSlice.js
      community/communitySlice.js
      rehearsals/rehearsalsSlice.js
      reports/reportsSlice.js
      submissions/submissionsSlice.js
      scripts/scriptsSlice.js
      profile/profileSlice.js
      sceneStudyScripts/sceneStudyScriptsSlice.js
  routes/
    config.jsx               # All routes (lazy loaded)
    sideMenuConfig.jsx       # Sidebar nav items per role
    index.jsx                # Router with role-based routing
  socket/socket.jsx          # WebSocket (Django Channels)
```

### Roles
- `actor` — main user, all dashboard panels
- `agent` — talent agent, sees AgentPortal
- `casting_director` — casting side
- `coach` — coaching side
- `admin` — admin panel

### API Base URL
```js
// src/redux/constant.js
export const baseURL = 'http://localhost:8000/api';
// All endpoints defined in endPoints object below baseURL
```

### Key Patterns
```jsx
// Standard Redux thunk + component pattern
const { data, loading, error } = useSelector((state) => state.sliceName);
dispatch(fetchSomethingThunk());

// After mutation — always re-fetch stats for live dashboard sync
dispatch(fetchAuditionStatsThunk());
```

---

## Backend Structure

### Apps
```
apps/
  users/         # Auth, login, profile, coaches
  auditions/     # Audition slots, tracker, stats, reports, submissions, scripts
  bookings/      # Studio bookings, locations, membership, available slots
  community/     # Posts, likes, comments
  rehearsals/    # Live rehearsal rooms (Daily.co), participants
  scene_study/   # Scripts, versions, scenes, analysis, annotations, rehearsal sessions
  notifications/ # WebSocket push notifications
  ai/            # GPT-4o (cd-feedback, scene-partner), Whisper, ElevenLabs TTS, Daily.co TTS
  analytics/     # Analytics (stub)
```

### API Version
All endpoints: `/api/v1/`

### Key Endpoints
```
POST   /api/v1/users/login/
GET    /api/v1/users/profile/
GET    /api/v1/users/profile-details/
GET    /api/v1/users/coaches/

GET    /api/v1/auditions/               # List auditions
POST   /api/v1/auditions/               # Create audition
GET    /api/v1/auditions/tracker/       # Kanban grouped by status
GET    /api/v1/auditions/stats/         # Stats for dashboard
GET    /api/v1/auditions/reports/       # Career reports data
GET    /api/v1/auditions/submissions/   # Tape submissions
GET    /api/v1/auditions/scripts/       # Audition scripts

GET    /api/v1/bookings/
POST   /api/v1/bookings/
GET    /api/v1/bookings/locations/
GET    /api/v1/bookings/membership/
GET    /api/v1/bookings/available-slots/

GET/POST /api/v1/rehearsals/
POST     /api/v1/rehearsals/{id}/join/
POST     /api/v1/rehearsals/{id}/token/  # Daily.co meeting token

GET/POST /api/v1/scene-study/scripts/
GET      /api/v1/scene-study/version/{id}/scene/
GET      /api/v1/scene-study/version/{id}/analysis/
POST     /api/v1/scene-study/rehearsal/start/
POST     /api/v1/scene-study/rehearsal/complete/

GET/POST /api/v1/community/posts/

GET      /api/v1/notifications/my-notifications/

POST     /api/v1/ai/cd-feedback/        # GPT-4o acting notes
POST     /api/v1/ai/scene-partner/      # GPT-4o scene partner response
POST     /api/v1/ai/transcribe/         # Whisper transcription
POST     /api/v1/ai/tts/                # ElevenLabs TTS (returns audio/mpeg)
```

### Response Format (always)
```json
{ "data": ..., "message": "Success", "success": true }
```

### Auth
JWT Bearer token. All protected routes need:
```
Authorization: Bearer <access_token>
```

### AI Keys (in .env via decouple, exposed via django settings)
- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`
- `DAILY_API_KEY`

### ElevenLabs Voice Map
```python
'cd_female':       'EXAVITQu4vr4xnSDxMaL'  # Sarah
'cd_male':         'onwK4e9ZLuTAKqWW03F9'  # Daniel
'partner_male':    'JBFqnCBsd6RMkjVDRZzb'  # George
'partner_female':  'pFZP5JQG7iQjIQuC4Bku'  # Lily
'partner_neutral': 'SAz9YHcvj6GT2YYXdXww'  # River
```

---

## UI Conventions
- Primary color: `#ff6b35` (orange)
- Dark mode panels: `bg-[#0f0f1a]`
- Cards: white, `rounded-xl`, `border border-gray-100`, `shadow-sm`
- Buttons: `bg-[#ff6b35] hover:bg-[#e55a2b] text-white rounded-xl font-semibold`
- Icons: lucide-react
- Charts: recharts
- Component library: custom (in src/components/Shared/)

## Sidebar Config
Add new routes in `src/routes/sideMenuConfig.jsx` under `actorMenu` / `agentMenu` etc.
Always add matching lazy import + route in `src/routes/config.jsx` under `commonRoutes` children.

## Important Rules
1. After adding a new Redux slice, register it in `src/redux/store.js`
2. After adding a new Django app, register in `INSTALLED_APPS` + `urls.py`
3. After Django model changes: `python manage.py makemigrations && python manage.py migrate`
4. After backend changes: restart Daphne (`pkill -f daphne && daphne -p 8000 self_tape_api.asgi:application`)
5. After frontend changes: Vite hot-reloads automatically
6. Commit stable builds: `git add -A && git commit -m "feat: ..."`

