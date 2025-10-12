import { useState, useEffect } from 'react'
import { useDatabase } from '../services/database/DatabaseContext'
import { AdvancedZenoCoachingService, UserProfile } from '../services/ai/advancedZenoCoachingService'

interface DashboardProps {
  coachingService: AdvancedZenoCoachingService
  userProfile: UserProfile | null
}

const Dashboard = ({ coachingService, userProfile }: DashboardProps) => {
  const { database } = useDatabase()
  const [stats, setStats] = useState({
    tasksToday: 0,
    tasksCompleted: 0,
    habitsTracked: 0,
    messagesCount: 0
  })
  const [dailyCheckIn, setDailyCheckIn] = useState<string>('')
  const [showCheckIn, setShowCheckIn] = useState(false)
  const [userResponse, setUserResponse] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  useEffect(() => {
    if (database) {
      loadStats()
    }
    if (userProfile) {
      generateDailyCheckIn()
    }
  }, [database, userProfile])

  const generateDailyCheckIn = async () => {
    if (!userProfile) return
    
    try {
      const now = new Date()
      const hour = now.getHours()
      
      let message = ''
      if (hour >= 6 && hour < 12) {
        message = await coachingService.generateMorningCheckIn()
      } else if (hour >= 12 && hour < 18) {
        message = await coachingService.generateMiddayCheckIn([], [])
      } else {
        message = await coachingService.generateEveningReflection([], [])
      }
      
      setDailyCheckIn(message)
    } catch (error) {
      console.error('Failed to generate daily check-in:', error)
      setDailyCheckIn(`Good ${getTimeOfDay()}, ${userProfile.name}! 

How are you feeling today? What's your main focus? I'm here to help you stay on track with your goals. 🌟`)
    }
  }

  const getTimeOfDay = () => {
    const hour = new Date().getHours()
    if (hour >= 6 && hour < 12) return 'morning'
    if (hour >= 12 && hour < 18) return 'afternoon'
    return 'evening'
  }

  const getCheckInIcon = () => {
    const hour = new Date().getHours()
    if (hour >= 6 && hour < 12) return '🌅'
    if (hour >= 12 && hour < 18) return '☀️'
    return '🌙'
  }

  const sendResponse = async () => {
    if (!userResponse.trim()) return

    setIsTyping(true)
    try {
      // Process user response and generate follow-up
      setTimeout(() => {
        setDailyCheckIn(prev => prev + '\n\nThanks for sharing! I\'ll use this to help you stay focused and motivated today. Keep up the great work! 🌟')
        setUserResponse('')
        setIsTyping(false)
      }, 2000)
    } catch (error) {
      console.error('Failed to process response:', error)
      setIsTyping(false)
    }
  }

  const loadStats = async () => {
    if (!database) return
    
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
          Welcome back{userProfile ? `, ${userProfile.name}` : ''}! 👋
        </h1>
        <p className="text-gray-600">
          Here's what's happening with your productivity today.
        </p>
      </div>

      {/* Daily Coaching Section */}
      {userProfile && dailyCheckIn && (
        <div className="mb-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl">
              {getCheckInIcon()}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Daily Check-In</h2>
              <p className="text-sm text-gray-600">Your conversation with Zeno</p>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
              {dailyCheckIn}
            </p>
          </div>

          {!showCheckIn ? (
            <button
              onClick={() => setShowCheckIn(true)}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-300 font-semibold"
            >
              Respond to Zeno
            </button>
          ) : (
            <div className="space-y-3">
              <textarea
                value={userResponse}
                onChange={(e) => setUserResponse(e.target.value)}
                placeholder="Share your thoughts with Zeno..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 resize-none"
                rows={3}
                disabled={isTyping}
              />
              <div className="flex space-x-3">
                <button
                  onClick={sendResponse}
                  disabled={!userResponse.trim() || isTyping}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {isTyping ? 'Sending...' : 'Send Response'}
                </button>
                <button
                  onClick={() => setShowCheckIn(false)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-300 font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
