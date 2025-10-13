import { AIService } from './aiService'
import { DatabaseInterface } from '../database/types'
import { ConversationalInputService } from './conversationalInputService'
import { ContextualQuestionEngine } from './contextualQuestionEngine'
import {
  ConversationalResponse,
  GoalIntent,
  ConversationContext,
  ClarificationQuestion,
  ExtractedTask,
  ExtractedEntity
} from './conversationalTypes'

export class ZenoConversationalAI {
  private conversationalInput: ConversationalInputService
  private questionEngine: ContextualQuestionEngine
  private database: DatabaseInterface
  private userId: string

  constructor(aiService: AIService, database: DatabaseInterface, userId: string) {
    this.conversationalInput = new ConversationalInputService(aiService, database, userId)
    this.questionEngine = new ContextualQuestionEngine(aiService, database, userId)
    this.database = database
    this.userId = userId
  }

  /**
   * Main entry point for conversational AI processing
   * Combines both conversational input and contextual questioning
   */
  async processConversation(
    userMessage: string,
    conversationHistory: ConversationContext[] = [],
    currentGoals: GoalIntent[] = []
  ): Promise<ConversationalResponse> {
    try {
      // Step 1: Process conversational input to extract goals and tasks
      const inputResponse = await this.conversationalInput.processConversationalInput(
        userMessage,
        conversationHistory
      )

      // Step 2: Generate contextual questions for clarification
      const contextualQuestions = await this.questionEngine.generateContextualQuestions(
        userMessage,
        conversationHistory,
        currentGoals
      )

      // Step 3: Combine responses and questions
      const combinedResponse: ConversationalResponse = {
        message: inputResponse.message,
        extractedData: inputResponse.extractedData,
        followUpQuestions: [
          ...inputResponse.followUpQuestions,
          ...contextualQuestions
        ].slice(0, 3), // Limit to 3 total questions
        suggestedActions: inputResponse.suggestedActions
      }

      // Step 4: Store conversation context
      await this.storeConversationContext(userMessage, combinedResponse, conversationHistory)

      return combinedResponse
    } catch (error) {
      console.error('Error processing conversation:', error)
      return this.createFallbackResponse(userMessage)
    }
  }

  /**
   * Process user's answer to a clarification question
   */
  async processClarificationAnswer(
    questionId: string,
    answer: string,
    conversationHistory: ConversationContext[]
  ): Promise<{
    response: string
    updatedGoal?: Partial<GoalIntent>
    followUpQuestions?: ClarificationQuestion[]
    nextActions?: string[]
  }> {
    try {
      const result = await this.questionEngine.processClarificationAnswer(
        questionId,
        answer,
        conversationHistory
      )

      // Generate next actions based on the clarification
      const nextActions = await this.generateNextActions(result.updatedGoal, answer)

      return {
        response: result.response,
        updatedGoal: result.updatedGoal,
        followUpQuestions: result.followUpQuestions,
        nextActions
      }
    } catch (error) {
      console.error('Error processing clarification answer:', error)
      return {
        response: "Thanks for clarifying that! It helps me understand your goals better.",
        nextActions: []
      }
    }
  }

  /**
   * Generate intelligent follow-up based on conversation context
   */
  async generateIntelligentFollowUp(
    conversationHistory: ConversationContext[],
    currentGoals: GoalIntent[]
  ): Promise<{
    message: string
    suggestedQuestions: ClarificationQuestion[]
    insights: string[]
  }> {
    try {
      const prompt = `
You are Zeno, analyzing a conversation to provide intelligent follow-up.

Recent Conversation:
${conversationHistory.slice(-10).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Current Goals:
${currentGoals.map(goal => `- ${goal.extractedGoal} (${goal.category}, ${goal.timeframe})`).join('\n')}

Based on this conversation, provide:
1. A thoughtful follow-up message that shows you're listening
2. 2-3 intelligent questions that would help the user move forward
3. Key insights about their goals or patterns you've noticed

Respond with JSON:
{
  "message": "Thoughtful follow-up message",
  "suggestedQuestions": [
    {
      "question": "Intelligent follow-up question",
      "context": "why this question is helpful",
      "expectedAnswerType": "choice|text|number|date",
      "options": ["option1", "option2"]
    }
  ],
  "insights": [
    "Insight about their goals or patterns"
  ]
}
`

      const response = await this.conversationalInput['aiService'].chatWithAI(
        prompt,
        {
          provider: 'gemini',
          modelId: 'gemini-2.5-flash',
          temperature: 0.7,
          maxTokens: 600
        },
        'You are Zeno, providing intelligent follow-up and insights.'
      )

      const parsed = this.parseFollowUpResponse(response.content)
      
      const suggestedQuestions: ClarificationQuestion[] = parsed.suggestedQuestions.map((q: any, index: number) => ({
        id: `q-followup-${Date.now()}-${index}`,
        question: q.question,
        context: q.context,
        expectedAnswerType: q.expectedAnswerType,
        options: q.options,
        isAnswered: false,
        createdAt: new Date().toISOString()
      }))

      return {
        message: parsed.message,
        suggestedQuestions,
        insights: parsed.insights || []
      }
    } catch (error) {
      console.error('Error generating intelligent follow-up:', error)
      return {
        message: "I've been thinking about our conversation. What would you like to focus on next?",
        suggestedQuestions: [],
        insights: []
      }
    }
  }

