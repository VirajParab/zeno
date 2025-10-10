import React, { useState } from 'react'
import { useDatabase } from '../services/database/DatabaseContext'
import { DatabaseMode } from '../services/database/types'
import { ConflictResolver } from './ConflictResolver'

interface DatabaseModeSelectorProps {
  className?: string
}

export function DatabaseModeSelector({ className = '' }: DatabaseModeSelectorProps) {
  const { config, setMode, sync, isOnline, conflicts, resolveConflict } = useDatabase()
  const [isSyncing, setIsSyncing] = useState(false)
  const [showConflictResolver, setShowConflictResolver] = useState(false)

  const handleModeChange = async (mode: DatabaseMode) => {
    try {
      await setMode(mode)
    } catch (error) {
      console.error('Failed to change database mode:', error)
      alert('Failed to change database mode')
    }
  }

  const handleSync = async () => {
    if (!isOnline) {
      alert('Cannot sync while offline')
      return
    }

    setIsSyncing(true)
    try {
      await sync()
    } catch (error) {
      console.error('Sync failed:', error)
      alert('Sync failed. Please try again.')
    } finally {
      setIsSyncing(false)
    }
  }

  const getModeDescription = (mode: DatabaseMode) => {
    switch (mode) {
      case 'local':
        return 'Data stored locally only. Fast and works offline.'
      case 'cloud':
        return 'Data stored in cloud only. Requires internet connection.'
      case 'sync':
        return 'Data synced between local and cloud. Best of both worlds.'
      default:
        return ''
    }
  }

  return (
    <div className={`database-mode-selector ${className}`}>
      <div className="mode-selector">
        <label htmlFor="database-mode">Database Mode:</label>
        <select
          id="database-mode"
          value={config.mode}
          onChange={(e) => handleModeChange(e.target.value as DatabaseMode)}
          className="mode-select"
        >
          <option value="local">Local Only</option>
          <option value="cloud">Cloud Only</option>
          <option value="sync">Sync Mode</option>
        </select>
        <p className="mode-description">{getModeDescription(config.mode)}</p>
      </div>

      <div className="sync-controls">
        <div className="status-indicators">
          <div className={`status-indicator ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? '🟢 Online' : '🔴 Offline'}
          </div>
          {conflicts.length > 0 && (
            <div className="status-indicator conflicts">
              ⚠️ {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {config.mode === 'sync' && (
          <button
            onClick={handleSync}
            disabled={!isOnline || isSyncing}
            className="sync-button"
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        )}
      </div>

      {conflicts.length > 0 && (
        <div className="conflicts-panel">
          <h4>Sync Conflicts</h4>
          <p>You have {conflicts.length} unresolved sync conflict{conflicts.length !== 1 ? 's' : ''}.</p>
          <button 
            className="resolve-conflicts-button"
            onClick={() => setShowConflictResolver(true)}
          >
            Resolve Conflicts
          </button>
        </div>
      )}

      {showConflictResolver && (
        <ConflictResolver
          conflicts={conflicts}
          onResolve={resolveConflict}
          onClose={() => setShowConflictResolver(false)}
        />
      )}
    </div>
  )
}
