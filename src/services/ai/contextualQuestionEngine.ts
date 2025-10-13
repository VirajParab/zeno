import { AIService } from './aiService'
import { DatabaseInterface } from '../database/types'
import {
  ClarificationQuestion,
  GoalIntent,
  ConversationContext,
  GoalCategory,
  GoalTimeframe
} from './conversationalTypes'

export class ContextualQuestionEngine {
  private aiService: AIService
  private database: DatabaseInterface
  private userId: string

  constructor(aiService: AIService, database: DatabaseInterface, userId: string) {
    this.aiService = aiService
    this.database = database
    this.userId = userId
  }

  /**
   * Ticket 1.2: Contextual Question Engine
   * Generate intelligent follow-up questions to refine vague goals
   */
  async generateContextualQuestions(
    userMessage: string,
    conversationHistory: ConversationContext[],
    currentGoals: GoalIntent[] = []
  ): Promise<ClarificationQuestion[]> {
    try {
      // Analyze the conversation for areas that need clarification
      const analysis = await this.analyzeForClarificationNeeds(userMessage, conversationHistory, currentGoals)
      
      // Generate contextual questions based on analysis
      const questions = await this.generateIntelligentQuestions(analysis)
      
      // Filter and prioritize questions
      const prioritizedQuestions = this.prioritizeQuestions(questions, analysis)
      
      return prioritizedQuestions.slice(0, 3) // Return top 3 questions
    } catch (error) {
      console.error('Error generating contextual questions:', error)
      return this.getFallbackQuestions(userMessage)
    }
  }

  /**
   * Analyze conversation for areas needing clarification
   */
  private async analyzeForClarificationNeeds(
    userMessage: string,
    conversationHistory: ConversationContext[],
    currentGoals: GoalIntent[]
  ): Promise<ClarificationAnalysis> {
    const prompt = `
You are Zeno, analyzing a user's message to identify areas that need clarification for better goal planning.

User Message: "${userMessage}"

Recent Conversation:
${conversationHistory.slice(-5).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Current Goals:
${currentGoals.map(goal => `- ${goal.extractedGoal} (${goal.category}, ${goal.timeframe})`).join('\n')}

Analyze what needs clarification:
1. Vague goals that need specificity
2. Missing timeline information
3. Unclear priorities or categories
4. Missing context about resources/constraints
5. Ambiguous success criteria
6. Unclear motivation or purpose

Respond with JSON:
{
  "needsClarification": [
    {
      "area": "goal_specificity|timeline|priority|category|resources|success_criteria|motivation",
      "reason": "Why this needs clarification",
      "confidence": 0.9,
      "suggestedQuestion": "What specific question would help clarify this?"
    }
  ],
  "context": {
    "goalCategory": "career|health|finance|learning|relationships|personal|creative|travel|home|other",
    "urgency": "low|medium|high",
    "complexity": "simple|moderate|complex",
    "userExperience": "beginner|intermediate|advanced"
  },
  "priority": "high|medium|low"
}
`

    try {
      const response = await this.aiService.chatWithAI(
        prompt,
        {
          provider: 'gemini',
          modelId: 'gemini-2.5-flash',
          temperature: 0.3,
          maxTokens: 800
        },
        'You are Zeno, an expert at identifying what needs clarification in user conversations.'
      )

      return this.parseClarificationAnalysis(response.content)
    } catch (error) {
      console.error('Error analyzing clarification needs:', error)
      return this.createFallbackAnalysis()
    }
  }

  /**
   * Generate intelligent questions based on analysis
   */
  private async generateIntelligentQuestions(analysis: ClarificationAnalysis): Promise<ClarificationQuestion[]> {
    const questions: ClarificationQuestion[] = []

    for (const need of analysis.needsClarification) {
      const question = await this.generateQuestionForArea(need, analysis.context)
      if (question) {
        questions.push(question)
      }
    }

    return questions
  }

