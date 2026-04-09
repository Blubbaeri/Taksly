import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    FlatList,
    TextInput,
    Platform,
    KeyboardAvoidingView,
    ScrollView,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useFinanceStore, Subscription } from '../../features/finance/useFinanceStore';

import DayPicker from './DayPicker';

interface BillManagerModalProps {
    visible: boolean;
    onClose: () => void;
}

const formatRupiah = (amount: number): string => 
    `Rp ${amount.toLocaleString('id-ID')}`;

const BillManagerModal: React.FC<BillManagerModalProps> = ({ visible, onClose }) => {
    const theme = useTheme();
    const primary = theme.colors.primary;
    const { 
        subscriptions, 
        addSubscription, 
        deleteSubscription, 
        markSubAsPaid,
        expenseCategories,
        savingsFrequency,
        updateSavingsFrequency
    } = useFinanceStore();

    const [isAdding, setIsAdding] = useState(false);
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [dueDay, setDueDay] = useState<number | null>(null);
    const [selectedCat, setSelectedCat] = useState<string | null>(null);
    const [isDayPickerVisible, setIsDayPickerVisible] = useState(false);

    const formatAmountDots = (value: string) => {
        // Remove non-numeric characters
        const numeric = value.replace(/\D/g, '');
        if (!numeric) return '';
        // Add dots every 3 digits
        return numeric.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };

    const cleanAmount = (value: string) => {
        return value.replace(/\./g, '');
    };

    const handleSave = () => {
        if (!name || !amount || !dueDay) {
            Alert.alert('Info', 'Isi semua data dulu ya!');
            return;
        }

        addSubscription({
            name,
            amount: Number(cleanAmount(amount)),
            dueDay,
            categoryId: selectedCat || 'tagihan',
            emoji: '📅',
            lastPaidDate: null,
        });

        setName('');
        setAmount('');
        setDueDay(null);
        setSelectedCat(null);
        setIsAdding(false);
    };

    const isPaidThisMonth = (sub: Subscription) => {
        if (!sub.lastPaidDate) return false;
        const lp = new Date(sub.lastPaidDate);
        const now = new Date();
        return lp.getMonth() === now.getMonth() && lp.getFullYear() === now.getFullYear();
    };

    const renderItem = ({ item }: { item: Subscription }) => {
        const paid = isPaidThisMonth(item);
        const cat = expenseCategories.find(c => c.id === item.categoryId);
        const now = new Date();
        const daysTo = item.dueDay - now.getDate();

        return (
            <View style={[styles.subCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <View style={styles.subHeader}>
                    <View style={[styles.subIcon, { backgroundColor: (cat?.color || primary) + '15' }]}>
                        <Ionicons name={cat?.icon as any || 'receipt-outline'} size={20} color={cat?.color || primary} />
                    </View>
                    <View style={styles.subInfo}>
                        <Text style={[styles.subName, { color: theme.colors.textPrimary }]}>{item.name}</Text>
                        <Text style={[styles.subDate, { color: theme.colors.textMuted }]}>
                            Tiap tanggal {item.dueDay} 
                            {!paid && (
                                <Text style={{ color: daysTo <= 3 && daysTo >= 0 ? theme.colors.danger : theme.colors.textMuted }}>
                                    {daysTo === 0 ? ' · Jatuh tempo HARI INI!' : daysTo > 0 ? ` · ${daysTo} hari lagi` : ''}
                                </Text>
                            )}
                        </Text>
                    </View>
                    <View style={styles.subAmountBox}>
                        <Text style={[styles.subAmount, { color: theme.colors.textPrimary }]}>{formatRupiah(item.amount)}</Text>
                        {paid ? (
                            <View style={[styles.paidBadge, { backgroundColor: theme.colors.success + '20' }]}>
                                <Text style={[styles.paidText, { color: theme.colors.success }]}>LUNAS</Text>
                            </View>
                        ) : (
                            <TouchableOpacity 
                                style={[styles.payBtn, { backgroundColor: primary }]}
                                onPress={() => markSubAsPaid(item.id)}
                            >
                                <Text style={styles.payBtnText}>BAYAR</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
                <TouchableOpacity 
                    style={styles.deleteBtn}
                    onPress={() => deleteSubscription(item.id)}
                >
                    <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <Modal 
            visible={visible} 
            animationType="slide" 
            transparent 
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.content, { backgroundColor: theme.colors.background }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Atur Tagihan Bulanan</Text>
                        <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.colors.card }]}>
                            <Ionicons name="close" size={20} color={theme.colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <KeyboardAvoidingView 
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
                        style={styles.keyboardView}
                    >
                        {isAdding ? (
                            <ScrollView 
                                style={styles.formScroll} 
                                contentContainerStyle={styles.formContent}
                                showsVerticalScrollIndicator={false}
                            >
                                <Text style={[styles.formTitle, { color: theme.colors.textPrimary }]}>Tambah Tagihan Baru</Text>
                                <TextInput 
                                    style={[styles.input, { backgroundColor: theme.colors.card, color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                                    placeholder="Nama Tagihan (misal: Spotify)"
                                    placeholderTextColor={theme.colors.textMuted}
                                    value={name}
                                    onChangeText={setName}
                                />
                                <TextInput 
                                    style={[styles.input, { backgroundColor: theme.colors.card, color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                                    placeholder="Jumlah (misal: 55.000)"
                                    placeholderTextColor={theme.colors.textMuted}
                                    keyboardType="numeric"
                                    value={amount}
                                    onChangeText={(val) => setAmount(formatAmountDots(val))}
                                />
                                
                                {/* Modal Trigger for Day Selection */}
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() => setIsDayPickerVisible(true)}
                                    style={[styles.dateTrigger, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                                >
                                    <View style={[styles.dateIconBox, { backgroundColor: primary + '15' }]}>
                                        <Ionicons name="calendar-outline" size={18} color={primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.dateLabel, { color: theme.colors.textMuted }]}>Tanggal Jatuh Tempo</Text>
                                        <Text style={[styles.dateValue, { color: dueDay ? theme.colors.textPrimary : theme.colors.textMuted }]}>
                                            {dueDay ? `Setiap Tanggal ${dueDay}` : 'Pilih tanggal...'}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
                                </TouchableOpacity>
                                
                                <View style={styles.catGrid}>
                                    {expenseCategories.slice(0, 8).map(c => (
                                        <TouchableOpacity 
                                            key={c.id}
                                            onPress={() => setSelectedCat(c.id)}
                                            style={[
                                                styles.catItem, 
                                                { backgroundColor: selectedCat === c.id ? primary + '30' : theme.colors.card, borderColor: selectedCat === c.id ? primary : theme.colors.border }
                                            ]}
                                        >
                                            <Ionicons name={c.icon as any} size={14} color={selectedCat === c.id ? primary : theme.colors.textMuted} />
                                            <Text style={[styles.catLabel, { color: selectedCat === c.id ? primary : theme.colors.textMuted }]}>{c.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <View style={styles.formButtons}>
                                    <TouchableOpacity 
                                        style={[styles.cancelBtn, { borderColor: theme.colors.border }]}
                                        onPress={() => setIsAdding(false)}
                                    >
                                        <Text style={{ color: theme.colors.textMuted }}>Batal</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.saveBtn, { backgroundColor: primary }]}
                                        onPress={handleSave}
                                    >
                                        <Text style={styles.saveBtnText}>Simpan</Text>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        ) : (
                            <>
                                <View style={[styles.freqContainer, { backgroundColor: theme.colors.card }]}>
                                    <TouchableOpacity 
                                        onPress={() => updateSavingsFrequency('daily')}
                                        style={[styles.freqBtn, savingsFrequency === 'daily' && { backgroundColor: primary }]}
                                    >
                                        <Text style={[styles.freqText, { color: savingsFrequency === 'daily' ? '#FFF' : theme.colors.textMuted }]}>Harian</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        onPress={() => updateSavingsFrequency('weekly')}
                                        style={[styles.freqBtn, savingsFrequency === 'weekly' && { backgroundColor: primary }]}
                                    >
                                        <Text style={[styles.freqText, { color: savingsFrequency === 'weekly' ? '#FFF' : theme.colors.textMuted }]}>Mingguan</Text>
                                    </TouchableOpacity>
                                </View>

                                <FlatList 
                                    data={subscriptions}
                                    keyExtractor={(item) => item.id}
                                    renderItem={renderItem}
                                    ListEmptyComponent={
                                        <View style={styles.empty}>
                                            <Ionicons name="receipt-outline" size={48} color={theme.colors.textMuted} />
                                            <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>Belum ada tagihan terdaftar.</Text>
                                        </View>
                                    }
                                    contentContainerStyle={styles.list}
                                />
                                <TouchableOpacity 
                                    style={[styles.addBtn, { backgroundColor: primary }]}
                                    onPress={() => setIsAdding(true)}
                                >
                                    <Ionicons name="add" size={24} color="#FFF" />
                                    <Text style={styles.addBtnText}>Tagihan Baru</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </KeyboardAvoidingView>
                </View>
            </View>

            {/* Nested Modal for Day Picker */}
            <Modal
                visible={isDayPickerVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsDayPickerVisible(false)}
            >
                <TouchableOpacity 
                    style={styles.dayPickerOverlay} 
                    activeOpacity={1} 
                    onPress={() => setIsDayPickerVisible(false)}
                >
                    <View style={[styles.dayPickerSheet, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                        <View style={styles.sheetHandle} />
                        <DayPicker 
                            value={dueDay} 
                            onChange={(day) => {
                                setDueDay(day);
                                setIsDayPickerVisible(false);
                            }} 
                        />
                        <TouchableOpacity 
                            style={[styles.closePickerBtn, { backgroundColor: theme.colors.card }]}
                            onPress={() => setIsDayPickerVisible(false)}
                        >
                            <Text style={{ color: theme.colors.textPrimary, fontWeight: '700' }}>Selesai</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    content: {
        height: '80%',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    keyboardView: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    freqContainer: {
        flexDirection: 'row',
        padding: 4,
        borderRadius: 14,
        marginBottom: 20,
        gap: 4,
    },
    freqBtn: {
        flex: 1,
        height: 38,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    freqText: {
        fontSize: 13,
        fontWeight: '800',
    },
    formScroll: {
        flex: 1,
    },
    formContent: {
        paddingBottom: 40,
        gap: 16,
    },
    list: {
        paddingBottom: 100,
        gap: 12,
    },
    subCard: {
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        position: 'relative',
    },
    subHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    subIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    subInfo: {
        flex: 1,
    },
    subName: {
        fontSize: 16,
        fontWeight: '800',
    },
    subDate: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
    subAmountBox: {
        alignItems: 'flex-end',
        gap: 6,
    },
    subAmount: {
        fontSize: 15,
        fontWeight: '800',
    },
    paidBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    paidText: {
        fontSize: 10,
        fontWeight: '900',
    },
    payBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    payBtnText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '900',
    },
    deleteBtn: {
        position: 'absolute',
        top: 10,
        right: 10,
    },
    addBtn: {
        position: 'absolute',
        bottom: 30,
        left: 0,
        right: 0,
        height: 56,
        borderRadius: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        elevation: 6,
    },
    addBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800',
    },
    empty: {
        alignItems: 'center',
        marginTop: 60,
        gap: 12,
    },
    emptyText: {
        fontSize: 14,
    },
    formTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 8,
    },
    input: {
        height: 52,
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 16,
        fontSize: 15,
        marginBottom: 4,
    },
    catGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
    },
    catItem: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
        gap: 6,
    },
    catLabel: {
        fontSize: 11,
        fontWeight: '700',
    },
    formButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
        marginBottom: 20,
    },
    cancelBtn: {
        flex: 1,
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    saveBtn: {
        flex: 2,
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800',
    },

    // Trigger & Shell
    dateTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 4,
    },
    dateIconBox: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dateLabel: {
        fontSize: 11,
        fontWeight: '600',
        marginBottom: 2,
    },
    dateValue: {
        fontSize: 14,
        fontWeight: '700',
    },

    // Day Picker Modal
    dayPickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        padding: 20,
    },
    dayPickerSheet: {
        borderRadius: 28,
        borderWidth: 1,
        padding: 20,
        paddingBottom: 24,
    },
    sheetHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignSelf: 'center',
        marginBottom: 20,
    },
    closePickerBtn: {
        marginTop: 20,
        height: 50,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default BillManagerModal;
