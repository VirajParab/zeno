import { AIService } from './aiService'
import { DatabaseInterface } from '../database/types'
import {
  GoalIntent,
  SubGoal,
  ExtractedTask,
  GoalContext,
  ConversationContext,
  ExtractedEntity,
  ClarificationQuestion,
  GoalCategory,
  GoalTimeframe,
  TaskCategory,
  ConversationAnalysis,
  ConversationIntent,
  ConversationalResponse,
  SuggestedAction
} from './conversationalTypes'

export class ConversationalInputService {
  private aiService: AIService
  private database: DatabaseInterface
  private userId: string

  constructor(aiService: AIService, database: DatabaseInterface, userId: string) {
    this.aiService = aiService
    this.database = database
    this.userId = userId
  }

  /**
   * Ticket 1.1: Conversational Input System
   * Parse natural language input and extract goals, tasks, and intents
   */
  async processConversationalInput(
    userMessage: string,
    conversationHistory: ConversationContext[] = []
  ): Promise<ConversationalResponse> {
    try {
      // Analyze the user's message for intents and entities
      const analysis = await this.analyzeConversation(userMessage, conversationHistory)
      
      // Extract structured data from the conversation
      const extractedData = await this.extractStructuredData(userMessage, analysis)
      
      // Generate intelligent follow-up questions
      const followUpQuestions = await this.generateFollowUpQuestions(analysis, extractedData)
      
      // Generate conversational response with task extraction
      const response = await this.generateConversationalResponse(
        userMessage,
        analysis,
        extractedData,
        followUpQuestions
      )

      // Combine AI-generated tasks with extracted tasks
      const allTasks = [...extractedData.tasks, ...(response.tasks || [])]
      extractedData.tasks = allTasks

      // Store extracted data if significant
      if (extractedData.goals.length > 0 || allTasks.length > 0) {
        await this.storeExtractedData(extractedData)
      }

      return {
        message: response.message,
        user_messages: [userMessage], // Include user message in response
        extractedData,
        followUpQuestions,
        suggestedActions: this.generateSuggestedActions(extractedData)
      }
    } catch (error) {
      console.error('Error processing conversational input:', error)
      return {
        message: "I understand you're sharing something important with me. Could you tell me more about what you'd like to work on?",
        user_messages: [userMessage], // Include user message in error response too
        extractedData: { goals: [], tasks: [], entities: [] },
        followUpQuestions: [],
        suggestedActions: []
      }
    }
  }

  /**
   * Analyze conversation for intents, entities, and context
   */
  private async analyzeConversation(
    userMessage: string,
    conversationHistory: ConversationContext[]
  ): Promise<ConversationAnalysis> {
    const prompt = `
You are Zeno, an AI that helps users brainstorm and plan their goals through natural conversation.

Analyze this user message for planning-related intents and extract structured information:

User Message: "${userMessage}"

Recent Conversation Context:
${conversationHistory.slice(-5).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Extract and analyze:
1. Primary intent (goal_setting, task_management, planning, reflection, clarification, general)
2. Goals mentioned (what they want to achieve)
3. Timeframes mentioned (when they want to achieve it)
4. Categories (career, health, finance, learning, relationships, personal, creative, travel, home, other)
5. Tasks or actions mentioned
6. Priority level (1-5, where 5 is highest)
7. Resources or constraints mentioned

Respond with JSON:
{
  "intent": {
    "type": "goal_setting|task_management|planning|reflection|clarification|general",
    "confidence": 0.95,
    "details": "User wants to set a new fitness goal"
  },
  "entities": [
    {
      "type": "goal|timeline|category|priority|resource",
      "value": "get fit",
      "confidence": 0.9,
      "position": {"start": 10, "end": 17}
    }
  ],
  "confidence": 0.9,
  "suggestedQuestions": [
    {
      "question": "What specific fitness activities interest you most?",
      "context": "clarify_fitness_preferences",
      "expectedAnswerType": "choice",
      "options": ["cardio", "strength training", "yoga", "sports", "other"]
    }
  ],
  "extractedGoals": [
    {
      "extractedGoal": "Get fit and healthy",
      "category": "health",
      "timeframe": "monthly",
      "priority": 4
    }
  ]
}
`

    try {
      const response = await this.aiService.chatWithAI(
        prompt,
        {
          provider: 'gemini',
          modelId: 'gemini-2.5-flash',
          temperature: 0.3,
          maxTokens: 1000
        },
        'You are Zeno, an expert at analyzing user conversations for goal and task extraction.'
      )

      return this.parseAnalysisResponse(response.content)
    } catch (error) {
      console.error('Error analyzing conversation:', error)
      return this.createFallbackAnalysis(userMessage)
    }
  }

