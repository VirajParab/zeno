import { useState, useEffect } from 'react'
import { useDatabase } from '../services/database/DatabaseContext'

const Dashboard = () => {
  const database = useDatabase()
  const [stats, setStats] = useState({
    tasksToday: 0,
    tasksCompleted: 0,
    habitsTracked: 0,
    messagesCount: 0
  })

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const tasks = await database.getTasks()
      const messages = await database.getMessages()
      
      const today = new Date().toISOString().split('T')[0]
      const tasksToday = tasks.filter((task: any) => 
        task.created_at.startsWith(today)
      ).length
      
      const tasksCompleted = tasks.filter((task: any) => 
        task.status === 'done'
      ).length

      setStats({
        tasksToday,
        tasksCompleted,
        habitsTracked: 0, // Will be implemented with habit tracker
        messagesCount: messages.length
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const statCards = [
    {
      title: 'Tasks Today',
      value: stats.tasksToday,
      icon: '📋',
      color: 'bg-blue-500',
      change: '+12%'
    },
    {
      title: 'Completed',
      value: stats.tasksCompleted,
      icon: '✅',
      color: 'bg-green-500',
      change: '+8%'
    },
    {
      title: 'Habits Tracked',
      value: stats.habitsTracked,
      icon: '🎯',
      color: 'bg-purple-500',
      change: '+5%'
    },
    {
      title: 'AI Messages',
      value: stats.messagesCount,
      icon: '💬',
      color: 'bg-orange-500',
      change: '+15%'
    }
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back! 👋
        </h1>
        <p className="text-gray-600">
          Here's what's happening with your productivity today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => (
          <div key={index} className="card hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {card.title}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {card.value}
                </p>
                <p className="text-xs text-green-600 font-medium">
                  {card.change}
                </p>
              </div>
              <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center text-white text-xl`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Tasks */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Tasks
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                <span className="text-gray-900">Complete project proposal</span>
              </div>
              <span className="text-sm text-gray-500">2h ago</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-gray-900">Review team feedback</span>
              </div>
              <span className="text-sm text-gray-500">4h ago</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                <span className="text-gray-900">Schedule meeting</span>
              </div>
              <span className="text-sm text-gray-500">6h ago</span>
            </div>
          </div>
        </div>

        {/* Habit Progress */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Today's Habits
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-lg mr-3">🏃‍♂️</span>
                <span className="text-gray-900">Morning Run</span>
              </div>
              <div className="flex items-center">
                <div className="w-16 h-2 bg-gray-200 rounded-full mr-2">
                  <div className="w-3/4 h-2 bg-green-500 rounded-full"></div>
                </div>
                <span className="text-sm text-gray-600">75%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-lg mr-3">📚</span>
                <span className="text-gray-900">Read 30 min</span>
              </div>
              <div className="flex items-center">
                <div className="w-16 h-2 bg-gray-200 rounded-full mr-2">
                  <div className="w-1/2 h-2 bg-blue-500 rounded-full"></div>
                </div>
                <span className="text-sm text-gray-600">50%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-lg mr-3">🧘‍♀️</span>
                <span className="text-gray-900">Meditation</span>
              </div>
              <div className="flex items-center">
                <div className="w-16 h-2 bg-gray-200 rounded-full mr-2">
                  <div className="w-full h-2 bg-purple-500 rounded-full"></div>
                </div>
                <span className="text-sm text-gray-600">100%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Assistant Quick Access */}
      <div className="mt-8 card bg-gradient-primary text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold mb-2">
              Need help with your tasks?
            </h3>
            <p className="text-primary-100 mb-4">
              Ask your AI assistant for guidance, task prioritization, or habit advice.
            </p>
            <button className="btn-primary bg-white text-primary-600 hover:bg-gray-100">
              Start Chat
            </button>
          </div>
          <div className="text-6xl opacity-20">
            🤖
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
