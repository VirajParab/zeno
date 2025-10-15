import { useState, useEffect, useRef } from 'react'
import { useDatabase } from '../services/database/DatabaseContext'
import { AIService } from '../services/ai/aiService'
import { AIModelConfig, AIProvider, AVAILABLE_MODELS } from '../services/ai/types'
import { Task, ChatSession } from '../services/database/types'
import ReactMarkdown from 'react-markdown'

interface ChatInterfaceProps {
  // Remove modelConfig prop since we'll manage it internally
}

const ChatInterface = ({}: ChatInterfaceProps) => {
  const { database } = useDatabase()
  const [messages, setMessages] = useState<any[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [apiKeys, setApiKeys] = useState<any[]>([])
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('openai')
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o-mini')
  const [showModelSelector, setShowModelSelector] = useState(false)
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([])
  const [currentChatId, setCurrentChatId] = useState<string>('default')
  const [showChatSidebar, setShowChatSidebar] = useState(true)
  const [tasks, setTasks] = useState<Task[]>([])
  const [pendingTaskCreation, setPendingTaskCreation] = useState<{
    messageId: string
    tasks: any[]
  } | null>(null)
  const [tasksCreated, setTasksCreated] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    console.log('ChatInterface mounted, loading data...')
    // Load chat sessions from database
    loadChatSessions()
    loadAPIKeys()
    // Don't initialize sample chats - start fresh
    loadTasks()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadAPIKeys = async () => {
    if (!database) return
    
    try {
      const keys = await database.getAPIKeys()
      setApiKeys(keys)
      
      // Auto-select a provider that has an active API key
      const activeProvider = keys.find(key => key.is_active)?.provider
      if (activeProvider) {
        setSelectedProvider(activeProvider)
        
        // Fetch available models for the active provider
        const aiService = new AIService(database, 'demo-user-123')
        
        // Debug: Show all available models
        if (activeProvider === 'gemini') {
          await aiService.debugAvailableModels(activeProvider)
        }
        
        const models = await aiService.listAvailableModels(activeProvider)
        setAvailableModels(models)
        
        // Set default model for the provider (prefer flash over pro for better token handling)
        if (models.length > 0) {
          const flashModel = models.find(m => m.includes('flash'))
          setSelectedModel(flashModel || models[0])
        } else {
          // Fallback to predefined models
          const providerModels = AVAILABLE_MODELS.filter(model => model.provider === activeProvider)
          if (providerModels.length > 0) {
            setSelectedModel(providerModels[0].id)
          }
        }
      }
    } catch (error) {
      console.error('Failed to load API keys:', error)
    }
  }

  const getActiveKeyForProvider = (provider: AIProvider) => {
    return apiKeys.find(key => key.provider === provider && key.is_active)
  }

  const hasActiveKey = (provider: AIProvider) => {
    return !!getActiveKeyForProvider(provider)
  }

  const getAvailableProviders = () => {
    return (['openai', 'gemini'] as AIProvider[]).filter(provider => hasActiveKey(provider))
  }

  const getAvailableModels = () => {
    if (availableModels.length > 0) {
      // Use dynamically fetched models
      return availableModels.map(modelId => ({
        id: modelId,
        name: modelId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        provider: selectedProvider,
        description: `Available ${selectedProvider} model`,
        maxTokens: 1000000,
        capabilities: ['text']
      }))
    } else {
      // Fallback to predefined models
      return AVAILABLE_MODELS.filter(model => model.provider === selectedProvider)
    }
  }

  const handleProviderChange = async (provider: AIProvider) => {
    setSelectedProvider(provider)
    
    // Fetch available models for the new provider
    if (database) {
      try {
        const aiService = new AIService(database, 'demo-user-123')
        const models = await aiService.listAvailableModels(provider)
        setAvailableModels(models)
        
        // Set default model for the provider (prefer flash over pro for better token handling)
        if (models.length > 0) {
          const flashModel = models.find(m => m.includes('flash'))
          setSelectedModel(flashModel || models[0])
        } else {
          // Fallback to predefined models
          const providerModels = AVAILABLE_MODELS.filter(model => model.provider === provider)
          if (providerModels.length > 0) {
            setSelectedModel(providerModels[0].id)
          }
        }
      } catch (error) {
        console.error('Failed to load models for provider:', error)
      }
    }
  }

  const getCurrentModelConfig = (): AIModelConfig => {
    return {
      provider: selectedProvider,
      modelId: selectedModel,
      temperature: 0.7,
      maxTokens: 400
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadChatSessions = async () => {
    if (!database) {
      console.log('No database available yet')
      return
    }
    
    try {
      console.log('Loading chat sessions...')
      const sessions = await database.getChatSessions()
      console.log('Loaded chat sessions:', sessions)
      setChatHistory(sessions)
    } catch (error) {
      console.error('Failed to load chat sessions:', error)
    }
  }


  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !database) return

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    // Update chat title if this is the first user message
    if (messages.length === 0) {
      const title = generateDailyChatTitle()
      // Create a new chat session for the first message
      const newChatId = `chat-${Date.now()}`
      const newSession: Omit<ChatSession, 'id' | 'created_at' | 'updated_at'> = {
        user_id: 'demo-user-123',
        title: title,
        last_message_at: new Date().toISOString(),
        message_count: 1
      }
      
      try {
        const createdSession = await database.createChatSession(newSession)
        setChatHistory(prev => [createdSession, ...prev])
        setCurrentChatId(createdSession.id)
      } catch (error) {
        console.error('Failed to create chat session:', error)
        // Fallback to local state if database fails
        const fallbackSession: ChatSession = {
          id: newChatId,
          user_id: 'demo-user-123',
          title: title,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_message_at: new Date().toISOString(),
          message_count: 1
        }
        setChatHistory(prev => [fallbackSession, ...prev])
        setCurrentChatId(newChatId)
      }
    }

    try {
      const aiService = new AIService(database, 'demo-user-123')
      
      // Use conversational AI service for better task extraction
      const conversationalResponse = await aiService.chatWithAI(
        `Extract tasks from this message and respond with JSON format: "${inputMessage}"`,
        {
          provider: 'gemini',
          modelId: 'gemini-2.5-flash',
          temperature: 0.3,
          maxTokens: 1000
        },
        'You are a JSON-only response generator for task creation.',
        currentChatId // Pass the current chat session ID
      )
      
      // Try to parse JSON response for tasks
      let aiTasks: any[] = []
      try {
        const parsed = JSON.parse(conversationalResponse.content)
        console.log('Parsed AI response:', parsed)
        if (parsed.tasks && Array.isArray(parsed.tasks)) {
          // Transform AI response format to our expected format
          aiTasks = parsed.tasks.map((task: any) => {
            const transformedTask = {
              title: task.title,
              description: task.goal || task.description || task.title,
              estimatedDuration: parseTimeToMinutes(task.overall_estimated_time || task.estimatedDuration),
              priority: getPriorityFromStatus(task.status) || 2,
              category: getCategoryFromTitle(task.title) || 'personal'
            }
            console.log('Transformed task:', transformedTask)
            return transformedTask
          })
        }
      } catch (parseError) {
        console.log('Direct JSON parsing failed, trying regex extraction')
        // Try to extract JSON from wrapped response
        const jsonMatch = conversationalResponse.content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0])
            console.log('Extracted JSON:', parsed)
            if (parsed.tasks && Array.isArray(parsed.tasks)) {
              // Transform AI response format to our expected format
              aiTasks = parsed.tasks.map((task: any) => {
                const transformedTask = {
                  title: task.title,
                  description: task.goal || task.description || task.title,
                  estimatedDuration: parseTimeToMinutes(task.overall_estimated_time || task.estimatedDuration),
                  priority: getPriorityFromStatus(task.status) || 2,
                  category: getCategoryFromTitle(task.title) || 'personal'
                }
                console.log('Transformed task:', transformedTask)
                return transformedTask
              })
            }
          } catch (secondParseError) {
            console.error('JSON parsing failed:', secondParseError)
          }
        }
      }
      
      console.log('Final aiTasks:', aiTasks)
      
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: conversationalResponse.content,
        timestamp: new Date().toISOString(),
        model: conversationalResponse.model,
        tokens: conversationalResponse.tokens,
        cost: conversationalResponse.cost
      }

      setMessages(prev => [...prev, assistantMessage])
      
      // Update chat message count
      try {
        await database.updateChatSession(currentChatId, {
          last_message_at: new Date().toISOString(),
          message_count: (chatHistory.find(chat => chat.id === currentChatId)?.message_count || 0) + 1
        })
        // Reload chat sessions to get updated data
        await loadChatSessions()
      } catch (error) {
        console.error('Failed to update chat session:', error)
        // Fallback to local state update
        setChatHistory(prev => 
          prev.map(chat => 
            chat.id === currentChatId 
              ? { ...chat, last_message_at: new Date().toISOString(), message_count: chat.message_count + 1 }
              : chat
          )
        )
      }
      
      // If AI provided tasks, set up pending task creation
      if (aiTasks.length > 0) {
        setPendingTaskCreation({
          messageId: assistantMessage.id,
          tasks: aiTasks
        })
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please check your API key configuration.',
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
      
      // Update chat message count for error message too
      try {
        await database.updateChatSession(currentChatId, {
          last_message_at: new Date().toISOString(),
          message_count: (chatHistory.find(chat => chat.id === currentChatId)?.message_count || 0) + 1
        })
        // Reload chat sessions to get updated data
        await loadChatSessions()
      } catch (updateError) {
        console.error('Failed to update chat session:', updateError)
        // Fallback to local state update
        setChatHistory(prev => 
          prev.map(chat => 
            chat.id === currentChatId 
              ? { ...chat, last_message_at: new Date().toISOString(), message_count: chat.message_count + 1 }
              : chat
          )
        )
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }


  const generateDailyChatTitle = (): string => {
    const today = new Date()
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' })
    const monthName = today.toLocaleDateString('en-US', { month: 'long' })
    const day = today.getDate()
    
    return `${dayName}, ${monthName} ${day}`
  }


  const createNewChat = async () => {
    const title = generateDailyChatTitle()
    const newSession: Omit<ChatSession, 'id' | 'created_at' | 'updated_at'> = {
      user_id: 'demo-user-123',
      title: title,
      last_message_at: new Date().toISOString(),
      message_count: 0
    }
    
    try {
      const createdSession = await database.createChatSession(newSession)
      setChatHistory(prev => [createdSession, ...prev])
      setCurrentChatId(createdSession.id)
      setMessages([])
    } catch (error) {
      console.error('Failed to create new chat session:', error)
      // Fallback to local state if database fails
      const fallbackSession: ChatSession = {
        id: `chat-${Date.now()}`,
        user_id: 'demo-user-123',
        title: title,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
        message_count: 0
      }
      setChatHistory(prev => [fallbackSession, ...prev])
      setCurrentChatId(fallbackSession.id)
      setMessages([])
    }
  }

  const deleteChatSession = async (chatId: string) => {
    try {
      await database.deleteChatSession(chatId)
      setChatHistory(prev => prev.filter(chat => chat.id !== chatId))
      
      if (chatId === currentChatId) {
        setCurrentChatId('default')
        setMessages([])
      }
    } catch (error) {
      console.error('Failed to delete chat session:', error)
      // Fallback to local state update
      setChatHistory(prev => prev.filter(chat => chat.id !== chatId))
      
      if (chatId === currentChatId) {
        setCurrentChatId('default')
        setMessages([])
      }
    }
  }

  const loadChatSession = async (chatId: string) => {
    setCurrentChatId(chatId)
    
    try {
      // Load messages for this specific chat session
      const chatMessages = await database.getMessagesByChatSession(chatId)
      console.log('Loaded messages for chat session:', chatMessages)
      
      // Transform database messages to the format expected by the UI
      const uiMessages = chatMessages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.inserted_at,
        model: msg.model,
        tokens: msg.tokens,
        cost: msg.cost
      }))
      
      setMessages(uiMessages)
    } catch (error) {
      console.error('Failed to load chat session messages:', error)
      setMessages([])
    }
  }


  // Helper functions to parse AI response format
  const parseTimeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 60 // Default 1 hour
    
    const time = timeStr.toLowerCase()
    if (time.includes('hour')) {
      const hours = parseFloat(time.match(/(\d+(?:\.\d+)?)/)?.[1] || '1')
      return hours * 60
    } else if (time.includes('minute')) {
      return parseInt(time.match(/(\d+)/)?.[1] || '60')
    } else if (time.includes('day') || time.includes('throughout')) {
      return 480 // 8 hours for all-day tasks
    } else if (time.includes('week')) {
      return 2400 // 40 hours for weekly tasks
    }
    
    return 60 // Default 1 hour
  }

  const getPriorityFromStatus = (status: string): number => {
    if (!status) return 2 // Default medium priority
    
    const statusLower = status.toLowerCase()
    if (statusLower.includes('urgent') || statusLower.includes('high')) return 1
    if (statusLower.includes('low') || statusLower.includes('optional')) return 3
    return 2 // Medium priority
  }

  const getCategoryFromTitle = (title: string): string => {
    if (!title) return 'personal'
    
    const titleLower = title.toLowerCase()
    if (titleLower.includes('work') || titleLower.includes('project') || titleLower.includes('meeting')) return 'work'
    if (titleLower.includes('food') || titleLower.includes('exercise') || titleLower.includes('health')) return 'health'
    if (titleLower.includes('learn') || titleLower.includes('study') || titleLower.includes('course')) return 'learning'
    if (titleLower.includes('money') || titleLower.includes('budget') || titleLower.includes('finance')) return 'finance'
    return 'personal'
  }

  const loadTasks = async () => {
    if (!database) return
    try {
      const allTasks = await database.getTasks()
      setTasks(allTasks)
    } catch (error) {
      console.error('Failed to load tasks:', error)
    }
  }

  const createTasksFromPending = async () => {
    if (!pendingTaskCreation || !database) return

    console.log('Creating tasks from pending:', pendingTaskCreation)
    setIsLoading(true)
    try {
      const createdTasks: Task[] = []
      
      for (const taskData of pendingTaskCreation.tasks) {
        console.log('Processing task data:', taskData)
        try {
          const task = await database.createTask({
            user_id: 'demo-user-123',
            title: taskData.title,
            description: taskData.description,
            status: 'todo',
            priority: taskData.priority,
            due_date: new Date().toISOString(),
            column_id: 'default',
            position: 0
          })
          console.log('Created task:', task)
          createdTasks.push(task)
        } catch (error) {
          console.error('Error creating task:', error)
        }
      }

      console.log('Total tasks created:', createdTasks.length)
      const successMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `✅ Perfect! I've created ${createdTasks.length} tasks for you. You can now manage them in the Task Board!`,
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, successMessage])

      await loadTasks()
      
      setPendingTaskCreation(null)
      setTasksCreated(true)
      
    } catch (error) {
      console.error('Failed to create tasks:', error)
      
      const errorMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: "I'm sorry, I couldn't create the tasks right now. Please try again.",
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-screen flex bg-gray-50">
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
                <span className="font-medium text-blue-700">{selectedModel}</span>
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
                          {chat.message_count} msgs
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
                      {new Date(chat.last_message_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              
              {chatHistory.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-2">💬</div>
                  <p className="text-gray-500 text-sm">
                    No previous chats
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Your conversation history will appear here
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center text-white font-semibold mr-3">
              AI
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                AI Assistant
              </h1>
              <p className="text-sm text-gray-500">
                {selectedModel} • {selectedProvider}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowChatSidebar(!showChatSidebar)}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200 text-sm"
            >
              {showChatSidebar ? '📋 Hide History' : '📋 Chat History'}
            </button>
            <button
              onClick={() => setShowModelSelector(!showModelSelector)}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">Model</span>
            </button>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-500">Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Model Selector Dropdown */}
      {showModelSelector && (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="space-y-4">
            {/* Provider Selection */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">AI Platform</h3>
              <div className="flex space-x-3">
                {getAvailableProviders().map(provider => (
                  <button
                    key={provider}
                    onClick={() => handleProviderChange(provider)}
                    className={`px-4 py-2 rounded-lg border-2 transition-all duration-200 ${
                      selectedProvider === provider
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`w-6 h-6 rounded flex items-center justify-center text-white text-sm ${
                        provider === 'openai' ? 'bg-green-600' : 'bg-blue-600'
                      }`}>
                        {provider === 'openai' ? '🧠' : '💎'}
                      </div>
                      <span className="font-medium">
                        {provider === 'openai' ? 'OpenAI' : 'Google Gemini'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Model Selection */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Model</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {getAvailableModels().map(model => (
                  <button
                    key={model.id}
                    onClick={() => setSelectedModel(model.id)}
                    className={`p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                      selectedModel === model.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 text-sm">{model.name}</h4>
                        <p className="text-xs text-gray-600 mt-1">{model.description}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="text-xs text-gray-500">
                            Max: {model.maxTokens.toLocaleString()} tokens
                          </span>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedModel === model.id 
                          ? 'border-blue-500 bg-blue-500' 
                          : 'border-gray-300'
                      }`}>
                        {selectedModel === model.id && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Close Button */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowModelSelector(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
              🤖
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Welcome to Zeno
            </h3>
            <p className="text-gray-500 mb-6">
              How can I help you today?
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              <button
                onClick={() => setInputMessage("I want to start a new chat")}
                className="p-4 bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-sm transition-all duration-200 text-left"
              >
                <div className="font-medium text-gray-900 mb-1">💬 Start New Chat</div>
                <div className="text-sm text-gray-500">Begin a fresh conversation</div>
              </button>
              <button
                onClick={() => setInputMessage("I want to add a new task")}
                className="p-4 bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-sm transition-all duration-200 text-left"
              >
                <div className="font-medium text-gray-900 mb-1">➕ Add New Task</div>
                <div className="text-sm text-gray-500">Create and organize new tasks</div>
              </button>
              <button
                onClick={() => setInputMessage("I want to update some task")}
                className="p-4 bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-sm transition-all duration-200 text-left"
              >
                <div className="font-medium text-gray-900 mb-1">✏️ Update Task</div>
                <div className="text-sm text-gray-500">Modify existing tasks</div>
              </button>
              <button
                onClick={() => setInputMessage("I want to discuss and plan a task")}
                className="p-4 bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-sm transition-all duration-200 text-left"
              >
                <div className="font-medium text-gray-900 mb-1">📋 Discuss & Plan</div>
                <div className="text-sm text-gray-500">Plan and strategize tasks</div>
              </button>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-900 shadow-sm border border-gray-200'
              }`}
            >
              {message.role === 'assistant' ? (
                <div>
                  {(() => {
                    try {
                      return (
                        <ReactMarkdown 
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                            li: ({ children }) => <li className="text-sm">{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                            em: ({ children }) => <em className="italic">{children}</em>,
                            code: ({ children }) => <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                            pre: ({ children }) => <pre className="bg-gray-100 p-2 rounded text-xs font-mono overflow-x-auto">{children}</pre>,
                            blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600">{children}</blockquote>,
                            h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                          }}
                        >
                          {message.content || 'No content'}
                        </ReactMarkdown>
                      )
                    } catch (error) {
                      console.error('Markdown rendering error:', error)
                      return <div className="whitespace-pre-wrap">{message.content}</div>
                    }
                  })()}
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{message.content}</div>
              )}
              
              {/* Add Tasks Button for AI messages with task details */}
              {message.role === 'assistant' && 
               pendingTaskCreation && 
               pendingTaskCreation.messageId === message.id && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <button
                    onClick={createTasksFromPending}
                    disabled={isLoading}
                    className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50"
                  >
                    📋 Add Tasks to Task List ({pendingTaskCreation.tasks.length} tasks)
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-900 shadow-sm border border-gray-200 px-4 py-3 rounded-2xl">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-gray-500">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Task Creation Success Notification */}
      {tasksCreated && (
        <div className="px-6 py-3 bg-green-50 border-t border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-green-800 mb-1">🎉 Tasks Created Successfully!</h4>
              <p className="text-xs text-green-700">Your tasks are now ready to be managed in the Task Board.</p>
            </div>
            <button
              onClick={() => {
                window.location.hash = '#tasks'
                setTasksCreated(false)
              }}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium text-sm"
            >
              📋 Open Task Board
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex items-end space-x-4">
          <div className="flex-1">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              rows={1}
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="btn-primary px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}

export default ChatInterface
