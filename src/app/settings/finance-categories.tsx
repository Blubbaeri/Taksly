import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    StatusBar, ScrollView, TextInput,
    Modal, Alert, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFinanceStore } from '../../../features/finance/useFinanceStore';

// ─── Theme ────────────────────────────────────────────────────────────────────

const C = {
    bg: '#08080E',
    surface: '#12121A',
    surfaceHigh: '#1C1C2E',
    border: '#2C2C3E',
    primary: '#7C6FFF',
    primaryGlow: 'rgba(124,111,255,0.08)',
    primaryBorder: 'rgba(124,111,255,0.18)',
    primaryText: '#B8B2FF',
    success: '#4ADE80',
    successGlow: 'rgba(74,222,128,0.08)',
    successBorder: 'rgba(74,222,128,0.2)',
    danger: '#F87171',
    dangerGlow: 'rgba(248,113,113,0.08)',
    dangerBorder: 'rgba(248,113,113,0.2)',
    text: '#FFFFFF',
    textSub: '#9494B0',
    textMid: '#5A5A78',
};

// ─── Presets ──────────────────────────────────────────────────────────────────

const PRESET_ICONS = [
    'fast-food-outline', 'car-outline', 'bag-outline', 'home-outline',
    'medkit-outline', 'game-controller-outline', 'airplane-outline', 'shirt-outline',
    'book-outline', 'cafe-outline', 'fitness-outline', 'musical-notes-outline',
    'phone-portrait-outline', 'tv-outline', 'paw-outline', 'gift-outline',
    'card-outline', 'cash-outline', 'trending-up-outline', 'briefcase-outline',
    'laptop-outline', 'build-outline', 'heart-outline', 'people-outline',
    'star-outline', 'flash-outline', 'leaf-outline', 'bicycle-outline',
];