  /**
   * Generate specific question for a clarification area
   */
  private async generateQuestionForArea(
    need: ClarificationNeed,
    context: ClarificationContext
  ): Promise<ClarificationQuestion | null> {
    const prompt = `
Generate a natural, conversational question to clarify this area:

Area: ${need.area}
Reason: ${need.reason}
Context: ${JSON.stringify(context)}

Create a question that:
1. Feels natural and conversational (not like a form)
2. Is specific to the user's situation
3. Helps gather the missing information
4. Shows genuine interest and understanding
5. Is easy to answer

Examples of good questions:
- "Nice! Is that through your main job, side hustle, or investing?" (for earning money)
- "What does success look like for you with this goal?" (for success criteria)
- "When you think about achieving this, what's the most exciting part?" (for motivation)
- "What's your ideal timeline for this?" (for timeline)

Respond with JSON:
{
  "question": "Natural conversational question",
  "expectedAnswerType": "choice|text|number|date",
  "options": ["option1", "option2"] (if choice type),
  "context": "brief context for the question"
}
`

    try {
      const response = await this.aiService.chatWithAI(
        prompt,
        {
          provider: 'gemini',
          modelId: 'gemini-2.5-flash',
          temperature: 0.7,
          maxTokens: 300
        },
        'You are Zeno, creating natural, conversational questions to help users clarify their goals.'
      )

      const parsed = this.parseQuestionResponse(response.content)
      if (parsed) {
        return {
          id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          question: parsed.question,
          context: parsed.context,
          expectedAnswerType: parsed.expectedAnswerType,
          options: parsed.options,
          isAnswered: false,
          createdAt: new Date().toISOString()
        }
      }
    } catch (error) {
      console.error('Error generating question for area:', error)
    }

    return null
  }

  /**
   * Prioritize questions based on importance and context
   */
  private prioritizeQuestions(
    questions: ClarificationQuestion[],
    analysis: ClarificationAnalysis
  ): ClarificationQuestion[] {
    return questions.sort((a, b) => {
      // Higher priority for high-priority analysis
      if (analysis.priority === 'high') return -1
      if (analysis.priority === 'low') return 1
      
      // Prioritize questions that help with goal specificity
      const aIsSpecificity = a.context.includes('specificity') || a.context.includes('clarify')
      const bIsSpecificity = b.context.includes('specificity') || b.context.includes('clarify')
      
      if (aIsSpecificity && !bIsSpecificity) return -1
      if (!aIsSpecificity && bIsSpecificity) return 1
      
      return 0
    })
  }

  /**
   * Process user's answer to a clarification question
   */
  async processClarificationAnswer(
    questionId: string,
    answer: string,
    conversationHistory: ConversationContext[]
  ): Promise<{
    updatedGoal?: Partial<GoalIntent>
    followUpQuestions?: ClarificationQuestion[]
    response: string
  }> {
    try {
      // Find the question
      const question = await this.findQuestionById(questionId)
      if (!question) {
        throw new Error('Question not found')
      }

      // Update the question with the answer
      question.isAnswered = true
      question.answer = answer

      // Generate follow-up based on the answer
      const followUp = await this.generateFollowUpFromAnswer(question, answer, conversationHistory)
      
      // Generate a conversational response acknowledging the answer
      const response = await this.generateAnswerAcknowledgment(question, answer)

      return {
        updatedGoal: followUp.updatedGoal,
        followUpQuestions: followUp.questions,
        response
      }
    } catch (error) {
      console.error('Error processing clarification answer:', error)
      return {
        response: "Thanks for sharing that! It helps me understand your goals better."
      }
    }
  }

  /**
   * Generate follow-up questions based on user's answer
   */
  private async generateFollowUpFromAnswer(
    question: ClarificationQuestion,
    answer: string,
    conversationHistory: ConversationContext[]
  ): Promise<{
    updatedGoal?: Partial<GoalIntent>
    questions: ClarificationQuestion[]
  }> {
    const prompt = `
The user answered a clarification question. Generate appropriate follow-up.

Question: "${question.question}"
Answer: "${answer}"
Context: "${question.context}"

Based on this answer, what additional information would be helpful?
Generate 1-2 follow-up questions that:
1. Build on the user's answer
2. Help create a more complete picture
3. Feel natural in the conversation flow
4. Move toward actionable planning

Respond with JSON:
{
  "followUpQuestions": [
    {
      "question": "Natural follow-up question",
      "context": "context for this question",
      "expectedAnswerType": "choice|text|number|date",
      "options": ["option1", "option2"]
    }
  ],
  "goalUpdate": {
    "field": "category|timeframe|priority|description",
    "value": "updated value based on answer"
  }
}
`

    try {
      const response = await this.aiService.chatWithAI(
        prompt,
        {
          provider: 'gemini',
          modelId: 'gemini-2.5-flash',
          temperature: 0.7,
          maxTokens: 400
        },
        'You are Zeno, generating natural follow-up questions based on user answers.'
      )

      const parsed = this.parseFollowUpResponse(response.content)
      
      const questions: ClarificationQuestion[] = parsed.followUpQuestions.map((q: any, index: number) => ({
        id: `q-followup-${Date.now()}-${index}`,
        question: q.question,
        context: q.context,
        expectedAnswerType: q.expectedAnswerType,
        options: q.options,
        isAnswered: false,
        createdAt: new Date().toISOString()
      }))

      const updatedGoal: Partial<GoalIntent> = parsed.goalUpdate ? {
        [parsed.goalUpdate.field]: parsed.goalUpdate.value,
        updatedAt: new Date().toISOString()
      } : undefined

      return { updatedGoal, questions }
    } catch (error) {
      console.error('Error generating follow-up:', error)
      return { questions: [] }
    }
  }

