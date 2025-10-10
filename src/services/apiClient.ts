import { createDatabaseService } from './database/databaseService'
import { DatabaseConfig } from './database/types'
import { AIService } from './ai/aiService'
import { AIModelConfig } from './ai/types'

// Default model configuration
const DEFAULT_MODEL_CONFIG: AIModelConfig = {
  provider: 'openai',
  modelId: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 400,
  systemPrompt: 'You are a helpful personal assistant. Keep responses concise and actionable. Help users manage their tasks and plan their day.'
}

export async function chatWithAssistant(
  userId: string, 
  text: string, 
  modelConfig?: AIModelConfig
): Promise<string> {
  try {
    // Create a temporary database service for this operation
    const config: DatabaseConfig = { mode: 'sync', userId }
    const database = createDatabaseService(config)
    await database.initialize()

    // Use provided model config or default
    const finalModelConfig = modelConfig || DEFAULT_MODEL_CONFIG

    // Create AI service and get response
    const aiService = new AIService(database, userId)
    const response = await aiService.chatWithAI(text, finalModelConfig)

    await database.close()
    return response.content
  } catch (error) {
    console.error('Error in chatWithAssistant:', error)
    return 'Sorry, there was an error processing your request. Please check your API key configuration.'
  }
}

export async function getTodaySummary(userId: string): Promise<{
  tasksToday: number
  tasksCompleted: number
  unreadMail: number
}> {
  try {
    // Create a temporary database service for this operation
    const config: DatabaseConfig = { mode: 'sync', userId }
    const database = createDatabaseService(config)
    await database.initialize()

    const today = new Date().toISOString().split('T')[0]
    
    const tasks = await database.getTasks()
    const todayTasks = tasks.filter(task => 
      task.created_at.startsWith(today)
    )

    const tasksToday = todayTasks.length
    const tasksCompleted = todayTasks.filter(t => t.status === 'done').length
    
    // Mock unread mail count - replace with actual mail API later
    const unreadMail = Math.floor(Math.random() * 5)

    await database.close()
    return {
      tasksToday,
      tasksCompleted,
      unreadMail
    }
  } catch (error) {
    console.error('Error getting today summary:', error)
    return {
      tasksToday: 0,
      tasksCompleted: 0,
      unreadMail: 0
    }
  }
}
