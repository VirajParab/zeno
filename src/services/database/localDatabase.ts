import Dexie, { Table } from 'dexie'
import { Task, Message, SyncConflict, APIKey } from './types'

export class LocalDatabase extends Dexie {
  tasks!: Table<Task>
  messages!: Table<Message>
  apiKeys!: Table<APIKey>
  syncQueue!: Table<any>
  conflicts!: Table<SyncConflict>

  constructor() {
    super('ZenoLocalDB_v2')
    
    // Clean schema with auto-incrementing primary keys from the start
    this.version(1).stores({
      tasks: '++id, user_id, status, created_at, updated_at, sync_status',
      messages: '++id, user_id, role, inserted_at, sync_status',
      apiKeys: '++id, user_id, provider, is_active, created_at, updated_at, sync_status',
      syncQueue: '++id, table, operation, data, timestamp',
      conflicts: '++id, table, localData, cloudData, conflictType, timestamp'
    })
  }
}

export const localDB = new LocalDatabase()
