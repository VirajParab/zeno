import React, { useState, useEffect } from 'react'
import { listen } from '@tauri-apps/api/event'
import ChatWindow from './ChatWindow'
import TodayDashboard from './TodayDashboard'
import KanbanBoard from './KanbanBoard'

const HotkeyOverlay: React.FC = () => {
  const [showOverlay, setShowOverlay] = useState(false)
  const [userId] = useState('demo-user') // In production, get from auth
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'tasks'>('dashboard')

  useEffect(() => {
    // Listen for Tauri toggle-overlay event
    const unlisten = listen('toggle-overlay', () => {
      setShowOverlay(prev => !prev)
    })

    // Also listen for keyboard shortcut in browser (for PWA)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
        e.preventDefault()
        setShowOverlay(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      unlisten.then(fn => fn())
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const closeOverlay = () => {
    setShowOverlay(false)
  }

  if (!showOverlay) return null

  return (
    <div className="overlay" onClick={closeOverlay}>
      <div className="overlay-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#e5e7eb' }}>Zeno AI</h2>
          <button 
            onClick={closeOverlay}
            style={{
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {[
            { id: 'dashboard', label: 'Today' },
            { id: 'chat', label: 'Chat' },
            { id: 'tasks', label: 'Tasks' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '8px 16px',
                background: activeTab === tab.id ? '#3b82f6' : '#374151',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && <TodayDashboard userId={userId} />}
        {activeTab === 'chat' && <ChatWindow userId={userId} />}
        {activeTab === 'tasks' && <KanbanBoard userId={userId} />}

        {/* Instructions */}
        <div style={{ 
          marginTop: '20px', 
          padding: '12px', 
          background: '#374151', 
          borderRadius: '6px',
          fontSize: '12px',
          color: '#9ca3af'
        }}>
          <strong>Shortcuts:</strong> Ctrl/Cmd+Space to toggle • Click outside to close • Drag tasks between columns
        </div>
      </div>
    </div>
  )
}

export default HotkeyOverlay
