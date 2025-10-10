import { useState, useEffect } from 'react'

const HabitTracker = () => {
  const [habits, setHabits] = useState<any[]>([])
  const [newHabitName, setNewHabitName] = useState('')
  const [newHabitDescription, setNewHabitDescription] = useState('')
  const [newHabitIcon, setNewHabitIcon] = useState('🎯')
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    loadHabits()
  }, [])

  const loadHabits = async () => {
    // For now, we'll use mock data since we haven't implemented habit storage yet
    const mockHabits = [
      {
        id: '1',
        name: 'Morning Run',
        description: 'Run for 30 minutes every morning',
        icon: '🏃‍♂️',
        color: 'bg-green-500',
        streak: 7,
        bestStreak: 15,
        frequency: 'daily',
        completedToday: true,
        target: 30, // minutes
        current: 30
      },
      {
        id: '2',
        name: 'Read Books',
        description: 'Read for 30 minutes daily',
        icon: '📚',
        color: 'bg-blue-500',
        streak: 3,
        bestStreak: 12,
        frequency: 'daily',
        completedToday: false,
        target: 30, // minutes
        current: 15
      },
      {
        id: '3',
        name: 'Meditation',
        description: 'Meditate for 10 minutes',
        icon: '🧘‍♀️',
        color: 'bg-purple-500',
        streak: 21,
        bestStreak: 21,
        frequency: 'daily',
        completedToday: true,
        target: 10, // minutes
        current: 10
      },
      {
        id: '4',
        name: 'Drink Water',
        description: 'Drink 8 glasses of water',
        icon: '💧',
        color: 'bg-cyan-500',
        streak: 5,
        bestStreak: 8,
        frequency: 'daily',
        completedToday: false,
        target: 8, // glasses
        current: 5
      }
    ]
    setHabits(mockHabits)
  }

  const toggleHabit = async (habitId: string) => {
    setHabits(prev => prev.map(habit => 
      habit.id === habitId 
        ? { 
            ...habit, 
            completedToday: !habit.completedToday,
            streak: habit.completedToday ? habit.streak - 1 : habit.streak + 1,
            current: habit.completedToday ? habit.current - 1 : habit.current + 1
          }
        : habit
    ))
  }

  const addHabit = () => {
    if (!newHabitName.trim()) return

    const newHabit = {
      id: Date.now().toString(),
      name: newHabitName,
      description: newHabitDescription,
      icon: newHabitIcon,
      color: 'bg-gray-500',
      streak: 0,
      bestStreak: 0,
      frequency: 'daily',
      completedToday: false,
      target: 1,
      current: 0
    }

    setHabits(prev => [...prev, newHabit])
    setNewHabitName('')
    setNewHabitDescription('')
    setNewHabitIcon('🎯')
    setShowAddForm(false)
  }

  const deleteHabit = (habitId: string) => {
    setHabits(prev => prev.filter(habit => habit.id !== habitId))
  }

  const icons = ['🎯', '🏃‍♂️', '📚', '🧘‍♀️', '💧', '🍎', '💪', '🌅', '🌙', '📝', '🎵', '🎨']

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Habit Tracker
          </h1>
          <p className="text-gray-600">
            Build better habits, one day at a time
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Habit
        </button>
      </div>

      {/* Add Habit Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Add New Habit</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Icon
                </label>
                <div className="grid grid-cols-6 gap-2 mb-4">
                  {icons.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setNewHabitIcon(icon)}
                      className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-xl ${
                        newHabitIcon === icon ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              
              <input
                type="text"
                placeholder="Habit name"
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                className="input-field"
              />
              
              <textarea
                placeholder="Description (optional)"
                value={newHabitDescription}
                onChange={(e) => setNewHabitDescription(e.target.value)}
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
                  onClick={addHabit}
                  className="btn-primary"
                >
                  Add Habit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Habits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {habits.map((habit) => (
          <div key={habit.id} className="habit-card">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className={`w-12 h-12 ${habit.color} rounded-xl flex items-center justify-center text-white text-xl mr-3`}>
                  {habit.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{habit.name}</h3>
                  <p className="text-sm text-gray-500">{habit.description}</p>
                </div>
              </div>
              <button
                onClick={() => deleteHabit(habit.id)}
                className="text-gray-400 hover:text-red-500"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Progress</span>
                <span>{habit.current}/{habit.target}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${habit.color}`}
                  style={{ width: `${Math.min((habit.current / habit.target) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Streak Info */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{habit.streak}</div>
                  <div className="text-xs text-gray-500">Current</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{habit.bestStreak}</div>
                  <div className="text-xs text-gray-500">Best</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {habit.frequency}
                </div>
                <div className="text-xs text-gray-500">Frequency</div>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={() => toggleHabit(habit.id)}
              className={`w-full py-3 rounded-lg font-medium transition-all duration-200 ${
                habit.completedToday
                  ? 'bg-success-100 text-success-700 hover:bg-success-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {habit.completedToday ? '✓ Completed' : 'Mark Complete'}
            </button>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {habits.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 text-2xl mx-auto mb-4">
            🎯
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No habits yet
          </h3>
          <p className="text-gray-500 mb-6">
            Start building better habits by adding your first one.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary"
          >
            Add Your First Habit
          </button>
        </div>
      )}

      {/* Stats Summary */}
      {habits.length > 0 && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card text-center">
            <div className="text-2xl font-bold text-primary-600 mb-1">
              {habits.filter(h => h.completedToday).length}
            </div>
            <div className="text-sm text-gray-600">Completed Today</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-success-600 mb-1">
              {Math.max(...habits.map(h => h.streak))}
            </div>
            <div className="text-sm text-gray-600">Longest Streak</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">
              {habits.length}
            </div>
            <div className="text-sm text-gray-600">Total Habits</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HabitTracker
