# Zeno AI Development Commands

## Quick Start Commands

```bash
# Setup everything
./setup.sh

# Start development
pnpm dev                    # Frontend dev server (http://localhost:3000)
pnpm tauri:dev             # Desktop app with hotkey support
cd backend && npm run dev  # API server (http://localhost:3001)
```

## Build Commands

```bash
# Build for production
pnpm build                 # Build PWA
pnpm tauri:build          # Build desktop app

# Preview production build
pnpm preview              # Preview PWA build
```

## Testing Commands

```bash
# Test hotkey functionality
pnpm tauri:dev            # Press Ctrl+Space to test overlay

# Test PWA installation
pnpm build && pnpm preview  # Open in browser, look for install prompt

# Test cross-device sync
# Open two browser windows to same URL and test task creation
```

## Environment Variables

Create `.env` file with:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

## Supabase Setup

1. Create project at supabase.com
2. Run `supabase-schema.sql` in SQL editor
3. Get URL and anon key from Settings > API
4. Add to `.env` file

## Troubleshooting

### Hotkey not working
- Check if Tauri app has permissions
- Try running with sudo for system shortcuts
- Verify no other app uses Ctrl+Space

### PWA not installing
- Ensure HTTPS in production
- Check manifest.json is accessible
- Verify service worker registration

### Supabase errors
- Check environment variables
- Verify RLS policies
- Check network connectivity
