import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { Account, useFinanceStore } from '../../features/finance/useFinanceStore';

const formatRupiah = (amount: number): string => {
    if (amount >= 1_000_000_000) return `Rp ${(amount / 1_000_000_000).toFixed(1)}M`;
    if (amount >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(1)}jt`;
    return `Rp ${amount.toLocaleString('id-ID')}`;
};

const formatInputNumber = (text: string) => {
    // Remove all non-numeric characters
    const cleanNumber = text.replace(/[^0-9]/g, '');
    if (!cleanNumber) return '';
    // Add dots every 3 digits
    return cleanNumber.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const getValidIcon = (iconName: string): any => {
    const isEmoji = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(iconName);
    if (isEmoji || !iconName) return 'card-outline';
    return iconName;
};

export const AccountsList = () => {
    const theme = useTheme();
    const primary = theme.colors.primary;
    const { accounts, addAccount, deleteAccount } = useFinanceStore();
    
    const [modalVisible, setModalVisible] = useState(false);
    const [name, setName] = useState('');
    const [emoji, setEmoji] = useState('card-outline');
    const [loading, setLoading] = useState(false);

    const handleAdd = async () => {
        if (!name.trim() || loading) {
            if (!name.trim()) Alert.alert('Error', 'Nama akun tidak boleh kosong');
            return;
        }
        
        setLoading(true);
        try {
            await addAccount(name, emoji, 0);
            setModalVisible(false);
            setName('');
            setEmoji('card-outline');
        } catch (err) {
            Alert.alert('Error', 'Gagal menambah kantong');
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = (id: string, name: string) => {
        Alert.alert(
            'Hapus Akun',
            `Yakin mau hapus akun ${name}?`,
            [
                { text: 'Batal', style: 'cancel' },
                { text: 'Hapus', style: 'destructive', onPress: () => deleteAccount(id) }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Kantong</Text>
                <TouchableOpacity onPress={() => setModalVisible(true)}>
                    <Ionicons name="add-circle" size={24} color={primary} />
                </TouchableOpacity>
            </View>

            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {accounts.length === 0 ? (
                    <TouchableOpacity 
                        style={[styles.emptyCard, { borderColor: theme.colors.border }]}
                        onPress={() => setModalVisible(true)}
                    >
                        <Ionicons name="wallet-outline" size={24} color={theme.colors.textMuted} />
                        <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>Tambah Kantong</Text>
                    </TouchableOpacity>
                ) : (
                    accounts.map(acc => (
                        <TouchableOpacity 
                            key={acc.id} 
                            style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                            onLongPress={() => confirmDelete(acc.id, acc.name)}
                        >
                            <View style={styles.cardHeader}>
                                <Ionicons name={getValidIcon(acc.emoji)} size={20} color={primary} />
                                <Text style={[styles.cardName, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                                    {acc.name}
                                </Text>
                            </View>
                            <Text style={[styles.cardBalance, { color: theme.colors.textPrimary }]}>
                                {formatRupiah(acc.balance)}
                            </Text>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>

            {/* Modal Tambah Akun */}
            <Modal visible={modalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
                        <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>Tambah Kantong Baru</Text>
                        
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Pilih Icon</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
                                {['card-outline', 'wallet-outline', 'cash-outline', 'business-outline', 'briefcase-outline', 'diamond-outline', 'star-outline'].map(i => (
                                    <TouchableOpacity 
                                        key={i} 
                                        onPress={() => setEmoji(i)}
                                        style={{ 
                                            width: 44, height: 44, borderRadius: 12, borderWidth: 1.5, 
                                            borderColor: emoji === i ? primary : theme.colors.border,
                                            backgroundColor: emoji === i ? primary + '15' : 'transparent',
                                            alignItems: 'center', justifyContent: 'center' 
                                        }}
                                    >
                                        <Ionicons name={i as any} size={22} color={emoji === i ? primary : theme.colors.textMuted} />
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Nama (cth: DANA, Dompet)</Text>
                            <TextInput 
                                style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]} 
                                value={name} 
                                onChangeText={setName} 
                                placeholderTextColor={theme.colors.textMuted}
                                placeholder="BCA / Mandiri / Dompet"
                            />
                        </View>

                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ color: theme.colors.textMuted, fontSize: 12, fontStyle: 'italic', lineHeight: 18 }}>
                                ℹ️ Saldo awal kantong ini dimulai dari Rp 0. Kamu bisa mengisi saldonya nanti melalui pencatatan transaksi pemasukan.
                            </Text>
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity 
                                style={[styles.btn, styles.btnCancel, { borderColor: theme.colors.border }]} 
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={{ color: theme.colors.textSecondary }}>Batal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.btn, styles.btnSave, { backgroundColor: loading ? theme.colors.textMuted : primary }]} 
                                onPress={handleAdd}
                                disabled={loading}
                            >
                                <Text style={styles.btnSaveText}>{loading ? 'Menyimpan...' : 'Simpan'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 4,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 10,
    },
    title: {
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    scrollContent: {
        paddingHorizontal: 16,
        gap: 12,
    },
    card: {
        width: 140,
        padding: 14,
        borderRadius: 20,
        borderWidth: 1,
        justifyContent: 'space-between',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    emoji: {
        fontSize: 18,
    },
    cardName: {
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
    },
    cardBalance: {
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    emptyCard: {
        width: 140,
        height: 80,
        borderRadius: 20,
        borderWidth: 1,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    emptyText: {
        fontSize: 12,
        fontWeight: '500',
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 20,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 10,
    },
    btn: {
        flex: 1,
        padding: 16,
        borderRadius: 14,
        alignItems: 'center',
    },
    btnCancel: {
        borderWidth: 1,
    },
    btnSave: {
    },
    btnSaveText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 16,
    }
});
