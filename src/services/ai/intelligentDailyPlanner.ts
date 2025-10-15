import { AIService } from './aiService'
import { DatabaseInterface } from '../database/types'
import { Task } from '../database/types'

export interface DailyPlan {
  id: string
  userId: string
  date: string
  totalHours: number
  timeBlocks: TimeBlock[]
  focusAreas: FocusArea[]
  energyLevel: number
  motivation: string
  createdAt: string
}

export interface TimeBlock {
  id: string
  startTime: string
  endTime: string
  duration: number // in minutes
  category: string
  title: string
  description: string
  priority: number
  tasks: PlannedTask[]
  isBreak: boolean
}

export interface PlannedTask {
  id: string
  title: string
  description: string
  estimatedDuration: number
  priority: number
  category: string
  dependencies?: string[]
}

export interface FocusArea {
  name: string
  tasks: PlannedTask[]
  totalTime: number
  priority: number
}

export interface DailyPlanConfirmation {
  planId: string
  approvedBlocks: string[]
  rejectedBlocks: string[]
  modifications: PlanModification[]
  userFeedback: string
}

export interface PlanModification {
  blockId: string
  type: 'time_change' | 'task_addition' | 'task_removal' | 'priority_change'
  details: string
  newValue?: any
}

export class IntelligentDailyPlanner {
  private aiService: AIService
  private database: DatabaseInterface
  private userId: string

  constructor(aiService: AIService, database: DatabaseInterface, userId: string) {
    this.aiService = aiService
    this.database = database
    this.userId = userId
  }

  /**
   * Generate a complete daily plan with time blocks and specific tasks
   * Only asks for confirmation, not for user to provide all details
   */
  async generateDailyPlan(
    userMessage: string,
    availableHours: number = 8,
    _existingTasks: Task[] = []
  ): Promise<DailyPlan> {
    try {
      // Extract focus areas and goals from user message
      const extractedInfo = await this.extractPlanningInfo(userMessage)
      
      // Generate intelligent time blocks with specific tasks
      const timeBlocks = await this.generateTimeBlocks(extractedInfo, availableHours)
      
      // Create the complete daily plan
      const dailyPlan: DailyPlan = {
        id: `plan-${Date.now()}`,
        userId: this.userId,
        date: new Date().toISOString().split('T')[0],
        totalHours: availableHours,
        timeBlocks,
        focusAreas: extractedInfo.focusAreas,
        energyLevel: extractedInfo.energyLevel || 7,
        motivation: extractedInfo.motivation || "Let's make today productive!",
        createdAt: new Date().toISOString()
      }

      return dailyPlan
    } catch (error) {
      console.error('Error generating daily plan:', error)
      return this.createFallbackPlan(availableHours)
    }
  }

  /**
   * Extract planning information from user message and existing tasks
   */
  private async extractPlanningInfo(userMessage: string): Promise<any> {
    const prompt = `
Analyze this user message and extract planning information:

User Message: "${userMessage}"

Extract focus areas and specific tasks. Look for patterns like:
- "Zeono App Development: Fix Critical Bug (2.5 hours)"
- "Hugeleap Clients: Make 5 Prospecting Calls (1.25 hours)"

Respond with JSON:
{
  "focusAreas": [
    {
      "name": "Zeono App Development",
      "tasks": [
        {
          "title": "Fix Critical Bug in User Onboarding Flow",
          "description": "Fix Critical Bug in User Onboarding Flow",
          "estimatedDuration": 150,
          "priority": 1,
          "category": "development"
        }
      ],
      "totalTime": 150,
      "priority": 1
    }
  ],
  "energyLevel": 7,
  "motivation": "Let's make today productive!"
}
`

    try {
      const response = await this.aiService.chatWithAI(
        prompt,
        {
          provider: 'gemini',
          modelId: 'gemini-2.5-flash',
          temperature: 0.6,
          maxTokens: 1000
        },
        'You are Zeno, an expert at extracting planning information from user messages.'
      )

      console.log('AI response for planning info:', response.content)
      return this.parsePlanningInfo(response.content)
    } catch (error) {
      console.error('Error extracting planning info:', error)
      return this.createFallbackPlanningInfo()
    }
  }

