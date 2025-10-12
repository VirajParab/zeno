import Dexie, { Table } from 'dexie'
import { Task, Message, SyncConflict, APIKey, Column, Reminder } from './types'

export class LocalDatabase extends Dexie {
  tasks!: Table<Task>
  messages!: Table<Message>
  apiKeys!: Table<APIKey>
  columns!: Table<Column>
  reminders!: Table<Reminder>
  syncQueue!: Table<any>
  conflicts!: Table<SyncConflict>

  constructor() {
    super('ZenoLocalDB_v3')
    
    // Updated schema with new tables
    this.version(2).stores({
      tasks: '++id, user_id, status, column_id, position, created_at, updated_at, sync_status',
      messages: '++id, user_id, role, inserted_at, sync_status',
      apiKeys: '++id, user_id, provider, is_active, created_at, updated_at, sync_status',
      columns: '++id, user_id, position, created_at, updated_at, sync_status',
      reminders: '++id, user_id, task_id, reminder_date, is_sent, created_at, updated_at, sync_status',
      syncQueue: '++id, table, operation, data, timestamp',
      conflicts: '++id, table, localData, cloudData, conflictType, timestamp'
    })
  }
}

export const localDB = new LocalDatabase()
