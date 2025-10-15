import { useState, useEffect, useRef } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd'
import { useDatabase } from '../services/database/DatabaseContext'
import { Task, Column } from '../services/database/types'
import { AdvancedZenoCoachingService, UserProfile } from '../services/ai/advancedZenoCoachingService'

interface ZenoTaskBoardProps {
  coachingService: AdvancedZenoCoachingService
  userProfile: UserProfile | null
}

const ZenoTaskBoard = ({ coachingService }: ZenoTaskBoardProps) => {
  const { database } = useDatabase()
  const [tasks, setTasks] = useState<Task[]>([])
  const [columns, setColumns] = useState<Column[]>([])
  const [dailyPlan, setDailyPlan] = useState<any>(null)
  const [goals, setGoals] = useState<any[]>([])
  const [showZenoChat, setShowZenoChat] = useState(false)
  const [zenoMessage, setZenoMessage] = useState('')
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'zeno', message: string }>>([])
  
  // Task form states
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 3,
    due_date: '',
    reminder_date: '',
    column_id: '',
    goalId: ''
  })
  
  // Column form states
  const [showColumnForm, setShowColumnForm] = useState(false)
  const [editingColumn, setEditingColumn] = useState<Column | null>(null)
  const [newColumn, setNewColumn] = useState({
    title: '',
    color: 'bg-blue-100'
  })
  
  // UI states
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null)
  const [showDailyPlan, setShowDailyPlan] = useState(false)
  
  // Notification permission
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
  const notificationInterval = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (database) {
      loadData()
      initializeDefaultColumns()
      requestNotificationPermission()
      startReminderChecker()
      generateTodayPlan()
    }
    
    return () => {
      if (notificationInterval.current) {
        clearInterval(notificationInterval.current)
      }
    }
  }, [database])

  const loadData = async () => {
    if (!database) return
    
    try {
      const [tasksData, columnsData] = await Promise.all([
        database.getTasks(),
        database.getColumns()
      ])
      
      setTasks(tasksData)
      setColumns(columnsData.sort((a, b) => a.position - b.position))
      
      // Load goals from coaching service
      try {
        if ((coachingService as any).getGoals) {
          setGoals((coachingService as any).getGoals())
        } else {
          setGoals([]) // Fallback if method doesn't exist
        }
      } catch (error) {
        console.error('Failed to load goals:', error)
        setGoals([])
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    }
  }

  const initializeDefaultColumns = async () => {
    if (!database) return
    
    try {
      const existingColumns = await database.getColumns()
      if (existingColumns.length === 0) {
        const defaultColumns = [
          { title: 'Focus Tasks', color: 'bg-blue-100', position: 0 },
          { title: 'Maintenance', color: 'bg-orange-100', position: 1 },
          { title: 'Wellbeing', color: 'bg-green-100', position: 2 },
          { title: 'Completed', color: 'bg-gray-100', position: 3 }
        ]
        
        for (const column of defaultColumns) {
          await database.createColumn({
            user_id: 'demo-user-123',
            ...column
          })
        }
        
        await loadData()
      }
    } catch (error) {
      console.error('Failed to initialize default columns:', error)
    }
  }

  const generateTodayPlan = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      if ((coachingService as any).generateDailyPlan) {
        const plan = await (coachingService as any).generateDailyPlan(today, tasks)
        setDailyPlan(plan)
      } else {
        // Fallback: create a simple plan
        const fallbackPlan = {
          date: today,
          focusTasks: tasks.filter(t => t.priority === 1).slice(0, 3),
          maintenanceTasks: tasks.filter(t => t.priority === 2).slice(0, 2),
          wellbeingTasks: tasks.filter(t => t.priority === 3).slice(0, 2),
          completedTasks: [],
          createdAt: new Date().toISOString()
        }
        setDailyPlan(fallbackPlan)
      }
    } catch (error) {
      console.error('Failed to generate daily plan:', error)
    }
  }

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
    }
  }

  const startReminderChecker = () => {
    notificationInterval.current = setInterval(() => {
      checkReminders()
    }, 60000)
  }

  const checkReminders = async () => {
    if (notificationPermission !== 'granted') return
    
    const now = new Date()
    const upcomingReminders = await database?.getReminders() || []
    const upcoming = upcomingReminders.filter(reminder => {
      const reminderDate = new Date(reminder.reminder_date)
      return !reminder.is_sent && reminderDate <= now && reminderDate > new Date(now.getTime() - 60000)
    })
    
    for (const reminder of upcoming) {
      const task = tasks.find(t => t.id === reminder.task_id)
      if (task) {
        showNotification(`Reminder: ${task.title}`, reminder.message)
        await database?.updateReminder(reminder.id, { is_sent: true })
      }
    }
  }

  const showNotification = (title: string, body: string) => {
    if (notificationPermission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'task-reminder'
      })
    }
  }

  // Task operations
  const createTask = async () => {
    if (!newTask.title.trim() || !database) return
    
    try {
      const columnId = newTask.column_id || columns[0]?.id
      const tasksInColumn = tasks.filter(t => t.column_id === columnId)
      const position = tasksInColumn.length
      
      const createdTask = await database.createTask({
        user_id: 'demo-user-123',
        title: newTask.title,
        description: newTask.description,
        status: 'todo',
        priority: newTask.priority,
        due_date: newTask.due_date || undefined,
        reminder_date: newTask.reminder_date || undefined,
        column_id: columnId,
        position
      })
      
      // Create reminder if specified
      if (newTask.reminder_date) {
        await database.createReminder({
          user_id: 'demo-user-123',
          task_id: createdTask.id,
          reminder_date: newTask.reminder_date,
          message: `Don't forget: ${newTask.title}`,
          is_sent: false
        })
      }
      
      resetTaskForm()
      await loadData()
    } catch (error) {
      console.error('Failed to create task:', error)
    }
  }

  const updateTask = async () => {
    if (!editingTask || !database) return
    
    try {
      await database.updateTask(editingTask.id, {
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        due_date: newTask.due_date || undefined,
        reminder_date: newTask.reminder_date || undefined
      })
      
      resetTaskForm()
      await loadData()
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }

  const deleteTask = async (taskId: string) => {
    if (!database) return
    
    try {
      await database.deleteTask(taskId)
      await loadData()
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  // Column operations
  const createColumn = async () => {
    if (!newColumn.title.trim() || !database) return
    
    try {
      const position = columns.length
      await database.createColumn({
        user_id: 'demo-user-123',
        title: newColumn.title,
        color: newColumn.color,
        position
      })
      
      resetColumnForm()
      await loadData()
    } catch (error) {
      console.error('Failed to create column:', error)
    }
  }

  const updateColumn = async () => {
    if (!editingColumn || !database) return
    
    try {
      await database.updateColumn(editingColumn.id, {
        title: newColumn.title,
        color: newColumn.color
      })
      
      resetColumnForm()
      await loadData()
    } catch (error) {
      console.error('Failed to update column:', error)
    }
  }

  const deleteColumn = async (columnId: string) => {
    if (!database) return
    
    try {
      // Move tasks to first column before deleting
      const tasksInColumn = tasks.filter(t => t.column_id === columnId)
      const firstColumn = columns.find(c => c.id !== columnId)
      
      if (firstColumn && tasksInColumn.length > 0) {
        for (const task of tasksInColumn) {
          await database.updateTask(task.id, { column_id: firstColumn.id })
        }
      }
      
      await database.deleteColumn(columnId)
      await loadData()
    } catch (error) {
      console.error('Failed to delete column:', error)
    }
  }

  // Enhanced drag and drop
  const onDragEnd = async (result: DropResult) => {
    setHoveredColumn(null)
    
    if (!database) return
    
    const { destination, source, draggableId } = result
    
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return
    
    try {
      const task = tasks.find(t => t.id.toString() === draggableId)
      if (!task) return
      
      const newColumnId = destination.droppableId === 'unassigned' ? null : destination.droppableId
      const newPosition = destination.index
      
      // Get all tasks in the destination column
      const tasksInDestinationColumn = tasks.filter(t => {
        if (destination.droppableId === 'unassigned') {
          return (!t.column_id || t.column_id === 'default') && t.id.toString() !== draggableId
        }
        return t.column_id === newColumnId && t.id.toString() !== draggableId
      })
      
      // Update the dragged task
      await database.updateTask(task.id, {
        column_id: newColumnId || undefined,
        position: newPosition
      })
      
      // Update positions of other tasks in the destination column
      for (let i = 0; i < tasksInDestinationColumn.length; i++) {
        const taskToUpdate = tasksInDestinationColumn[i]
        let newPos = i
        
        if (i >= newPosition) {
          newPos = i + 1
        }
        
        await database.updateTask(taskToUpdate.id, { position: newPos })
      }
      
      // Update positions of tasks in the source column (if different)
      if (source.droppableId !== newColumnId) {
        const tasksInSourceColumn = tasks.filter(t => t.column_id === source.droppableId && t.id !== draggableId)
        for (let i = 0; i < tasksInSourceColumn.length; i++) {
          await database.updateTask(tasksInSourceColumn[i].id, { position: i })
        }
      }
      
      await loadData()
    } catch (error) {
      console.error('Failed to update task position:', error)
    }
  }

  const onDragStart = () => {
    // Drag started
  }

  // Zeno Chat
  const sendMessageToZeno = async () => {
    if (!zenoMessage.trim()) return
    
    const userMessage = zenoMessage
    setZenoMessage('')
    setChatHistory(prev => [...prev, { role: 'user', message: userMessage }])
    
    try {
      const response = await (coachingService as any).chatWithZeno(userMessage, {
        tasks: tasks,
        goals: goals,
        dailyPlan: dailyPlan
      })
      
      setChatHistory(prev => [...prev, { role: 'zeno', message: response }])
    } catch (error) {
      console.error('Failed to chat with Zeno:', error)
      setChatHistory(prev => [...prev, { role: 'zeno', message: "I'm here to help! What would you like to work on today?" }])
    }
  }

  // Form helpers
  const resetTaskForm = () => {
    setNewTask({
      title: '',
      description: '',
      priority: 3,
      due_date: '',
      reminder_date: '',
      column_id: '',
      goalId: ''
    })
    setEditingTask(null)
    setShowTaskForm(false)
  }

  const resetColumnForm = () => {
    setNewColumn({
      title: '',
      color: 'bg-blue-100'
    })
    setEditingColumn(null)
    setShowColumnForm(false)
  }

  const openEditTask = (task: Task) => {
    setEditingTask(task)
    setNewTask({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      due_date: task.due_date || '',
      reminder_date: task.reminder_date || '',
      column_id: task.column_id,
      goalId: ''
    })
    setShowTaskForm(true)
  }

  const openEditColumn = (column: Column) => {
    setEditingColumn(column)
    setNewColumn({
      title: column.title,
      color: column.color
    })
    setShowColumnForm(true)
  }

  const getTasksByColumn = (columnId: string) => {
    if (columnId === 'unassigned') {
      return tasks
        .filter(task => !task.column_id || task.column_id === 'default')
        .sort((a, b) => a.position - b.position)
    }
    return tasks
      .filter(task => task.column_id === columnId)
      .sort((a, b) => a.position - b.position)
  }

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'bg-red-500'
      case 2: return 'bg-yellow-500'
      case 3: return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1: return 'High'
      case 2: return 'Medium'
      case 3: return 'Low'
      default: return 'Normal'
    }
  }

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date()
  }

  const colorOptions = [
    'bg-blue-100',
    'bg-green-100',
    'bg-orange-100',
    'bg-pink-100',
    'bg-purple-100',
    'bg-yellow-100',
    'bg-indigo-100',
    'bg-teal-100'
  ]

  if (!database) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 text-3xl mx-auto mb-6 animate-pulse">
            ⏳
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">Loading Database</h3>
          <p className="text-gray-600">Please wait while the database initializes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Zeno Task Board
            </h1>
            <p className="text-gray-600 text-lg">Your AI coach for intentional living</p>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => setShowDailyPlan(true)}
              className="px-6 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-300 flex items-center space-x-2 group"
            >
              <svg className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>Today's Plan</span>
            </button>
            <button
              onClick={() => setShowZenoChat(true)}
              className="px-6 py-3 bg-blue-500 rounded-lg text-white hover:bg-blue-600 transition-all duration-300 flex items-center space-x-2 shadow-sm group"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Chat with Zeno</span>
            </button>
            <button
              onClick={() => setShowColumnForm(true)}
              className="px-6 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-300 flex items-center space-x-2 group"
            >
              <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Add Column</span>
            </button>
            <button
              onClick={() => setShowTaskForm(true)}
              className="px-6 py-3 bg-green-500 rounded-lg text-white hover:bg-green-600 transition-all duration-300 flex items-center space-x-2 shadow-sm group"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Task</span>
            </button>
          </div>
        </div>

        {/* Daily Plan Modal */}
        {showDailyPlan && dailyPlan && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 w-full max-w-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Today's Plan</h2>
                <button
                  onClick={() => setShowDailyPlan(false)}
                  className="p-2 bg-white/20 rounded-lg text-white hover:bg-white/30 transition-all duration-300"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-500/20 to-purple-600/20 rounded-xl border border-blue-500/30">
                <p className="text-white text-lg font-medium">{dailyPlan.motivation}</p>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-blue-300 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Focus Tasks (Most Impactful)
                  </h3>
                  <div className="space-y-2">
                    {dailyPlan.focusTasks.map((task: any, index: number) => (
                      <div key={index} className="p-3 bg-white/5 rounded-lg border border-white/10">
                        <div className="font-medium text-white">{task.title}</div>
                        <div className="text-white/70 text-sm">{task.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-orange-300 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Maintenance Tasks (Routines)
                  </h3>
                  <div className="space-y-2">
                    {dailyPlan.maintenanceTasks.map((task: any, index: number) => (
                      <div key={index} className="p-3 bg-white/5 rounded-lg border border-white/10">
                        <div className="font-medium text-white">{task.title}</div>
                        <div className="text-white/70 text-sm">{task.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-green-300 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    Wellbeing Tasks (Self-Care)
                  </h3>
                  <div className="space-y-2">
                    {dailyPlan.wellbeingTasks.map((task: any, index: number) => (
                      <div key={index} className="p-3 bg-white/5 rounded-lg border border-white/10">
                        <div className="font-medium text-white">{task.title}</div>
                        <div className="text-white/70 text-sm">{task.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Zeno Chat Modal */}
        {showZenoChat && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 w-full max-w-2xl h-96 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">
                    Z
                  </div>
                  Chat with Zeno
                </h2>
                <button
                  onClick={() => setShowZenoChat(false)}
                  className="p-2 bg-white/20 rounded-lg text-white hover:bg-white/30 transition-all duration-300"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto mb-4 space-y-3">
                {chatHistory.length === 0 && (
                  <div className="text-center text-white/70 py-8">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
                      👋
                    </div>
                    <p>Hi! I'm Zeno, your personal AI coach.</p>
                    <p>How can I help you today?</p>
                  </div>
                )}
                {chatHistory.map((chat, index) => (
                  <div key={index} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs p-3 rounded-xl ${
                      chat.role === 'user' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-white/10 text-white border border-white/20'
                    }`}>
                      {chat.message}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex space-x-3">
                <input
                  type="text"
                  placeholder="Ask Zeno anything..."
                  value={zenoMessage}
                  onChange={(e) => setZenoMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessageToZeno()}
                  className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                />
                <button
                  onClick={sendMessageToZeno}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-white hover:from-blue-600 hover:to-purple-700 transition-all duration-300"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Task Form Modal */}
        {showTaskForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 w-full max-w-md">
              <h2 className="text-2xl font-bold text-white mb-6">
                {editingTask ? 'Edit Task' : 'Add New Task'}
              </h2>
              <div className="space-y-6">
                <div>
                  <input
                    type="text"
                    placeholder="Task title"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  />
                </div>
                <div>
                  <textarea
                    placeholder="Task description (optional)"
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 resize-none"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Priority</label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    >
                      <option value={1}>High</option>
                      <option value={2}>Medium</option>
                      <option value={3}>Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Column</label>
                    <select
                      value={newTask.column_id}
                      onChange={(e) => setNewTask({ ...newTask, column_id: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    >
                      {columns.map(column => (
                        <option key={column.id} value={column.id}>{column.title}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Due Date</label>
                    <input
                      type="datetime-local"
                      value={newTask.due_date}
                      onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Reminder</label>
                    <input
                      type="datetime-local"
                      value={newTask.reminder_date}
                      onChange={(e) => setNewTask({ ...newTask, reminder_date: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-4">
                  <button 
                    onClick={resetTaskForm} 
                    className="px-6 py-3 bg-white/10 border border-white/20 rounded-xl text-white hover:bg-white/20 transition-all duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingTask ? updateTask : createTask}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-white hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg shadow-blue-500/25"
                  >
                    {editingTask ? 'Update Task' : 'Add Task'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Column Form Modal */}
        {showColumnForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 w-full max-w-md">
              <h2 className="text-2xl font-bold text-white mb-6">
                {editingColumn ? 'Edit Column' : 'Add New Column'}
              </h2>
              <div className="space-y-6">
                <div>
                  <input
                    type="text"
                    placeholder="Column title"
                    value={newColumn.title}
                    onChange={(e) => setNewColumn({ ...newColumn, title: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-3">Color Theme</label>
                  <div className="grid grid-cols-4 gap-3">
                    {colorOptions.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewColumn({ ...newColumn, color })}
                        className={`w-12 h-12 rounded-xl bg-gradient-to-r ${color} border-2 transition-all duration-300 ${
                          newColumn.color === color ? 'border-white scale-110 shadow-lg' : 'border-white/30 hover:border-white/60'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex justify-end space-x-4">
                  <button 
                    onClick={resetColumnForm} 
                    className="px-6 py-3 bg-white/10 border border-white/20 rounded-xl text-white hover:bg-white/20 transition-all duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingColumn ? updateColumn : createColumn}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-white hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg shadow-blue-500/25"
                  >
                    {editingColumn ? 'Update Column' : 'Add Column'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Board */}
        <DragDropContext onDragEnd={onDragEnd} onDragStart={onDragStart}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Unassigned Tasks Column */}
            {getTasksByColumn('unassigned').length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                <div className="p-6 rounded-t-xl bg-yellow-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">Unassigned Tasks</h3>
                      <span className="text-gray-600 text-sm">
                        {getTasksByColumn('unassigned').length} tasks
                      </span>
                    </div>
                  </div>
                </div>
                
                <Droppable droppableId="unassigned">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`p-4 min-h-[200px] transition-colors duration-200 ${
                        snapshot.isDraggingOver ? 'bg-yellow-50' : 'bg-gray-50'
                      }`}
                    >
                      {getTasksByColumn('unassigned').map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white border border-gray-200 rounded-lg p-4 mb-3 shadow-sm transition-all duration-200 ${
                                snapshot.isDragging ? 'shadow-lg rotate-2' : 'hover:shadow-md'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-medium text-gray-900 text-sm mb-1">{task.title}</h4>
                                  {task.description && (
                                    <p className="text-gray-600 text-xs mb-2">{task.description}</p>
                                  )}
                                  <div className="flex items-center space-x-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getPriorityColor(task.priority)}`}>
                                      {getPriorityLabel(task.priority)}
                                    </span>
                                    {task.due_date && (
                                      <span className={`text-xs px-2 py-1 rounded-full ${
                                        isOverdue(task.due_date) ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                      }`}>
                                        {new Date(task.due_date).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex space-x-1 ml-2">
                                  <button
                                    onClick={() => openEditTask(task)}
                                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => deleteTask(task.id)}
                                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            )}
            
            {columns.map((column) => (
              <div 
                key={column.id} 
                className={`bg-white border border-gray-200 rounded-xl shadow-sm transition-all duration-300 ${
                  hoveredColumn === column.id ? 'shadow-md scale-105' : ''
                }`}
                onMouseEnter={() => setHoveredColumn(column.id)}
                onMouseLeave={() => setHoveredColumn(null)}
              >
                <div className={`p-6 rounded-t-xl ${column.color}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{column.title}</h3>
                      <span className="text-gray-600 text-sm">
                        {getTasksByColumn(column.id).length} tasks
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openEditColumn(column)}
                        className="p-2 bg-white rounded-lg text-gray-600 hover:bg-gray-50 transition-all duration-300"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {columns.length > 1 && (
                        <button
                          onClick={() => deleteColumn(column.id)}
                          className="p-2 bg-white rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all duration-300"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                <Droppable droppableId={column.id.toString()}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`p-6 min-h-96 transition-all duration-300 ${
                        snapshot.isDraggingOver ? 'bg-gray-50' : ''
                      }`}
                    >
                      {getTasksByColumn(column.id).map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`mb-4 bg-white border border-gray-200 rounded-lg p-4 transition-all duration-300 hover:shadow-md group ${
                                snapshot.isDragging ? 'shadow-lg rotate-2 scale-105' : 'hover:scale-105'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <h4 className="font-semibold text-gray-900 flex-1 text-lg">
                                  {task.title}
                                </h4>
                                <div className="flex space-x-2 ml-3">
                                  <button
                                    onClick={() => openEditTask(task)}
                                    className="p-1.5 bg-gray-100 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition-all duration-300 opacity-0 group-hover:opacity-100"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => deleteTask(task.id)}
                                    className="p-1.5 bg-gray-100 rounded-lg text-gray-600 hover:text-red-600 hover:bg-red-50 transition-all duration-300 opacity-0 group-hover:opacity-100"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                              
                              {task.description && (
                                <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                                  {task.description}
                                </p>
                              )}
                              
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                  <div className={`w-3 h-3 rounded-full ${getPriorityColor(task.priority)}`}></div>
                                  <span className="text-gray-500 text-sm font-medium">
                                    {getPriorityLabel(task.priority)}
                                  </span>
                                </div>
                                {task.due_date && (
                                  <span className={`text-sm font-medium ${
                                    isOverdue(task.due_date) ? 'text-red-500' : 'text-gray-500'
                                  }`}>
                                    {new Date(task.due_date).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                              
                              {task.reminder_date && (
                                <div className="flex items-center space-x-2 text-blue-500 text-sm">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 1 0-15 0v5h5l-5 5-5-5h5v-5a7.5 7.5 0 1 0 15 0v5z" />
                                  </svg>
                                  <span>{new Date(task.reminder_date).toLocaleString()}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>
    </div>
  )
}

export default ZenoTaskBoard
