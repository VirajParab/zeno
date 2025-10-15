import { useState, useEffect, useRef } from 'react'
import { useDatabase } from '../services/database/DatabaseContext'
import { AIService } from '../services/ai/aiService'
import { ConversationalInputService } from '../services/ai/conversationalInputService'
import { AIProvider, AVAILABLE_MODELS } from '../services/ai/types'
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
  const [currentChatId, setCurrentChatId] = useState<string>(() => {
    // Don't restore from localStorage - always start fresh
    return 'new-chat'
  })
  const [showChatSidebar, setShowChatSidebar] = useState(true)
  const [pendingTaskCreation, setPendingTaskCreation] = useState<{
    messageId: string
    tasks: any[]
  } | null>(null)
  const [tasksCreated, setTasksCreated] = useState(false)
  const [editingChatId, setEditingChatId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    console.log('ChatInterface mounted, loading data...')
    console.log('Database available:', !!database)
    if (database) {
      console.log('Database type:', database.constructor.name)
    }
    // Load chat sessions from database
    loadChatSessions()
    loadAPIKeys()
    // Don't initialize sample chats - start fresh
    loadTasks()
  }, [database])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

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


  const cleanMessageContent = (content: string, role: string): string => {
    // This function is now only needed for existing messages that were stored with prompts
    // New messages will be stored cleanly
    console.log('Cleaning message:', role, content.substring(0, 100) + '...')
    
    if (role === 'assistant') {
      // Try to extract clean response from AI messages that contain JSON
      try {
        // Look for JSON in the content
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          if (parsed.user_message_response) {
            console.log('Found clean response in JSON:', parsed.user_message_response)
            return parsed.user_message_response
          }
        }
        
        // If no JSON found, try to extract the clean response after "user_message_response":
        const responseMatch = content.match(/user_message_response["\s]*:["\s]*"([^"]+)"/)
        if (responseMatch) {
          console.log('Found clean response via regex:', responseMatch[1])
          return responseMatch[1]
        }
        
        // If still no clean response found, return the original content
        console.log('No clean response found, returning original content')
        return content
      } catch (error) {
        console.log('Error cleaning message content:', error)
        return content
      }
    } else if (role === 'user') {
      // Clean user messages that contain system prompts
      try {
        // Check if the message contains system prompt indicators
        if (content.includes('You are Zeno, an AI assistant') || content.includes('User Message:')) {
          console.log('Detected user message with system prompt, extracting original message')
          
          // Try to extract the original user message after "User Message:"
          const userMessageMatch = content.match(/User Message:\s*"([^"]+)"/)
          if (userMessageMatch) {
            console.log('Found original user message:', userMessageMatch[1])
            return userMessageMatch[1]
          }
          
          // If that doesn't work, try to find text that looks like a user message
          // Look for text that doesn't contain system instructions
          const lines = content.split('\n')
          for (const line of lines) {
            const trimmedLine = line.trim()
            if (trimmedLine && 
                !trimmedLine.includes('You are Zeno') && 
                !trimmedLine.includes('Your role is to:') &&
                !trimmedLine.includes('Respond with this EXACT JSON') &&
                !trimmedLine.includes('Guidelines:') &&
                !trimmedLine.includes('estimatedDuration:') &&
                !trimmedLine.includes('priority:') &&
                !trimmedLine.includes('category:') &&
                !trimmedLine.includes('RESPOND WITH ONLY')) {
              console.log('Found clean user message line:', trimmedLine)
              return trimmedLine
            }
          }
        }
        
        // If no system prompt detected, return original content
        return content
      } catch (error) {
        console.log('Error cleaning user message:', error)
        return content
      }
    }
    
    // For other roles or if cleaning fails, return original content
    return content
  }

  const debugAllMessages = async () => {
    if (!database) return
    
    try {
      console.log('=== DEBUGGING ALL MESSAGES ===')
      const allMessages = await database.getMessages()
      console.log(`Total messages in database: ${allMessages.length}`)
      
      allMessages.forEach((msg, index) => {
        console.log(`Message ${index + 1}:`, {
          id: msg.id,
          role: msg.role,
          content: msg.content.substring(0, 50) + '...',
          chat_session_id: msg.chat_session_id,
          inserted_at: msg.inserted_at
        })
      })
      
      // Group by chat_session_id
      const messagesBySession = allMessages.reduce((acc, msg) => {
        const sessionId = msg.chat_session_id || 'no-session'
        if (!acc[sessionId]) acc[sessionId] = []
        acc[sessionId].push(msg)
        return acc
      }, {} as Record<string, any[]>)
      
      console.log('Messages grouped by chat_session_id:', messagesBySession)
      
      // Show unique chat_session_ids
      const uniqueSessionIds = [...new Set(allMessages.map(msg => msg.chat_session_id || 'no-session'))]
      console.log('Unique chat_session_ids in database:', uniqueSessionIds)
      
      console.log('=== END DEBUG ===')
    } catch (error) {
      console.error('Error debugging messages:', error)
    }
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
      
      // Fix message counts for all sessions by counting actual messages
      const updatedSessions = []
      for (const session of sessions) {
        try {
          console.log(`=== CHECKING SESSION ===`)
          console.log(`Session: ${session.title} (ID: ${session.id})`)
          console.log(`Session ID type: ${typeof session.id}`)
          console.log(`Current message_count: ${session.message_count}`)
          
          const actualMessages = await database.getMessagesByChatSession(session.id)
          console.log(`Found ${actualMessages.length} messages for session ${session.id}`)
          console.log(`Messages:`, actualMessages.map(m => ({ id: m.id, chat_session_id: m.chat_session_id, content: m.content.substring(0, 50) + '...' })))
          
          if (actualMessages.length !== session.message_count) {
            console.log(`Fixing message count for ${session.title}: ${session.message_count} -> ${actualMessages.length}`)
            await database.updateChatSession(session.id, {
              message_count: actualMessages.length
            })
            updatedSessions.push({ ...session, message_count: actualMessages.length })
          } else {
            console.log(`Message count correct for ${session.title}: ${session.message_count}`)
            updatedSessions.push(session)
          }
        } catch (error) {
          console.error(`Error fixing message count for session ${session.id}:`, error)
          updatedSessions.push(session)
        }
      }
      
      setChatHistory(updatedSessions)
      
      // Don't auto-load any session - let user choose
      console.log('Chat sessions loaded, waiting for user to select a chat')
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

    // Create a new chat session if this is the first message or if we're starting a new chat
    let actualChatId = currentChatId
    if (currentChatId === 'new-chat') {
      const title = generateChatTitle()
      // Create a new chat session for the first message
      const newChatId = `chat-${Date.now()}`
      const newSession: Omit<ChatSession, 'id' | 'created_at' | 'updated_at'> = {
        user_id: 'demo-user-123',
        title: title,
        last_message_at: new Date().toISOString(),
        message_count: 0
      }
      
      try {
        console.log(`=== CREATING CHAT SESSION ===`)
        console.log(`newSession:`, newSession)
        const createdSession = await database.createChatSession(newSession)
        console.log('Created chat session:', createdSession)
        console.log('Created session ID type:', typeof createdSession.id)
        console.log('Created session ID value:', createdSession.id)
        setChatHistory(prev => [createdSession, ...prev])
        setCurrentChatId(createdSession.id)
        actualChatId = createdSession.id // Use the real chat session ID
        console.log('Set currentChatId to:', createdSession.id)
        console.log('Set actualChatId to:', actualChatId)
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
          message_count: 0
        }
        setChatHistory(prev => [fallbackSession, ...prev])
        setCurrentChatId(newChatId)
        actualChatId = newChatId // Use the fallback ID
        console.log('Fallback: Set currentChatId to:', newChatId)
      }
    }

    // Store user message in database
    try {
      console.log(`Storing user message with chat_session_id: ${actualChatId}`)
      await database.createMessage({
        user_id: 'demo-user-123',
        role: 'user',
        content: inputMessage,
        chat_session_id: actualChatId.toString(), // Use the actual chat session ID
        model: selectedModel,
        provider: selectedProvider,
        tokens: 0,
        cost: 0
      })
      console.log(`Successfully stored user message with chat_session_id: ${actualChatId}`)
    } catch (error) {
      console.error('Failed to store user message:', error)
    }

    try {
      // Use conversational AI service for better task extraction
      const aiService = new AIService(database, 'demo-user-123')
      const conversationalService = new ConversationalInputService(aiService, database, 'demo-user-123')
      // Pass conversation history for context
      const conversationHistory = messages.slice(-5).map(msg => ({
        role: msg.role,
        content: msg.content
      }))
      
      const conversationalResponse = await conversationalService.generateStructuredResponse(inputMessage, conversationHistory)
      
      // Extract data from conversational response
      const aiTasks = conversationalResponse.tasks || []
      const canCreateTask = conversationalResponse.canCreateTask || false
      const structuredTaskDetails = conversationalResponse.structuredTaskDetails || null
      const multipleTasks = conversationalResponse.multipleTasks || []
      const goalDecomposition = conversationalResponse.goalDecomposition || null
      const displayMessage = conversationalResponse.message
      
      console.log('Conversational response:', conversationalResponse)
      console.log('Display message:', displayMessage)
      console.log('Can create task:', canCreateTask)
      
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: displayMessage, // Show only the user_message_response
        timestamp: new Date().toISOString(),
        model: 'gemini-2.5-flash',
        tokens: 0,
        cost: 0,
        canCreateTask: canCreateTask,
        structuredTaskDetails: structuredTaskDetails,
        multipleTasks: multipleTasks,
        tasks: aiTasks,
        goalDecomposition: goalDecomposition
      }

      setMessages(prev => [...prev, assistantMessage])
      
      // Store assistant message in database
      try {
        console.log(`=== STORING ASSISTANT MESSAGE ===`)
        console.log(`actualChatId: ${actualChatId}`)
        console.log(`actualChatId type: ${typeof actualChatId}`)
        console.log(`content: ${displayMessage.substring(0, 100)}...`)
        
        await database.createMessage({
          user_id: 'demo-user-123',
          role: 'assistant',
          content: displayMessage,
          chat_session_id: actualChatId.toString(), // Use the actual chat session ID
          model: 'gemini-2.5-flash',
          provider: selectedProvider,
          tokens: 0,
          cost: 0
        })
        console.log(`Successfully stored assistant message with chat_session_id: ${actualChatId}`)
      } catch (error) {
        console.error('Failed to store assistant message:', error)
      }
      
      // Update chat message count by counting actual messages
      try {
        console.log(`=== DEBUGGING CHAT UPDATE ===`)
        console.log(`actualChatId: ${actualChatId}`)
        console.log(`typeof actualChatId: ${typeof actualChatId}`)
        console.log(`Updating message count for chat session: ${actualChatId}`)
        
        // Skip update if we're still in 'new-chat' mode
        if (actualChatId === 'new-chat') {
          console.log(`Skipping update for placeholder chat session: ${actualChatId}`)
          return
        }
        
        // First check if the chat session exists
        const existingSession = await database.getChatSession(actualChatId)
        console.log(`existingSession:`, existingSession)
        console.log(`existingSession ID:`, existingSession?.id)
        console.log(`existingSession ID type:`, typeof existingSession?.id)
        if (!existingSession) {
          console.error(`Chat session ${actualChatId} not found, skipping update`)
          return
        }
        
        const actualMessages = await database.getMessagesByChatSession(actualChatId)
        console.log(`Found ${actualMessages.length} messages for session ${actualChatId}`)
        console.log(`Message details:`, actualMessages.map(m => ({ 
          id: m.id, 
          chat_session_id: m.chat_session_id, 
          chat_session_id_type: typeof m.chat_session_id,
          content: m.content.substring(0, 50) + '...' 
        })))
        
        await database.updateChatSession(actualChatId, {
          last_message_at: new Date().toISOString(),
          message_count: actualMessages.length
        })
        console.log(`Updated message count to ${actualMessages.length}`)
        // Reload chat sessions to get updated data
        await loadChatSessions()
      } catch (error) {
        console.error('Failed to update chat session:', error)
        // Fallback to local state update
        setChatHistory(prev => 
          prev.map(chat => 
            chat.id === actualChatId 
              ? { ...chat, last_message_at: new Date().toISOString(), message_count: chat.message_count + 2 }
              : chat
          )
        )
      }
      
      // If AI provided tasks and can create task, set up pending task creation
      console.log('Checking task creation conditions:', { aiTasksLength: aiTasks.length, canCreateTask, aiTasks, structuredTaskDetails })
      if (aiTasks.length > 0 && canCreateTask) {
        console.log('Setting pending task creation with messageId:', assistantMessage.id)
        setPendingTaskCreation({
          messageId: assistantMessage.id,
          tasks: aiTasks
        })
      } else {
        console.log('Not setting pending task creation:', { aiTasksLength: aiTasks.length, canCreateTask })
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
      
      // Store error message in database
      try {
        await database.createMessage({
          user_id: 'demo-user-123',
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please check your API key configuration.',
          chat_session_id: currentChatId.toString(), // Use the actual chat session ID
          model: selectedModel,
          provider: selectedProvider,
          tokens: 0,
          cost: 0
        })
      } catch (error) {
        console.error('Failed to store error message:', error)
      }
      
      // Update chat message count for error message too
      try {
        // Skip update if we're still in 'new-chat' mode
        if (actualChatId === 'new-chat') {
          console.log(`Skipping error message count update for placeholder chat session: ${actualChatId}`)
          return
        }
        
        // First check if the chat session exists
        const existingSession = await database.getChatSession(actualChatId)
        if (!existingSession) {
          console.error(`Chat session ${actualChatId} not found, skipping error message count update`)
          return
        }
        
        const actualMessages = await database.getMessagesByChatSession(actualChatId)
        await database.updateChatSession(actualChatId, {
          last_message_at: new Date().toISOString(),
          message_count: actualMessages.length
        })
        // Reload chat sessions to get updated data
        await loadChatSessions()
      } catch (updateError) {
        console.error('Failed to update chat session:', updateError)
        // Fallback to local state update
        setChatHistory(prev => 
          prev.map(chat => 
            chat.id === actualChatId 
              ? { ...chat, last_message_at: new Date().toISOString(), message_count: chat.message_count + 2 }
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


  const generateChatTitle = (): string => {
    const now = new Date()
    const timeStr = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
    const dateStr = now.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
    
    return `Chat ${dateStr} ${timeStr}`
  }


  const createNewChat = async () => {
    const title = generateChatTitle()
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
        setCurrentChatId('new-chat')
        setMessages([])
      }
    } catch (error) {
      console.error('Failed to delete chat session:', error)
      // Fallback to local state update
      setChatHistory(prev => prev.filter(chat => chat.id !== chatId))
      
      if (chatId === currentChatId) {
        setCurrentChatId('new-chat')
        setMessages([])
      }
    }
  }

  const startEditingChat = (chatId: string, currentTitle: string) => {
    setEditingChatId(chatId)
    setEditingTitle(currentTitle)
  }

  const cancelEditingChat = () => {
    setEditingChatId(null)
    setEditingTitle('')
  }

  const saveChatTitle = async (chatId: string) => {
    if (!editingTitle.trim()) {
      cancelEditingChat()
      return
    }

    try {
      await database.updateChatSession(chatId, { title: editingTitle.trim() })
      setChatHistory(prev => 
        prev.map(chat => 
          chat.id === chatId 
            ? { ...chat, title: editingTitle.trim() }
            : chat
        )
      )
      cancelEditingChat()
    } catch (error) {
      console.error('Failed to update chat title:', error)
      cancelEditingChat()
    }
  }

  const loadChatSession = async (chatId: string) => {
    console.log('Loading chat session:', chatId)
    setCurrentChatId(chatId)
    
    try {
      // Load messages for this specific chat session only
      const chatMessages = await database.getMessagesByChatSession(chatId)
      console.log('Loaded messages for chat session:', chatId, chatMessages.length)
      
      // Transform database messages to the format expected by the UI
      const uiMessages = chatMessages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: cleanMessageContent(msg.content, msg.role), // Clean the content
        timestamp: msg.inserted_at,
        model: msg.model,
        tokens: msg.tokens,
        cost: msg.cost
      }))
      
      setMessages(uiMessages)
      console.log('Set messages:', uiMessages.length)
      console.log('Messages content:', uiMessages)
    } catch (error) {
      console.error('Failed to load chat session messages:', error)
      setMessages([])
    }
  }


  // Helper functions to parse AI response format


  const loadTasks = async () => {
    if (!database) return
    try {
      const allTasks = await database.getTasks()
      // Tasks are loaded but not stored in state since they're not used in this component
      console.log('Loaded tasks:', allTasks.length)
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
      
      // Get the first available column (Focus Tasks) or create a default one
      let defaultColumnId = 'default'
      try {
        const columns = await database.getColumns()
        if (columns.length > 0) {
          defaultColumnId = columns[0].id // Use the first column (Focus Tasks)
        } else {
          // Create a default column if none exist
          const defaultColumn = await database.createColumn({
            user_id: 'demo-user-123',
            title: 'Focus Tasks',
            color: 'bg-blue-100',
            position: 0
          })
          defaultColumnId = defaultColumn.id
        }
      } catch (error) {
        console.error('Error getting columns:', error)
      }
      
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
            column_id: defaultColumnId,
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

      // Store success message in database
      try {
        await database.createMessage({
          user_id: 'demo-user-123',
          role: 'assistant',
          content: `✅ Perfect! I've created ${createdTasks.length} tasks for you. You can now manage them in the Task Board!`,
          chat_session_id: currentChatId.toString(),
          model: 'gemini-2.5-flash',
          provider: selectedProvider,
          tokens: 0,
          cost: 0
        })
        
        // Update chat message count
        // Skip update if we're still in 'new-chat' mode
        if (currentChatId === 'new-chat') {
          console.log(`Skipping success message count update for placeholder chat session: ${currentChatId}`)
          return
        }
        
        // First check if the chat session exists
        const existingSession = await database.getChatSession(currentChatId)
        if (!existingSession) {
          console.error(`Chat session ${currentChatId} not found, skipping success message count update`)
          return
        }
        
        const actualMessages = await database.getMessagesByChatSession(currentChatId)
        await database.updateChatSession(currentChatId, {
          last_message_at: new Date().toISOString(),
          message_count: actualMessages.length
        })
        await loadChatSessions()
      } catch (error) {
        console.error('Failed to store success message:', error)
      }

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

      // Store error message in database
      try {
        await database.createMessage({
          user_id: 'demo-user-123',
          role: 'assistant',
          content: "I'm sorry, I couldn't create the tasks right now. Please try again.",
          chat_session_id: currentChatId.toString(),
          model: 'gemini-2.5-flash',
          provider: selectedProvider,
          tokens: 0,
          cost: 0
        })
        
        // Update chat message count
        // Skip update if we're still in 'new-chat' mode
        if (currentChatId === 'new-chat') {
          console.log(`Skipping task creation error message count update for placeholder chat session: ${currentChatId}`)
          return
        }
        
        // First check if the chat session exists
        const existingSession = await database.getChatSession(currentChatId)
        if (!existingSession) {
          console.error(`Chat session ${currentChatId} not found, skipping task creation error message count update`)
          return
        }
        
        const actualMessages = await database.getMessagesByChatSession(currentChatId)
        await database.updateChatSession(currentChatId, {
          last_message_at: new Date().toISOString(),
          message_count: actualMessages.length
        })
        await loadChatSessions()
      } catch (error) {
        console.error('Failed to store task creation error message:', error)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const createSingleTask = async (taskData: any, messageId: string) => {
    if (!database) return

    console.log('Creating single task:', taskData)
    setIsLoading(true)
    try {
      // Get the first available column (Focus Tasks) or create a default one
      let defaultColumnId = 'default'
      try {
        const columns = await database.getColumns()
        if (columns.length > 0) {
          defaultColumnId = columns[0].id // Use the first column (Focus Tasks)
        } else {
          // Create a default column if none exist
          const defaultColumn = await database.createColumn({
            user_id: 'demo-user-123',
            title: 'Focus Tasks',
            color: 'bg-blue-100',
            position: 0
          })
          defaultColumnId = defaultColumn.id
        }
      } catch (error) {
        console.error('Error getting columns:', error)
      }
      
      const task = await database.createTask({
        user_id: 'demo-user-123',
        title: taskData.title,
        description: taskData.description,
        status: 'todo',
        priority: taskData.priority,
        due_date: new Date().toISOString(),
        column_id: defaultColumnId,
        position: 0
      })
      console.log('Created single task:', task)

      const successMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `✅ Great! I've created "${taskData.title}" for you. You can manage it in the Task Board!`,
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, successMessage])

      // Store success message in database
      try {
        await database.createMessage({
          user_id: 'demo-user-123',
          role: 'assistant',
          content: successMessage.content,
          chat_session_id: currentChatId.toString(),
          model: 'gemini-2.5-flash',
          provider: selectedProvider,
          tokens: 0,
          cost: 0
        })
        
        // Update chat message count
        if (currentChatId !== 'new-chat') {
          const existingSession = await database.getChatSession(currentChatId)
          if (existingSession) {
            const actualMessages = await database.getMessagesByChatSession(currentChatId)
            await database.updateChatSession(currentChatId, {
              last_message_at: new Date().toISOString(),
              message_count: actualMessages.length
            })
            await loadChatSessions()
          }
        }
      } catch (error) {
        console.error('Failed to store success message:', error)
      }

      await loadTasks()
      
      // Update pending task creation to remove the created task
      if (pendingTaskCreation && pendingTaskCreation.messageId === messageId) {
        const remainingTasks = pendingTaskCreation.tasks.filter(t => t.title !== taskData.title)
        if (remainingTasks.length === 0) {
          setPendingTaskCreation(null)
        } else {
          setPendingTaskCreation({
            ...pendingTaskCreation,
            tasks: remainingTasks
          })
        }
      }
      
    } catch (error) {
      console.error('Failed to create single task:', error)
      
      const errorMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `I'm sorry, I couldn't create "${taskData.title}" right now. Please try again.`,
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])

      // Store error message in database
      try {
        await database.createMessage({
          user_id: 'demo-user-123',
          role: 'assistant',
          content: errorMessage.content,
          chat_session_id: currentChatId.toString(),
          model: 'gemini-2.5-flash',
          provider: selectedProvider,
          tokens: 0,
          cost: 0
        })
        
        // Update chat message count
        if (currentChatId !== 'new-chat') {
          const existingSession = await database.getChatSession(currentChatId)
          if (existingSession) {
            const actualMessages = await database.getMessagesByChatSession(currentChatId)
            await database.updateChatSession(currentChatId, {
              last_message_at: new Date().toISOString(),
              message_count: actualMessages.length
            })
            await loadChatSessions()
          }
        }
      } catch (error) {
        console.error('Failed to store task creation error message:', error)
      }
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
                  {editingChatId === chat.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            saveChatTitle(chat.id)
                          } else if (e.key === 'Escape') {
                            cancelEditingChat()
                          }
                        }}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={() => saveChatTitle(chat.id)}
                          className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEditingChat}
                          className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => {
                        console.log('Clicked on chat session:', chat.id, chat.title)
                        loadChatSession(chat.id)
                      }}
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
                              startEditingChat(chat.id, chat.title)
                            }}
                            className="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-700 transition-opacity"
                            title="Rename chat"
                          >
                            ✏️
                          </button>
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
                  )}
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
              <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold text-gray-900">
                  {chatHistory.find(chat => chat.id === currentChatId)?.title || 'AI Assistant'}
                </h1>
                <button 
                  onClick={debugAllMessages}
                  className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                  title="Debug messages"
                >
                  🐛
                </button>
              </div>
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
              
              {/* Goal Decomposition Indicator */}
              {message.goalDecomposition && message.goalDecomposition.decomposed && (
                <div className="mt-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      🎯
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-purple-800 mb-1">
                        Goal Decomposed: "{message.goalDecomposition.original_goal}"
                      </h4>
                      <p className="text-xs text-purple-700">
                        {message.goalDecomposition.explanation}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Add Tasks Button for AI messages with task details */}
              {(() => {
                const shouldShowButton = message.role === 'assistant' && 
                 pendingTaskCreation && 
                 pendingTaskCreation.messageId === message.id
                console.log('Button rendering check:', { 
                  messageRole: message.role, 
                  messageId: message.id, 
                  pendingTaskCreation: !!pendingTaskCreation,
                  pendingMessageId: pendingTaskCreation?.messageId,
                  shouldShowButton 
                })
                return shouldShowButton && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={createTasksFromPending}
                        disabled={isLoading}
                        className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50"
                      >
                        📋 Add All Tasks ({pendingTaskCreation.tasks.length} tasks)
                        {message.goalDecomposition?.decomposed && (
                          <span className="ml-1 text-xs opacity-90">🎯</span>
                        )}
                      </button>
                      
                      {/* Individual task buttons for multiple tasks */}
                      {pendingTaskCreation.tasks.length > 1 && (
                        <div className="flex flex-wrap gap-1">
                          {pendingTaskCreation.tasks.map((task, index) => (
                            <button
                              key={index}
                              onClick={() => createSingleTask(task, message.id)}
                              disabled={isLoading}
                              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
                            >
                              + {task.title}
                              {message.goalDecomposition?.decomposed && (
                                <span className="ml-1 text-xs opacity-90">🎯</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}
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
