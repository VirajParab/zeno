import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { userId, text } = req.body;

    if (!userId || !text) {
      return res.status(400).json({ error: 'Missing userId or text' });
    }

    // Get recent messages for context
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', userId)
      .order('inserted_at', { ascending: false })
      .limit(10);

    // Prepare messages for OpenAI
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful personal assistant. Keep responses concise and actionable. Help users manage their tasks and plan their day.'
      },
      ...(recentMessages?.reverse().map(msg => ({
        role: msg.role,
        content: msg.content
      })) || []),
      {
        role: 'user',
        content: text
      }
    ];

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages as any,
      max_tokens: 400,
      temperature: 0.7
    });

    const assistantReply = completion.choices[0]?.message?.content || 'Sorry, I could not process that request.';

    // Save both user message and assistant reply
    await supabase.from('messages').insert([
      {
        user_id: userId,
        role: 'user',
        content: text
      },
      {
        user_id: userId,
        role: 'assistant',
        content: assistantReply
      }
    ]);

    res.json({ text: assistantReply });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Tasks endpoints
app.get('/api/tasks/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const { userId, title, description, status = 'todo', priority = 3 } = req.body;
    
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        title,
        description,
        status,
        priority
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const { data, error } = await supabase
      .from('tasks')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Today summary endpoint
app.get('/api/summary/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const today = new Date().toISOString().split('T')[0];
    
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', today);

    const tasksToday = tasks?.length || 0;
    const tasksCompleted = tasks?.filter(t => t.status === 'done').length || 0;
    
    // Mock unread mail count - replace with actual mail API later
    const unreadMail = Math.floor(Math.random() * 5);

    res.json({
      tasksToday,
      tasksCompleted,
      unreadMail
    });
  } catch (error) {
    console.error('Error getting summary:', error);
    res.status(500).json({ error: 'Failed to get summary' });
  }
});

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});
