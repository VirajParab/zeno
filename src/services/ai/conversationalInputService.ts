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
      
      // Generate conversational response
      const response = await this.generateConversationalResponse(
        userMessage,
        analysis,
        extractedData,
        followUpQuestions
      )

      // Store extracted data if significant
      if (extractedData.goals.length > 0 || extractedData.tasks.length > 0) {
        await this.storeExtractedData(extractedData)
      }

      return {
        message: response,
        extractedData,
        followUpQuestions,
        suggestedActions: this.generateSuggestedActions(extractedData)
      }
    } catch (error) {
      console.error('Error processing conversational input:', error)
      return {
        message: "I understand you're sharing something important with me. Could you tell me more about what you'd like to work on?",
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
    analysis: ConversationAnalysis
  ): Promise<{
    goals: Partial<GoalIntent>[]
    tasks: ExtractedTask[]
    entities: ExtractedEntity[]
  }> {
    const goals: Partial<GoalIntent>[] = []
    const tasks: ExtractedTask[] = []
    const entities: ExtractedEntity[] = analysis.entities

    // Process extracted goals
    for (const goalData of analysis.extractedGoals) {
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

    // Add questions from analysis
    for (const suggestedQ of analysis.suggestedQuestions) {
      const question: ClarificationQuestion = {
        id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        question: suggestedQ.question,
        context: suggestedQ.context,
        expectedAnswerType: suggestedQ.expectedAnswerType as any,
        options: suggestedQ.options,
        isAnswered: false,
        createdAt: new Date().toISOString()
      }
      questions.push(question)
    }

    // Generate additional contextual questions
    if (extractedData.goals.length > 0) {
      const goalQuestions = await this.generateGoalClarificationQuestions(extractedData.goals)
      questions.push(...goalQuestions)
    }

    return questions.slice(0, 3) // Limit to 3 questions to avoid overwhelming
  }

  /**
   * Generate goal-specific clarification questions
   */
  private async generateGoalClarificationQuestions(goals: Partial<GoalIntent>[]): Promise<ClarificationQuestion[]> {
    const questions: ClarificationQuestion[] = []

    for (const goal of goals) {
      // Generate category-specific questions
      switch (goal.category) {
        case 'health':
          questions.push({
            id: `q-health-${Date.now()}`,
            question: "What specific health activities are you most interested in?",
            context: "clarify_health_preferences",
            expectedAnswerType: 'choice',
            options: ['exercise', 'nutrition', 'mental health', 'sleep', 'medical checkups'],
            isAnswered: false,
            createdAt: new Date().toISOString()
          })
          break

        case 'career':
          questions.push({
            id: `q-career-${Date.now()}`,
            question: "Is this goal related to your current job, a career change, or professional development?",
            context: "clarify_career_context",
            expectedAnswerType: 'choice',
            options: ['current job', 'career change', 'professional development', 'side project'],
            isAnswered: false,
            createdAt: new Date().toISOString()
          })
          break

        case 'finance':
          questions.push({
            id: `q-finance-${Date.now()}`,
            question: "What's your target amount or financial milestone?",
            context: "clarify_financial_target",
            expectedAnswerType: 'text',
            isAnswered: false,
            createdAt: new Date().toISOString()
          })
          break

        case 'learning':
          questions.push({
            id: `q-learning-${Date.now()}`,
            question: "What specific skills or knowledge do you want to gain?",
            context: "clarify_learning_objectives",
            expectedAnswerType: 'text',
            isAnswered: false,
            createdAt: new Date().toISOString()
          })
          break
      }

      // Add timeframe clarification if not specified
      if (!goal.timeframe || goal.timeframe === 'monthly') {
        questions.push({
          id: `q-timeframe-${Date.now()}`,
          question: "When would you like to achieve this goal?",
          context: "clarify_timeline",
          expectedAnswerType: 'choice',
          options: ['this week', 'this month', 'next 3 months', 'this year', 'long-term'],
          isAnswered: false,
          createdAt: new Date().toISOString()
        })
      }
    }

    return questions.slice(0, 2) // Limit to 2 additional questions
  }

  /**
   * Generate conversational response
   */
  private async generateConversationalResponse(
    userMessage: string,
    analysis: ConversationAnalysis,
    extractedData: any,
    followUpQuestions: ClarificationQuestion[]
  ): Promise<string> {
    const prompt = `
You are Zeno, a warm and intelligent AI companion for personal growth and planning.

User Message: "${userMessage}"

Analysis Results:
- Intent: ${analysis.intent.type} (confidence: ${analysis.intent.confidence})
- Goals Extracted: ${extractedData.goals.length}
- Tasks Extracted: ${extractedData.tasks.length}
- Follow-up Questions: ${followUpQuestions.length}

Generate a warm, conversational response that:
1. Acknowledges what the user shared
2. Shows understanding of their goals/intent
3. Naturally incorporates 1-2 follow-up questions
4. Maintains an encouraging, supportive tone
5. Keeps the conversation flowing naturally

Be conversational, not robotic. Ask questions naturally within the flow of conversation.

Example responses:
- "That's exciting! I can see you're really motivated about [goal]. What specific aspect of [goal] are you most excited to work on?"
- "I love that you're thinking about [goal]! When you imagine achieving this, what does success look like to you?"
- "That sounds like a meaningful goal! What's driving you to pursue [goal] right now?"

Keep it under 100 words and make it feel like talking to a supportive friend.
`

    try {
      const response = await this.aiService.chatWithAI(
        prompt,
        {
          provider: 'gemini',
          modelId: 'gemini-2.5-flash',
          temperature: 0.8,
          maxTokens: 200
        },
        'You are Zeno, a warm and intelligent AI companion for personal growth.'
      )

      return response.content
    } catch (error) {
      console.error('Error generating conversational response:', error)
      return "That's really interesting! I'd love to help you work through this. Could you tell me more about what you're hoping to achieve?"
    }
  }

  /**
   * Decompose a goal into subgoals and tasks
   */
  private async decomposeGoal(goal: GoalIntent): Promise<{ subgoals: SubGoal[]; tasks: ExtractedTask[] }> {
    const prompt = `
Break down this goal into actionable subgoals and tasks:

Goal: "${goal.extractedGoal}"
Category: ${goal.category}
Timeframe: ${goal.timeframe}
Priority: ${goal.priority}/5

Create 2-3 subgoals and 3-5 specific tasks that will help achieve this goal.

Respond with JSON:
{
  "subgoals": [
    {
      "title": "Subgoal title",
      "description": "What this subgoal involves",
      "timeframe": "weekly",
      "priority": 4,
      "tasks": ["Task 1", "Task 2"]
    }
  ],
  "tasks": [
    {
      "title": "Specific task",
      "description": "What needs to be done",
      "priority": 3,
      "estimatedDuration": 60,
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
          temperature: 0.7,
          maxTokens: 800
        },
        'You are Zeno, an expert at breaking down goals into actionable steps.'
      )

      const parsed = this.parseGoalDecomposition(response.content)
      
      const subgoals: SubGoal[] = parsed.subgoals.map((sg: any, index: number) => ({
        id: `subgoal-${Date.now()}-${index}`,
        title: sg.title,
        description: sg.description,
        timeframe: sg.timeframe as GoalTimeframe,
        priority: sg.priority,
        parentGoalId: goal.id!,
        tasks: sg.tasks.map((taskTitle: string, taskIndex: number) => ({
          id: `task-${Date.now()}-${index}-${taskIndex}`,
          title: taskTitle,
          description: `Task for ${sg.title}`,
          priority: sg.priority,
          category: 'execution' as TaskCategory,
          dependencies: [],
          parentSubGoalId: `subgoal-${Date.now()}-${index}`
        }))
      }))

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

      return { subgoals, tasks }
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
