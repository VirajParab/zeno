import { useState, useEffect, useRef } from 'react'
import { AdvancedZenoCoachingService, UserProfile, DailyReflection, ConversationMessage } from '../services/ai/advancedZenoCoachingService'
import { ZenoConversationalAI } from '../services/ai/zenoConversationalAI'
import { AIService } from '../services/ai/aiService'
import { useDatabase } from '../services/database/DatabaseContext'
import { Task } from '../services/database/types'
import { ConversationalResponse, GoalIntent, ClarificationQuestion } from '../services/ai/conversationalTypes'

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
  const [olderTasks, setOlderTasks] = useState<Task[]>([])
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([])
  const [showOlderTasks, setShowOlderTasks] = useState(false)
  const [extractedGoals, setExtractedGoals] = useState<GoalIntent[]>([])
  const [pendingQuestions, setPendingQuestions] = useState<ClarificationQuestion[]>([])
  const [conversationalAI, setConversationalAI] = useState<ZenoConversationalAI | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadTasks()
    determineCheckInType()
    initializeConversationalAI()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [conversationHistory])

  const initializeConversationalAI = async () => {
    if (database) {
      const aiService = new AIService(database, userProfile.id)
      const conversationalAI = new ZenoConversationalAI(aiService, database, userProfile.id)
      setConversationalAI(conversationalAI)
    }
  }

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadTasks = async () => {
    if (!database) return
    
    try {
      const allTasks = await database.getTasks()
      const today = new Date()
      const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000)
      
      // Separate tasks into current and older tasks
      const currentTasks = allTasks.filter(task => {
        if (!task.due_date) return true
        const dueDate = new Date(task.due_date)
        return dueDate >= threeDaysAgo
      })
      
      const olderTasksList = allTasks.filter(task => {
        if (!task.due_date) return false
        const dueDate = new Date(task.due_date)
        return dueDate < threeDaysAgo && task.status !== 'done'
      })
      
      setTasks(currentTasks)
      setOlderTasks(olderTasksList)
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
      const message = await coachingService.generateMorningCheckInWithOlderTasks(olderTasks)
      setCheckInMessage(message)
      
      // Add Zeno's message to conversation history
      const zenoMessage: ConversationMessage = {
        id: `msg-${Date.now()}`,
        role: 'zeno',
        content: message,
        timestamp: new Date().toISOString()
      }
      setConversationHistory([zenoMessage])
    } catch (error) {
      console.error('Failed to generate morning check-in:', error)
      const fallbackMessage = `Good morning, ${userProfile.name}! ☀️

Ready to make today amazing? Let's plan together:

1. What's your main focus today?
2. How much time do you have for deep work?
3. Any meetings or personal events I should account for?
4. Would you like to focus more on your professional or personal goals today?

I'm here to help you create a balanced, productive day! 🌟`
      
      setCheckInMessage(fallbackMessage)
      
      const zenoMessage: ConversationMessage = {
        id: `msg-${Date.now()}`,
        role: 'zeno',
        content: fallbackMessage,
        timestamp: new Date().toISOString()
      }
      setConversationHistory([zenoMessage])
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
    if (!userResponse.trim() || !conversationalAI) return

    setIsTyping(true)
    
    // Add user message to conversation history
    const userMessage: ConversationMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: userResponse,
      timestamp: new Date().toISOString()
    }
    setConversationHistory(prev => [...prev, userMessage])

    try {
      // Process user response with conversational AI
      const response = await conversationalAI.processConversation(
        userResponse,
        conversationHistory.map(msg => ({
          messageId: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp
        })),
        extractedGoals
      )

      // Handle extracted goals
      if (response.extractedData?.goals.length > 0) {
        setExtractedGoals(prev => [...prev, ...response.extractedData.goals as GoalIntent[]])
      }

      // Handle follow-up questions
      if (response.followUpQuestions.length > 0) {
        setPendingQuestions(prev => [...prev, ...response.followUpQuestions])
      }

      // Handle suggested actions
      if (response.suggestedActions.length > 0) {
        await handleSuggestedActions(response.suggestedActions)
      }

      // Add Zeno's response to conversation history
      const zenoMessage: ConversationMessage = {
        id: `msg-${Date.now()}`,
        role: 'zeno',
        content: response.message,
        timestamp: new Date().toISOString()
      }
      setConversationHistory(prev => [...prev, zenoMessage])
      
      setUserResponse('')
    } catch (error) {
      console.error('Failed to process response:', error)
      
      const errorMessage: ConversationMessage = {
        id: `msg-${Date.now()}`,
        role: 'zeno',
        content: "I'm having trouble processing that right now. Could you try rephrasing your response?",
        timestamp: new Date().toISOString()
      }
      setConversationHistory(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const handleSuggestedActions = async (actions: any[]) => {
    if (!database) return

    for (const action of actions) {
      try {
        switch (action.type) {
          case 'create_goal':
            // Create goal in database
            console.log('Creating goal:', action.data)
            break
          case 'create_task':
            // Create tasks in database
            for (const task of action.data) {
              await database.createTask({
                user_id: userProfile.id,
                title: task.title,
                description: task.description,
                status: 'todo',
                priority: task.priority,
                column_id: 'default',
                position: 0
              })
            }
            await loadTasks() // Reload tasks
            break
          case 'schedule_reminder':
            // Schedule reminder
            console.log('Scheduling reminder:', action.data)
            break
          case 'set_deadline':
            // Set deadline
            console.log('Setting deadline:', action.data)
            break
        }
      } catch (error) {
        console.error(`Failed to execute action ${action.type}:`, error)
      }
    }
  }

  const answerClarificationQuestion = async (questionId: string, answer: string) => {
    if (!conversationalAI) return

    setIsTyping(true)
    try {
      const result = await conversationalAI.processClarificationAnswer(
        questionId,
        answer,
        conversationHistory.map(msg => ({
          messageId: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp
        }))
      )

      // Update pending questions
      setPendingQuestions(prev => prev.filter(q => q.id !== questionId))

      // Add follow-up questions if any
      if (result.followUpQuestions?.length > 0) {
        setPendingQuestions(prev => [...prev, ...result.followUpQuestions])
      }

      // Add response to conversation
      const responseMessage: ConversationMessage = {
        id: `msg-${Date.now()}`,
        role: 'zeno',
        content: result.response,
        timestamp: new Date().toISOString()
      }
      setConversationHistory(prev => [...prev, responseMessage])

      // Handle next actions
      if (result.nextActions?.length > 0) {
        console.log('Next actions:', result.nextActions)
      }
    } catch (error) {
      console.error('Failed to process clarification answer:', error)
    } finally {
      setIsTyping(false)
    }
  }

  const handleTaskActions = async (actions: any[]) => {
    if (!database) return

    for (const action of actions) {
      try {
        switch (action.type) {
          case 'complete':
            await database.updateTask(action.taskId, { status: 'done' })
            setCompletedTasks(prev => [...prev, action.taskId])
            break
          case 'skip':
            await database.updateTask(action.taskId, { status: 'skipped' })
            setSkippedTasks(prev => [...prev, action.taskId])
            break
          case 'reschedule':
            await database.updateTask(action.taskId, { due_date: action.newDate })
            break
          case 'update':
            await database.updateTask(action.taskId, action.updates)
            break
        }
      } catch (error) {
        console.error(`Failed to execute task action ${action.type}:`, error)
      }
    }
    
    // Reload tasks to reflect changes
    await loadTasks()
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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                  Z
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Zeno</h3>
                  <p className="text-sm text-gray-600">Your AI coach</p>
                </div>
              </div>
              {olderTasks.length > 0 && (
                <button
                  onClick={() => setShowOlderTasks(!showOlderTasks)}
                  className="px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded-full hover:bg-orange-200 transition-colors"
                >
                  {olderTasks.length} older tasks
                </button>
              )}
            </div>
            
            {/* Conversation History */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4 min-h-64 max-h-96 overflow-y-auto">
              {conversationHistory.length === 0 ? (
                <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
                  {checkInMessage}
                </p>
              ) : (
                <div className="space-y-4">
                  {conversationHistory.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-blue-500 text-white'
                            : 'bg-white text-gray-900 border border-gray-200'
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {message.content}
                        </p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-white text-gray-900 border border-gray-200 px-4 py-2 rounded-lg">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Extracted Goals Display */}
            {extractedGoals.length > 0 && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="text-sm font-medium text-green-800 mb-2">🎯 Goals Extracted from Conversation</h4>
                <div className="space-y-2">
                  {extractedGoals.slice(-3).map((goal) => (
                    <div key={goal.id} className="text-sm text-green-700">
                      <span className="font-medium">{goal.extractedGoal}</span>
                      <span className="text-green-600 ml-2">({goal.category}, {goal.timeframe})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Clarification Questions */}
            {pendingQuestions.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 mb-2">❓ Quick Questions</h4>
                <div className="space-y-2">
                  {pendingQuestions.slice(0, 2).map((question) => (
                    <div key={question.id} className="text-sm">
                      <p className="text-blue-700 mb-2">{question.question}</p>
                      {question.expectedAnswerType === 'choice' && question.options ? (
                        <div className="flex flex-wrap gap-1">
                          {question.options.map((option, index) => (
                            <button
                              key={index}
                              onClick={() => answerClarificationQuestion(question.id, option)}
                              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            placeholder="Your answer..."
                            className="flex-1 px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                answerClarificationQuestion(question.id, e.currentTarget.value)
                                e.currentTarget.value = ''
                              }
                            }}
                          />
                          <button
                            onClick={(e) => {
                              const input = e.currentTarget.previousElementSibling as HTMLInputElement
                              if (input.value.trim()) {
                                answerClarificationQuestion(question.id, input.value.trim())
                                input.value = ''
                              }
                            }}
                            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                          >
                            Send
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

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
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Today's Tasks</h3>
              {olderTasks.length > 0 && (
                <span className="text-sm text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                  {olderTasks.length} overdue
                </span>
              )}
            </div>
            
            {/* Older Tasks Section */}
            {showOlderTasks && olderTasks.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-orange-700 mb-3">Older Tasks (Overdue)</h4>
                <div className="space-y-2">
                  {olderTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 rounded-lg border border-orange-200 bg-orange-50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h5 className="font-medium text-orange-900">{task.title}</h5>
                          {task.description && (
                            <p className="text-sm text-orange-700 mt-1">{task.description}</p>
                          )}
                          <p className="text-xs text-orange-600 mt-1">
                            Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
                          </p>
                        </div>
                        <div className="flex space-x-2 ml-3">
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
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Current Tasks */}
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
                      {task.due_date && (
                        <p className="text-xs text-gray-500 mt-1">
                          Due: {new Date(task.due_date).toLocaleDateString()}
                        </p>
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
                {olderTasks.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-orange-600">Overdue</span>
                    <span className="text-orange-600 font-medium">{olderTasks.length}</span>
                  </div>
                )}
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.round((completedTasks.length / (tasks.length || 1)) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-1 text-center">
                    {Math.round((completedTasks.length / (tasks.length || 1)) * 100)}% Complete
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
