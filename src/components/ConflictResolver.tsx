import { useState } from 'react'
import { SyncConflict } from '../services/database/types'

interface ConflictResolverProps {
  conflicts: SyncConflict[]
  onResolve: (conflictId: string, resolution: 'local' | 'cloud' | 'merge') => Promise<void>
  onClose: () => void
}

export function ConflictResolver({ conflicts, onResolve, onClose }: ConflictResolverProps) {
  const [resolving, setResolving] = useState<string | null>(null)

  const handleResolve = async (conflictId: string, resolution: 'local' | 'cloud' | 'merge') => {
    setResolving(conflictId)
    try {
      await onResolve(conflictId, resolution)
    } catch (error) {
      console.error('Failed to resolve conflict:', error)
      alert('Failed to resolve conflict')
    } finally {
      setResolving(null)
    }
  }

  const formatData = (data: any) => {
    if (data.title) {
      return `Task: ${data.title}${data.description ? ` - ${data.description}` : ''}`
    }
    if (data.content) {
      return `Message: ${data.content.substring(0, 50)}${data.content.length > 50 ? '...' : ''}`
    }
    return JSON.stringify(data, null, 2)
  }

  return (
    <div className="conflict-resolver-overlay">
      <div className="conflict-resolver">
        <div className="conflict-resolver-header">
          <h3>Resolve Sync Conflicts</h3>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <div className="conflicts-list">
          {conflicts.map((conflict) => (
            <div key={conflict.id} className="conflict-item">
              <div className="conflict-header">
                <h4>{conflict.table === 'tasks' ? 'Task Conflict' : 'Message Conflict'}</h4>
                <span className="conflict-type">{conflict.conflictType}</span>
              </div>

              <div className="conflict-content">
                <div className="data-comparison">
                  <div className="data-column">
                    <h5>Local Version</h5>
                    <div className="data-preview">
                      {formatData(conflict.localData)}
                    </div>
                    <div className="data-timestamp">
                      Updated: {new Date(conflict.localData.updated_at || conflict.localData.inserted_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="data-column">
                    <h5>Cloud Version</h5>
                    <div className="data-preview">
                      {formatData(conflict.cloudData)}
                    </div>
                    <div className="data-timestamp">
                      Updated: {new Date(conflict.cloudData.updated_at || conflict.cloudData.inserted_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="resolution-options">
                  <button
                    onClick={() => handleResolve(conflict.id, 'local')}
                    disabled={resolving === conflict.id}
                    className="resolve-button local"
                  >
                    Keep Local
                  </button>
                  <button
                    onClick={() => handleResolve(conflict.id, 'cloud')}
                    disabled={resolving === conflict.id}
                    className="resolve-button cloud"
                  >
                    Use Cloud
                  </button>
                  <button
                    onClick={() => handleResolve(conflict.id, 'merge')}
                    disabled={resolving === conflict.id}
                    className="resolve-button merge"
                  >
                    Merge
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {conflicts.length === 0 && (
          <div className="no-conflicts">
            <p>No conflicts to resolve.</p>
            <button onClick={onClose} className="close-button">Close</button>
          </div>
        )}
      </div>
    </div>
  )
}
