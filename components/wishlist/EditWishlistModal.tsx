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
import { Priority, PRIORITY_CONFIG, CATEGORY_ICONS, WishlistItem, formatIDR } from '../../hooks/useWishlistUtils';
import { Account } from '../../features/finance/useFinanceStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface EditWishlistModalProps {
    visible: boolean;
    onClose: () => void;
    item: WishlistItem | null;
    onEdit: (id: string, payload: any, diffAmount: number, splits: { accountId: string; amount: number }[]) => Promise<void>;
    accentColor: string;
    theme: any;
    accounts: Account[];
}

export function EditWishlistModal({ visible, onClose, item, onEdit, accentColor, theme, accounts }: EditWishlistModalProps) {
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [date, setDate] = useState('');
    const [priority, setPriority] = useState<Priority>('Medium');
    const [category, setCategory] = useState('Tech');
    const [reasoning, setReasoning] = useState('');
    const [emoji, setEmoji] = useState('star');
    const [saved, setSaved] = useState('');
    
    // Split pocket reconciliation state
    const [splits, setSplits] = useState<{ id: string; accountId: string; amount: string }[]>([]);
    const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Populate data when item opens
    useEffect(() => {
        if (item) {
            setName(item.name);
            setPrice(new Intl.NumberFormat('id-ID').format(item.targetPrice));
            setDate(item.targetDate.split('T')[0]);
            setPriority(item.priority);
            setCategory(item.category);
            setReasoning(item.reasoning || '');
            setEmoji(item.emoji || 'star');
            setSaved(new Intl.NumberFormat('id-ID').format(item.currentSaved));
            setSplits([]);
        }
    }, [item, visible]);

    // Calculate savings difference
    const originalSaved = item ? item.currentSaved : 0;
    const newSavedVal = parseInt(saved.replace(/\D/g, '')) || 0;
    const diffAmount = newSavedVal - originalSaved;
    const isReconciliationNeeded = diffAmount !== 0;

    // Initialize/Update splits when difference changes
    useEffect(() => {
        if (visible && isReconciliationNeeded && splits.length === 0) {
            setSplits([{
                id: Math.random().toString(),
                accountId: '',
                amount: ''
            }]);
        } else if (!isReconciliationNeeded) {
            setSplits([]);
        }
    }, [visible, isReconciliationNeeded]);

    const formatInputValue = (val: string) => {
        const clean = val.replace(/\D/g, '');
        if (!clean) return '';
        return new Intl.NumberFormat('id-ID').format(parseInt(clean));
    };

    const handlePriceChange = (val: string) => {
        setPrice(formatInputValue(val));
    };

    const handleSavedChange = (val: string) => {
        setSaved(formatInputValue(val));
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            const yyyy = selectedDate.getFullYear();
            const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const dd = String(selectedDate.getDate()).padStart(2, '0');
            setDate(`${yyyy}-${mm}-${dd}`);
        }
    };

    // Calculate total allocations
    const totalSplitAmount = splits.reduce((sum, s) => {
        const val = parseInt(s.amount.replace(/\D/g, '')) || 0;
        return sum + val;
    }, 0);

    const absDiffAmount = Math.abs(diffAmount);
    const remainingToAllocate = absDiffAmount - totalSplitAmount;

    // Validation for save disabled state
    const isSaveDisabled = isReconciliationNeeded && (
        remainingToAllocate !== 0 ||
        splits.some(s => {
            const splitVal = parseInt(s.amount.replace(/\D/g, '')) || 0;
            const acc = accounts.find(a => a.id === s.accountId);
            return !s.accountId || splitVal <= 0 || (diffAmount > 0 && acc && acc.balance < splitVal);
        })
    );

    // Animation State
    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
                Animated.spring(translateY, { toValue: 0, damping: 20, stiffness: 150, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
            ]).start();
        }
    }, [visible]);

    // Pan Responder for Swipe-to-close
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 10,
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
        if (!item) return;
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

        if (isReconciliationNeeded && remainingToAllocate !== 0) {
            return Alert.alert('Reconciliation Needed', `Alokasikan semua selisih nominal. Sisa belum teralokasi: ${formatIDR(remainingToAllocate)}`);
        }

        const formattedSplits = splits.map(s => ({
            accountId: s.accountId,
            amount: parseInt(s.amount.replace(/\D/g, '')) || 0
        }));

        setLoading(true);
        try {
            await onEdit(item.id, {
                name: name.trim(),
                target_price: numPrice,
                target_date: date,
                category,
                priority,
                reasoning: reasoning.trim(),
                emoji,
                current_saved: newSavedVal
            }, diffAmount, formattedSplits);
            onClose();
        } catch (err: unknown) {
            if (err instanceof Error) {
                Alert.alert('Failed to edit goal', err.message);
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
                                <Ionicons name="create-outline" size={20} color={accentColor} />
                                <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>Edit Wishlist Item</Text>
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
                            contentContainerStyle={{ gap: 14, paddingBottom: 40 }}
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
                                    justifyContent: 'center'
                                }]}
                            >
                                <Text style={{ color: date ? theme.colors.textPrimary : theme.colors.textSecondary }}>
                                    {date ? date : 'Select Date'}
                                </Text>
                            </TouchableOpacity>

                            {showDatePicker && (
                                <DateTimePicker
                                    value={date ? new Date(date) : new Date()}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={onDateChange}
                                />
                            )}

                            {/* Category Stacked Vertically with Horizontal Scroll */}
                            <View>
                                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Category</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                                    {['Tech', 'Work', 'Fashion', 'Travel', 'Health', 'Home', 'Food', 'Personal', 'Other'].map(c => (
                                        <TouchableOpacity
                                            key={c}
                                            onPress={() => setCategory(c)}
                                            style={[
                                                styles.categoryChip,
                                                {
                                                    borderColor: category === c ? accentColor : theme.colors.border,
                                                    backgroundColor: category === c ? accentColor + '15' : theme.colors.background,
                                                }
                                            ]}
                                        >
                                            <Ionicons name={CATEGORY_ICONS[c] || 'cube-outline'} size={14} color={category === c ? accentColor : theme.colors.textSecondary} />
                                            <Text style={[styles.categoryText, { color: category === c ? accentColor : theme.colors.textPrimary }]}>{c}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            {/* Priority Stacked Vertically with Horizontal layout row */}
                            <View>
                                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Priority</Text>
                                <View style={styles.priorityRow}>
                                    {(['Low', 'Medium', 'High'] as Priority[]).map(p => {
                                        const cfg = PRIORITY_CONFIG[p];
                                        const isSel = priority === p;
                                        return (
                                            <TouchableOpacity
                                                key={p}
                                                onPress={() => setPriority(p)}
                                                style={[
                                                    styles.priorityBtn,
                                                    {
                                                        borderColor: isSel ? cfg.color : theme.colors.border,
                                                        backgroundColor: isSel ? cfg.color + '20' : theme.colors.background,
                                                        flex: 1
                                                    }
                                                ]}
                                            >
                                                <Ionicons name={cfg.icon} size={14} color={isSel ? cfg.color : theme.colors.textSecondary} />
                                                <Text style={[styles.priorityBtnText, { color: isSel ? cfg.color : theme.colors.textPrimary }]}>{p}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Why do you want this?</Text>
                            <TextInput
                                style={[
                                    styles.modalInput, 
                                    styles.multilineInput, 
                                    { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.background }
                                ]}
                                placeholder="Add your reasoning..."
                                placeholderTextColor={theme.colors.textSecondary}
                                multiline
                                numberOfLines={3}
                                value={reasoning} onChangeText={setReasoning}
                            />

                            {/* Current Saved Reconciliaton Section */}
                            <View style={[styles.reconcileBox, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Tabungan Saat Ini (IDR)</Text>
                                <TextInput
                                    style={[styles.modalInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
                                    placeholder="e.g. 150.000"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    keyboardType="numeric"
                                    value={saved} onChangeText={handleSavedChange}
                                />
                                
                                {isReconciliationNeeded && (
                                    <View style={{ marginTop: 10 }}>
                                        <Text style={[styles.reconcileTitle, { color: diffAmount > 0 ? theme.colors.primary : theme.colors.success }]}>
                                            {diffAmount > 0 
                                                ? `Selisih: +${formatIDR(diffAmount)} (Dipotong dari kantong)` 
                                                : `Selisih: ${formatIDR(diffAmount)} (Dikembalikan ke kantong)`
                                            }
                                        </Text>
                                        
                                        <Text style={[styles.inputLabel, { color: theme.colors.textSecondary, marginTop: 12, marginBottom: 6 }]}>
                                            Alokasi Pembagian Kantong:
                                        </Text>
                                        
                                        <View style={{ gap: 10 }}>
                                            {splits.map((split) => {
                                                const splitVal = parseInt(split.amount.replace(/\D/g, '')) || 0;
                                                const selectedAcc = accounts.find(a => a.id === split.accountId);
                                                const isAccEmoji = selectedAcc && /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(selectedAcc.emoji);

                                                return (
                                                    <View key={split.id} style={{ gap: 4 }}>
                                                        <View style={[styles.splitRow, { borderColor: theme.colors.border }]}>
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={[styles.splitLabel, { color: theme.colors.textSecondary }]}>Nominal</Text>
                                                                <TextInput
                                                                    style={[styles.splitInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
                                                                    placeholder="Rp 0"
                                                                    placeholderTextColor={theme.colors.textSecondary}
                                                                    keyboardType="numeric"
                                                                    value={split.amount}
                                                                    onChangeText={(val) => {
                                                                        const clean = val.replace(/\D/g, '');
                                                                        const formatted = clean ? new Intl.NumberFormat('id-ID').format(parseInt(clean)) : '';
                                                                        setSplits(prev => prev.map(s => s.id === split.id ? { ...s, amount: formatted } : s));
                                                                    }}
                                                                />
                                                            </View>

                                                            <View style={{ flex: 1.5 }}>
                                                                <Text style={[styles.splitLabel, { color: theme.colors.textSecondary }]}>Pilih Kantong</Text>
                                                                <TouchableOpacity
                                                                    style={[styles.dropdownTrigger, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
                                                                    onPress={() => setActiveDropdownId(activeDropdownId === split.id ? null : split.id)}
                                                                >
                                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                                                                        {selectedAcc ? (
                                                                            <>
                                                                                {isAccEmoji ? (
                                                                                    <Text style={{ fontSize: 14 }}>{selectedAcc.emoji}</Text>
                                                                                ) : (
                                                                                    <Ionicons name={selectedAcc.emoji as any || 'wallet-outline'} size={15} color={theme.colors.primary} />
                                                                                )}
                                                                                <Text style={{ color: theme.colors.textPrimary, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
                                                                                    {selectedAcc.name}
                                                                                </Text>
                                                                            </>
                                                                        ) : (
                                                                            <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Pilih Kantong</Text>
                                                                        )}
                                                                    </View>
                                                                    <Ionicons name="chevron-down" size={14} color={theme.colors.textSecondary} />
                                                                </TouchableOpacity>
                                                            </View>

                                                            {splits.length > 1 && (
                                                                <TouchableOpacity
                                                                    onPress={() => {
                                                                        setSplits(prev => prev.filter(s => s.id !== split.id));
                                                                    }}
                                                                    style={styles.deleteSplitBtn}
                                                                >
                                                                    <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                                                                </TouchableOpacity>
                                                            )}
                                                        </View>

                                                        {activeDropdownId === split.id && (
                                                            <View style={[styles.dropdownList, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                                                                {accounts.map(acc => {
                                                                    const isEmoji = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(acc.emoji);
                                                                    const pocketInsufficient = diffAmount > 0 && acc.balance < splitVal;
                                                                    return (
                                                                        <TouchableOpacity
                                                                            key={acc.id}
                                                                            disabled={pocketInsufficient}
                                                                            style={[
                                                                                styles.dropdownItem,
                                                                                { borderBottomColor: theme.colors.border },
                                                                                pocketInsufficient && { opacity: 0.35 }
                                                                            ]}
                                                                            onPress={() => {
                                                                                setSplits(prev => prev.map(s => s.id === split.id ? { ...s, accountId: acc.id } : s));
                                                                                setActiveDropdownId(null);
                                                                            }}
                                                                        >
                                                                            {isEmoji ? (
                                                                                <Text style={{ fontSize: 14 }}>{acc.emoji}</Text>
                                                                            ) : (
                                                                                <Ionicons name={acc.emoji as any || 'wallet-outline'} size={15} color={theme.colors.primary} />
                                                                            )}
                                                                            <Text style={[styles.dropdownItemText, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                                                                                {acc.name} ({formatIDR(acc.balance)})
                                                                            </Text>
                                                                            {pocketInsufficient && (
                                                                                <Text style={{ color: theme.colors.danger, fontSize: 9, fontWeight: '700', marginLeft: 'auto' }}>
                                                                                    Saldo Kurang
                                                                                </Text>
                                                                            )}
                                                                        </TouchableOpacity>
                                                                    );
                                                                })}
                                                            </View>
                                                        )}
                                                    </View>
                                                );
                                            })}
                                        </View>

                                        {remainingToAllocate !== 0 && (
                                            <Text style={[styles.remainingText, { color: remainingToAllocate > 0 ? theme.colors.primary : theme.colors.danger }]}>
                                                Sisa belum dialokasikan: {formatIDR(remainingToAllocate)}
                                            </Text>
                                        )}

                                        {remainingToAllocate > 0 && (
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setSplits(prev => [...prev, {
                                                        id: Math.random().toString(),
                                                        accountId: '',
                                                        amount: new Intl.NumberFormat('id-ID').format(remainingToAllocate)
                                                    }]);
                                                }}
                                                style={[styles.addSplitRowBtn, { borderColor: accentColor + '60' }]}
                                            >
                                                <Ionicons name="add" size={16} color={accentColor} />
                                                <Text style={[styles.addSplitRowBtnText, { color: accentColor }]}>Bagi ke kantong lain</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}
                            </View>

                            <TouchableOpacity
                                disabled={loading || isSaveDisabled}
                                onPress={handleSave}
                                style={[
                                    styles.saveBtn, 
                                    { backgroundColor: isSaveDisabled ? theme.colors.border : accentColor }
                                ]}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Text style={styles.saveBtnText}>Save Changes</Text>
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
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalSheet: {
        height: '95%',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingHorizontal: 20,
        elevation: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
    },
    swipeArea: {
        alignItems: 'center',
        paddingVertical: 12,
        width: '100%',
    },
    modalHandle: {
        width: 44,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 12,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    modalInput: {
        height: 48,
        borderWidth: 1.5,
        borderRadius: 14,
        paddingHorizontal: 16,
        fontSize: 15,
        fontWeight: '600',
    },
    multilineInput: {
        height: 80,
        paddingTop: 12,
        textAlignVertical: 'top',
    },
    emojiPickerRow: {
        gap: 10,
        paddingVertical: 4,
    },
    emojiPickerBtn: {
        width: 42,
        height: 42,
        borderRadius: 12,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    categoryScroll: {
        flexDirection: 'row',
        gap: 8,
        paddingVertical: 4,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1.5,
    },
    categoryText: {
        fontSize: 13,
        fontWeight: '600',
    },
    priorityRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
    priorityBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1.5,
    },
    priorityBtnText: {
        fontSize: 13,
        fontWeight: '700',
    },
    reconcileBox: {
        borderWidth: 1.5,
        borderRadius: 16,
        padding: 14,
        marginTop: 10,
        gap: 8,
    },
    reconcileTitle: {
        fontSize: 13,
        fontWeight: '800',
    },
    splitRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 10,
        borderWidth: 1,
        borderRadius: 14,
        padding: 10,
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    splitLabel: {
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 4,
    },
    splitInput: {
        height: 40,
        borderWidth: 1.2,
        borderRadius: 10,
        paddingHorizontal: 10,
        fontSize: 14,
        fontWeight: '600',
    },
    dropdownTrigger: {
        height: 40,
        borderWidth: 1.2,
        borderRadius: 10,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dropdownList: {
        borderWidth: 1.2,
        borderRadius: 12,
        marginTop: 4,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        gap: 8,
    },
    dropdownItemText: {
        fontSize: 13,
        fontWeight: '700',
    },
    deleteSplitBtn: {
        padding: 8,
        alignSelf: 'center',
    },
    remainingText: {
        fontSize: 12,
        fontWeight: '800',
        marginTop: 6,
    },
    addSplitRowBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderRadius: 12,
        paddingVertical: 10,
        marginTop: 8,
    },
    addSplitRowBtnText: {
        fontSize: 13,
        fontWeight: '700',
    },
    pocketItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1.5,
        gap: 10,
    },
    pocketIconBg: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    pocketName: {
        fontSize: 14,
        fontWeight: '700',
    },
    pocketBalance: {
        fontSize: 11,
    },
    saveBtn: {
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        elevation: 4,
    },
    saveBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800',
    },
});
