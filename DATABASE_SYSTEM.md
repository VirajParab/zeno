# Zeno AI - Dual Database System

This document describes the dual database system implemented in Zeno AI, which provides both local and cloud database options with seamless synchronization capabilities.

## Overview

The dual database system allows users to choose between three modes:
- **Local Only**: Data stored locally using IndexedDB (Dexie.js)
- **Cloud Only**: Data stored in Supabase cloud database
- **Sync Mode**: Data synchronized between local and cloud with conflict resolution

## Architecture

### Database Abstraction Layer

The system uses a clean abstraction layer defined in `src/services/database/types.ts`:

```typescript
export interface DatabaseInterface {
  // Task operations
  getTasks(): Promise<Task[]>
  createTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task>
  updateTask(id: string, updates: Partial<Task>): Promise<Task>
  deleteTask(id: string): Promise<void>
  
  // Message operations
  getMessages(): Promise<Message[]>
  createMessage(message: Omit<Message, 'id' | 'inserted_at'>): Promise<Message>
  
  // Sync operations
  sync(): Promise<void>
  getConflicts(): Promise<SyncConflict[]>
  resolveConflict(conflictId: string, resolution: 'local' | 'cloud' | 'merge'): Promise<void>
}
```

### Database Services

#### 1. Local Database Service (`LocalDatabaseService`)
- Uses Dexie.js (IndexedDB wrapper) for local storage
- Implements offline-first approach
- Maintains sync queue for operations when offline
- Handles conflict detection and resolution

#### 2. Cloud Database Service (`CloudDatabaseService`)
- Direct integration with Supabase
- Real-time capabilities through Supabase subscriptions
- No local storage, all operations go directly to cloud

#### 3. Sync Database Service (`SyncDatabaseService`)
- Combines local and cloud services
- Implements bidirectional synchronization
- Handles conflict resolution with user intervention
- Maintains sync status for each record

## Features

### Offline-First Capabilities

The local database service provides:
- **Sync Queue**: Operations are queued when offline and synced when online
- **Conflict Detection**: Automatically detects conflicts during sync
- **Data Persistence**: All data remains available offline

### Conflict Resolution

When conflicts occur during sync, the system:
1. Detects conflicts between local and cloud data
2. Presents conflict resolution UI to the user
3. Allows resolution through three options:
   - **Keep Local**: Use local version
   - **Use Cloud**: Use cloud version  
   - **Merge**: Intelligently merge both versions

### Sync Status Tracking

Each record includes sync metadata:
```typescript
interface Task {
  // ... other fields
  sync_status?: 'synced' | 'pending' | 'conflict'
  last_synced_at?: string
}
```

## Usage

### Database Context

The system provides a React context for easy usage:

```typescript
import { useDatabase } from './services/database/DatabaseContext'

function MyComponent() {
  const { database, config, setMode, sync, conflicts } = useDatabase()
  
  // Use database operations
  const tasks = await database.getTasks()
  await database.createTask({ title: 'New Task', status: 'todo' })
}
```

### Database Mode Selection

Users can switch between modes using the `DatabaseModeSelector` component:

```typescript
<DatabaseModeSelector />
```

This component provides:
- Mode selection dropdown
- Online/offline status indicator
- Sync button for manual synchronization
- Conflict resolution interface

## Configuration

### Environment Variables

Required environment variables for cloud functionality:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENAI_API_KEY=your_openai_api_key
```

### Database Schema

The system supports both local and cloud schemas:

#### Local Schema (IndexedDB)
- Tables: `tasks`, `messages`, `syncQueue`, `conflicts`
- Indexes for performance optimization
- Automatic schema versioning

#### Cloud Schema (Supabase)
- PostgreSQL tables with Row Level Security
- Real-time subscriptions enabled
- Automatic timestamp updates

## Implementation Details

### Sync Algorithm

1. **Push Local Changes**: Send pending local changes to cloud
2. **Pull Cloud Changes**: Fetch latest cloud data
3. **Conflict Detection**: Compare timestamps and detect conflicts
4. **Resolution**: Present conflicts to user or auto-resolve
5. **Update Status**: Mark records as synced

### Performance Optimizations

- **Batch Operations**: Multiple operations batched together
- **Incremental Sync**: Only sync changed records
- **Indexed Queries**: Optimized database indexes
- **Lazy Loading**: Load data on demand

### Error Handling

- **Network Errors**: Graceful handling of network failures
- **Sync Failures**: Retry mechanism for failed syncs
- **Data Validation**: Input validation and sanitization
- **Rollback Support**: Ability to rollback failed operations

## Migration Guide

### From Single Database to Dual Database

1. **Install Dependencies**:
   ```bash
   npm install dexie @types/better-sqlite3
   ```

2. **Update Components**: Replace direct Supabase calls with database abstraction
3. **Add Database Provider**: Wrap your app with `DatabaseProvider`
4. **Configure Modes**: Set up database mode selection UI

### Example Migration

**Before**:
```typescript
const { data } = await supabase.from('tasks').select('*')
```

**After**:
```typescript
const { database } = useDatabase()
const tasks = await database.getTasks()
```

## Best Practices

1. **Always use the database abstraction** - Don't access Supabase directly
2. **Handle offline scenarios** - Check `isOnline()` before cloud operations
3. **Resolve conflicts promptly** - Don't let conflicts accumulate
4. **Monitor sync status** - Track sync health and performance
5. **Test offline scenarios** - Ensure app works without internet

## Troubleshooting

### Common Issues

1. **Sync Conflicts**: Use the conflict resolver UI to resolve manually
2. **Offline Data Loss**: Check sync queue and retry sync when online
3. **Performance Issues**: Monitor database indexes and query patterns
4. **Authentication Errors**: Verify Supabase credentials and RLS policies

### Debug Tools

- **Database Inspector**: Use browser dev tools to inspect IndexedDB
- **Sync Logs**: Check console for sync operation logs
- **Conflict Viewer**: Use conflict resolver to inspect conflicts
- **Network Monitor**: Check network requests for cloud operations

## Future Enhancements

- **Multi-device Sync**: Sync across multiple devices
- **Selective Sync**: Choose which data to sync
- **Background Sync**: Automatic sync in background
- **Data Compression**: Compress data for faster sync
- **Encryption**: Encrypt sensitive data locally
