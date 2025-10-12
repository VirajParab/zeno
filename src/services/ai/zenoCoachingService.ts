import { AIService } from './aiService'
import { Task, Column, Reminder } from '../database/types'

export interface UserProfile {
  id: string
  name: string
  focusAreas: string[]
  intentStyle: 'growth' | 'hustle' | 'balanced'
  vision: string
  fiveYearGoals: string[]
  yearlyGoals: string[]
  monthlyFocus: string[]
  weeklyMilestones: string[]
  energyLevel: number
  preferredPlanningTime: string
  motivationStyle: 'calm' | 'push' | 'humor'
  createdAt: string
  updatedAt: string
}

export interface Goal {
  id: string
  userId: string
  title: string
  description: string
  category: string
  timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'five-year'
  priority: number
  progress: number
  targetDate: string
  parentGoalId?: string
  childGoalIds: string[]
  createdAt: string
  updatedAt: string
}

export interface DailyPlan {
  id: string
  userId: string
  date: string
  focusTasks: Task[]
  maintenanceTasks: Task[]
  wellbeingTasks: Task[]
  energyLevel: number
  motivation: string
  reflection?: string
  completedTasks: string[]
  createdAt: string
}

export interface Reflection {
  id: string
  userId: string
  date: string
  type: 'daily' | 'weekly' | 'monthly'
  whatWentWell: string
  whatCouldImprove: string
  energyLevel: number
  mood: number
  insights: string
  goalsProgress: { [goalId: string]: number }
  createdAt: string
}

export interface ZenoInsight {
  id: string
  userId: string
  type: 'energy_trend' | 'productivity_pattern' | 'goal_alignment' | 'motivation_boost'
  title: string
  description: string
  actionableAdvice: string
  confidence: number
  createdAt: string
}

export class ZenoCoachingService {
  private aiService: AIService
  private userProfile: UserProfile | null = null
  private goals: Goal[] = []
  private dailyPlans: DailyPlan[] = []
  private reflections: Reflection[] = []

  constructor(aiService: AIService) {
    this.aiService = aiService
  }

  // User Profile Management
  async createUserProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
    const profile: UserProfile = {
      id: `user-${Date.now()}`,
      name: profileData.name || 'User',
      focusAreas: profileData.focusAreas || [],
      intentStyle: profileData.intentStyle || 'balanced',
      vision: profileData.vision || '',
      fiveYearGoals: profileData.fiveYearGoals || [],
      yearlyGoals: profileData.yearlyGoals || [],
      monthlyFocus: profileData.monthlyFocus || [],
      weeklyMilestones: profileData.weeklyMilestones || [],
      energyLevel: profileData.energyLevel || 7,
      preferredPlanningTime: profileData.preferredPlanningTime || 'morning',
      motivationStyle: profileData.motivationStyle || 'calm',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    this.userProfile = profile
    return profile
  }

  async updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    if (!this.userProfile) {
      throw new Error('No user profile found')
    }

    this.userProfile = {
      ...this.userProfile,
      ...updates,
      updatedAt: new Date().toISOString()
    }

