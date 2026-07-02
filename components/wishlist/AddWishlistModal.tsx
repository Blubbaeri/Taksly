import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Pressable,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    Animated,
    Dimensions,
    PanResponder,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Priority, PRIORITY_CONFIG, CATEGORY_ICONS } from '../../hooks/useWishlistUtils';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AddWishlistModalProps {
    visible: boolean;
    onClose: () => void;
    onAdd: (payload: any) => Promise<void>;
    accentColor: string;
    theme: any;
}

export function AddWishlistModal({ visible, onClose, onAdd, accentColor, theme }: AddWishlistModalProps) {
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [date, setDate] = useState('');
    const [priority, setPriority] = useState<Priority>('Medium');
    const [category, setCategory] = useState('Tech');
    const [reasoning, setReasoning] = useState('');
    const [emoji, setEmoji] = useState('star');
    const [loading, setLoading] = useState(false);

    const formatInputValue = (val: string) => {
        const clean = val.replace(/\D/g, '');
        if (!clean) return '';
        return new Intl.NumberFormat('id-ID').format(parseInt(clean));
    };

    const handlePriceChange = (val: string) => {
        setPrice(formatInputValue(val));
    };

    const [showDatePicker, setShowDatePicker] = useState(false);

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            const yyyy = selectedDate.getFullYear();
            const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const dd = String(selectedDate.getDate()).padStart(2, '0');
            setDate(`${yyyy}-${mm}-${dd}`);
        }
    };

    // Animation State
    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.spring(translateY, {
                    toValue: 0,
                    damping: 20,
                    stiffness: 150,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(translateY, {
                    toValue: SCREEN_HEIGHT,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    // Pan Responder for Swipe-to-close
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return gestureState.dy > 10; // Only swipe DOWN
            },
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    translateY.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 150 || gestureState.vy > 0.5) {
                    onClose();
                } else {
                    Animated.spring(translateY, {
                        toValue: 0,
                        damping: 20,
                        stiffness: 150,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    const handleSave = async () => {
        if (!name.trim()) return Alert.alert('Error', 'Item Name is required');
        
        const numPrice = parseInt(price.replace(/\D/g, ''));
        if (isNaN(numPrice) || numPrice <= 0) {
            return Alert.alert('Error', 'Price must be greater than 0');
        }

        if (!date.trim()) return Alert.alert('Error', 'Target Date is required');
        
        const targetDate = new Date(date);
        if (isNaN(targetDate.getTime())) {
            return Alert.alert('Error', 'Invalid date format (YYYY-MM-DD)');
        }
        if (targetDate.getTime() < Date.now() - 86400000) {
            return Alert.alert('Error', 'Target date cannot be in the past');
        }

        setLoading(true);
        try {
            await onAdd({
                name: name.trim(),
                target_price: numPrice,
                target_date: date,
                category,
                priority,
                reasoning: reasoning.trim(),
                emoji,
            });
            setName(''); setPrice(''); setDate('');
            setReasoning(''); setEmoji('star'); setPriority('Medium'); setCategory('Tech');
            onClose();
        } catch (err: unknown) {
            if (err instanceof Error) {
                Alert.alert('Failed to add goal', err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="none">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <View style={styles.modalOverlay}>
                    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.65)', opacity }]} >
                        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                    </Animated.View>
                    
                    <Animated.View
                        style={[
                            styles.modalSheet, 
                            { 
                                backgroundColor: theme.colors.card ?? '#1A1A1A',
                                transform: [{ translateY }]
                            }
                        ]}
                    >
                        <View {...panResponder.panHandlers} style={styles.swipeArea}>
                            <View style={styles.modalHandle} />
                        </View>

                        <View style={styles.modalHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Ionicons name="sparkles-outline" size={20} color={accentColor} />
                                <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>Add New Goal</Text>
                            </View>
                            <TouchableOpacity 
                                onPress={onClose}
                                style={styles.closeBtn}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView 
                            showsVerticalScrollIndicator={false} 
                            style={{ flex: 1 }}
                            contentContainerStyle={{ gap: 10, paddingBottom: 40 }}
                        >
                            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Pick Icon</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiPickerRow}>
                                {['star', 'phone-portrait', 'laptop', 'briefcase', 'airplane', 'home', 'camera', 'game-controller', 'car', 'heart', 'flower', 'watch'].map(e => (
                                    <TouchableOpacity
                                        key={e}
                                        onPress={() => setEmoji(e)}
                                        style={[
                                            styles.emojiPickerBtn,
                                            {
                                                borderColor: emoji === e ? accentColor : theme.colors.border,
                                                backgroundColor: emoji === e ? accentColor + '22' : 'transparent'
                                            },
                                        ]}
                                    >
                                        <Ionicons name={e as any} size={20} color={emoji === e ? accentColor : theme.colors.textSecondary} />
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Item Name *</Text>
                            <TextInput
                                style={[styles.modalInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                                placeholder="e.g. Nike Air Max 270"
                                placeholderTextColor={theme.colors.textSecondary}
                                value={name} onChangeText={setName}
                            />

                            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Target Price (IDR) *</Text>
                            <TextInput
                                style={[styles.modalInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                                placeholder="e.g. 1.500.000"
                                placeholderTextColor={theme.colors.textSecondary}
                                keyboardType="numeric"
                                value={price} onChangeText={handlePriceChange}
                            />

                            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Target Date *</Text>
                            <TouchableOpacity
                                onPress={() => setShowDatePicker(true)}
                                style={[styles.modalInput, { 
                                    borderColor: theme.colors.border, 
                                    backgroundColor: theme.colors.background,
                                    justifyContent: 'center',
                                    height: 48
                                }]}
                            >
                                <Text style={{ color: date ? theme.colors.textPrimary : theme.colors.textSecondary }}>
                                    {date ? date : 'Select target date'}
                                </Text>
                            </TouchableOpacity>

                            {showDatePicker && (
                                <DateTimePicker
                                    value={date ? new Date(date) : new Date()}
                                    mode="date"
                                    minimumDate={new Date()}
                                    display="default"
                                    onChange={onDateChange}
                                />
                            )}

                            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Motivation / Reasoning</Text>
                            <TextInput
                                style={[styles.modalInput, styles.modalInputMulti, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                                placeholder="Why do you want this?"
                                placeholderTextColor={theme.colors.textSecondary}
                                multiline numberOfLines={3}
                                value={reasoning} onChangeText={setReasoning}
                            />

                            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Priority</Text>
                            <View style={styles.chipRow}>
                                {(['Low', 'Medium', 'High'] as Priority[]).map(p => {
                                    const cfg = PRIORITY_CONFIG[p];
                                    const isSelected = priority === p;
                                    return (
                                        <TouchableOpacity
                                            key={p}
                                            onPress={() => setPriority(p)}
                                            style={[styles.priorityChip, {
                                                borderColor: isSelected ? cfg.color : theme.colors.border,
                                                backgroundColor: isSelected ? cfg.color + '20' : 'transparent',
                                                opacity: isSelected ? 1 : 0.55,
                                            }]}
                                        >
                                            <Ionicons 
                                                name={cfg.icon} 
                                                size={14} 
                                                color={isSelected ? cfg.color : theme.colors.textSecondary} 
                                            />
                                            <Text style={[
                                                styles.priorityChipText, 
                                                { color: isSelected ? cfg.color : theme.colors.textSecondary }
                                            ]}>
                                                {cfg.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Category</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View style={styles.chipRow}>
                                    {Object.keys(CATEGORY_ICONS).map(cat => (
                                        <TouchableOpacity
                                            key={cat}
                                            onPress={() => setCategory(cat)}
                                            style={[styles.catChip, {
                                                borderColor: category === cat ? accentColor : theme.colors.border,
                                                backgroundColor: category === cat ? accentColor + '22' : 'transparent',
                                            }]}
                                        >
                                            <Ionicons 
                                                name={CATEGORY_ICONS[cat]} 
                                                size={14} 
                                                color={category === cat ? accentColor : theme.colors.textSecondary} 
                                            />
                                            <Text style={[styles.catChipText, { color: category === cat ? accentColor : theme.colors.textSecondary }]}>
                                                {cat}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>

                            <TouchableOpacity
                                onPress={handleSave}
                                disabled={loading || !name || !price || !date}
                                style={[styles.saveBtn, { backgroundColor: accentColor, opacity: (name && price && date) ? 1 : 0.4 }]}
                                activeOpacity={0.85}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <>
                                        <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                                        <Text style={styles.saveBtnText}>Save Goal</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </Animated.View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalSheet: { 
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '90%',
        borderTopLeftRadius: 28, 
        borderTopRightRadius: 28, 
        padding: 20, 
        paddingBottom: 36, 
        gap: 10 
    },
    swipeArea: { width: '100%', alignItems: 'center', paddingTop: 12, paddingBottom: 16 },
    modalHandle: { width: 36, height: 4, borderRadius: 99, backgroundColor: '#555', alignSelf: 'center' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 4 },
    closeBtn: { padding: 4, marginRight: -8 },
    modalTitle: { fontSize: 20, fontWeight: '800' },
    inputLabel: { fontSize: 12, fontWeight: '700', marginTop: 8, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
    modalInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14 },
    modalInputMulti: { height: 80, textAlignVertical: 'top' },
    emojiPickerRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
    emojiPickerBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
    chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    priorityChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
    priorityChipText: { fontSize: 13, fontWeight: '700' },
    catChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
    catChipText: { fontSize: 12, fontWeight: '600' },
    saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 16, marginTop: 8 },
    saveBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});