  /**
   * Extract structured data (goals, tasks) from conversation analysis
   */
  private async extractStructuredData(
    userMessage: string,
    _analysis: ConversationAnalysis
  ): Promise<{
    goals: Partial<GoalIntent>[]
    tasks: ExtractedTask[]
    entities: ExtractedEntity[]
  }> {
    const goals: Partial<GoalIntent>[] = []
    const tasks: ExtractedTask[] = []
    const entities: ExtractedEntity[] = _analysis.entities

    // Process extracted goals
    for (const goalData of _analysis.extractedGoals) {
      const goal: Partial<GoalIntent> = {
        id: `goal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId: this.userId,
        originalText: userMessage,
        extractedGoal: goalData.extractedGoal || '',
        category: goalData.category || 'other',
        timeframe: goalData.timeframe || 'monthly',
        priority: goalData.priority || 3,
        subgoals: [],
        tasks: [],
        context: {
          userProfile: {
            focusAreas: [],
            motivationStyle: 'gentle',
            planningStyle: 'flexible'
          },
          conversationHistory: [],
          clarificationQuestions: []
        },
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Generate subgoals and tasks for the goal
      const { subgoals, tasks: goalTasks } = await this.decomposeGoal(goal as GoalIntent)
      goal.subgoals = subgoals
      goal.tasks = goalTasks

      goals.push(goal)
    }

    // Extract standalone tasks
    const taskEntities = entities.filter(e => e.type === 'task' || e.value.toLowerCase().includes('task'))
    for (const entity of taskEntities) {
      const task: ExtractedTask = {
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: entity.value,
        description: `Task extracted from: "${userMessage}"`,
        priority: 3,
        category: 'execution',
        dependencies: []
      }
      tasks.push(task)
    }

    return { goals, tasks, entities }
  }

  /**
   * Generate intelligent follow-up questions based on analysis
   */
  private async generateFollowUpQuestions(
    analysis: ConversationAnalysis,
    extractedData: any
  ): Promise<ClarificationQuestion[]> {
    const questions: ClarificationQuestion[] = []

    // Only ask 1 essential question to move quickly to task creation
    if (extractedData.goals.length > 0) {
      const essentialQuestion = await this.generateEssentialQuestion(extractedData.goals[0])
      if (essentialQuestion) {
        questions.push(essentialQuestion)
      }
    }

    return questions.slice(0, 1) // Limit to 1 question only
  }

  /**
   * Generate one essential question to move quickly to task creation
   */
  private async generateEssentialQuestion(goal: Partial<GoalIntent>): Promise<ClarificationQuestion | null> {
    // Generate one quick question based on goal category to get to tasks faster
    switch (goal.category) {
      case 'health':
        return {
          id: `q-essential-${Date.now()}`,
          question: "What's your main focus - exercise, nutrition, or both?",
          context: "quick_clarification",
          expectedAnswerType: 'choice',
          options: ['exercise', 'nutrition', 'both'],
          isAnswered: false,
          createdAt: new Date().toISOString()
        }
      
      case 'career':
        return {
          id: `q-essential-${Date.now()}`,
          question: "Is this for your current job or a new opportunity?",
          context: "quick_clarification",
          expectedAnswerType: 'choice',
          options: ['current job', 'new opportunity', 'side project'],
          isAnswered: false,
          createdAt: new Date().toISOString()
        }
      
      case 'finance':
        return {
          id: `q-essential-${Date.now()}`,
          question: "What's your target amount?",
          context: "quick_clarification",
          expectedAnswerType: 'text',
          isAnswered: false,
          createdAt: new Date().toISOString()
        }
      
      case 'learning':
        return {
          id: `q-essential-${Date.now()}`,
          question: "What specific skill do you want to learn?",
          context: "quick_clarification",
          expectedAnswerType: 'text',
          isAnswered: false,
          createdAt: new Date().toISOString()
        }
      
      default:
        return {
          id: `q-essential-${Date.now()}`,
          question: "When do you want to achieve this?",
          context: "quick_clarification",
          expectedAnswerType: 'choice',
          options: ['this week', 'this month', 'next 3 months', 'this year'],
          isAnswered: false,
          createdAt: new Date().toISOString()
        }
    }
  }

  /**
   * Generate conversational response with task extraction check
   */
  private async generateConversationalResponse(
    userMessage: string,
    _analysis: ConversationAnalysis,
    _extractedData: any,
    _followUpQuestions: ClarificationQuestion[]
  ): Promise<{ message: string; user_messages?: string[]; tasks?: any[] }> {
    
    // First try to generate structured response
    const structuredResponse = await this.generateStructuredResponse(userMessage)
    
    // If we got tasks, return them
    if (structuredResponse.tasks && structuredResponse.tasks.length > 0) {
      return structuredResponse
    }
    
    // Otherwise, ask for clarification
    return {
      message: "I need more details. What specific tasks do you want to work on today?",
      user_messages: [userMessage] // Include user message
    }
  }

  /**
   * Generate structured JSON response for task creation
   */
  async generateStructuredResponse(userMessage: string, conversationHistory: any[] = []): Promise<{ message: string; user_messages?: string[]; tasks?: any[]; canCreateTask?: boolean; structuredTaskDetails?: any; multipleTasks?: any[]; goalDecomposition?: any }> {
    const prompt = `You are Zeno, an AI assistant that helps users brainstorm and clarify their tasks through conversation.

Your goal is to understand the user's intent completely before creating any tasks. You can help create MULTIPLE tasks in one conversation.

User Message: "${userMessage}"

${conversationHistory.length > 0 ? `
Recent Conversation Context:
${conversationHistory.slice(-3).map((msg, i) => `${i + 1}. ${msg.role}: ${msg.content}`).join('\n')}
` : ''}

Your role is to:
1. Ask clarifying questions if the task details are unclear
2. Brainstorm ideas and suggestions to improve the task
3. Help break down complex goals into actionable steps
4. Identify if the user wants to create MULTIPLE tasks
5. Detect LARGER GOALS and automatically decompose them into smaller tasks
6. Only confirm task creation when you have ALL necessary details

GOAL DECOMPOSITION: If the user mentions a large goal (like "launch a website", "learn Spanish", "get fit", "start a business"), automatically break it down into 3-5 smaller, actionable tasks that can be completed in 1-4 hours each.

CRITICAL: Respond with ONLY the JSON object below. Do not include any other text, explanations, or conversation context.

{
  "did_we_get_all_Details_to_craete_task": "yes/no",
  "user_message_response": "Your conversational response here - either brainstorming questions, clarifications, or confirmation that you'll create the task(s)",
  "goal_decomposition": {
    "original_goal": "The larger goal mentioned by the user",
    "decomposed": true/false,
    "explanation": "Brief explanation of how the goal was broken down"
  },
  "structured_task_details": {
    "title": "Task title (if clear)",
    "description": "Detailed description (if available)",
    "estimatedDuration": 120,
    "priority": 1,
    "category": "work",
    "timeframe": "when to complete",
    "specific_steps": ["step 1", "step 2"],
    "resources_needed": ["resource 1", "resource 2"],
    "success_criteria": "how to know it's done"
  },
  "multiple_tasks": [
    {
      "title": "First task title",
      "description": "First task description",
      "estimatedDuration": 60,
      "priority": 1,
      "category": "work",
      "timeframe": "today",
      "specific_steps": ["step 1", "step 2"],
      "resources_needed": ["resource 1"],
      "success_criteria": "completion criteria"
    },
    {
      "title": "Second task title",
      "description": "Second task description", 
      "estimatedDuration": 90,
      "priority": 2,
      "category": "personal",
      "timeframe": "this week",
      "specific_steps": ["step 1", "step 2"],
      "resources_needed": ["resource 2"],
      "success_criteria": "completion criteria"
    }
  ]
}

Guidelines:
- If task details are vague or incomplete, set "did_we_get_all_Details_to_craete_task" to "no" and ask specific questions
- If you have all details needed, set it to "yes" and confirm you'll create the task(s)
- If the user mentions multiple tasks/goals, populate "multiple_tasks" array with all tasks
- If only one task, leave "multiple_tasks" empty and use "structured_task_details"
- GOAL DECOMPOSITION: If user mentions a large goal, set "goal_decomposition.decomposed" to true and break it into 3-5 smaller tasks
- Always populate task details with whatever information you have, even if incomplete
- Keep responses conversational and helpful
- Ask about: timeframe, priority, specific steps, resources needed, success criteria
- Brainstorm improvements or alternatives when appropriate
- Use minimum words but be clear and actionable
- estimatedDuration: time in minutes (60 = 1 hour, 120 = 2 hours)
- priority: 1=High, 2=Medium, 3=Low
- category: "work", "health", "learning", "finance", "personal"

RESPOND WITH ONLY THE JSON OBJECT. NO OTHER TEXT.`

    try {
      // Call AI service WITHOUT storing messages - we'll handle storage separately
      const response = await this.aiService.chatWithAIWithoutStorage(
        prompt,
        {
          provider: 'gemini',
          modelId: 'gemini-2.5-flash',
          temperature: 0.3, // Lower temperature for more consistent JSON
          maxTokens: 1000   // Increased token limit for proper JSON responses
        },
        'You are a JSON-only response generator for task creation.'
      )

      console.log('AI Response:', response.content)
      console.log('AI Response type:', typeof response.content)
      
      // Try to parse JSON response
      try {
        // First, try to clean the response by removing any text before/after JSON
        let cleanedResponse = response.content.trim()
        
        // Remove any text before the first {
        const firstBrace = cleanedResponse.indexOf('{')
        if (firstBrace > 0) {
          cleanedResponse = cleanedResponse.substring(firstBrace)
        }
        
        // Remove any text after the last }
        const lastBrace = cleanedResponse.lastIndexOf('}')
        if (lastBrace > 0 && lastBrace < cleanedResponse.length - 1) {
          cleanedResponse = cleanedResponse.substring(0, lastBrace + 1)
        }
        
        console.log('Cleaned response:', cleanedResponse)
        
        const parsed = JSON.parse(cleanedResponse)
        console.log('Parsed JSON:', parsed)
        
        if (parsed.did_we_get_all_Details_to_craete_task && parsed.user_message_response) {
          console.log('Found valid AI response:', parsed)
          
          // Handle multiple tasks
          let tasks = []
          if (parsed.did_we_get_all_Details_to_craete_task === 'yes') {
            if (parsed.multiple_tasks && parsed.multiple_tasks.length > 0) {
              tasks = parsed.multiple_tasks
            } else if (parsed.structured_task_details) {
              tasks = [parsed.structured_task_details]
            }
          }
          
          const result = {
            message: parsed.user_message_response,
            user_messages: [userMessage], // Include user message
            tasks: tasks,
            canCreateTask: parsed.did_we_get_all_Details_to_craete_task === 'yes',
            structuredTaskDetails: parsed.structured_task_details,
            multipleTasks: parsed.multiple_tasks || [],
            goalDecomposition: parsed.goal_decomposition || null
          }
          console.log('Returning result:', result)
          return result
        }
      } catch (parseError) {
        console.error('JSON parsing failed:', parseError)
        console.log('Raw response:', response.content)
        
        // Try to extract JSON from the response if it's wrapped in text
        const jsonMatch = response.content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0])
            if (parsed.did_we_get_all_Details_to_craete_task && parsed.user_message_response) {
              // Handle multiple tasks
              let tasks = []
              if (parsed.did_we_get_all_Details_to_craete_task === 'yes') {
                if (parsed.multiple_tasks && parsed.multiple_tasks.length > 0) {
                  tasks = parsed.multiple_tasks
                } else if (parsed.structured_task_details) {
                  tasks = [parsed.structured_task_details]
                }
              }
              
              return {
                message: parsed.user_message_response,
                user_messages: [userMessage], // Include user message
                tasks: tasks,
                canCreateTask: parsed.did_we_get_all_Details_to_craete_task === 'yes',
                structuredTaskDetails: parsed.structured_task_details,
                multipleTasks: parsed.multiple_tasks || [],
                goalDecomposition: parsed.goal_decomposition || null
              }
            }
          } catch (secondParseError) {
            console.error('Second JSON parsing failed:', secondParseError)
          }
        }
      }

      // If no valid JSON found, return empty
      return { 
        message: "I couldn't understand your message clearly. Could you please provide more details about what you'd like to work on?",
        user_messages: [userMessage], // Include user message
        tasks: [],
        canCreateTask: false,
        structuredTaskDetails: null,
        multipleTasks: [],
        goalDecomposition: null
      }
      
    } catch (error) {
      console.error('Error generating structured response:', error)
      return { 
        message: "I'm having trouble processing that right now. Could you try rephrasing your response?",
        user_messages: [userMessage], // Include user message
        tasks: [],
        canCreateTask: false,
        structuredTaskDetails: null,
        multipleTasks: [],
        goalDecomposition: null
      }
    }
  }

  /**
   * Decompose a goal into subgoals and tasks - FAST AND DIRECT
   */
  private async decomposeGoal(goal: GoalIntent): Promise<{ subgoals: SubGoal[]; tasks: ExtractedTask[] }> {
    const prompt = `
Create 2-3 quick tasks for this goal:

Goal: "${goal.extractedGoal}"
Category: ${goal.category}

Generate 2-3 specific, actionable tasks (max 5 words each).

Respond with JSON:
{
  "tasks": [
    {
      "title": "Short task name",
      "description": "Brief description",
      "priority": 3,
      "estimatedDuration": 30,
      "category": "execution"
    }
  ]
}
`

    try {
      const response = await this.aiService.chatWithAI(
        prompt,
        {
          provider: 'gemini',
          modelId: 'gemini-2.5-flash',
          temperature: 0.6,
          maxTokens: 300
        },
        'You are Zeno, creating quick actionable tasks.'
      )

      const parsed = this.parseGoalDecomposition(response.content)
      
      const tasks: ExtractedTask[] = parsed.tasks.map((task: any, index: number) => ({
        id: `task-${Date.now()}-${index}`,
        title: task.title,
        description: task.description,
        priority: task.priority,
        estimatedDuration: task.estimatedDuration,
        category: task.category as TaskCategory,
        dependencies: [],
        parentGoalId: goal.id
      }))

      return { subgoals: [], tasks } // Skip subgoals for speed
    } catch (error) {
      console.error('Error decomposing goal:', error)
      return { subgoals: [], tasks: [] }
    }
  }

  /**
   * Store extracted data in database
   */
  private async storeExtractedData(extractedData: any): Promise<void> {
    try {
      // Store goals
      for (const goal of extractedData.goals) {
        // This would integrate with your existing goal storage system
        console.log('Storing goal:', goal)
      }

      // Store tasks
      for (const task of extractedData.tasks) {
        // This would integrate with your existing task storage system
        console.log('Storing task:', task)
      }
    } catch (error) {
      console.error('Error storing extracted data:', error)
    }
  }

  /**
   * Generate suggested actions based on extracted data
   */
  private generateSuggestedActions(extractedData: any): SuggestedAction[] {
    const actions: SuggestedAction[] = []

    if (extractedData.goals.length > 0) {
      actions.push({
        type: 'create_goal',
        description: 'Create a new goal from your conversation',
        data: extractedData.goals[0],
        priority: 5
      })
    }

    if (extractedData.tasks.length > 0) {
      actions.push({
        type: 'create_task',
        description: 'Add tasks to your task list',
        data: extractedData.tasks,
        priority: 4
      })
    }

    return actions
  }

  // Helper methods for parsing AI responses
  private parseAnalysisResponse(response: string): ConversationAnalysis {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (error) {
      console.error('Error parsing analysis response:', error)
    }

    return this.createFallbackAnalysis('')
  }

  private parseGoalDecomposition(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (error) {
      console.error('Error parsing goal decomposition:', error)
    }

    return { subgoals: [], tasks: [] }
  }

  private createFallbackAnalysis(userMessage: string): ConversationAnalysis {
    return {
      intent: {
        type: 'general',
        confidence: 0.5,
        details: 'General conversation'
      },
      entities: [],
      confidence: 0.5,
      suggestedQuestions: [],
      extractedGoals: []
    }
  }
}
