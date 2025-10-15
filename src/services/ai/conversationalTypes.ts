// Enhanced types for conversational AI features
export interface GoalIntent {
  id: string
  userId: string
  originalText: string
  extractedGoal: string
  category: GoalCategory
  timeframe?: GoalTimeframe
  priority: number
  subgoals: SubGoal[]
  tasks: ExtractedTask[]
  context: GoalContext
  status: 'draft' | 'active' | 'completed' | 'archived'
  createdAt: string
  updatedAt: string
}

export interface SubGoal {
  id: string
  title: string
  description: string
  timeframe: GoalTimeframe
  priority: number
  parentGoalId: string
  tasks: ExtractedTask[]
}

export interface ExtractedTask {
  id: string
  title: string
  description: string
  priority: number
  estimatedDuration?: number // in minutes
  category: TaskCategory
  dependencies: string[]
  parentGoalId?: string
  parentSubGoalId?: string
}

export interface GoalContext {
  userProfile: {
    focusAreas: string[]
    motivationStyle: 'gentle' | 'firm' | 'neutral'
    planningStyle: 'structured' | 'flexible' | 'adaptive'
  }
  conversationHistory: ConversationContext[]
  clarificationQuestions: ClarificationQuestion[]
}

export interface ConversationContext {
  messageId: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  extractedEntities?: ExtractedEntity[]
}

export interface ExtractedEntity {
  type: 'goal' | 'timeline' | 'category' | 'priority' | 'resource' | 'task'
  value: string
  confidence: number
  position: { start: number; end: number }
}

export interface ClarificationQuestion {
  id: string
  question: string
  context: string
  expectedAnswerType: 'choice' | 'text' | 'number' | 'date'
  options?: string[]
  isAnswered: boolean
  answer?: string
  createdAt: string
}

export type GoalCategory = 
  | 'career' 
  | 'health' 
  | 'finance' 
  | 'learning' 
  | 'relationships' 
  | 'personal' 
  | 'creative' 
  | 'travel' 
  | 'home' 
  | 'other'

export type GoalTimeframe = 
  | 'daily' 
  | 'weekly' 
  | 'monthly' 
  | 'quarterly' 
  | 'yearly' 
  | 'long-term'

export type TaskCategory = 
  | 'planning' 
  | 'research' 
  | 'execution' 
  | 'review' 
  | 'communication' 
  | 'learning' 
  | 'maintenance'

export interface ConversationAnalysis {
  intent: ConversationIntent
  entities: ExtractedEntity[]
  confidence: number
  suggestedQuestions: ClarificationQuestion[]
  extractedGoals: Partial<GoalIntent>[]
}

export interface ConversationIntent {
  type: 'goal_setting' | 'task_management' | 'planning' | 'reflection' | 'clarification' | 'general'
  confidence: number
  details: string
}

export interface ConversationalResponse {
  message: string
  user_messages?: string[] // New field for user messages
  extractedData?: {
    goals: Partial<GoalIntent>[]
    tasks: ExtractedTask[]
    entities: ExtractedEntity[]
  }
  followUpQuestions: ClarificationQuestion[]
  suggestedActions: SuggestedAction[]
}

export interface SuggestedAction {
  type: 'create_goal' | 'create_task' | 'schedule_reminder' | 'set_deadline' | 'break_down_goal'
  description: string
  data: any
  priority: number
}
