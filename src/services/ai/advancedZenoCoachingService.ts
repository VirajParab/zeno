import { AIService } from './aiService'
import { Task, Column, Reminder } from '../database/types'

export interface UserProfile {
  id: string
  name: string
  
  // Identity & Lifestyle
  wakeTime: string
  sleepTime: string
  workHours: string
  restPatterns: string[]
  planningStyle: 'structured' | 'flexible' | 'adaptive'
  
  // Life Categories & Priorities
  focusAreas: LifeCategory[]
  
  // Goals
  fiveYearGoals: Goal[]
  yearlyGoals: Goal[]
  monthlyGoals: Goal[]
  
  // Habits & Routines
  habits: Habit[]
  
  // Constraints & Challenges
  blockers: string[]
  motivationStyle: 'gentle' | 'firm' | 'neutral'
  timeConstraints: string[]
  
  // Motivational Profile
  motivationMode: 'progress' | 'encouragement' | 'insights' | 'accountability' | 'reflection'
  tonePreference: 'calm' | 'energetic' | 'professional' | 'friendly'
  
  // Daily Data
  dailyReflections: DailyReflection[]
  energyLevels: number[]
  completionRates: number[]
  
  createdAt: string
  updatedAt: string
}

export interface LifeCategory {
  id: string
  name: string
  icon: string
  priority: number // 1-10
  description: string
}

export interface Goal {
  id: string
  title: string
  description: string
  category: string
  timeframe: 'five-year' | 'yearly' | 'monthly'
  priority: number
  progress: number
  targetDate: string
  parentGoalId?: string
  childGoalIds: string[]
  createdAt: string
  updatedAt: string
}

export interface Habit {
  id: string
  name: string
  description: string
  frequency: 'daily' | 'weekly' | 'custom'
  timeOfDay: string
  linkedGoalId?: string
  category: string
  isActive: boolean
  streak: number
  createdAt: string
  updatedAt: string
}

export interface DailyReflection {
  id: string
  date: string
  type: 'morning' | 'midday' | 'evening'
  energyLevel: number
  mood: number
  completedTasks: string[]
  skippedTasks: string[]
  whatWentWell: string
  whatCouldImprove: string
  insights: string
  createdAt: string
}

export interface CoachingConversation {
  id: string
  userId: string
  type: 'onboarding' | 'morning' | 'midday' | 'evening' | 'weekly' | 'monthly'
  messages: ConversationMessage[]
  currentStep?: string
  isComplete: boolean
  createdAt: string
  updatedAt: string
}

export interface ConversationMessage {
  id: string
  role: 'zeno' | 'user'
  content: string
  timestamp: string
  metadata?: any
}

export class AdvancedZenoCoachingService {
  private aiService: AIService
  private userProfile: UserProfile | null = null
  private currentConversation: CoachingConversation | null = null

  constructor(aiService: AIService) {
    this.aiService = aiService
  }

  // Onboarding Conversation Flow
  async startOnboardingConversation(userName: string): Promise<CoachingConversation> {
    const conversation: CoachingConversation = {
      id: `conv-${Date.now()}`,
      userId: 'demo-user-123',
      type: 'onboarding',
      messages: [],
      currentStep: 'welcome',
      isComplete: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const welcomeMessage = await this.generateWelcomeMessage(userName)
    conversation.messages.push({
      id: `msg-${Date.now()}`,
      role: 'zeno',
      content: welcomeMessage,
      timestamp: new Date().toISOString()
    })

    this.currentConversation = conversation
    return conversation
  }

  private async generateWelcomeMessage(userName: string): Promise<string> {
    const prompt = `
You are Zeno, a warm and intelligent AI companion for personal growth.

Generate a welcoming message for ${userName} that:
1. Introduces yourself as their AI companion for growth
2. Explains that you'll help them understand their world and goals
3. Sets the tone for a conversational, supportive relationship
4. Mentions that you'll ask questions to understand their life better
5. Keeps it warm, personal, and encouraging

Make it feel like talking to a wise, caring friend who's genuinely interested in their growth.
`

    try {
      const response = await this.aiService.chatWithAI({
        modelId: 'gemini-2.5-flash',
        temperature: 0.8,
        maxTokens: 300
      }, prompt, [], 'You are Zeno, a warm and intelligent AI companion for personal growth.')

      return response.response
    } catch (error) {
      return `Hey ${userName}! I'm Zeno — your AI companion for growth 🌱

I'm here to help you understand your world and achieve your goals through meaningful conversations. Think of me as your wise, caring friend who's genuinely interested in your journey.

Before I can help you thrive, I'd love to learn about your world. I'll ask you some questions to understand what matters to you, what you're working toward, and how you like to operate day-to-day.

Ready to explore together? Let's start with understanding what's most important to you right now.`
    }
  }

  async processUserResponse(userMessage: string): Promise<ConversationMessage> {
    if (!this.currentConversation) {
      throw new Error('No active conversation')
    }

    // Add user message
    const userMsg: ConversationMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    }
    this.currentConversation.messages.push(userMsg)

    // Generate Zeno's response based on current step
    const zenoResponse = await this.generateContextualResponse(userMessage)
    
    const zenoMsg: ConversationMessage = {
      id: `msg-${Date.now()}`,
      role: 'zeno',
      content: zenoResponse.content,
      timestamp: new Date().toISOString(),
      metadata: zenoResponse.metadata
    }
    this.currentConversation.messages.push(zenoMsg)

    // Update conversation step if needed
    if (zenoResponse.nextStep) {
      this.currentConversation.currentStep = zenoResponse.nextStep
    }

    return zenoMsg
  }

