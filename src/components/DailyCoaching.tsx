import { useState, useEffect } from 'react'
import { AdvancedZenoCoachingService, UserProfile, DailyReflection } from '../services/ai/advancedZenoCoachingService'
import { useDatabase } from '../services/database/DatabaseContext'
import { Task } from '../services/database/types'

interface DailyCoachingProps {
  coachingService: AdvancedZenoCoachingService
  userProfile: UserProfile
}

const DailyCoaching = ({ coachingService, userProfile }: DailyCoachingProps) => {
  const { database } = useDatabase()
  const [currentCheckIn, setCurrentCheckIn] = useState<'morning' | 'midday' | 'evening' | null>(null)
  const [checkInMessage, setCheckInMessage] = useState('')
  const [userResponse, setUserResponse] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [completedTasks, setCompletedTasks] = useState<string[]>([])
  const [skippedTasks, setSkippedTasks] = useState<string[]>([])

  useEffect(() => {
    loadTasks()
    determineCheckInType()
  }, [])

  const loadTasks = async () => {
    if (!database) return
    
    try {
      const allTasks = await database.getTasks()
      setTasks(allTasks)
    } catch (error) {
      console.error('Failed to load tasks:', error)
    }
  }

  const determineCheckInType = () => {
    const now = new Date()
    const hour = now.getHours()
    
    if (hour >= 6 && hour < 12) {
      setCurrentCheckIn('morning')
      generateMorningCheckIn()
    } else if (hour >= 12 && hour < 18) {
      setCurrentCheckIn('midday')
      generateMiddayCheckIn()
    } else {
      setCurrentCheckIn('evening')
      generateEveningCheckIn()
    }
  }

  const generateMorningCheckIn = async () => {
    try {
      const message = await coachingService.generateMorningCheckIn()
      setCheckInMessage(message)
    } catch (error) {
      console.error('Failed to generate morning check-in:', error)
      setCheckInMessage(`Good morning, ${userProfile.name}! ☀️

Ready to make today amazing? Let's plan together:

1. What's your main focus today?
2. How much time do you have for deep work?
3. Any meetings or personal events I should account for?
4. Would you like to focus more on your professional or personal goals today?

I'm here to help you create a balanced, productive day! 🌟`)
    }
  }

  const generateMiddayCheckIn = async () => {
    try {
      const message = await coachingService.generateMiddayCheckIn(completedTasks, tasks.map(t => t.id))
      setCheckInMessage(message)
    } catch (error) {
      console.error('Failed to generate midday check-in:', error)
      setCheckInMessage(`You've finished ${completedTasks.length} of ${tasks.length} key tasks today — awesome! 🎉

Want me to shuffle the remaining ones based on your energy? Or is there anything you'd like to adjust?

I'm here to keep you on track and flexible! 💪`)
    }
  }

  const generateEveningCheckIn = async () => {
    try {
      const message = await coachingService.generateEveningReflection(completedTasks, skippedTasks)
      setCheckInMessage(message)
    } catch (error) {
      console.error('Failed to generate evening check-in:', error)
      setCheckInMessage(`Nice work today, ${userProfile.name}! 🌟

Let's take 2 minutes to reflect before wrapping up:

1. What went well today?
2. What did you skip and why?
3. How do you feel overall — energized, tired, or balanced?
4. Want me to adjust tomorrow's plan based on this?

You completed ${Math.round((completedTasks.length / tasks.length) * 100)}% of today's plan. You're doing great! 🎯`)
    }
  }

  const sendResponse = async () => {
    if (!userResponse.trim()) return

    setIsTyping(true)
    try {
      // Process user response and generate follow-up
      // This would integrate with the coaching service to handle responses
      
      // For now, just simulate a response
      setTimeout(() => {
        setCheckInMessage(prev => prev + '\n\nThanks for sharing! I\'ll use this to help you tomorrow. Keep up the great work! 🌟')
        setUserResponse('')
        setIsTyping(false)
      }, 2000)
    } catch (error) {
      console.error('Failed to process response:', error)
      setIsTyping(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendResponse()
    }
  }

  const markTaskComplete = (taskId: string) => {
    setCompletedTasks(prev => [...prev, taskId])
    setSkippedTasks(prev => prev.filter(id => id !== taskId))
  }

  const markTaskSkipped = (taskId: string) => {
    setSkippedTasks(prev => [...prev, taskId])
    setCompletedTasks(prev => prev.filter(id => id !== taskId))
  }

  const getCheckInIcon = () => {
    switch (currentCheckIn) {
      case 'morning': return '🌅'
      case 'midday': return '☀️'
      case 'evening': return '🌙'
      default: return '💬'
    }
  }

  const getCheckInTitle = () => {
    switch (currentCheckIn) {
      case 'morning': return 'Morning Check-In'
      case 'midday': return 'Midday Check-In'
      case 'evening': return 'Evening Reflection'
      default: return 'Daily Coaching'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-4">
            {getCheckInIcon()}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{getCheckInTitle()}</h1>
          <p className="text-gray-600">Your daily conversation with Zeno</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Chat Interface */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                Z
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Zeno</h3>
                <p className="text-sm text-gray-600">Your AI coach</p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4 min-h-32">
              <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
                {checkInMessage}
              </p>
            </div>

            <div className="space-y-3">
              <textarea
                value={userResponse}
                onChange={(e) => setUserResponse(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Share your thoughts with Zeno..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 resize-none"
                rows={3}
                disabled={isTyping}
              />
              <button
                onClick={sendResponse}
                disabled={!userResponse.trim() || isTyping}
                className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {isTyping ? 'Sending...' : 'Send Response'}
              </button>
            </div>
          </div>

          {/* Task Overview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Today's Tasks</h3>
            
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-3 rounded-lg border transition-all duration-300 ${
                    completedTasks.includes(task.id)
                      ? 'bg-green-50 border-green-200'
                      : skippedTasks.includes(task.id)
                      ? 'bg-red-50 border-red-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{task.title}</h4>
                      {task.description && (
                        <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                      )}
                    </div>
                    <div className="flex space-x-2 ml-3">
                      {!completedTasks.includes(task.id) && !skippedTasks.includes(task.id) && (
                        <>
                          <button
                            onClick={() => markTaskComplete(task.id)}
                            className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors duration-300"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => markTaskSkipped(task.id)}
                            className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors duration-300"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </>
                      )}
                      {completedTasks.includes(task.id) && (
                        <div className="p-1.5 text-green-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                      {skippedTasks.includes(task.id) && (
                        <div className="p-1.5 text-red-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Progress Summary */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Today's Progress</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Completed</span>
                  <span className="text-green-600 font-medium">{completedTasks.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Skipped</span>
                  <span className="text-red-600 font-medium">{skippedTasks.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Remaining</span>
                  <span className="text-gray-600 font-medium">{tasks.length - completedTasks.length - skippedTasks.length}</span>
                </div>
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.round((completedTasks.length / tasks.length) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-1 text-center">
                    {Math.round((completedTasks.length / tasks.length) * 100)}% Complete
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 text-center">
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => setCurrentCheckIn('morning')}
              className={`px-6 py-3 rounded-lg transition-all duration-300 ${
                currentCheckIn === 'morning'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              🌅 Morning
            </button>
            <button
              onClick={() => setCurrentCheckIn('midday')}
              className={`px-6 py-3 rounded-lg transition-all duration-300 ${
                currentCheckIn === 'midday'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              ☀️ Midday
            </button>
            <button
              onClick={() => setCurrentCheckIn('evening')}
              className={`px-6 py-3 rounded-lg transition-all duration-300 ${
                currentCheckIn === 'evening'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              🌙 Evening
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DailyCoaching
