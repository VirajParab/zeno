import { useState, useEffect, useRef } from 'react'
import { AdvancedZenoCoachingService, UserProfile, ConversationMessage } from '../services/ai/advancedZenoCoachingService'
import { ZenoConversationalAI } from '../services/ai/zenoConversationalAI'
import { IntelligentDailyPlanner, DailyPlan, DailyPlanConfirmation } from '../services/ai/intelligentDailyPlanner'
import { AIService } from '../services/ai/aiService'
import { useDatabase } from '../services/database/DatabaseContext'
import { Task } from '../services/database/types'
import { GoalIntent, ClarificationQuestion } from '../services/ai/conversationalTypes'

interface ChatSession {
  id: string
  title: string
  createdAt: string
  lastMessageAt: string
  messageCount: number
}

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
  const [dailyPlanner, setDailyPlanner] = useState<IntelligentDailyPlanner | null>(null)
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null)
  const [showPlanConfirmation, setShowPlanConfirmation] = useState(false)
  const [tasksCreated, setTasksCreated] = useState(false)
  const [pendingTaskCreation, setPendingTaskCreation] = useState<{
    messageId: string
    tasks: any[]
  } | null>(null)
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([])
  const [currentChatId, setCurrentChatId] = useState<string>('default')
  const [showChatSidebar, setShowChatSidebar] = useState(true)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadTasks()
    determineCheckInType()
    initializeConversationalAI()
    initializeSampleChats()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [conversationHistory])

  const initializeConversationalAI = async () => {
    if (database) {
      const aiService = new AIService(database, userProfile.id)
      const conversationalAI = new ZenoConversationalAI(aiService, database, userProfile.id)
      const planner = new IntelligentDailyPlanner(aiService, database, userProfile.id)
      setConversationalAI(conversationalAI)
      setDailyPlanner(planner)
    }
  }

  const initializeSampleChats = () => {
    const sampleChats: ChatSession[] = [
      {
        id: 'sample-1',
        title: 'Daily Planning',
        createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        lastMessageAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        messageCount: 8
      },
      {
        id: 'sample-2', 
        title: 'Fitness Goals',
        createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        lastMessageAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        messageCount: 12
      },
      {
        id: 'sample-3',
        title: 'Work Projects',
        createdAt: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
        lastMessageAt: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
        messageCount: 15
      }
    ]
    setChatHistory(sampleChats)
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
        role: 'assistant',
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
        role: 'assistant',
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
    if (!userResponse.trim() || !conversationalAI || !dailyPlanner) return

    setIsTyping(true)
    
        // Add user message to conversation history
        const userMessage: ConversationMessage = {
          id: `msg-${Date.now()}`,
          role: 'user',
          content: userResponse,
          timestamp: new Date().toISOString()
        }
        setConversationHistory(prev => [...prev, userMessage])

        // Update chat title if this is the first user message
        if (conversationHistory.length === 0) {
          const title = generateChatTitle(userResponse)
          updateChatTitle(title)
        }

    try {
      // Check if user is asking for daily planning
      const isPlanningRequest = userResponse.toLowerCase().includes('plan') || 
                               userResponse.toLowerCase().includes('schedule') ||
                               userResponse.toLowerCase().includes('today') ||
                               userResponse.toLowerCase().includes('day')

      if (isPlanningRequest) {
        // Generate intelligent daily plan
        const { plan, confirmationMessage } = await dailyPlanner.generateQuickPlan(userResponse)
        setDailyPlan(plan)
        setShowPlanConfirmation(true)

        const zenoMessage: ConversationMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: confirmationMessage,
          timestamp: new Date().toISOString()
        }
        setConversationHistory(prev => [...prev, zenoMessage])
      } else {
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
        if (response.extractedData?.goals && response.extractedData.goals.length > 0) {
          setExtractedGoals(prev => [...prev, ...response.extractedData!.goals as GoalIntent[]])
        }

        // Handle follow-up questions
        if (response.followUpQuestions.length > 0) {
          setPendingQuestions(prev => [...prev, ...response.followUpQuestions])
        }

        // Handle suggested actions
        if (response.suggestedActions.length > 0) {
          await handleSuggestedActions(response.suggestedActions)
        }

        // Check if AI response contains task details for creation
        const aiTasks = response.extractedData?.tasks || []
        
        // Add Zeno's response to conversation history
        const zenoMessage: ConversationMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: response.message,
          timestamp: new Date().toISOString()
        }
        setConversationHistory(prev => [...prev, zenoMessage])
        
        // If AI provided tasks, set up pending task creation
        if (aiTasks.length > 0) {
          setPendingTaskCreation({
            messageId: zenoMessage.id,
            tasks: aiTasks
          })
        }
      }
      
      setUserResponse('')
    } catch (error) {
      console.error('Failed to process response:', error)
      
      const errorMessage: ConversationMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
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
      if (result.followUpQuestions && result.followUpQuestions.length > 0) {
        setPendingQuestions(prev => [...prev, ...result.followUpQuestions!])
      }

      // Add response to conversation
      const responseMessage: ConversationMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: result.response,
        timestamp: new Date().toISOString()
      }
      setConversationHistory(prev => [...prev, responseMessage])

      // Handle next actions
      if (result.nextActions && result.nextActions.length > 0) {
        console.log('Next actions:', result.nextActions)
      }
    } catch (error) {
      console.error('Failed to process clarification answer:', error)
    } finally {
      setIsTyping(false)
    }
  }

  const confirmDailyPlan = async (approved: boolean) => {
    if (!dailyPlan || !dailyPlanner) return

    setIsTyping(true)
    try {
      const confirmation: DailyPlanConfirmation = {
        planId: dailyPlan.id,
        approvedBlocks: approved ? dailyPlan.timeBlocks.map(block => block.id) : [],
        rejectedBlocks: approved ? [] : dailyPlan.timeBlocks.map(block => block.id),
        modifications: [],
        userFeedback: approved ? 'Plan approved' : 'Plan rejected'
      }

      const result = await dailyPlanner.processPlanConfirmation(dailyPlan, confirmation)
      
      const responseMessage: ConversationMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `${result.message} Created ${result.createdTasks.length} tasks. You can now view and manage them in the Task Board!`,
        timestamp: new Date().toISOString()
      }
      setConversationHistory(prev => [...prev, responseMessage])

      // Reload tasks to show newly created ones
      await loadTasks()
      
      setShowPlanConfirmation(false)
      setDailyPlan(null)
      setTasksCreated(true)
    } catch (error) {
      console.error('Failed to process plan confirmation:', error)
    } finally {
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

  /**
   * Extract tasks from AI response message
   */

  /**
   * Create tasks from pending task creation
   */
  const createTasksFromPending = async () => {
    if (!pendingTaskCreation || !database) return

    setIsTyping(true)
    try {
      const createdTasks: Task[] = []
      
      for (const taskData of pendingTaskCreation.tasks) {
        try {
          const task = await database.createTask({
            user_id: userProfile.id,
            title: taskData.title,
            description: taskData.description,
            status: 'todo',
            priority: taskData.priority,
            due_date: new Date().toISOString(),
            column_id: 'default',
            position: 0
          })
          createdTasks.push(task)
        } catch (error) {
          console.error('Error creating task:', error)
        }
      }

      // Add success message to conversation
      const successMessage: ConversationMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `✅ Perfect! I've created ${createdTasks.length} tasks for you. You can now manage them in the Task Board!`,
        timestamp: new Date().toISOString()
      }
      setConversationHistory(prev => [...prev, successMessage])

      // Reload tasks to show newly created ones
      await loadTasks()
      
      // Clear pending task creation
      setPendingTaskCreation(null)
      setTasksCreated(true)
      
    } catch (error) {
      console.error('Failed to create tasks:', error)
      
      const errorMessage: ConversationMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: "I'm sorry, I couldn't create the tasks right now. Please try again.",
        timestamp: new Date().toISOString()
      }
      setConversationHistory(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  /**
   * Clean current chat and start fresh
   */
  const cleanChat = () => {
    setConversationHistory([])
    setExtractedGoals([])
    setPendingQuestions([])
    setPendingTaskCreation(null)
    setTasksCreated(false)
    setDailyPlan(null)
    setShowPlanConfirmation(false)
    
    // Add a fresh welcome message
    const welcomeMessage: ConversationMessage = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: `Hello ${userProfile.name}! I'm ready for a fresh conversation. What would you like to work on today?`,
      timestamp: new Date().toISOString()
    }
    setConversationHistory([welcomeMessage])
  }

  /**
   * Create a new chat session
   */
  const createNewChat = () => {
    const newChatId = `chat-${Date.now()}`
    const newSession: ChatSession = {
      id: newChatId,
      title: 'New Chat',
      createdAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
      messageCount: 0
    }
    
    setChatHistory(prev => [newSession, ...prev])
    setCurrentChatId(newChatId)
    cleanChat()
  }

  /**
   * Load a specific chat session
   */
  const loadChatSession = (chatId: string) => {
    setCurrentChatId(chatId)
    // For now, just clean the current chat
    // In a full implementation, you'd load the chat history from storage
    cleanChat()
  }

  /**
   * Update current chat session title
   */
  const updateChatTitle = (title: string) => {
    setChatHistory(prev => 
      prev.map(chat => 
        chat.id === currentChatId 
          ? { ...chat, title, lastMessageAt: new Date().toISOString() }
          : chat
      )
    )
  }

  /**
   * Generate chat title from user message
   */
  const generateChatTitle = (message: string): string => {
    // Extract key words from the message
    const words = message.toLowerCase().split(' ')
    const keyWords = words.filter(word => 
      word.length > 3 && 
      !['want', 'need', 'would', 'like', 'help', 'with', 'about', 'this', 'that'].includes(word)
    )
    
    if (keyWords.length > 0) {
      const title = keyWords.slice(0, 3).join(' ')
      return title.charAt(0).toUpperCase() + title.slice(1)
    }
    
    return 'New Chat'
  }

  /**
   * Delete a chat session
   */
  const deleteChatSession = (chatId: string) => {
    setChatHistory(prev => prev.filter(chat => chat.id !== chatId))
    
    // If we're deleting the current chat, switch to default
    if (chatId === currentChatId) {
      setCurrentChatId('default')
      cleanChat()
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Chat Sidebar */}
      {showChatSidebar && (
        <div className="w-80 bg-white shadow-lg border-r border-gray-200 flex flex-col animate-slide-in">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Chat History</h2>
              <button
                onClick={() => setShowChatSidebar(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
          </div>
          
          {/* Model and Status Info */}
          <div className="p-4 border-b border-gray-200 bg-blue-50">
            <div className="text-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">Model:</span>
                <span className="font-medium text-blue-700">Gemini 2.5 Flash</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="flex items-center text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Online
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <button
              onClick={createNewChat}
              className="w-full mb-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
            >
              ➕ Start New Chat
            </button>
            
            <div className="space-y-2">
              {chatHistory.map((chat) => (
                <div
                  key={chat.id}
                  className={`group p-3 rounded-lg transition-colors ${
                    chat.id === currentChatId
                      ? 'bg-blue-100 border border-blue-300'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div 
                    onClick={() => loadChatSession(chat.id)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900 text-sm truncate">
                        {chat.title}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">
                          {chat.messageCount} msgs
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteChatSession(chat.id)
                          }}
                          className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
                          title="Delete chat"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(chat.lastMessageAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              
              {chatHistory.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-2">💬</div>
                  <p className="text-gray-500 text-sm">
                    No chat history yet.
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Start a conversation to see it here!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`flex-1 flex flex-col ${showChatSidebar ? '' : ''}`}>
        <div className="max-w-4xl mx-auto w-full p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-4">
            {getCheckInIcon()}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{getCheckInTitle()}</h1>
          <p className="text-gray-600">Your daily conversation with Zeno</p>
          
          {/* Chat Management Buttons */}
          <div className="flex justify-center space-x-3 mt-4">
            <button
              onClick={() => setShowChatSidebar(!showChatSidebar)}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
            >
              {showChatSidebar ? '📋 Hide Chat History' : '📋 Show Chat History'}
            </button>
            <button
              onClick={createNewChat}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
            >
              ➕ New Chat
            </button>
            <button
              onClick={cleanChat}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
            >
              🗑️ Clean Chat
            </button>
          </div>
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
                        className={`px-4 py-3 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-blue-500 text-white max-w-md'
                            : 'bg-white text-gray-900 border border-gray-200 w-full max-w-none'
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {message.content}
                        </p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                        
                        {/* Add Tasks Button for Zeno messages with task details */}
                        {message.role === 'assistant' && 
                         pendingTaskCreation && 
                         pendingTaskCreation.messageId === message.id && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <button
                              onClick={createTasksFromPending}
                              disabled={isTyping}
                              className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50"
                            >
                              📋 Add Tasks to Task List ({pendingTaskCreation.tasks.length} tasks)
                            </button>
                          </div>
                        )}
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

            {/* Clarification Questions - SHOW ONLY 1 QUESTION */}
            {pendingQuestions.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 mb-2">❓ Quick Question</h4>
                <div className="text-sm">
                  {(() => {
                    const question = pendingQuestions[0] // Show only the first question
                    return (
                      <div>
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
                    )
                  })()}
                </div>
              </div>
            )}

            {/* Daily Plan Confirmation */}
            {showPlanConfirmation && dailyPlan && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="text-lg font-semibold text-green-800 mb-3">📅 Your Daily Schedule</h4>
                <div className="space-y-3">
                  {dailyPlan.timeBlocks.map((block) => (
                    <div key={block.id} className={`p-3 rounded-lg border ${
                      block.isBreak 
                        ? 'bg-gray-100 border-gray-300' 
                        : 'bg-white border-green-300'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-800">
                              {block.startTime} - {block.endTime}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded ${
                              block.priority === 1 ? 'bg-red-100 text-red-700' :
                              block.priority === 2 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {block.priority === 1 ? 'High' : block.priority === 2 ? 'Medium' : 'Low'} Priority
                            </span>
                          </div>
                          <h5 className="font-semibold text-gray-800 mt-1">{block.title}</h5>
                          <p className="text-sm text-gray-600 mt-1">{block.description}</p>
                          {block.tasks.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-gray-700 mb-1">Tasks:</p>
                              <ul className="text-xs text-gray-600 space-y-1">
                                {block.tasks.map((task) => (
                                  <li key={task.id} className="flex items-center space-x-2">
                                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                                    <span>{task.title}</span>
                                    <span className="text-gray-500">({task.estimatedDuration}min)</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex space-x-3">
                  <button
                    onClick={() => confirmDailyPlan(true)}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                  >
                    ✅ Approve Plan
                  </button>
                  <button
                    onClick={() => confirmDailyPlan(false)}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                  >
                    ❌ Reject Plan
                  </button>
                </div>
                
                {/* Task Board Integration */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700 mb-2">
                    💡 <strong>Pro Tip:</strong> After approving this plan, you can view and manage these tasks in the Zeno Task Board for better organization and tracking.
                  </p>
                  <button
                    onClick={() => {
                      // Navigate to task board or show task board
                      window.location.hash = '#taskboard'
                    }}
                    className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    📋 Open Task Board
                  </button>
                </div>
              </div>
            )}

            {/* Task Board Button - Show after tasks are created */}
            {tasksCreated && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-green-800 mb-1">🎉 Tasks Created Successfully!</h4>
                    <p className="text-xs text-green-700">Your daily tasks are now ready to be managed in the Task Board.</p>
                  </div>
                  <button
                    onClick={() => {
                      // Navigate to task board
                      window.location.hash = '#taskboard'
                      setTasksCreated(false) // Reset the flag
                    }}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium text-sm"
                  >
                    📋 Open Task Board
                  </button>
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
    </div>
  )
}

export default DailyCoaching
