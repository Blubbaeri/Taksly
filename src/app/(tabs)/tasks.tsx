import React, { useState, ComponentProps, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    StatusBar,
    TouchableOpacity,
    TextInput,
    Modal,
    Pressable,
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    PanResponder,
    FlatList,
    ScrollView,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import { Card } from '../../../components/Card';
import { Ionicons } from '@expo/vector-icons';
import { requestNotificationPermissions } from '../../../lib/notification';
import { useTasks, TASK_STATUS, TaskStatus, Priority, Task } from '../../../hooks/useTasks';
import TaskCard from '../../../components/tasks/TaskCard';

type FilterTab = 'All' | TaskStatus;

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;

const PRIORITY_COLORS: Record<Priority, string> = {
    High: '#F87171',
    Medium: '#FBBF24',
    Low: '#4ADE80',
};

export default function Tasks() {
    const theme = useTheme();
    const {
        tasks,
        loading,
        adding,
        updatingId,
        addTask,
        updateTaskStatus,
        deleteTask,
        reorderTasks,
        breakdownTask,
        fetchTasks,
    } = useTasks();

    const [activeFilter, setActiveFilter] = useState<FilterTab>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchTasks();
        setRefreshing(false);
    }, [fetchTasks]);

    // Form state
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newDeadline, setNewDeadline] = useState<Date | null>(null);
    const [newPriority, setNewPriority] = useState<Priority>('Medium');
    const [newCategory, setNewCategory] = useState('Work');

    // ─── Animations ───
    const slideAnim = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropAnim = React.useRef(new Animated.Value(0)).current;

    const panResponder = React.useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 10,
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) slideAnim.setValue(gestureState.dy);
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 150 || gestureState.vy > 0.5) {
                    handleClose();
                } else {
                    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 25, stiffness: 200 }).start();
                }
            },
        })
    ).current;

    const handleOpen = useCallback(() => {
        setShowAddModal(true);
        Animated.parallel([
            Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 25, stiffness: 200 }),
            Animated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        ]).start();
    }, [slideAnim, backdropAnim]);

    const handleClose = useCallback(() => {
        Animated.parallel([
            Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
            Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start(() => setShowAddModal(false));
    }, [slideAnim, backdropAnim]);

    const handleUpdateStatus = useCallback((id: string, status: TaskStatus) => {
        updateTaskStatus(id, status);
    }, [updateTaskStatus]);

    const handleDelete = useCallback((id: string) => {
        deleteTask(id);
    }, [deleteTask]);

    React.useEffect(() => {
        requestNotificationPermissions();
    }, []);

    const filters: FilterTab[] = ['All', ...Object.values(TASK_STATUS)];

    const filtered = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return tasks.filter(t => {
            const matchFilter = activeFilter === 'All' || t.status === activeFilter;
            const matchSearch =
                t.title.toLowerCase().includes(query) ||
                ((t.description || '').toLowerCase().includes(query));
            return matchFilter && matchSearch;
        });
    }, [tasks, activeFilter, searchQuery]);

    const stats = useMemo(() => ({
        total: tasks.length,
        completed: tasks.filter(t => t.status === TASK_STATUS.COMPLETED).length,
        pending: tasks.filter(t => t.status === TASK_STATUS.PENDING).length,
        inProgress: tasks.filter(t => t.status === TASK_STATUS.IN_PROGRESS).length,
    }), [tasks]);

    const handleAddTask = async () => {
        const success = await addTask(newTitle, newDesc, newDeadline, newPriority, newCategory);
        if (success) {
            handleClose();
            // Bug #18 fix: reset form
            setNewTitle('');
            setNewDesc('');
            setNewDeadline(null);
            setNewPriority('Medium');
            setNewCategory('');
        }
    };

    const renderHeader = () => (
        <View>
            <Card style={styles.progressCard}>
                <View style={styles.statsRow}>
                    <StatChip icon="hourglass-outline" label="Pending" count={stats.pending} color="#888" />
                    <StatChip icon="sync-outline" label="Active" count={stats.inProgress} color="#FFA940" />
                    <StatChip icon="checkmark-circle-outline" label="Done" count={stats.completed} color="#52C41A" />
                </View>
            </Card>

            <View style={[styles.searchBox, { backgroundColor: theme.colors.surfaceHighlight, borderColor: theme.colors.border }]}>
                <Ionicons name="search" size={18} color={theme.colors.textMuted} />
                <TextInput
                    style={[styles.searchInput, { color: theme.colors.textPrimary }]}
                    placeholder="Search your tasks..."
                    placeholderTextColor={theme.colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <View style={styles.tabScrollWrapper}>
                <FlatList
                    horizontal
                    data={filters}
                    keyExtractor={item => String(item)}
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item: f }) => (
                        <TouchableOpacity
                            onPress={() => setActiveFilter(f)}
                            style={[
                                styles.tab,
                                {
                                    backgroundColor: activeFilter === f ? theme.colors.primary : theme.colors.surfaceHighlight,
                                    borderColor: theme.colors.border
                                }
                            ]}
                        >
                            <Text style={[styles.tabText, { color: activeFilter === f ? '#FFF' : theme.colors.textSecondary }]}>
                                {f}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>
        </View>
    );

    const renderEmpty = () => (
        <View style={styles.empty}>
            <Ionicons name="documents-outline" size={48} color={theme.colors.textMuted} />
            <Text style={{ color: theme.colors.textSecondary, marginTop: 12 }}>
                {loading ? 'Loading tasks...' : 'No tasks found in this category.'}
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />

            <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                <View>
                    <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>My Tasks</Text>
                    <Text style={[styles.headerSub, { color: theme.colors.textSecondary }]}>
                        {stats.completed}/{stats.total} tasks completed
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={handleOpen}
                    style={[styles.addBtn, { backgroundColor: theme.colors.primary }]}
                    activeOpacity={0.8}
                >
                    <Ionicons name="add" size={24} color="#FFF" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={filtered}
                keyExtractor={item => String(item.id)}
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={theme.colors.primary}
                        colors={[theme.colors.primary]}
                    />
                }
                renderItem={({ item }) => (
                    <TaskCard
                        task={item}
                        theme={theme}
                        onUpdateStatus={handleUpdateStatus}
                        onDelete={handleDelete}
                        updatingId={updatingId}
                        onAI={breakdownTask}
                    />
                )}
            />

            <Modal visible={showAddModal} transparent animationType="none" statusBarTranslucent>
                <Animated.View style={[styles.modalOverlay, { opacity: backdropAnim }]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
                </Animated.View>

                <Animated.View
                    style={[
                        styles.modalSheet,
                        { backgroundColor: theme.colors.surfaceHighlight, transform: [{ translateY: slideAnim }] }
                    ]}
                >
                    <View {...panResponder.panHandlers} style={styles.modalHeader}>
                        <View style={styles.modalHandle} />
                        <TouchableOpacity style={styles.modalCloseBtn} onPress={handleClose}>
                            <Ionicons name="close" size={20} color={theme.colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>Create Task</Text>

                        <TextInput
                            style={[styles.modalInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                            placeholder="Task Name"
                            placeholderTextColor={theme.colors.textMuted}
                            value={newTitle}
                            onChangeText={setNewTitle}
                        />

                        <TextInput
                            style={[styles.modalInput, { height: 80, textAlignVertical: 'top', color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                            placeholder="Description (Optional)"
                            placeholderTextColor={theme.colors.textMuted}
                            value={newDesc}
                            onChangeText={setNewDesc}
                            multiline
                        />

                        <Text style={styles.label}>Priority</Text>
                        <View style={styles.chipRow}>
                            {(['High', 'Medium', 'Low'] as Priority[]).map(p => (
                                <TouchableOpacity
                                    key={p}
                                    onPress={() => setNewPriority(p)}
                                    style={[styles.chip, { borderColor: PRIORITY_COLORS[p], backgroundColor: newPriority === p ? PRIORITY_COLORS[p] + '20' : 'transparent' }]}
                                >
                                    <Text style={{ color: PRIORITY_COLORS[p], fontSize: 13, fontWeight: '700' }}>{p}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            onPress={handleAddTask}
                            disabled={!newTitle.trim() || adding}
                            style={[styles.saveBtn, { backgroundColor: theme.colors.primary, opacity: !newTitle.trim() || adding ? 0.6 : 1 }]}
                        >
                            {adding ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Task</Text>}
                        </TouchableOpacity>
                    </ScrollView>
                </Animated.View>
            </Modal>
        </SafeAreaView>
    );
}

function StatChip({ icon, label, count, color }: { icon: ComponentProps<typeof Ionicons>['name']; label: string; count: number; color: string }) {
    return (
        <View style={[styles.statChip, { backgroundColor: color + '15' }]}>
            <Ionicons name={icon} size={20} color={color} style={{ marginBottom: 4 }} />
            <Text style={{ fontSize: 22, fontWeight: '800', color }}>{count}</Text>
            <Text style={{ fontSize: 10, color, opacity: 0.8, fontWeight: '700', marginTop: 2 }}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 18, alignItems: 'center', borderBottomWidth: 1 },
    headerTitle: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
    headerSub: { fontSize: 13 },
    addBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 100 },
    progressCard: { padding: 16, marginBottom: 16 },
    statsRow: { flexDirection: 'row', gap: 8 },
    statChip: { alignItems: 'center', paddingVertical: 12, borderRadius: 16, flex: 1 },
    searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, height: 50, gap: 10, marginBottom: 16 },
    searchInput: { flex: 1, fontSize: 15 },
    tabScrollWrapper: { marginBottom: 16, height: 44 },
    tab: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 25, marginRight: 10, borderWidth: 1 },
    tabText: { fontSize: 14, fontWeight: '700' },
    empty: { alignItems: 'center', paddingVertical: 60, opacity: 0.8 },
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)'
    },
    modalSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: SHEET_HEIGHT,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 24,
        paddingBottom: 48,
        overflow: 'hidden'
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        paddingVertical: 18,
        marginBottom: 8,
    },
    modalHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#333',
        borderRadius: 2,
    },
    modalCloseBtn: {
        position: 'absolute',
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalTitle: { fontSize: 22, fontWeight: '900', marginBottom: 20 },
    modalInput: { borderWidth: 1, borderRadius: 16, padding: 14, fontSize: 16, marginBottom: 16 },
    label: { color: '#AAA', fontSize: 12, fontWeight: '700', marginBottom: 10, marginLeft: 4 },
    chipRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    chip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 2 },
    saveBtn: { padding: 18, borderRadius: 18, alignItems: 'center' },
    saveBtnText: { color: '#FFF', fontWeight: '900', fontSize: 16 }
});