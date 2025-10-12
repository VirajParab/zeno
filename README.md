# Zeno AI - Cross-Device Personal Assistant

A cross-platform AI assistant that runs on Linux (Tauri desktop app) and Android (installable PWA) with global hotkey overlay, AI chat, task management, and real-time sync.

## Features

- 🪄 **Global Hotkey Overlay** - Press `Ctrl+Space` to open assistant anywhere on Linux
- 💬 **AI Chat** - Powered by OpenAI GPT-4o-mini for intelligent conversations
- ✅ **Task Management** - Drag-and-drop Kanban board (To Do / Doing / Done)
- 📅 **Today Dashboard** - Quick overview of daily progress and tasks
- ☁️ **Real-time Sync** - Tasks and chat sync instantly across devices
- 📱 **PWA Support** - Install on Android for mobile access
- 🔐 **Secure** - Row-level security with Supabase authentication

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Desktop**: Tauri (Rust) for native Linux app with global shortcuts
- **Backend**: Supabase (PostgreSQL + Realtime + Auth)
- **AI**: OpenAI GPT-4o-mini API
- **PWA**: Service Worker + Manifest for Android installation

## Quick Start

### 1. Setup Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the SQL schema from `supabase-schema.sql` in the SQL editor
3. Get your project URL and anon key from Settings > API

### 2. Environment Setup

```bash
# Copy environment template
cp env.example .env

# Edit .env with your keys
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install Tauri CLI globally
npm install @tauri-apps/cli -g

# Install backend dependencies (optional)
cd backend && npm install && cd ..
```

### 4. Development

```bash
# Start frontend dev server
npm run dev

# Start Tauri desktop app (in another terminal)
npm run tauri:dev

# Start backend API server (optional, in another terminal)
cd backend && npm run dev
```

### 5. Build & Deploy

```bash
# Build for production
npm run build

# Build Tauri desktop app
npm run tauri:build

# Deploy PWA to Vercel/Netlify
# The dist/ folder contains the PWA-ready build
```

## Usage

### Desktop (Linux)
- Press `Ctrl+Space` anywhere to open the overlay
- Use tabs to switch between Today, Chat, and Tasks
- Drag tasks between columns to update status
- Click outside overlay to close

### Mobile (Android)
- Open the PWA in Chrome/Edge
- Tap "Install" when prompted
- Use the same interface as desktop
- All data syncs in real-time

## Project Structure

```
zeno-ai/
├── src/
│   ├── components/
│   │   ├── HotkeyOverlay.tsx    # Main overlay with tabs
│   │   ├── ChatWindow.tsx       # AI chat interface
│   │   ├── KanbanBoard.tsx      # Drag-and-drop task board
│   │   └── TodayDashboard.tsx   # Daily overview widget
│   ├── services/
│   │   ├── supabaseClient.ts    # Supabase client & types
│   │   └── apiClient.ts         # OpenAI integration
│   └── App.tsx                  # Main app component
├── src-tauri/                   # Tauri desktop wrapper
├── backend/                     # Optional Express API
├── public/                      # PWA assets
└── supabase-schema.sql          # Database schema
```

## API Endpoints (Backend)

- `POST /api/chat` - Send message to AI assistant
- `GET /api/tasks/:userId` - Get user's tasks
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `GET /api/summary/:userId` - Get today's summary

## Database Schema

### Tasks
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key to auth.users)
- `title` (text, required)
- `description` (text, optional)
- `status` (text: 'todo' | 'doing' | 'done')
- `priority` (int: 1-5, default 3)
- `created_at`, `updated_at` (timestamps)
- `due_date` (timestamp, optional)

### Messages
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key to auth.users)
- `role` (text: 'user' | 'assistant' | 'system')
- `content` (text, required)
- `inserted_at` (timestamp)

## Security

- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- OpenAI API key stored server-side (backend) or environment variables
- HTTPS required for PWA installation

## Future Enhancements

- 🔗 **Mail Integration** - Gmail API for unread count and summaries
- 📊 **Health Tracking** - Google Fit integration for steps/activity
- 🔔 **Push Notifications** - FCM for native mobile notifications
- 🤖 **Local LLM** - Ollama integration for offline/privacy mode
- 📈 **Analytics** - Task completion trends and productivity insights

## Troubleshooting

### Global Hotkey Not Working
- Ensure Tauri app has proper permissions
- Check if another app is using `Ctrl+Space`
- Try running with `sudo` for system-wide shortcuts

### PWA Not Installing
- Ensure HTTPS in production
- Check manifest.json is accessible
- Verify service worker is registered

### Supabase Connection Issues
- Verify environment variables are set correctly
- Check Supabase project is active
- Ensure RLS policies allow your operations

## License

Zeno is open-source under the [PolyForm Noncommercial License 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0/).  
You are free to use, modify, and share this project for personal and educational purposes.  
Commercial use, reselling, or hosting of Zeno without written permission from the author is prohibited.

© 2025 Viraj Parab. All rights reserved.