  /**
   * Generate intelligent time blocks with specific tasks
   */
  private async generateTimeBlocks(extractedInfo: any, availableHours: number): Promise<TimeBlock[]> {
    const timeBlocks: TimeBlock[] = []
    let currentTime = 9 * 60 // Start at 9 AM in minutes
    const endTime = currentTime + (availableHours * 60)
    
    // Sort focus areas by priority
    const sortedAreas = extractedInfo.focusAreas.sort((a: any, b: any) => b.priority - a.priority)
    
    for (let i = 0; i < sortedAreas.length && currentTime < endTime; i++) {
      const area = sortedAreas[i]
      
      // Create time blocks for this focus area
      const blocks = await this.createTimeBlocksForArea(area, currentTime, endTime)
      timeBlocks.push(...blocks)
      
      // Update current time
      if (blocks.length > 0) {
        const lastBlock = blocks[blocks.length - 1]
        currentTime = this.timeToMinutes(lastBlock.endTime)
      }
      
      // Add break if needed
      if (currentTime < endTime && i < sortedAreas.length - 1) {
        const breakBlock = this.createBreakBlock(currentTime)
        timeBlocks.push(breakBlock)
        currentTime = this.timeToMinutes(breakBlock.endTime)
      }
    }

    return timeBlocks
  }

  /**
   * Create time blocks for a specific focus area
   */
  private async createTimeBlocksForArea(
    area: FocusArea, 
    startTime: number, 
    endTime: number
  ): Promise<TimeBlock[]> {
    const blocks: TimeBlock[] = []
    let currentTime = startTime
    
    // Group tasks by priority and create blocks
    const highPriorityTasks = area.tasks.filter(task => task.priority === 1)
    const mediumPriorityTasks = area.tasks.filter(task => task.priority === 2)
    const lowPriorityTasks = area.tasks.filter(task => task.priority === 3)
    
    const allTasks = [...highPriorityTasks, ...mediumPriorityTasks, ...lowPriorityTasks]
    
    for (const task of allTasks) {
      if (currentTime >= endTime) break
      
      const blockDuration = Math.min(task.estimatedDuration, endTime - currentTime)
      const blockEndTime = currentTime + blockDuration
      
      const timeBlock: TimeBlock = {
        id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        startTime: this.minutesToTime(currentTime),
        endTime: this.minutesToTime(blockEndTime),
        duration: blockDuration,
        category: area.name,
        title: task.title,
        description: task.description,
        priority: task.priority,
        tasks: [task],
        isBreak: false
      }
      
      blocks.push(timeBlock)
      currentTime = blockEndTime
    }
    
    return blocks
  }

  /**
   * Create a break block
   */
  private createBreakBlock(startTime: number): TimeBlock {
    const breakDuration = 15 // 15 minutes
    const endTime = startTime + breakDuration
    
    return {
      id: `break-${Date.now()}`,
      startTime: this.minutesToTime(startTime),
      endTime: this.minutesToTime(endTime),
      duration: breakDuration,
      category: 'Break',
      title: 'Break Time',
      description: 'Take a break, stretch, or grab a snack',
      priority: 1,
      tasks: [],
      isBreak: true
    }
  }