const PRESET_COLORS = [
    '#7C6FFF', '#4ADE80', '#F87171', '#F59E0B',
    '#38BDF8', '#FB7185', '#A78BFA', '#34D399',
    '#FBBF24', '#60A5FA', '#F472B6', '#2DD4BF',
    '#E879F9', '#FCD34D', '#86EFAC', '#93C5FD',
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function FinanceCategoriesScreen() {
    const { expenseCategories, incomeCategories, addCategory, deleteCategory } = useFinanceStore();

    const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newLabel, setNewLabel] = useState('');
    const [newIcon, setNewIcon] = useState('cash-outline');
    const [newColor, setNewColor] = useState('#7C6FFF');
    const [saving, setSaving] = useState(false);

    const categories = activeTab === 'expense' ? expenseCategories : incomeCategories;

    const resetForm = () => {
        setNewLabel('');
        setNewIcon('cash-outline');
        setNewColor('#7C6FFF');
    };

    const handleAdd = async () => {
        const label = newLabel.trim();
        if (!label) {
            Alert.alert('Oops', 'Nama kategori tidak boleh kosong.');
            return;
        }
        setSaving(true);
        try {
            const success = await addCategory(activeTab, { label, icon: newIcon, color: newColor });
            if (success) {
                setShowAddModal(false);
                resetForm();
            }
        } catch (e: any) {
            Alert.alert('Gagal', e.message || 'Terjadi kesalahan.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="light-content" backgroundColor={C.bg} />

            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={20} color={C.textSub} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Kelola Kategori</Text>
                    <Text style={styles.headerSub}>Tambah kategori transaksi</Text>
                </View>
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => setShowAddModal(true)}
                >
                    <Ionicons name="add" size={20} color={C.text} />
                </TouchableOpacity>
            </View>

            {/* ── Tab Selector ── */}
            <View style={styles.tabRow}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'expense' && styles.tabActive]}
                    onPress={() => setActiveTab('expense')}
                    activeOpacity={0.8}
                >
                    <Ionicons
                        name="trending-down"
                        size={14}
                        color={activeTab === 'expense' ? C.danger : C.textMid}
                    />
                    <Text style={[styles.tabText, activeTab === 'expense' && styles.tabTextActiveExpense]}>
                        Expense
                    </Text>
                    <View style={[styles.tabBadge, activeTab === 'expense' && styles.tabBadgeActiveExpense]}>
                        <Text style={[styles.tabBadgeText, activeTab === 'expense' && { color: C.danger }]}>
                            {expenseCategories.length}
                        </Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, activeTab === 'income' && styles.tabActive]}
                    onPress={() => setActiveTab('income')}
                    activeOpacity={0.8}
                >
                    <Ionicons
                        name="trending-up"
                        size={14}
                        color={activeTab === 'income' ? C.success : C.textMid}
                    />
                    <Text style={[styles.tabText, activeTab === 'income' && styles.tabTextActiveIncome]}>
                        Income
                    </Text>
                    <View style={[styles.tabBadge, activeTab === 'income' && styles.tabBadgeActiveIncome]}>
                        <Text style={[styles.tabBadgeText, activeTab === 'income' && { color: C.success }]}>
                            {incomeCategories.length}
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* ── Category List ── */}
            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                {categories.length === 0 ? (
                    <View style={styles.empty}>
                        <View style={styles.emptyIcon}>
                            <Ionicons name="grid-outline" size={28} color={C.textMid} />
                        </View>
                        <Text style={styles.emptyText}>Belum ada kategori</Text>
                        <Text style={styles.emptySub}>
                            Tap tombol + di atas untuk menambahkan
                        </Text>
                    </View>
                ) : (
                    categories.map((cat: { id: string; label: string; icon: string; color: string }) => {
                        return (
                            <View key={cat.id} style={styles.catItem}>
                                <View style={[styles.catIcon, { backgroundColor: cat.color + '18' }]}>
                                    <Ionicons name={cat.icon as any} size={18} color={cat.color} />
                                </View>
                                <Text style={styles.catLabel}>{cat.label}</Text>
                                
                                <TouchableOpacity 
                                    style={styles.deleteBtn}
                                    onPress={() => {
                                        Alert.alert(
                                            'Hapus Kategori',
                                            `Yakin ingin menghapus kategori "${cat.label}"?`,
                                            [
                                                { text: 'Batal', style: 'cancel' },
                                                { 
                                                    text: 'Hapus', 
                                                    style: 'destructive',
                                                    onPress: () => deleteCategory(cat.id, activeTab)
                                                }
                                            ]
                                        );
                                    }}
                                >
                                    <Ionicons name="trash-outline" size={16} color={C.danger} />
                                </TouchableOpacity>
                            </View>
                        );
                    })
                )}

                {/* Add CTA at bottom */}
                <TouchableOpacity
                    style={styles.addCta}
                    onPress={() => setShowAddModal(true)}
                    activeOpacity={0.82}
                >
                    <Ionicons name="add-circle-outline" size={18} color={C.primaryText} />
                    <Text style={styles.addCtaText}>
                        Tambah kategori {activeTab === 'expense' ? 'expense' : 'income'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>

            {/* ── Add Category Modal ── */}
            <Modal
                visible={showAddModal}
                transparent
                animationType="slide"
                onRequestClose={() => { setShowAddModal(false); resetForm(); }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.sheetHandle} />

                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                Tambah Kategori {activeTab === 'expense' ? 'Expense' : 'Income'}
                            </Text>
                            <TouchableOpacity
                                style={styles.modalClose}
                                onPress={() => { setShowAddModal(false); resetForm(); }}
                            >
                                <Ionicons name="close" size={18} color={C.textMid} />
                            </TouchableOpacity>
                        </View>

                        {/* Preview */}
                        <View style={styles.preview}>
                            <View style={[styles.previewIcon, { backgroundColor: newColor + '20', borderColor: newColor + '40' }]}>
                                <Ionicons name={newIcon as any} size={22} color={newColor} />
                            </View>
                            <Text style={[styles.previewLabel, { color: newColor }]}>
                                {newLabel || 'Nama kategori'}
                            </Text>
                        </View>

                        {/* Label Input */}
                        <View style={styles.inputWrap}>
                            <Text style={styles.inputLabel}>NAMA KATEGORI</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Makan, Transport..."
                                placeholderTextColor={C.textMid}
                                value={newLabel}
                                onChangeText={setNewLabel}
                                autoCapitalize="words"
                                maxLength={24}
                            />
                        </View>

                        {/* Color Picker */}
                        <Text style={styles.pickerLabel}>WARNA</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.colorRow}
                        >
                            {PRESET_COLORS.map(color => (
                                <TouchableOpacity
                                    key={color}
                                    style={[
                                        styles.colorDot,
                                        { backgroundColor: color },
                                        newColor === color && styles.colorDotSelected,
                                    ]}
                                    onPress={() => setNewColor(color)}
                                />
                            ))}
                        </ScrollView>

                        {/* Icon Picker */}
                        <Text style={styles.pickerLabel}>IKON</Text>
                        <View style={styles.iconGrid}>
                            {PRESET_ICONS.map(icon => (
                                <TouchableOpacity
                                    key={icon}
                                    style={[
                                        styles.iconBtn,
                                        newIcon === icon && { backgroundColor: newColor + '25', borderColor: newColor + '60' }
                                    ]}
                                    onPress={() => setNewIcon(icon)}
                                >
                                    <Ionicons
                                        name={icon as any}
                                        size={18}
                                        color={newIcon === icon ? newColor : C.textMid}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Save Button */}
                        <TouchableOpacity
                            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                            onPress={handleAdd}
                            disabled={saving}
                            activeOpacity={0.88}
                        >
                            <Text style={styles.saveBtnText}>
                                {saving ? 'Menyimpan...' : 'Tambah Kategori'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#1C1C2E',
    },
    backBtn: {
        width: 36, height: 36,
        borderRadius: 10,
        backgroundColor: C.surfaceHigh,
        borderWidth: 1, borderColor: C.border,
        alignItems: 'center', justifyContent: 'center',
    },
    headerCenter: { flex: 1 },
    headerTitle: { color: C.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.4 },
    headerSub: { color: C.textMid, fontSize: 11, marginTop: 1 },
    addBtn: {
        width: 36, height: 36,
        borderRadius: 10,
        backgroundColor: C.primary,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },

    tabRow: {
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#1C1C2E',
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: C.surfaceHigh,
    },
    tabActive: { borderColor: C.border },
    tabText: { fontSize: 13, fontWeight: '600', color: C.textMid },
    tabTextActiveExpense: { color: C.danger },
    tabTextActiveIncome: { color: C.success },
    tabBadge: {
        backgroundColor: C.border,
        borderRadius: 8,
        paddingHorizontal: 6, paddingVertical: 1,
    },
    tabBadgeActiveExpense: { backgroundColor: 'rgba(248,113,113,0.15)' },
    tabBadgeActiveIncome: { backgroundColor: 'rgba(74,222,128,0.15)' },
    tabBadgeText: { fontSize: 10, fontWeight: '700', color: C.textMid },

    scroll: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 48,
    },

    catItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: C.surfaceHigh,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.border,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    catIcon: {
        width: 36, height: 36,
        borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
    },
    catLabel: { flex: 1, color: C.text, fontSize: 14, fontWeight: '600' },
    catColorDot: { width: 8, height: 8, borderRadius: 4 },
    deleteBtn: {
        width: 32, height: 32,
        borderRadius: 8,
        backgroundColor: C.dangerGlow,
        alignItems: 'center', justifyContent: 'center',
    },

    empty: { alignItems: 'center', paddingTop: 48, gap: 8 },
    emptyIcon: {
        width: 64, height: 64, borderRadius: 20,
        backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.border,
        alignItems: 'center', justifyContent: 'center', marginBottom: 4,
    },
    emptyText: { color: C.textSub, fontSize: 15, fontWeight: '600' },
    emptySub: { color: C.textMid, fontSize: 12, textAlign: 'center' },

    addCta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 8,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.primaryBorder,
        borderStyle: 'dashed',
        backgroundColor: C.primaryGlow,
    },
    addCtaText: { color: C.primaryText, fontSize: 13, fontWeight: '600' },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.78)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: '#10101A',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderTopWidth: 1,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: C.border,
        padding: 24,
        paddingBottom: 48,
    },
    sheetHandle: {
        width: 36, height: 3, borderRadius: 2,
        backgroundColor: C.border,
        alignSelf: 'center', marginBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: { color: C.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.4 },
    modalClose: {
        width: 30, height: 30, borderRadius: 8,
        backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.border,
        alignItems: 'center', justifyContent: 'center',
    },

    // Preview
    preview: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: C.surfaceHigh,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: C.border,
        padding: 14,
        marginBottom: 20,
    },
    previewIcon: {
        width: 40, height: 40, borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center', justifyContent: 'center',
    },
    previewLabel: { fontSize: 16, fontWeight: '700' },

    // Input
    inputWrap: {
        backgroundColor: C.surfaceHigh,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.border,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 10,
        marginBottom: 18,
    },
    inputLabel: {
        fontSize: 9, fontWeight: '700', color: C.textSub,
        letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6,
    },
    input: { color: C.text, fontSize: 15, padding: 0 },

    pickerLabel: {
        fontSize: 9, fontWeight: '700', color: C.textSub,
        letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10,
    },

    colorRow: { gap: 8, paddingBottom: 18 },
    colorDot: {
        width: 28, height: 28, borderRadius: 14,
    },
    colorDotSelected: {
        transform: [{ scale: 1.25 }],
        shadowColor: '#fff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 4,
    },

    iconGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 22,
    },
    iconBtn: {
        width: 44, height: 44,
        borderRadius: 12,
        backgroundColor: C.surfaceHigh,
        borderWidth: 1,
        borderColor: C.border,
        alignItems: 'center', justifyContent: 'center',
    },

    saveBtn: {
        backgroundColor: C.primary,
        borderRadius: 14,
        paddingVertical: 17,
        alignItems: 'center',
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 18,
        elevation: 8,
    },
    saveBtnText: { color: '#041A0C', fontSize: 15, fontWeight: '700' },
});