    return this.userProfile
  }

  // Goal Management
  async createGoal(goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Goal> {
    const goal: Goal = {
      ...goalData,
      id: `goal-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    this.goals.push(goal)
    return goal
  }

  async decomposeGoalWithAI(goalTitle: string, timeframe: Goal['timeframe']): Promise<string[]> {
    if (!this.userProfile) {
      throw new Error('User profile required for AI goal decomposition')
    }

    const prompt = `
You are Zeno, a personal AI coach helping ${this.userProfile.name} achieve their goals.

Goal: "${goalTitle}"
Timeframe: ${timeframe}
User's Intent Style: ${this.userProfile.intentStyle}
Focus Areas: ${this.userProfile.focusAreas.join(', ')}

Break this goal down into 3-5 specific, actionable sub-goals that align with their ${this.userProfile.intentStyle} approach.

For each sub-goal, provide:
1. A clear, specific action
2. A timeframe within the main goal's timeframe
3. How it connects to their focus areas

Format as a JSON array of strings, each string being a sub-goal description.
`

    try {
      const response = await this.aiService.chatWithAI({
        modelId: 'gemini-2.5-flash',
        temperature: 0.7,
        maxTokens: 1000
      }, prompt, [], 'You are Zeno, a helpful AI coach specializing in goal setting and personal development.')

      // Parse the AI response to extract sub-goals
      const subGoals = this.parseSubGoals(response.response)
      return subGoals
    } catch (error) {
      console.error('Failed to decompose goal with AI:', error)
      return [`Complete ${goalTitle}`, `Review progress on ${goalTitle}`, `Celebrate achievement of ${goalTitle}`]
    }
  }

  private parseSubGoals(aiResponse: string): string[] {
    try {
      // Try to extract JSON array from the response
      const jsonMatch = aiResponse.match(/\[.*\]/s)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      
      // Fallback: extract bullet points or numbered items
      const lines = aiResponse.split('\n').filter(line => 
        line.trim().match(/^[\d\.\-\*]\s+/) || line.trim().startsWith('"')
      )
      
      return lines.map(line => 
        line.replace(/^[\d\.\-\*]\s+/, '').replace(/^["']|["']$/g, '').trim()
      ).filter(goal => goal.length > 0)
    } catch (error) {
      console.error('Failed to parse sub-goals:', error)
      return ['Complete the main goal', 'Review progress', 'Celebrate achievement']
    }
  }

  // Daily Planning AI
  async generateDailyPlan(date: string, existingTasks: Task[]): Promise<DailyPlan> {
    if (!this.userProfile) {
      throw new Error('User profile required for daily planning')
    }

    const prompt = `
You are Zeno, creating a daily plan for ${this.userProfile.name} on ${date}.

User Profile:
- Intent Style: ${this.userProfile.intentStyle}
- Focus Areas: ${this.userProfile.focusAreas.join(', ')}
- Energy Level: ${this.userProfile.energyLevel}/10
- Motivation Style: ${this.userProfile.motivationStyle}

Current Goals:
${this.goals.map(g => `- ${g.title} (${g.timeframe}, ${g.progress}% complete)`).join('\n')}

Existing Tasks:
${existingTasks.map(t => `- ${t.title} (${t.priority === 1 ? 'High' : t.priority === 2 ? 'Medium' : 'Low'} priority)`).join('\n')}

Create a balanced daily plan with:
1. 3 FOCUS tasks (most impactful for goals)
2. 2 MAINTENANCE tasks (routines, admin)
3. 1 WELLBEING task (health, relationships, self-care)

Consider their ${this.userProfile.intentStyle} style and ${this.userProfile.energyLevel}/10 energy level.

Provide a motivational message for the day.

Format as JSON with this structure:
{
  "focusTasks": [{"title": "...", "description": "...", "priority": 1}],
  "maintenanceTasks": [{"title": "...", "description": "...", "priority": 2}],
  "wellbeingTasks": [{"title": "...", "description": "...", "priority": 3}],
  "motivation": "..."
}
`

    try {
      const response = await this.aiService.chatWithAI({
        modelId: 'gemini-2.5-flash',
        temperature: 0.8,
        maxTokens: 1500
      }, prompt, [], 'You are Zeno, an expert daily planning AI coach.')

      const planData = this.parseDailyPlan(response.response)
      
      const dailyPlan: DailyPlan = {
        id: `plan-${Date.now()}`,
        userId: this.userProfile.id,
        date,
        focusTasks: planData.focusTasks,
        maintenanceTasks: planData.maintenanceTasks,
        wellbeingTasks: planData.wellbeingTasks,
        energyLevel: this.userProfile.energyLevel,
        motivation: planData.motivation,
        completedTasks: [],
        createdAt: new Date().toISOString()
      }

      this.dailyPlans.push(dailyPlan)
      return dailyPlan
    } catch (error) {
      console.error('Failed to generate daily plan:', error)
      return this.createFallbackDailyPlan(date)
    }
  }

  private parseDailyPlan(aiResponse: string): any {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (error) {
      console.error('Failed to parse daily plan:', error)
    }

    // Fallback plan
    return {
      focusTasks: [
        { title: 'Work on main goal', description: 'Focus on your most important goal today', priority: 1 },
        { title: 'Complete priority task', description: 'Handle your highest priority item', priority: 1 },
        { title: 'Make progress on project', description: 'Advance your current project', priority: 1 }
      ],
      maintenanceTasks: [
        { title: 'Check emails', description: 'Review and respond to important emails', priority: 2 },
        { title: 'Organize workspace', description: 'Clean and organize your work area', priority: 2 }
      ],
      wellbeingTasks: [
        { title: 'Take a walk', description: 'Get some fresh air and light exercise', priority: 3 }
      ],
      motivation: 'You\'ve got this! Every step forward counts towards your bigger vision.'
    }
  }

  private createFallbackDailyPlan(date: string): DailyPlan {
    return {
      id: `plan-${Date.now()}`,
      userId: this.userProfile?.id || 'unknown',
      date,
      focusTasks: [
        { title: 'Work on main goal', description: 'Focus on your most important goal today', priority: 1 } as Task,
        { title: 'Complete priority task', description: 'Handle your highest priority item', priority: 1 } as Task,
        { title: 'Make progress on project', description: 'Advance your current project', priority: 1 } as Task
      ],
      maintenanceTasks: [
        { title: 'Check emails', description: 'Review and respond to important emails', priority: 2 } as Task,
        { title: 'Organize workspace', description: 'Clean and organize your work area', priority: 2 } as Task
      ],
      wellbeingTasks: [
        { title: 'Take a walk', description: 'Get some fresh air and light exercise', priority: 3 } as Task
      ],
      energyLevel: 7,
      motivation: 'You\'ve got this! Every step forward counts towards your bigger vision.',
      completedTasks: [],
      createdAt: new Date().toISOString()
    }
  }

  // Conversational AI Assistant
  async chatWithZeno(message: string, context: any = {}): Promise<string> {
    if (!this.userProfile) {
      return "Hi! I'm Zeno, your personal AI coach. Let's start by setting up your profile and goals. What would you like to focus on first?"
    }

    const contextPrompt = `
You are Zeno, a personal AI coach for ${this.userProfile.name}.

User Profile:
- Name: ${this.userProfile.name}
- Intent Style: ${this.userProfile.intentStyle}
- Focus Areas: ${this.userProfile.focusAreas.join(', ')}
- Vision: ${this.userProfile.vision}
- Energy Level: ${this.userProfile.energyLevel}/10
- Motivation Style: ${this.userProfile.motivationStyle}

Current Goals:
${this.goals.map(g => `- ${g.title} (${g.timeframe}, ${g.progress}% complete)`).join('\n')}

Recent Daily Plans:
${this.dailyPlans.slice(-3).map(p => `- ${p.date}: ${p.completedTasks.length}/${p.focusTasks.length + p.maintenanceTasks.length + p.wellbeingTasks.length} tasks completed`).join('\n')}

User Message: "${message}"

Respond as Zeno with their ${this.userProfile.motivationStyle} style. Be encouraging, goal-focused, and helpful. 
If they're asking about planning, goals, or productivity, provide specific, actionable advice.
If they're feeling stuck or unmotivated, offer gentle guidance and remind them of their vision.
`

    try {
      const response = await this.aiService.chatWithAI({
        modelId: 'gemini-2.5-flash',
        temperature: 0.8,
        maxTokens: 800
      }, message, [], contextPrompt)

      return response.response
    } catch (error) {
      console.error('Failed to chat with Zeno:', error)
      return "I'm here to help you achieve your goals! What would you like to work on today?"
    }
  }

  // Reflection and Analytics
  async generateReflection(type: 'daily' | 'weekly' | 'monthly', date: string): Promise<Reflection> {
    if (!this.userProfile) {
      throw new Error('User profile required for reflection')
    }

    const recentPlans = this.dailyPlans.filter(p => {
      const planDate = new Date(p.date)
      const targetDate = new Date(date)
      const diffDays = Math.abs(planDate.getTime() - targetDate.getTime()) / (1000 * 3600 * 24)
      return diffDays <= (type === 'daily' ? 1 : type === 'weekly' ? 7 : 30)
    })

    const prompt = `
You are Zeno, helping ${this.userProfile.name} reflect on their ${type} progress.

User Profile:
- Intent Style: ${this.userProfile.intentStyle}
- Focus Areas: ${this.userProfile.focusAreas.join(', ')}
- Vision: ${this.userProfile.vision}

Recent Activity:
${recentPlans.map(p => `- ${p.date}: ${p.completedTasks.length}/${p.focusTasks.length + p.maintenanceTasks.length + p.wellbeingTasks.length} tasks completed`).join('\n')}

Goals Progress:
${this.goals.map(g => `- ${g.title}: ${g.progress}% complete`).join('\n')}

Generate a thoughtful ${type} reflection with:
1. What went well (celebrate wins)
2. What could be improved (constructive feedback)
3. Insights about patterns or trends
4. Suggestions for next period

Be encouraging but honest. Match their ${this.userProfile.motivationStyle} style.

Format as JSON:
{
  "whatWentWell": "...",
  "whatCouldImprove": "...",
  "insights": "...",
  "energyLevel": 7,
  "mood": 8
}
`

    try {
      const response = await this.aiService.chatWithAI({
        modelId: 'gemini-2.5-flash',
        temperature: 0.7,
        maxTokens: 1000
      }, prompt, [], 'You are Zeno, an expert reflection and personal development coach.')

      const reflectionData = this.parseReflection(response.response)
      
      const reflection: Reflection = {
        id: `reflection-${Date.now()}`,
        userId: this.userProfile.id,
        date,
        type,
        whatWentWell: reflectionData.whatWentWell,
        whatCouldImprove: reflectionData.whatCouldImprove,
        insights: reflectionData.insights,
        energyLevel: reflectionData.energyLevel,
        mood: reflectionData.mood,
        goalsProgress: this.goals.reduce((acc, goal) => {
          acc[goal.id] = goal.progress
          return acc
        }, {} as { [goalId: string]: number }),
        createdAt: new Date().toISOString()
      }

      this.reflections.push(reflection)
      return reflection
    } catch (error) {
      console.error('Failed to generate reflection:', error)
      return this.createFallbackReflection(type, date)
    }
  }

  private parseReflection(aiResponse: string): any {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (error) {
      console.error('Failed to parse reflection:', error)
    }

    return {
      whatWentWell: 'You made progress on your goals and maintained consistency.',
      whatCouldImprove: 'Consider balancing focus areas and taking more breaks.',
      insights: 'Your dedication is paying off. Keep building momentum.',
      energyLevel: 7,
      mood: 8
    }
  }

  private createFallbackReflection(type: 'daily' | 'weekly' | 'monthly', date: string): Reflection {
    return {
      id: `reflection-${Date.now()}`,
      userId: this.userProfile?.id || 'unknown',
      date,
      type,
      whatWentWell: 'You made progress on your goals and maintained consistency.',
      whatCouldImprove: 'Consider balancing focus areas and taking more breaks.',
      insights: 'Your dedication is paying off. Keep building momentum.',
      energyLevel: 7,
      mood: 8,
      goalsProgress: this.goals.reduce((acc, goal) => {
        acc[goal.id] = goal.progress
        return acc
      }, {} as { [goalId: string]: number }),
      createdAt: new Date().toISOString()
    }
  }

  // Insights Generation
  async generateInsights(): Promise<ZenoInsight[]> {
    if (!this.userProfile || this.reflections.length === 0) {
      return []
    }

    const prompt = `
You are Zeno, analyzing ${this.userProfile.name}'s patterns and providing insights.

User Profile:
- Intent Style: ${this.userProfile.intentStyle}
- Focus Areas: ${this.userProfile.focusAreas.join(', ')}

Recent Reflections:
${this.reflections.slice(-5).map(r => `- ${r.date} (${r.type}): Energy ${r.energyLevel}/10, Mood ${r.mood}/10`).join('\n')}

Goals Progress:
${this.goals.map(g => `- ${g.title}: ${g.progress}% complete`).join('\n')}

Generate 2-3 actionable insights about:
1. Energy patterns and optimal work times
2. Productivity trends and what's working
3. Goal alignment and focus areas
4. Motivation strategies that work

Each insight should be specific, actionable, and encouraging.

Format as JSON array:
[
  {
    "type": "energy_trend",
    "title": "...",
    "description": "...",
    "actionableAdvice": "...",
    "confidence": 8
  }
]
`

    try {
      const response = await this.aiService.chatWithAI({
        modelId: 'gemini-2.5-flash',
        temperature: 0.6,
        maxTokens: 1200
      }, prompt, [], 'You are Zeno, an expert data analyst and personal development coach.')

      const insights = this.parseInsights(response.response)
      return insights.map(insight => ({
        ...insight,
        id: `insight-${Date.now()}-${Math.random()}`,
        userId: this.userProfile!.id,
        createdAt: new Date().toISOString()
      }))
    } catch (error) {
      console.error('Failed to generate insights:', error)
      return []
    }
  }

  private parseInsights(aiResponse: string): Omit<ZenoInsight, 'id' | 'userId' | 'createdAt'>[] {
    try {
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (error) {
      console.error('Failed to parse insights:', error)
    }

    return [
      {
        type: 'productivity_pattern',
        title: 'Consistent Progress',
        description: 'You maintain steady progress across your focus areas.',
        actionableAdvice: 'Keep your current routine - it\'s working well for you.',
        confidence: 7
      }
    ]
  }

  // Getters
  getUserProfile(): UserProfile | null {
    return this.userProfile
  }

  getGoals(): Goal[] {
    return this.goals
  }

  getDailyPlans(): DailyPlan[] {
    return this.dailyPlans
  }

  getReflections(): Reflection[] {
    return this.reflections
  }
}