  private async generateContextualResponse(userMessage: string): Promise<{ content: string; nextStep?: string; metadata?: any }> {
    const currentStep = this.currentConversation?.currentStep
    const conversationHistory = this.currentConversation?.messages.slice(-6) || []

    const prompt = `
You are Zeno, conducting an onboarding conversation to understand the user's world.

Current conversation step: ${currentStep}
Recent conversation history:
${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

User's latest message: "${userMessage}"

Based on the onboarding framework, respond appropriately:

1. If this is the welcome step, ask about their main focus in life (Career, Health, Finance, Learning, etc.)
2. If they've shared their focus, ask about their 5-year vision
3. If they've shared their vision, ask about this year's big goal
4. If they've shared yearly goals, ask about daily habits
5. If they've shared habits, ask about their daily schedule (wake/sleep times)
6. If they've shared schedule, ask about their preferred structure level
7. If they've shared structure preference, ask about motivation style
8. If they've shared motivation, ask about accountability preferences

Be conversational, warm, and genuinely curious. Extract key information and ask follow-up questions.
If you've gathered enough info for a step, naturally transition to the next question.

Respond with JSON:
{
  "content": "Your response message",
  "nextStep": "next_step_name",
  "metadata": {
    "extractedInfo": {
      "key": "value"
    }
  }
}
`

    try {
      const response = await this.aiService.chatWithAI({
        modelId: 'gemini-2.5-flash',
        temperature: 0.8,
        maxTokens: 500
      }, prompt, [], 'You are Zeno, conducting a warm onboarding conversation.')

      // Parse the AI response
      const parsedResponse = this.parseAIResponse(response.response)
      return parsedResponse
    } catch (error) {
      console.error('Failed to generate contextual response:', error)
      return {
        content: "That's really interesting! Tell me more about that. I'm here to understand your world better so I can help you thrive.",
        nextStep: currentStep
      }
    }
  }

