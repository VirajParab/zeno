import Dexie, { Table } from 'dexie'
import { Task, Message, SyncConflict, APIKey } from './types'

export class LocalDatabase extends Dexie {
  tasks!: Table<Task>
  messages!: Table<Message>
  apiKeys!: Table<APIKey>
  syncQueue!: Table<any>
  conflicts!: Table<SyncConflict>

  constructor() {
    super('ZenoLocalDB')
    
    // Version 1: Original schema (for migration)
    this.version(1).stores({
      tasks: 'id, user_id, status, created_at, updated_at, sync_status',
      messages: 'id, user_id, role, inserted_at, sync_status',
      apiKeys: 'id, user_id, provider, is_active, created_at, updated_at, sync_status',
      syncQueue: 'id, table, operation, data, timestamp',
      conflicts: 'id, table, localData, cloudData, conflictType, timestamp'
    })

    // Version 2: Fixed schema with auto-incrementing primary keys
    this.version(2).stores({
      tasks: '++id, user_id, status, created_at, updated_at, sync_status',
      messages: '++id, user_id, role, inserted_at, sync_status',
      apiKeys: '++id, user_id, provider, is_active, created_at, updated_at, sync_status',
      syncQueue: '++id, table, operation, data, timestamp',
      conflicts: '++id, table, localData, cloudData, conflictType, timestamp'
    }).upgrade(tx => {
      // Clear all data to ensure clean migration
      return Promise.all([
        (tx as any).tasks.clear(),
        (tx as any).messages.clear(),
        (tx as any).apiKeys.clear(),
        (tx as any).syncQueue.clear(),
        (tx as any).conflicts.clear()
      ])
    })
  }
}

export const localDB = new LocalDatabase()
