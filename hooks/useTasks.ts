import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { scheduleTaskReminder } from '../lib/notification';
import { breakdownTaskAI, parseSubtasks } from '../services/aiService';
import { useLoading } from '../src/context/LoadingContext';

export const TASK_STATUS = {
    PENDING: 'Pending',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
} as const;

export type TaskStatus = typeof TASK_STATUS[keyof typeof TASK_STATUS];

export type Priority = 'High' | 'Medium' | 'Low';

export interface Task {
    id: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: Priority;
    category: string;
    deadline: string | null;
    created_at: string;
    position: number;
}

export function useTasks() {
    const { setGlobalLoading } = useLoading();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const fetchTasks = useCallback(async (withGlobal = false) => {
        try {
            if (withGlobal) setGlobalLoading(true);
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('ts_tasks')
                .select('*')
                .eq('user_id', user.id)
                .is('deleted_date', null)
                .order('position', { ascending: true });

            if (error) throw error;
            
            const mapped: Task[] = (data || []).map(t => ({
                id: t.id,
                title: t.title,
                description: t.description,
                status: t.task_status as TaskStatus,
                priority: t.priority as Priority,
                category: t.category || 'Other',
                deadline: t.deadline,
                created_at: t.created_date,
                position: t.position || 0
            }));

            setTasks(mapped);
        } catch (error: any) {
            console.error('Fetch tasks error:', error.message);
        } finally {
            setLoading(false);
            if (withGlobal) setGlobalLoading(false);
        }
    }, [setGlobalLoading]);

    // ─── Realtime Subscription ───
    useEffect(() => {
        const channel = supabase
            .channel('tasks-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'ts_tasks' },
                () => {
                    fetchTasks();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchTasks]);

    const addTask = async (
        title: string, 
        description: string, 
        deadlineDate: Date | null,
        priority: Priority = 'Medium',
        category: string = 'Other'
    ) => {
        if (!title.trim()) {
            Alert.alert('Validation', 'Title is required');
            return null;
        }

        setGlobalLoading(true);
        try {
            setAdding(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not found');

            const minPos = tasks.length > 0 ? Math.min(...tasks.map(t => t.position)) : 0;
            const newPos = minPos - 1;

            const { data, error } = await supabase
                .from('ts_tasks')
                .insert([{
                    title: title.trim(),
                    description: description.trim() || null,
                    deadline: deadlineDate ? deadlineDate.toISOString() : null,
                    task_status: TASK_STATUS.PENDING,
                    priority,
                    category,
                    user_id: user.id,
                    created_by: user.email,
                    position: newPos
                }])
                .select()
                .single();

            if (error) throw error;

            const newTask: Task = {
                id: data.id,
                title: data.title,
                description: data.description,
                status: data.task_status as TaskStatus,
                priority: data.priority as Priority,
                category: data.category || 'Other',
                deadline: data.deadline,
                created_at: data.created_date,
                position: data.position
            };

            setTasks(prev => [newTask, ...prev]);

            if (newTask.deadline) {
                await scheduleTaskReminder(newTask.title, newTask.deadline);
            }

            return newTask;
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to add task');
            return null;
        } finally {
            setAdding(false);
            setGlobalLoading(false);
        }
    };

    const breakdownTask = async (task: Task) => {
        if (updatingId) return;

        setGlobalLoading(true);
        try {
            setUpdatingId(task.id);
            const result = await breakdownTaskAI(task.title);
            const subtasks = parseSubtasks(result);

            if (subtasks.length === 0) {
                Alert.alert('AI Info', 'No subtasks generated.');
                return;
            }

            for (const sub of subtasks) {
                await addTask(
                    sub,
                    `Subtask of: ${task.title}`,
                    null,
                    'Medium',
                    task.category
                );
            }

            Alert.alert('Success ✨', `Created ${subtasks.length} subtasks!`);
        } catch (error: any) {
            console.error('Breakdown error:', error.message);
            Alert.alert('AI Error', 'Failed to generate subtasks.');
        } finally {
            setUpdatingId(null);
            setGlobalLoading(false);
        }
    };

    const reorderTasks = async (newTasks: Task[]) => {
        const original = [...tasks];
        setTasks(newTasks);

        try {
            const updates = newTasks.map((t, index) => 
                supabase
                    .from('ts_tasks')
                    .update({ position: index })
                    .eq('id', t.id)
            );

            const results = await Promise.all(updates);
            const error = results.find(r => r.error);
            if (error) throw error.error;

        } catch (error: any) {
            console.error('Reorder error:', error.message);
            setTasks(original);
            Alert.alert('Error', 'Failed to save new order');
        }
    };

    const updateTaskStatus = async (id: string, newStatus: TaskStatus) => {
        if (updatingId) return;
        setGlobalLoading(true);
        const original = [...tasks];
        
        setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
        setUpdatingId(id);

        try {
            const { error } = await supabase
                .from('ts_tasks')
                .update({ 
                    task_status: newStatus,
                    modif_date: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;
        } catch (error: any) {
            setTasks(original);
            Alert.alert('Error', error.message || 'Failed to update status');
        } finally {
            setUpdatingId(null);
            setGlobalLoading(false);
        }
    };

    const deleteTask = async (id: string) => {
        if (updatingId) return;
        setGlobalLoading(true);
        const original = [...tasks];
        
        setTasks(prev => prev.filter(t => t.id !== id));
        setUpdatingId(id);

        try {
            const { error } = await supabase
                .from('ts_tasks')
                .update({ 
                    deleted_date: new Date().toISOString(),
                    task_status: 'Inactive'
                })
                .eq('id', id);

            if (error) throw error;
        } catch (error: any) {
            setTasks(original);
            Alert.alert('Error', error.message || 'Failed to delete task');
        } finally {
            setUpdatingId(null);
            setGlobalLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks(true); // Initial load with global loader
    }, [fetchTasks]);

    return {
        tasks,
        loading,
        adding,
        updatingId,
        fetchTasks,
        addTask,
        reorderTasks,
        breakdownTask,
        updateTaskStatus,
        deleteTask
    };
}