  /**
   * Present plan to user for confirmation
   */
  async presentPlanForConfirmation(plan: DailyPlan): Promise<string> {
    const prompt = `
Create a confirmation message for this daily plan:

Plan Overview:
- Total Hours: ${plan.totalHours}
- Focus Areas: ${plan.focusAreas.map(area => area.name).join(', ')}
- Time Blocks: ${plan.timeBlocks.length}

Time Blocks:
${plan.timeBlocks.map(block => 
  `${block.startTime}-${block.endTime}: ${block.title} (${block.duration}min)`
).join('\n')}

Create a message that:
1. Shows the complete schedule
2. Asks for confirmation
3. Offers to modify specific blocks
4. Is encouraging and professional
5. Keeps it concise but comprehensive

Format it nicely with clear time blocks and ask "Does this schedule work for you?"
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
        'You are Zeno, presenting a daily plan for user confirmation.'
      )

      return response.content
    } catch (error) {
      console.error('Error creating confirmation message:', error)
      return this.createFallbackConfirmation(plan)
    }
  }

  /**
   * Process user confirmation and create tasks
   */
  async processPlanConfirmation(
    plan: DailyPlan,
    confirmation: DailyPlanConfirmation
  ): Promise<{
    createdTasks: Task[]
    message: string
  }> {
    try {
      const createdTasks: Task[] = []
      
      console.log('Processing plan confirmation:', {
        planId: plan.id,
        approvedBlocks: confirmation.approvedBlocks,
        totalBlocks: plan.timeBlocks.length
      })
      
      // Create tasks for approved blocks
      for (const blockId of confirmation.approvedBlocks) {
        const block = plan.timeBlocks.find(b => b.id === blockId)
        console.log('Processing block:', block)
        
        if (block && !block.isBreak) {
          console.log('Creating tasks for block:', block.title, 'Tasks:', block.tasks)
          
          for (const plannedTask of block.tasks) {
            try {
              const taskData = {
                user_id: this.userId,
                title: plannedTask.title,
                description: `${block.title}: ${plannedTask.description}`,
                status: 'todo',
                priority: plannedTask.priority,
                due_date: new Date().toISOString(),
                column_id: 'default',
                position: 0
              }
              
              console.log('Creating task with data:', taskData)
              const task = await this.database.createTask(taskData)
              console.log('Created task:', task)
              createdTasks.push(task)
            } catch (taskError) {
              console.error('Error creating individual task:', taskError)
            }
          }
        }
      }

      console.log('Total tasks created:', createdTasks.length)
      
      // Generate confirmation message
      const message = `Perfect! I've created ${createdTasks.length} tasks for your day. Your schedule is ready to go! 🚀`

      return { createdTasks, message }
    } catch (error) {
      console.error('Error processing plan confirmation:', error)
      return {
        createdTasks: [],
        message: "I've created your tasks. Let's make today productive!"
      }
    }
  }

  /**
   * Generate a quick daily plan based on user message
   */
  async generateQuickPlan(userMessage: string): Promise<{
    plan: DailyPlan
    confirmationMessage: string
  }> {
    try {
      console.log('Generating quick plan for message:', userMessage)
      
      // Generate the plan
      const plan = await this.generateDailyPlan(userMessage)
      console.log('Generated plan:', plan)
      
      // Create confirmation message
      const confirmationMessage = await this.presentPlanForConfirmation(plan)
      
      return { plan, confirmationMessage }
    } catch (error) {
      console.error('Error generating quick plan:', error)
      const fallbackPlan = this.createFallbackPlan(8)
      return {
        plan: fallbackPlan,
        confirmationMessage: "I've created a basic schedule for you. Does this work?"
      }
    }
  }

  // Helper methods
  private timeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number)
    return hours * 60 + minutes
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  private parsePlanningInfo(response: string): any {
    try {
      console.log('Parsing AI response:', response)
      
      // Try to find JSON in the response
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        console.log('Parsed planning info:', parsed)
        return parsed
      }
      
      // If no JSON found, try to extract information from the text
      return this.extractInfoFromText(response)
    } catch (error) {
      console.error('Error parsing planning info:', error)
      return this.createFallbackPlanningInfo()
    }
  }

  /**
   * Extract planning info from text when JSON parsing fails
   */
  private extractInfoFromText(response: string): any {
    const focusAreas = []
    
    // Look for patterns like "Zeono App Development: Task Name (X hours)"
    const taskPattern = /([^:]+):\s*([^(]+)\s*\(([^)]+)\)/g
    let match
    
    while ((match = taskPattern.exec(response)) !== null) {
      const areaName = match[1].trim()
      const taskTitle = match[2].trim()
      const timeStr = match[3].trim()
      
      // Convert time to minutes
      let duration = 60 // default 1 hour
      if (timeStr.includes('hour')) {
        const hours = parseFloat(timeStr.match(/(\d+(?:\.\d+)?)/)?.[1] || '1')
        duration = hours * 60
      } else if (timeStr.includes('min')) {
        duration = parseInt(timeStr.match(/(\d+)/)?.[1] || '60')
      }
      
      // Find or create focus area
      let area: any = focusAreas.find(a => a.name === areaName)
      if (!area) {
        area = {
          name: areaName,
          tasks: [],
          totalTime: 0,
          priority: 1
        }
        focusAreas.push(area)
      }
      
      // Add task to area
      area.tasks.push({
        title: taskTitle,
        description: taskTitle,
        estimatedDuration: duration,
        priority: 1,
        category: areaName.toLowerCase().replace(/\s+/g, '_')
      })
      
      area.totalTime += duration
    }
    
    console.log('Extracted focus areas from text:', focusAreas)
    
    return {
      focusAreas,
      energyLevel: 7,
      motivation: "Let's make today productive!",
      preferences: {
        workStyle: 'focused',
        breakFrequency: 'every-2-hours'
      }
    }
  }

  private createFallbackPlanningInfo(): any {
    return {
      focusAreas: [
        {
          name: 'Work Tasks',
          tasks: [
            {
              title: 'Complete priority task',
              description: 'Focus on your most important work',
              estimatedDuration: 120,
              priority: 1,
              category: 'work'
            }
          ],
          totalTime: 120,
          priority: 1
        }
      ],
      energyLevel: 7,
      motivation: "Let's make today productive!",
      preferences: {
        workStyle: 'focused',
        breakFrequency: 'every-2-hours'
      }
    }
  }

  private createFallbackPlan(availableHours: number): DailyPlan {
    return {
      id: `fallback-${Date.now()}`,
      userId: this.userId,
      date: new Date().toISOString().split('T')[0],
      totalHours: availableHours,
      timeBlocks: [
        {
          id: 'fallback-1',
          startTime: '09:00',
          endTime: '11:00',
          duration: 120,
          category: 'Work',
          title: 'Focus Work',
          description: 'Deep work on your most important tasks',
          priority: 1,
          tasks: [
            {
              id: 'task-1',
              title: 'Priority Task',
              description: 'Work on your most important task',
              estimatedDuration: 120,
              priority: 1,
              category: 'work'
            }
          ],
          isBreak: false
        },
        {
          id: 'break-1',
          startTime: '11:00',
          endTime: '11:15',
          duration: 15,
          category: 'Break',
          title: 'Break',
          description: 'Take a break',
          priority: 1,
          tasks: [],
          isBreak: true
        }
      ],
      focusAreas: [
        {
          name: 'Work',
          tasks: [
            {
              id: 'task-1',
              title: 'Priority Task',
              description: 'Work on your most important task',
              estimatedDuration: 120,
              priority: 1,
              category: 'work'
            }
          ],
          totalTime: 120,
          priority: 1
        }
      ],
      energyLevel: 7,
      motivation: "Let's make today productive!",
      createdAt: new Date().toISOString()
    }
  }

  private createFallbackConfirmation(plan: DailyPlan): string {
    return `Here's your ${plan.totalHours}-hour schedule for today:

${plan.timeBlocks.map(block => 
  `${block.startTime}-${block.endTime}: ${block.title}`
).join('\n')}

Does this schedule work for you? I can adjust any time blocks if needed.`
  }
}
