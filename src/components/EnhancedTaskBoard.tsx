import { useState, useEffect, useRef } from 'react'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { useDatabase } from '../services/database/DatabaseContext'
import { Task, Column, Reminder } from '../services/database/types'

const EnhancedTaskBoard = () => {
  const { database } = useDatabase()
  const [tasks, setTasks] = useState<Task[]>([])
  const [columns, setColumns] = useState<Column[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  
  // Task form states
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 3,
    due_date: '',
    reminder_date: '',
    column_id: ''
  })
  
  // Column form states
  const [showColumnForm, setShowColumnForm] = useState(false)
  const [editingColumn, setEditingColumn] = useState<Column | null>(null)
  const [newColumn, setNewColumn] = useState({
    title: '',
    color: 'bg-gray-100'
  })
  
  // Notification permission
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
  const notificationInterval = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (database) {
      loadData()
      initializeDefaultColumns()
      requestNotificationPermission()
      startReminderChecker()
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
      const [tasksData, columnsData, remindersData] = await Promise.all([
        database.getTasks(),
        database.getColumns(),
        database.getReminders()
      ])
      
      setTasks(tasksData)
      setColumns(columnsData.sort((a, b) => a.position - b.position))
      setReminders(remindersData)
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
          { title: 'To Do', color: 'bg-gray-100', position: 0 },
          { title: 'In Progress', color: 'bg-blue-100', position: 1 },
          { title: 'Done', color: 'bg-green-100', position: 2 }
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

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
    }
  }

  const startReminderChecker = () => {
    // Check for reminders every minute
    notificationInterval.current = setInterval(() => {
      checkReminders()
    }, 60000)
  }

  const checkReminders = async () => {
    if (notificationPermission !== 'granted') return
    
    const now = new Date()
    const upcomingReminders = reminders.filter(reminder => {
      const reminderDate = new Date(reminder.reminder_date)
      return !reminder.is_sent && reminderDate <= now && reminderDate > new Date(now.getTime() - 60000)
    })
    
    for (const reminder of upcomingReminders) {
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
      const position = tasks.filter(t => t.column_id === columnId).length
      
      await database.createTask({
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
          task_id: '', // Will be updated after task creation
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

  // Drag and drop
  const onDragEnd = async (result: any) => {
    if (!database) return
    
    const { destination, source, draggableId } = result
    
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return
    
    try {
      const task = tasks.find(t => t.id === draggableId)
      if (!task) return
      
      const newColumnId = destination.droppableId
      const newPosition = destination.index
      
      // Update task position and column
      await database.updateTask(task.id, {
        column_id: newColumnId,
        position: newPosition
      })
      
      // Update positions of other tasks in the same column
      const tasksInColumn = tasks.filter(t => t.column_id === newColumnId && t.id !== draggableId)
      for (let i = 0; i < tasksInColumn.length; i++) {
        if (i >= newPosition) {
          await database.updateTask(tasksInColumn[i].id, { position: i + 1 })
        }
      }
      
      await loadData()
    } catch (error) {
      console.error('Failed to update task position:', error)
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
      column_id: ''
    })
    setEditingTask(null)
    setShowTaskForm(false)
  }

  const resetColumnForm = () => {
    setNewColumn({
      title: '',
      color: 'bg-gray-100'
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
      column_id: task.column_id
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
    'bg-gray-100', 'bg-blue-100', 'bg-green-100', 'bg-yellow-100',
    'bg-red-100', 'bg-purple-100', 'bg-pink-100', 'bg-indigo-100'
  ]

  if (!database) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 text-2xl mx-auto mb-4">
            ⏳
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Database</h3>
          <p className="text-gray-500">Please wait while the database initializes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Enhanced Task Board</h1>
            <p className="text-gray-600">Drag and drop tasks, manage columns, set reminders</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowColumnForm(true)}
              className="btn-secondary flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Column
            </button>
            <button
              onClick={() => setShowTaskForm(true)}
              className="btn-primary flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Task
            </button>
          </div>
        </div>

        {/* Task Form Modal */}
        {showTaskForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold mb-4">
                {editingTask ? 'Edit Task' : 'Add New Task'}
              </h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Task title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="input-field"
                />
                <textarea
                  placeholder="Task description (optional)"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="input-field"
                  rows={3}
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: parseInt(e.target.value) })}
                      className="input-field"
                    >
                      <option value={1}>High</option>
                      <option value={2}>Medium</option>
                      <option value={3}>Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Column</label>
                    <select
                      value={newTask.column_id}
                      onChange={(e) => setNewTask({ ...newTask, column_id: e.target.value })}
                      className="input-field"
                    >
                      {columns.map(column => (
                        <option key={column.id} value={column.id}>{column.title}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <input
                      type="datetime-local"
                      value={newTask.due_date}
                      onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reminder</label>
                    <input
                      type="datetime-local"
                      value={newTask.reminder_date}
                      onChange={(e) => setNewTask({ ...newTask, reminder_date: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <button onClick={resetTaskForm} className="btn-secondary">Cancel</button>
                  <button
                    onClick={editingTask ? updateTask : createTask}
                    className="btn-primary"
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold mb-4">
                {editingColumn ? 'Edit Column' : 'Add New Column'}
              </h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Column title"
                  value={newColumn.title}
                  onChange={(e) => setNewColumn({ ...newColumn, title: e.target.value })}
                  className="input-field"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                  <div className="grid grid-cols-4 gap-2">
                    {colorOptions.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewColumn({ ...newColumn, color })}
                        className={`w-8 h-8 rounded ${color} border-2 ${
                          newColumn.color === color ? 'border-gray-900' : 'border-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <button onClick={resetColumnForm} className="btn-secondary">Cancel</button>
                  <button
                    onClick={editingColumn ? updateColumn : createColumn}
                    className="btn-primary"
                  >
                    {editingColumn ? 'Update Column' : 'Add Column'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Board */}
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {columns.map((column) => (
              <div key={column.id} className="bg-white rounded-xl shadow-sm">
                <div className={`p-4 rounded-t-xl ${column.color}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{column.title}</h3>
                      <span className="text-sm text-gray-600">
                        {getTasksByColumn(column.id).length} tasks
                      </span>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => openEditColumn(column)}
                        className="text-gray-600 hover:text-blue-500 p-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {columns.length > 1 && (
                        <button
                          onClick={() => deleteColumn(column.id)}
                          className="text-gray-600 hover:text-red-500 p-1"
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
                      className={`p-4 min-h-96 ${
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
                              className={`task-card mb-3 ${
                                snapshot.isDragging ? 'shadow-lg rotate-2' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-medium text-gray-900 flex-1">
                                  {task.title}
                                </h4>
                                <div className="flex space-x-1 ml-2">
                                  <button
                                    onClick={() => openEditTask(task)}
                                    className="text-gray-400 hover:text-blue-500"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => deleteTask(task.id)}
                                    className="text-gray-400 hover:text-red-500"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                              
                              {task.description && (
                                <p className="text-sm text-gray-600 mb-3">
                                  {task.description}
                                </p>
                              )}
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)} mr-2`}></div>
                                  <span className="text-xs text-gray-500">
                                    {getPriorityLabel(task.priority)}
                                  </span>
                                </div>
                                {task.due_date && (
                                  <span className={`text-xs ${
                                    isOverdue(task.due_date) ? 'text-red-500 font-semibold' : 'text-gray-400'
                                  }`}>
                                    {new Date(task.due_date).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                              
                              {task.reminder_date && (
                                <div className="mt-2 text-xs text-blue-500">
                                  🔔 {new Date(task.reminder_date).toLocaleString()}
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

export default EnhancedTaskBoard