  private parseAIResponse(aiResponse: string): { content: string; nextStep?: string; metadata?: any } {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error)
    }

    // Fallback: return the raw response
    return {
      content: aiResponse,
      nextStep: this.currentConversation?.currentStep
    }
  }

  // Daily Coaching Conversations
  async generateMorningCheckInWithOlderTasks(olderTasks: any[]): Promise<string> {
    if (!this.userProfile) {
      throw new Error('No user profile found')
    }

    const yesterdayReflection = this.userProfile.dailyReflections
      .filter(r => r.type === 'evening')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]

    const prompt = `
You are Zeno, conducting a morning check-in with ${this.userProfile.name}.

User Profile:
- Planning Style: ${this.userProfile.planningStyle}
- Motivation Style: ${this.userProfile.motivationStyle}
- Tone Preference: ${this.userProfile.tonePreference}
- Focus Areas: ${this.userProfile.focusAreas.map(f => f.name).join(', ')}

Yesterday's Reflection:
${yesterdayReflection ? `
- Energy Level: ${yesterdayReflection.energyLevel}/10
- What Went Well: ${yesterdayReflection.whatWentWell}
- What Could Improve: ${yesterdayReflection.whatCouldImprove}
` : 'No reflection available'}

Older/Overdue Tasks:
${olderTasks.length > 0 ? olderTasks.map(task => `- ${task.title} (due: ${task.due_date})`).join('\n') : 'No overdue tasks'}

Generate a warm, personalized morning check-in that:
1. Greets them warmly
2. Acknowledges yesterday's progress if available
3. ${olderTasks.length > 0 ? 'Mentions the overdue tasks and asks how they want to handle them' : ''}
4. Asks about their main focus for today
5. Asks about available time for deep work
6. Asks about any meetings or events
7. Asks about focus preference (professional vs personal)
8. Matches their tone preference (${this.userProfile.tonePreference})

Keep it conversational and supportive. If there are overdue tasks, be gentle but direct about addressing them.
`

    try {
      const response = await this.aiService.chatWithAI({
        modelId: 'gemini-2.5-flash',
        temperature: 0.8,
        maxTokens: 500
      }, prompt, [], 'You are Zeno, conducting a warm morning check-in.')

      return response.response
    } catch (error) {
      return `Good morning, ${this.userProfile.name}! ☀️

${yesterdayReflection ? `Yesterday you made progress on your goals — nice work!` : ''}
${olderTasks.length > 0 ? `I notice you have ${olderTasks.length} overdue tasks. Let's talk about how to handle them today.` : ''}

Ready to make today amazing? Let's plan together:

1. What's your main focus today?
2. How much time do you have for deep work?
3. Any meetings or personal events I should account for?
4. Would you like to focus more on your professional or personal goals today?

I'm here to help you create a balanced, productive day! 🌟`
    }
  }

  async generateMorningCheckIn(): Promise<string> {
    if (!this.userProfile) {
      throw new Error('No user profile found')
    }

    const yesterdayReflection = this.userProfile.dailyReflections
      .filter(r => r.type === 'evening')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]

    const prompt = `
You are Zeno, conducting a morning check-in with ${this.userProfile.name}.

User Profile:
- Planning Style: ${this.userProfile.planningStyle}
- Motivation Style: ${this.userProfile.motivationStyle}
- Tone Preference: ${this.userProfile.tonePreference}
- Focus Areas: ${this.userProfile.focusAreas.map(f => f.name).join(', ')}

Yesterday's Reflection:
${yesterdayReflection ? `
- Energy Level: ${yesterdayReflection.energyLevel}/10
- What Went Well: ${yesterdayReflection.whatWentWell}
- What Could Improve: ${yesterdayReflection.whatCouldImprove}
` : 'No reflection available'}

Generate a warm, personalized morning check-in that:
1. Greets them warmly
2. Acknowledges yesterday's progress if available
3. Asks about their main focus for today
4. Asks about available time for deep work
5. Asks about any meetings or events
6. Asks about focus preference (professional vs personal)
7. Matches their tone preference (${this.userProfile.tonePreference})

Keep it conversational and supportive.
`

    try {
      const response = await this.aiService.chatWithAI({
        modelId: 'gemini-2.5-flash',
        temperature: 0.8,
        maxTokens: 400
      }, prompt, [], 'You are Zeno, conducting a warm morning check-in.')

      return response.response
    } catch (error) {
      return `Good morning, ${this.userProfile.name}! ☀️

${yesterdayReflection ? `Yesterday you made progress on your goals — nice work!` : ''}

Ready to make today amazing? Let's plan together:

1. What's your main focus today?
2. How much time do you have for deep work?
3. Any meetings or personal events I should account for?
4. Would you like to focus more on your professional or personal goals today?

I'm here to help you create a balanced, productive day! 🌟`
    }
  }

  async generateMiddayCheckIn(completedTasks: string[], remainingTasks: string[]): Promise<string> {
    if (!this.userProfile) {
      throw new Error('No user profile found')
    }

    const completionRate = completedTasks.length / (completedTasks.length + remainingTasks.length)
    const energyLevel = this.userProfile.energyLevels.slice(-3).reduce((a, b) => a + b, 0) / 3

    const prompt = `
You are Zeno, conducting a midday check-in with ${this.userProfile.name}.

Current Status:
- Completed Tasks: ${completedTasks.length}
- Remaining Tasks: ${remainingTasks.length}
- Completion Rate: ${Math.round(completionRate * 100)}%
- Recent Energy Level: ${energyLevel}/10

User Profile:
- Motivation Style: ${this.userProfile.motivationStyle}
- Tone Preference: ${this.userProfile.tonePreference}

Generate a supportive midday check-in that:
1. Acknowledges their progress
2. Offers to adjust the remaining tasks based on their energy
3. Asks about any habits they haven't started yet
4. Provides encouragement
5. Matches their tone preference

Keep it brief, supportive, and actionable.
`

    try {
      const response = await this.aiService.chatWithAI({
        modelId: 'gemini-2.5-flash',
        temperature: 0.8,
        maxTokens: 300
      }, prompt, [], 'You are Zeno, conducting a supportive midday check-in.')

      return response.response
    } catch (error) {
      return `You've finished ${completedTasks.length} of ${completedTasks.length + remainingTasks.length} key tasks today — awesome! 🎉

Want me to shuffle the remaining ones based on your energy? Or is there anything you'd like to adjust?

I'm here to keep you on track and flexible! 💪`
    }
  }

  async generateEveningReflection(completedTasks: string[], skippedTasks: string[]): Promise<string> {
    if (!this.userProfile) {
      throw new Error('No user profile found')
    }

    const prompt = `
You are Zeno, conducting an evening reflection with ${this.userProfile.name}.

Today's Results:
- Completed Tasks: ${completedTasks.length}
- Skipped Tasks: ${skippedTasks.length}
- Completion Rate: ${Math.round((completedTasks.length / (completedTasks.length + skippedTasks.length)) * 100)}%

User Profile:
- Motivation Style: ${this.userProfile.motivationStyle}
- Tone Preference: ${this.userProfile.tonePreference}

Generate a reflective evening conversation that:
1. Acknowledges their work today
2. Asks what went well
3. Asks what they skipped and why
4. Asks how they feel overall (energized, tired, balanced)
5. Offers to adjust tomorrow's plan
6. Provides a summary of their progress
7. Matches their tone preference

Keep it warm, reflective, and supportive.
`

    try {
      const response = await this.aiService.chatWithAI({
        modelId: 'gemini-2.5-flash',
        temperature: 0.8,
        maxTokens: 400
      }, prompt, [], 'You are Zeno, conducting a warm evening reflection.')

      return response.response
    } catch (error) {
      return `Nice work today, ${this.userProfile.name}! 🌟

Let's take 2 minutes to reflect before wrapping up:

1. What went well today?
2. What did you skip and why?
3. How do you feel overall — energized, tired, or balanced?
4. Want me to adjust tomorrow's plan based on this?

You completed ${Math.round((completedTasks.length / (completedTasks.length + skippedTasks.length)) * 100)}% of today's plan. You're doing great! 🎯`
    }
  }

  // Weekly and Monthly Alignment
  async generateWeeklyAlignment(): Promise<string> {
    if (!this.userProfile) {
      throw new Error('No user profile found')
    }

    const weeklyStats = this.calculateWeeklyStats()
    const prompt = `
You are Zeno, conducting a weekly alignment conversation with ${this.userProfile.name}.

Weekly Stats:
- Average Completion Rate: ${weeklyStats.avgCompletionRate}%
- Most Consistent Area: ${weeklyStats.mostConsistentArea}
- Least Consistent Area: ${weeklyStats.leastConsistentArea}
- Energy Trend: ${weeklyStats.energyTrend}

User Profile:
- Focus Areas: ${this.userProfile.focusAreas.map(f => f.name).join(', ')}
- Motivation Style: ${this.userProfile.motivationStyle}

Generate a weekly review conversation that:
1. Summarizes their week's performance
2. Highlights areas of strength and improvement
3. Asks which area they want to focus on next week
4. Asks if they want to add/drop any habits
5. Offers to rebalance their focus
6. Matches their tone preference

Keep it strategic and encouraging.
`

    try {
      const response = await this.aiService.chatWithAI({
        modelId: 'gemini-2.5-flash',
        temperature: 0.7,
        maxTokens: 400
      }, prompt, [], 'You are Zeno, conducting a strategic weekly review.')

      return response.response
    } catch (error) {
      return `Time for our weekly check-in, ${this.userProfile.name}! 📊

This week you were ${weeklyStats.avgCompletionRate}% consistent overall. 
${weeklyStats.mostConsistentArea} was your strongest area, while ${weeklyStats.leastConsistentArea} could use more attention.

Questions for next week:
1. Which area do you want to focus on more?
2. Is there any goal you'd like to pause or update?
3. Would you like to add a new habit or drop one that isn't helping?

Let's make next week even better! 🚀`
    }
  }

  private calculateWeeklyStats(): any {
    // This would calculate actual stats from user data
    return {
      avgCompletionRate: 75,
      mostConsistentArea: 'Health',
      leastConsistentArea: 'Finance',
      energyTrend: 'stable'
    }
  }

  // AI Chat and Task Management
  async processDailyCheckInResponse(
    userMessage: string,
    context: {
      currentTasks: any[]
      olderTasks: any[]
      completedTasks: string[]
      skippedTasks: string[]
      conversationHistory: ConversationMessage[]
    }
  ): Promise<{ message: string; taskActions?: any[] }> {
    if (!this.userProfile) {
      throw new Error('No user profile found')
    }

    const prompt = `
You are Zeno, processing a user's response during a daily check-in conversation.

User Profile:
- Name: ${this.userProfile.name}
- Motivation Style: ${this.userProfile.motivationStyle}
- Tone Preference: ${this.userProfile.tonePreference}

Current Context:
- Current Tasks: ${context.currentTasks.map(t => `${t.title} (${t.id})`).join(', ')}
- Older/Overdue Tasks: ${context.olderTasks.map(t => `${t.title} (${t.id}, due: ${t.due_date})`).join(', ')}
- Completed Tasks: ${context.completedTasks.join(', ')}
- Skipped Tasks: ${context.skippedTasks.join(', ')}

Recent Conversation:
${context.conversationHistory.slice(-4).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

User's Response: "${userMessage}"

Analyze the user's response and:
1. Provide an appropriate conversational response
2. Identify any task actions they want to take based on their message
3. Look for mentions of completing, skipping, rescheduling, or updating tasks
4. Be supportive and match their tone preference

Task Actions Format (if any):
- complete: Mark a task as done
- skip: Mark a task as skipped
- reschedule: Change due date
- update: Update task details

Respond with JSON:
{
  "message": "Your conversational response",
  "taskActions": [
    {
      "type": "complete|skip|reschedule|update",
      "taskId": "task-id",
      "newDate": "2024-01-01" (for reschedule),
      "updates": {} (for update)
    }
  ]
}
`

    try {
      const response = await this.aiService.chatWithAI({
        modelId: 'gemini-2.5-flash',
        temperature: 0.7,
        maxTokens: 800
      }, prompt, [], 'You are Zeno, processing daily check-in responses and managing tasks.')

      const parsedResponse = this.parseTaskManagementResponse(response.response)
      return parsedResponse
    } catch (error) {
      console.error('Failed to process daily check-in response:', error)
      return {
        message: "I understand. Let me help you with that. Could you tell me more about what you'd like to focus on today?",
        taskActions: []
      }
    }
  }

  private parseTaskManagementResponse(aiResponse: string): { message: string; taskActions?: any[] } {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (error) {
      console.error('Failed to parse task management response:', error)
    }

    // Fallback: return just the message
    return {
      message: aiResponse,
      taskActions: []
    }
  }

  // Profile Management
  async createUserProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
    const profile: UserProfile = {
      id: `user-${Date.now()}`,
      name: profileData.name || 'User',
      wakeTime: profileData.wakeTime || '7:00 AM',
      sleepTime: profileData.sleepTime || '11:00 PM',
      workHours: profileData.workHours || '9:00 AM - 5:00 PM',
      restPatterns: profileData.restPatterns || [],
      planningStyle: profileData.planningStyle || 'flexible',
      focusAreas: profileData.focusAreas || [],
      fiveYearGoals: profileData.fiveYearGoals || [],
      yearlyGoals: profileData.yearlyGoals || [],
      monthlyGoals: profileData.monthlyGoals || [],
      habits: profileData.habits || [],
      blockers: profileData.blockers || [],
      motivationStyle: profileData.motivationStyle || 'gentle',
      timeConstraints: profileData.timeConstraints || [],
      motivationMode: profileData.motivationMode || 'encouragement',
      tonePreference: profileData.tonePreference || 'friendly',
      dailyReflections: profileData.dailyReflections || [],
      energyLevels: profileData.energyLevels || [],
      completionRates: profileData.completionRates || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    this.userProfile = profile
    return profile
  }

  // Getters
  getUserProfile(): UserProfile | null {
    return this.userProfile
  }

  getCurrentConversation(): CoachingConversation | null {
    return this.currentConversation
  }
}
