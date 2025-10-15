import { AIService } from './aiService'
import { DatabaseInterface } from '../database/types'
import {
  ClarificationQuestion,
  GoalIntent,
  ConversationContext
} from './conversationalTypes'

export class ContextualQuestionEngine {
  // private aiService: AIService

  constructor(_aiService: AIService, _database: DatabaseInterface, _userId: string) {
    // this.aiService = aiService
  }

  /**
   * Ticket 1.2: Contextual Question Engine - OPTIMIZED FOR SPEED
   * Generate intelligent follow-up questions to refine vague goals
   */
  async generateContextualQuestions(
    userMessage: string,
    _conversationHistory: ConversationContext[],
    _currentGoals: GoalIntent[] = []
  ): Promise<ClarificationQuestion[]> {
    try {
      // Skip complex analysis - just ask one quick question
      const quickQuestion = this.generateQuickQuestion(userMessage)
      return quickQuestion ? [quickQuestion] : []
    } catch (error) {
      console.error('Error generating contextual questions:', error)
      return []
    }
  }

  /**
   * Generate a quick, focused question to move conversation forward
   */
  private generateQuickQuestion(userMessage: string): ClarificationQuestion | null {
    // Simple keyword-based question generation
    const lowerMessage = userMessage.toLowerCase()
    
    if (lowerMessage.includes('goal') || lowerMessage.includes('want to')) {
      return {
        id: `quick-${Date.now()}`,
        question: "What's the first step you'd like to take?",
        context: 'goal_clarification',
        expectedAnswerType: 'choice',
        options: ['Start planning', 'Break it down', 'Set timeline'],
        isAnswered: false,
        createdAt: new Date().toISOString()
      }
    }
    
    if (lowerMessage.includes('task') || lowerMessage.includes('todo')) {
      return {
        id: `quick-${Date.now()}`,
        question: "When would you like to complete this?",
        context: 'timeline_clarification',
        expectedAnswerType: 'choice',
        options: ['Today', 'This week', 'This month'],
        isAnswered: false,
        createdAt: new Date().toISOString()
      }
    }
    
    return null
  }

  async processClarificationAnswer(
    _questionId: string,
    answer: string,
    _conversationHistory: ConversationContext[]
  ): Promise<{
    updatedGoal?: Partial<GoalIntent>
    followUpQuestions?: ClarificationQuestion[]
    response: string
  }> {
    return {
      response: `Got it! ${answer} sounds great. Let's move forward with that.`,
      followUpQuestions: []
    }
  }
}