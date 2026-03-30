import React, { memo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, ActivityIndicator, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task, TaskStatus, TASK_STATUS } from '../../hooks/useTasks';
import { Theme } from '../../theme/ThemeContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface TaskCardProps {
    task: Task;
    theme: Theme;
    onUpdateStatus: (id: string, status: TaskStatus) => void;
    onDelete: (id: string) => void;
    updatingId: string | null;
    drag?: () => void;
    onAI?: (task: Task) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
    High: '#F87171',
    Medium: '#FBBF24',
    Low: '#4ADE80',
};

const TaskCard = memo(({ task, theme, onUpdateStatus, onDelete, updatingId, drag, onAI }: TaskCardProps) => {
    const [expanded, setExpanded] = useState(false);
    const isUpdating = updatingId === task.id;

    const toggleExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(!expanded);
    };

    return (
        <View style={[styles.card, { backgroundColor: theme.colors.surfaceHighlight, borderColor: theme.colors.border }]}>
            <TouchableOpacity 
                activeOpacity={0.6}
                onPress={toggleExpand} 
                onLongPress={drag}
                style={styles.mainInfo}
            >
                <View style={styles.content}>
                    <View style={styles.titleRow}>
                        <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[task.priority] || '#888' }]} />
                        <Text style={[styles.title, { color: theme.colors.textPrimary, textDecorationLine: task.status === TASK_STATUS.COMPLETED ? 'line-through' : 'none', opacity: task.status === TASK_STATUS.COMPLETED ? 0.6 : 1 }]}>
                            {task.title}
                        </Text>
                    </View>
                    <View style={styles.metaRow}>
                        <Text style={[styles.category, { color: theme.colors.primary }]}>{task.category}</Text>
                        <Text style={{ color: theme.colors.textMuted }}>•</Text>
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{task.status}</Text>
                        {isUpdating && <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginLeft: 8 }} />}
                    </View>
                </View>
                
                <View style={styles.actions}>
                    <TouchableOpacity 
                        activeOpacity={0.6}
                        onPress={() => onDelete(task.id)} 
                        style={styles.iconBtn}
                        disabled={!!updatingId}
                    >
                        <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                    </TouchableOpacity>
                    <Ionicons 
                        name={expanded ? "chevron-up" : "chevron-down"} 
                        size={18} 
                        color={theme.colors.textMuted} 
                    />
                </View>
            </TouchableOpacity>

            {expanded && (
                <View style={[styles.details, { borderTopColor: theme.colors.border, backgroundColor: 'rgba(255,255,255,0.02)' }]}>
                    <Text style={[styles.desc, { color: theme.colors.textSecondary }]}>
                        {task.description || 'No additional details provided.'}
                    </Text>
                    {task.deadline && (
                        <View style={styles.deadlineRow}>
                            <Ionicons name="calendar-outline" size={14} color={theme.colors.warning} />
                            <Text style={[styles.deadlineText, { color: theme.colors.warning }]}>
                                Deadline: {new Date(task.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                            </Text>
                        </View>
                    )}

                    <View style={styles.statusActions}>
                        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Update Status:</Text>
                        <View style={styles.statusBtns}>
                            {Object.values(TASK_STATUS).map((s) => (
                                <TouchableOpacity
                                    key={s}
                                    onPress={() => onUpdateStatus(task.id, s)}
                                    disabled={task.status === s || !!updatingId}
                                    activeOpacity={0.6}
                                    style={[
                                        styles.statusBtn,
                                        { 
                                            backgroundColor: task.status === s ? theme.colors.primary : 'transparent',
                                            borderColor: task.status === s ? theme.colors.primary : theme.colors.border,
                                            opacity: task.status === s || !!updatingId ? 0.6 : 1
                                        }
                                    ]}
                                >
                                    <Text style={[styles.statusBtnText, { color: task.status === s ? '#FFF' : theme.colors.textSecondary }]}>
                                        {s}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={() => onAI?.(task)}
                        disabled={!!updatingId}
                        activeOpacity={0.7}
                        style={[styles.aiBtn, { backgroundColor: theme.colors.primary, opacity: !!updatingId ? 0.7 : 1 }]}
                    >
                        {isUpdating ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <>
                                <Ionicons name="sparkles" size={16} color="#FFF" />
                                <Text style={styles.aiBtnText}>Break into subtasks</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}, (prev, next) => {
    return (
        prev.task === next.task && 
        prev.theme === next.theme && 
        prev.updatingId === next.updatingId
    );
});

const styles = StyleSheet.create({
    card: { borderRadius: 16, marginBottom: 12, borderWidth: 1, overflow: 'hidden' },
    mainInfo: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    content: { flex: 1, gap: 4 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    priorityDot: { width: 8, height: 8, borderRadius: 4 },
    title: { fontSize: 16, fontWeight: '700' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    category: { fontSize: 12, fontWeight: '600' },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBtn: { padding: 4 },
    details: { padding: 16, borderTopWidth: 1 },
    desc: { fontSize: 14, lineHeight: 20 },
    deadlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
    deadlineText: { fontSize: 12, fontWeight: '600' },
    statusActions: { marginTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 16 },
    label: { fontSize: 11, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    statusBtns: { flexDirection: 'row', gap: 8 },
    statusBtn: { flex: 1, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
    statusBtnText: { fontSize: 11, fontWeight: '700' },
    aiBtn: { 
        marginTop: 16, 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: 8, 
        paddingVertical: 12, 
        borderRadius: 12 
    },
    aiBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 }
});

export default TaskCard;