  /**
   * Generate acknowledgment response for user's answer
   */
  private async generateAnswerAcknowledgment(
    question: ClarificationQuestion,
    answer: string
  ): Promise<string> {
    const prompt = `
Generate a warm, conversational response acknowledging the user's answer.

Question: "${question.question}"
Answer: "${answer}"

Create a response that:
1. Shows you understand and appreciate their answer
2. Validates their choice or input
3. Moves the conversation forward naturally
4. Feels encouraging and supportive
5. Is under 50 words

Examples:
- "That makes perfect sense! I can see why [answer] would be important to you."
- "Great choice! [Answer] is definitely a solid approach for this goal."
- "I love that you're thinking about [answer] - that shows real commitment to this goal."

Keep it conversational and encouraging.
`

    try {
      const response = await this.aiService.chatWithAI(
        prompt,
        {
          provider: 'gemini',
          modelId: 'gemini-2.5-flash',
          temperature: 0.8,
          maxTokens: 100
        },
        'You are Zeno, acknowledging user answers warmly and encouragingly.'
      )

      return response.content
    } catch (error) {
      console.error('Error generating acknowledgment:', error)
      return "That's really helpful! Thanks for sharing that with me."
    }
  }

  /**
   * Get fallback questions when analysis fails
   */
  private getFallbackQuestions(userMessage: string): ClarificationQuestion[] {
    return [
      {
        id: `q-fallback-${Date.now()}`,
        question: "What specific aspect of this goal are you most excited about?",
        context: "general_clarification",
        expectedAnswerType: 'text',
        isAnswered: false,
        createdAt: new Date().toISOString()
      },
      {
        id: `q-fallback-${Date.now()}-2`,
        question: "When would you like to achieve this?",
        context: "timeline_clarification",
        expectedAnswerType: 'choice',
        options: ['this week', 'this month', 'next 3 months', 'this year', 'long-term'],
        isAnswered: false,
        createdAt: new Date().toISOString()
      }
    ]
  }

  /**
   * Find question by ID (placeholder - would integrate with database)
   */
  private async findQuestionById(questionId: string): Promise<ClarificationQuestion | null> {
    // This would integrate with your database to find the question
    // For now, return a placeholder
    return null
  }

  // Helper methods for parsing AI responses
  private parseClarificationAnalysis(response: string): ClarificationAnalysis {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (error) {
      console.error('Error parsing clarification analysis:', error)
    }

    return this.createFallbackAnalysis()
  }

  private parseQuestionResponse(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (error) {
      console.error('Error parsing question response:', error)
    }

    return null
  }

  private parseFollowUpResponse(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (error) {
      console.error('Error parsing follow-up response:', error)
    }

    return { followUpQuestions: [], goalUpdate: null }
  }

  private createFallbackAnalysis(): ClarificationAnalysis {
    return {
      needsClarification: [
        {
          area: 'goal_specificity',
          reason: 'Goal needs more specific details',
          confidence: 0.7,
          suggestedQuestion: 'What specific aspect would you like to focus on?'
        }
      ],
      context: {
        goalCategory: 'other',
        urgency: 'medium',
        complexity: 'moderate',
        userExperience: 'intermediate'
      },
      priority: 'medium'
    }
  }
}

// Additional types for the contextual question engine
interface ClarificationAnalysis {
  needsClarification: ClarificationNeed[]
  context: ClarificationContext
  priority: 'high' | 'medium' | 'low'
}

interface ClarificationNeed {
  area: 'goal_specificity' | 'timeline' | 'priority' | 'category' | 'resources' | 'success_criteria' | 'motivation'
  reason: string
  confidence: number
  suggestedQuestion: string
}

interface ClarificationContext {
  goalCategory: GoalCategory
  urgency: 'low' | 'medium' | 'high'
  complexity: 'simple' | 'moderate' | 'complex'
  userExperience: 'beginner' | 'intermediate' | 'advanced'
}
