import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { DatabaseInterface, DatabaseConfig, DatabaseMode } from './types'
import { createDatabaseService } from './databaseService'

interface DatabaseContextType {
  database: DatabaseInterface
  config: DatabaseConfig
  setMode: (mode: DatabaseMode) => Promise<void>
  sync: () => Promise<void>
  isOnline: boolean
  conflicts: any[]
  resolveConflict: (conflictId: string, resolution: 'local' | 'cloud' | 'merge') => Promise<void>
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined)

interface DatabaseProviderProps {
  children: ReactNode
  userId: string
}

export function DatabaseProvider({ children, userId }: DatabaseProviderProps) {
  const [config, setConfig] = useState<DatabaseConfig>({
    mode: 'local',
    userId,
    syncEnabled: false
  })
  const [database, setDatabase] = useState<DatabaseInterface | null>(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [conflicts, setConflicts] = useState<any[]>([])

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Initialize database only once on mount
  useEffect(() => {
    console.log('Initializing database on mount')
    const initializeDatabase = async () => {
      try {
        const db = createDatabaseService(config)
        await db.initialize()
        setDatabase(db)
        
        // Load conflicts if any
        const conflictList = await db.getConflicts()
        setConflicts(conflictList)
        console.log('Database initialized successfully')
      } catch (error) {
        console.error('Failed to initialize database:', error)
      }
    }

    initializeDatabase()
  }, []) // Only run once on mount

  // Cleanup database only on unmount
  useEffect(() => {
    return () => {
      if (database) {
        console.log('Closing database on unmount')
        database.close()
      }
    }
  }, [])

  const setMode = async (mode: DatabaseMode) => {
    console.log('Setting database mode to:', mode)
    if (database) {
      console.log('Closing existing database before mode change')
      await database.close()
    }
    
    const newConfig = { ...config, mode }
    setConfig(newConfig)
  }

  const sync = async () => {
    if (database && isOnline) {
      try {
        await database.sync()
        const conflictList = await database.getConflicts()
        setConflicts(conflictList)
      } catch (error) {
        console.error('Sync failed:', error)
        throw error
      }
    }
  }

  const resolveConflict = async (conflictId: string, resolution: 'local' | 'cloud' | 'merge') => {
    if (database) {
      await database.resolveConflict(conflictId, resolution)
      const conflictList = await database.getConflicts()
      setConflicts(conflictList)
    }
  }

  if (!database) {
    return <div>Initializing database...</div>
  }

  return (
    <DatabaseContext.Provider value={{
      database,
      config,
      setMode,
      sync,
      isOnline,
      conflicts,
      resolveConflict
    }}>
      {children}
    </DatabaseContext.Provider>
  )
}

export function useDatabase() {
  const context = useContext(DatabaseContext)
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider')
  }
  return context
}
