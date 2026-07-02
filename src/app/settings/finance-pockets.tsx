import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    StatusBar, ScrollView, TextInput,
    Modal, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFinanceStore, Account } from '../../../features/finance/useFinanceStore';

// ─── Theme Colors ─────────────────────────────────────────────────────────────

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
    'card-outline', 'wallet-outline', 'cash-outline', 'business-outline',
    'briefcase-outline', 'diamond-outline', 'star-outline', 'gift-outline',
    'home-outline', 'car-outline', 'basket-outline', 'bank-outline'
];

const getValidIcon = (iconName: string): any => {
    const isEmoji = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(iconName);
    if (isEmoji || !iconName) return 'card-outline';
    return iconName;
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function FinancePocketsScreen() {
    const { accounts, addAccount, deleteAccount, updateAccount } = useFinanceStore();

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);

    // Form inputs
    const [name, setName] = useState('');
    const [emoji, setEmoji] = useState('card-outline');
    const [saving, setSaving] = useState(false);

    const formatIDR = (n: number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

    const openAddModal = () => {
        setEditingAccount(null);
        setName('');
        setEmoji('card-outline');
        setShowModal(true);
    };

    const openEditModal = (acc: Account) => {
        setEditingAccount(acc);
        setName(acc.name);
        setEmoji(acc.emoji);
        setShowModal(true);
    };

    const handleSave = async () => {
        const cleanName = name.trim();
        if (!cleanName) {
            Alert.alert('Oops', 'Nama kantong tidak boleh kosong.');
            return;
        }

        setSaving(true);
        try {
            if (editingAccount) {
                // Edit existing pocket
                await updateAccount(editingAccount.id, cleanName, emoji);
            } else {
                // Add new pocket
                await addAccount(cleanName, emoji, 0);
            }
            setShowModal(false);
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
                    <Text style={styles.headerTitle}>Kelola Kantong</Text>
                    <Text style={styles.headerSub}>Atur nama & ikon dompet kamu</Text>
                </View>
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={openAddModal}
                >
                    <Ionicons name="add" size={20} color={C.text} />
                </TouchableOpacity>
            </View>

            {/* ── Pocket List ── */}
            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                {accounts.length === 0 ? (
                    <View style={styles.empty}>
                        <View style={styles.emptyIcon}>
                            <Ionicons name="wallet-outline" size={28} color={C.textMid} />
                        </View>
                        <Text style={styles.emptyText}>Belum ada kantong</Text>
                        <Text style={styles.emptySub}>
                            Tap tombol + di atas untuk menambahkan
                        </Text>
                    </View>
                ) : (
                    accounts.map((acc: Account) => {
                        return (
                            <View key={acc.id} style={styles.pocketItem}>
                                <View style={styles.pocketIcon}>
                                    <Ionicons name={getValidIcon(acc.emoji)} size={20} color={C.primaryText} />
                                </View>
                                <View style={styles.pocketInfo}>
                                    <Text style={styles.pocketLabel}>{acc.name}</Text>
                                    <Text style={styles.pocketBalance}>{formatIDR(acc.balance)}</Text>
                                </View>
                                
                                <View style={styles.actionGroup}>
                                    <TouchableOpacity 
                                        style={styles.editBtn}
                                        onPress={() => openEditModal(acc)}
                                    >
                                        <Ionicons name="pencil-outline" size={16} color={C.primaryText} />
                                    </TouchableOpacity>

                                    <TouchableOpacity 
                                        style={styles.deleteBtn}
                                        onPress={() => {
                                            Alert.alert(
                                                'Hapus Kantong',
                                                `Yakin ingin menghapus kantong "${acc.name}"?`,
                                                [
                                                    { text: 'Batal', style: 'cancel' },
                                                    { 
                                                        text: 'Hapus', 
                                                        style: 'destructive',
                                                        onPress: () => deleteAccount(acc.id)
                                                    }
                                                ]
                                            );
                                        }}
                                    >
                                        <Ionicons name="trash-outline" size={16} color={C.danger} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    })
                )}

                {/* Add CTA at bottom */}
                <TouchableOpacity
                    style={styles.addCta}
                    onPress={openAddModal}
                    activeOpacity={0.82}
                >
                    <Ionicons name="add-circle-outline" size={18} color={C.primaryText} />
                    <Text style={styles.addCtaText}>Tambah kantong baru</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* ── Add / Edit Pocket Modal ── */}
            <Modal
                visible={showModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.sheetHandle} />

                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {editingAccount ? 'Edit Kantong' : 'Tambah Kantong Baru'}
                            </Text>
                            <TouchableOpacity
                                style={styles.modalClose}
                                onPress={() => setShowModal(false)}
                            >
                                <Ionicons name="close" size={18} color={C.textMid} />
                            </TouchableOpacity>
                        </View>

                        {/* Preview */}
                        <View style={styles.preview}>
                            <View style={styles.previewIcon}>
                                <Ionicons name={getValidIcon(emoji)} size={20} color={C.primaryText} />
                            </View>
                            <Text style={styles.previewLabel}>
                                {name || 'Nama Kantong'}
                            </Text>
                        </View>

                        {/* Name Input */}
                        <View style={styles.inputWrap}>
                            <Text style={styles.inputLabel}>NAMA KANTONG</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Rekening Utama, Tabungan..."
                                placeholderTextColor={C.textMid}
                                value={name}
                                onChangeText={setName}
                                autoCapitalize="words"
                                maxLength={24}
                            />
                        </View>



                        {/* Icon Picker */}
                        <Text style={styles.pickerLabel}>PILIH IKON KANTONG</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.emojiRow}
                        >
                            {PRESET_ICONS.map(item => (
                                <TouchableOpacity
                                    key={item}
                                    style={[
                                        styles.emojiDot,
                                        emoji === item && styles.emojiDotSelected,
                                    ]}
                                    onPress={() => setEmoji(item)}
                                >
                                    <Ionicons 
                                        name={item as any} 
                                        size={20} 
                                        color={emoji === item ? C.primary : C.textMid} 
                                    />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Save Button */}
                        <TouchableOpacity
                            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                            onPress={handleSave}
                            disabled={saving}
                            activeOpacity={0.88}
                        >
                            <Text style={styles.saveBtnText}>
                                {saving ? 'Menyimpan...' : (editingAccount ? 'Simpan Perubahan' : 'Tambah Kantong')}
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

    scroll: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 48,
    },

    pocketItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: C.surfaceHigh,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.border,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    pocketIcon: {
        width: 42, height: 42,
        borderRadius: 12,
        backgroundColor: C.border,
        alignItems: 'center', justifyContent: 'center',
    },
    pocketEmoji: { fontSize: 20 },
    pocketInfo: { flex: 1, gap: 2 },
    pocketLabel: { color: C.text, fontSize: 14, fontWeight: '700' },
    pocketBalance: { color: C.primaryText, fontSize: 13, fontWeight: '600' },

    actionGroup: { flexDirection: 'row', gap: 6 },
    editBtn: {
        width: 32, height: 32,
        borderRadius: 8,
        backgroundColor: C.primaryGlow,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: C.primaryBorder
    },
    deleteBtn: {
        width: 32, height: 32,
        borderRadius: 8,
        backgroundColor: C.dangerGlow,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: C.dangerBorder
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
        backgroundColor: C.border,
        alignItems: 'center', justifyContent: 'center',
    },
    previewEmoji: { fontSize: 22 },
    previewLabel: { fontSize: 16, fontWeight: '700', color: C.text },

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

    emojiRow: { gap: 12, paddingBottom: 22, height: 60, alignItems: 'center' },
    emojiDot: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: C.surfaceHigh, borderWidth: 1.5, borderColor: C.border,
        alignItems: 'center', justifyContent: 'center',
    },
    emojiDotSelected: {
        borderColor: C.primary,
        backgroundColor: C.primaryGlow,
    },
    emojiPickerText: { fontSize: 22 },

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
        marginTop: 10,
    },
    saveBtnText: { color: '#041A0C', fontSize: 15, fontWeight: '700' },
});
