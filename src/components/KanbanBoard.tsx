import React, { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd'
import { useDatabase } from '../services/database/DatabaseContext'
import { Task } from '../services/database/types'

interface KanbanBoardProps {
  userId: string
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ userId }) => {
  const { database } = useDatabase()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTasks()
  }, [database])

  const fetchTasks = async () => {
    try {
      const tasks = await database.getTasks()
      setTasks(tasks)
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  // Refresh tasks when database changes
  useEffect(() => {
    fetchTasks()
  }, [database])

  const addTask = async () => {
    const title = prompt('Enter task title:')
    if (!title) return

    try {
      await database.createTask({
        user_id: userId,
        title,
        status: 'todo',
        priority: 3
      })
      fetchTasks() // Refresh the list
    } catch (error) {
      console.error('Error adding task:', error)
      alert('Failed to add task')
    }
  }

  const updateTaskStatus = async (taskId: string, newStatus: 'todo' | 'doing' | 'done') => {
    try {
      await database.updateTask(taskId, { status: newStatus })
      fetchTasks() // Refresh the list
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result

    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const task = tasks.find(t => t.id === draggableId)
    if (!task) return

    const newStatus = destination.droppableId as 'todo' | 'doing' | 'done'
    updateTaskStatus(task.id, newStatus)
  }

  const columns = [
    { id: 'todo', title: 'To Do', tasks: tasks.filter(t => t.status === 'todo') },
    { id: 'doing', title: 'Doing', tasks: tasks.filter(t => t.status === 'doing') },
    { id: 'done', title: 'Done', tasks: tasks.filter(t => t.status === 'done') }
  ]

  if (loading) {
    return <div className="kanban-board">Loading tasks...</div>
  }

  return (
    <div className="kanban-board">
      <DragDropContext onDragEnd={onDragEnd}>
        {columns.map(column => (
          <div key={column.id} className="kanban-column">
            <h3>{column.title}</h3>
            <Droppable droppableId={column.id.toString()}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    backgroundColor: snapshot.isDraggingOver ? '#374151' : 'transparent',
                    minHeight: '200px'
                  }}
                >
                  {column.tasks.map((task, index) => (
                    <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="task-item"
                          style={{
                            ...provided.draggableProps.style,
                            backgroundColor: snapshot.isDragging ? '#4b5563' : '#374151'
                          }}
                        >
                          <div>{task.title}</div>
                          {task.description && (
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                              {task.description}
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
      </DragDropContext>
      <button className="add-task-btn" onClick={addTask}>
        + Add Task
      </button>
    </div>
  )
}

export default KanbanBoard