  /**
   * Extract and summarize conversation insights
   */
  async extractConversationInsights(
    conversationHistory: ConversationContext[],
    goals: GoalIntent[]
  ): Promise<{
    patterns: string[]
    recommendations: string[]
    nextSteps: string[]
  }> {
    try {
      const prompt = `
Analyze this conversation and goal data to extract insights:

Conversation History:
${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Goals:
${goals.map(goal => `- ${goal.extractedGoal} (${goal.category}, ${goal.timeframe}, priority: ${goal.priority})`).join('\n')}

Extract:
1. Patterns in their goals and communication style
2. Recommendations for better goal achievement
3. Suggested next steps

Respond with JSON:
{
  "patterns": [
    "Pattern observed in their goals or communication"
  ],
  "recommendations": [
    "Specific recommendation for improvement"
  ],
  "nextSteps": [
    "Actionable next step they could take"
  ]
}
`

      const response = await this.conversationalInput['aiService'].chatWithAI(
        prompt,
        {
          provider: 'gemini',
          modelId: 'gemini-2.5-flash',
          temperature: 0.6,
          maxTokens: 800
        },
        'You are Zeno, analyzing conversations for insights and recommendations.'
      )

      return this.parseInsightsResponse(response.content)
    } catch (error) {
      console.error('Error extracting conversation insights:', error)
      return {
        patterns: [],
        recommendations: [],
        nextSteps: []
      }
    }
  }

  /**
   * Generate next actions based on clarification
   */
  private async generateNextActions(
    updatedGoal?: Partial<GoalIntent>,
    answer?: string
  ): Promise<string[]> {
    const actions: string[] = []

    if (updatedGoal) {
      actions.push('Update goal with new information')
    }

    if (answer) {
      // Generate specific actions based on the answer
      if (answer.toLowerCase().includes('this week')) {
        actions.push('Create weekly action plan')
        actions.push('Set up daily reminders')
      } else if (answer.toLowerCase().includes('career')) {
        actions.push('Research career development resources')
        actions.push('Set up professional networking goals')
      } else if (answer.toLowerCase().includes('health')) {
        actions.push('Create health tracking system')
        actions.push('Set up fitness reminders')
      }
    }

    return actions
  }

  /**
   * Store conversation context for future reference
   */
  private async storeConversationContext(
    userMessage: string,
    response: ConversationalResponse,
    conversationHistory: ConversationContext[]
  ): Promise<void> {
    try {
      // Store user message
      const userContext: ConversationContext = {
        messageId: `msg-${Date.now()}`,
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString(),
        extractedEntities: response.extractedData?.entities
      }

      // Store assistant response
      const assistantContext: ConversationContext = {
        messageId: `msg-${Date.now()}-1`,
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString()
      }

      // This would integrate with your database to store conversation context
      console.log('Storing conversation context:', { userContext, assistantContext })
    } catch (error) {
      console.error('Error storing conversation context:', error)
    }
  }

  /**
   * Create fallback response when processing fails
   */
  private createFallbackResponse(userMessage: string): ConversationalResponse {
    return {
      message: "I'm here to help you brainstorm and plan your goals. Could you tell me more about what you'd like to work on?",
      extractedData: {
        goals: [],
        tasks: [],
        entities: []
      },
      followUpQuestions: [
        {
          id: `q-fallback-${Date.now()}`,
          question: "What's the most important goal you'd like to focus on right now?",
          context: "primary_goal_identification",
          expectedAnswerType: 'text',
          isAnswered: false,
          createdAt: new Date().toISOString()
        }
      ],
      suggestedActions: []
    }
  }

  // Helper methods for parsing AI responses
  private parseFollowUpResponse(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (error) {
      console.error('Error parsing follow-up response:', error)
    }

    return {
      message: "I've been thinking about our conversation. What would you like to focus on next?",
      suggestedQuestions: [],
      insights: []
    }
  }

  private parseInsightsResponse(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (error) {
      console.error('Error parsing insights response:', error)
    }

    return {
      patterns: [],
      recommendations: [],
      nextSteps: []
    }
  }
}
