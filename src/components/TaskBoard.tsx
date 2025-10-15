import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { useDatabase } from '../services/database/DatabaseContext'

const TaskBoard = () => {
  const { database } = useDatabase()
  const [tasks, setTasks] = useState<any[]>([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    if (database) {
      loadTasks()
    }
  }, [database])

  const loadTasks = async () => {
    if (!database) return
    
    try {
      const allTasks = await database.getTasks()
      setTasks(allTasks)
    } catch (error) {
      console.error('Failed to load tasks:', error)
    }
  }

  const createTask = async () => {
    if (!newTaskTitle.trim() || !database) return

    try {
      await database.createTask({
        user_id: 'demo-user-123',
        title: newTaskTitle,
        description: newTaskDescription,
        status: 'todo',
        priority: 3
      })
      
      setNewTaskTitle('')
      setNewTaskDescription('')
      setShowAddForm(false)
      loadTasks()
    } catch (error) {
      console.error('Failed to create task:', error)
    }
  }

  const updateTaskStatus = async (taskId: string, newStatus: 'todo' | 'doing' | 'done') => {
    if (!database) return
    
    try {
      await database.updateTask(taskId, { status: newStatus })
      loadTasks()
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }

  const deleteTask = async (taskId: string) => {
    if (!database) return
    
    try {
      await database.deleteTask(taskId)
      loadTasks()
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  const onDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result

    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const task = tasks.find(t => t.id.toString() === draggableId)
    if (!task) return

    const newStatus = destination.droppableId as 'todo' | 'doing' | 'done'
    await updateTaskStatus(task.id, newStatus)
  }

  const columns = [
    { id: 'todo', title: 'To Do', color: 'bg-gray-100', textColor: 'text-gray-700' },
    { id: 'doing', title: 'In Progress', color: 'bg-blue-100', textColor: 'text-blue-700' },
    { id: 'done', title: 'Done', color: 'bg-green-100', textColor: 'text-green-700' }
  ]

  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => task.status === status)
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

  return (
    <div className="h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Task Board</h1>
            <p className="text-gray-600">Drag and drop tasks between columns</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary flex items-center"
            disabled={!database}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Task
          </button>
        </div>

        {/* Loading State */}
        {!database && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 text-2xl mx-auto mb-4">
              ⏳
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Loading Database
            </h3>
            <p className="text-gray-500">
              Please wait while the database initializes...
            </p>
          </div>
        )}

        {/* Add Task Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold mb-4">Add New Task</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Task title"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="input-field"
                />
                <textarea
                  placeholder="Task description (optional)"
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  className="input-field"
                  rows={3}
                />
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createTask}
                    className="btn-primary"
                  >
                    Add Task
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Board */}
        {database && (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {columns.map((column) => (
                <div key={column.id} className="bg-white rounded-xl shadow-sm">
                  <div className={`p-4 rounded-t-xl ${column.color}`}>
                    <h3 className={`font-semibold ${column.textColor}`}>
                      {column.title}
                    </h3>
                    <span className={`text-sm ${column.textColor} opacity-75`}>
                      {getTasksByStatus(column.id).length} tasks
                    </span>
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
                        {getTasksByStatus(column.id).map((task, index) => (
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
                                  <button
                                    onClick={() => deleteTask(task.id)}
                                    className="text-gray-400 hover:text-red-500 ml-2"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
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
                                  <span className="text-xs text-gray-400">
                                    {new Date(task.created_at).toLocaleDateString()}
                                  </span>
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
              ))}
            </div>
          </DragDropContext>
        )}
      </div>
    </div>
  )
}

export default TaskBoard
