import React, { useState, useEffect } from 'react'
import { getTodaySummary } from '../services/apiClient'

interface TodayDashboardProps {
  userId: string
}

const TodayDashboard: React.FC<TodayDashboardProps> = ({ userId }) => {
  const [summary, setSummary] = useState({
    tasksToday: 0,
    tasksCompleted: 0,
    unreadMail: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSummary()
  }, [userId])

  const loadSummary = async () => {
    try {
      const data = await getTodaySummary(userId)
      setSummary(data)
    } catch (error) {
      console.error('Error loading summary:', error)
    } finally {
      setLoading(false)
    }
  }

  const addQuickTask = () => {
    const title = prompt('Quick task:')
    if (!title) return
    
    // This would integrate with the KanbanBoard component
    // For now, just show a placeholder
    alert(`Quick task "${title}" added! (Integrate with KanbanBoard)`)
  }

  const checkMail = () => {
    // Placeholder for mail integration
    alert('Mail integration coming soon! For now, manually track your unread emails.')
  }

  if (loading) {
    return (
      <div className="today-dashboard">
        <div className="dashboard-widget">Loading...</div>
      </div>
    )
  }

  return (
    <div className="today-dashboard">
      <div className="dashboard-widget">
        <h4>Today's Overview</h4>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-number">{summary.tasksToday}</div>
            <div className="stat-label">Tasks Today</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">{summary.tasksCompleted}</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">{summary.unreadMail}</div>
            <div className="stat-label">Unread Mail</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">
              {summary.tasksToday > 0 ? Math.round((summary.tasksCompleted / summary.tasksToday) * 100) : 0}%
            </div>
            <div className="stat-label">Progress</div>
          </div>
        </div>
      </div>

      <div className="dashboard-widget">
        <h4>Quick Actions</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button 
            onClick={addQuickTask}
            style={{
              padding: '8px 16px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            + Quick Task
          </button>
          <button 
            onClick={checkMail}
            style={{
              padding: '8px 16px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            📧 Check Mail
          </button>
          <button 
            onClick={loadSummary}
            style={{
              padding: '8px 16px',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>
    </div>
  )
}

export default TodayDashboard
