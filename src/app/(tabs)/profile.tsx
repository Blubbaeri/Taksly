import React, { useEffect, useState, useMemo } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    StatusBar, ActivityIndicator,
    Modal, TextInput, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { useLoading } from '../../context/LoadingContext';

// ─── Theme Helper ─────────────────────────────────────────────────────────────

// We replace the hardcoded C object with a function that takes the current theme
const getC = (t: ReturnType<typeof useTheme>) => ({
    bg: t.colors.background,
    surfaceHigh: t.colors.surfaceHighlight,
    border: t.colors.border,
    borderSoft: 'rgba(255,255,255,0.05)',
    primary: t.colors.primary,
    primaryGlow: 'rgba(124,111,255,0.08)',
    primaryBorder: 'rgba(124,111,255,0.2)',
    primaryText: t.colors.primary,
    danger: t.colors.danger,
    dangerDim: 'rgba(255,82,82,0.08)',
    dangerBorder: 'rgba(255,82,82,0.22)',
    text: t.colors.textPrimary,
    textSub: t.colors.textMuted,
    textMid: t.colors.textSecondary,
    muted: t.colors.border,
    sheet: t.colors.surface,
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function Profile() {
    const theme = useTheme();
    const C = getC(theme);
    const { styles, statStyles, menuStyles, mfStyles } = useMemo(() => getStyles(C), [C]);

    const { setGlobalLoading } = useLoading();
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [stats, setStats] = useState({ tasks: 0, finance: 0, efficiency: 0 });
    const [showEditModal, setShowEditModal] = useState(false);
    const [editNickname, setEditNickname] = useState('');
    const [editBio, setEditBio] = useState('');
    const [saving, setSaving] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    useEffect(() => { fetchProfile(); }, []);

    const fetchProfile = async () => {
        try {
            setGlobalLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setUser(session.user);

                const { data } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .single();

                if (data) {
                    setProfile(data);
                    setEditNickname(data.nickname || '');
                    setEditBio(data.bio || '');
                }

                const [tasksRes, financeRes] = await Promise.all([
                    supabase.from('ts_tasks').select('id, task_status').eq('user_id', session.user.id).is('deleted_date', null),
                    supabase.from('ts_finance').select('amount, type').eq('user_id', session.user.id).is('deleted_date', null),
                ]);

                let taskCount = 0, doneCount = 0;
                if (tasksRes.data) {
                    taskCount = tasksRes.data.length;
                    doneCount = tasksRes.data.filter(t => t.task_status === 'Completed').length;
                }

                let balance = 0;
                if (financeRes.data) {
                    balance = financeRes.data.reduce((acc, curr) =>
                        curr.type === 'income' ? acc + Number(curr.amount) : acc - Number(curr.amount), 0);
                }

                setStats({
                    tasks: taskCount,
                    finance: balance,
                    efficiency: taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0,
                });
            } else {
                router.replace('/(auth)/login');
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setGlobalLoading(false);
        }
    };

    const handleUpdateProfile = async () => {
        try {
            setGlobalLoading(true);
            setSaving(true);
            const { error } = await supabase
                .from('user_profiles')
                .update({ nickname: editNickname, bio: editBio, modif_date: new Date().toISOString() })
                .eq('user_id', user.id);

            if (error) throw error;
            setProfile({ ...profile, nickname: editNickname, bio: editBio });
            setShowEditModal(false);
        } catch (error: any) {
            alert('Gagal update profil: ' + error.message);
        } finally {
            setSaving(false);
            setGlobalLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            router.replace('/(auth)/login');
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    // The global loader handles initial data fetching

    const displayName = profile?.nickname || profile?.full_name || user?.email?.split('@')[0] || 'User';
    const initial = displayName.substring(0, 2).toUpperCase();

    const formatCurrency = (amount: number) => {
        if (Math.abs(amount) >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(1)}jt`;
        if (Math.abs(amount) >= 1_000) return `Rp ${(amount / 1_000).toFixed(0)}rb`;
        return `Rp ${amount.toLocaleString('id-ID')}`;
    };

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
            <StatusBar barStyle="light-content" backgroundColor={C.bg} />

            {/* Ambient orbs */}
            <View style={styles.orbTop} />
            <View style={styles.orbBottom} />

            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Header ── */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Profile</Text>
                    <TouchableOpacity
                        style={styles.editIconBtn}
                        onPress={() => setShowEditModal(true)}
                        activeOpacity={0.75}
                    >
                        <Ionicons name="pencil-outline" size={16} color={C.primaryText} />
                    </TouchableOpacity>
                </View>

                {/* ── Avatar + Identity ── */}
                <View style={styles.identityBlock}>
                    <View style={styles.avatarRing}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{initial}</Text>
                        </View>
                    </View>
                    <Text style={styles.displayName}>@{displayName}</Text>
                    <Text style={styles.emailText}>{user?.email}</Text>
                    {profile?.bio ? (
                        <Text style={styles.bioText}>{profile.bio}</Text>
                    ) : null}
                </View>

                {/* ── Stats ── */}
                <View style={styles.statsRow}>
                    <StatCard label="Tasks" value={String(stats.tasks)} C={C} statStyles={statStyles} />
                    <StatCard
                        label="Balance"
                        value={formatCurrency(stats.finance)}
                        danger={stats.finance < 0}
                        C={C}
                        statStyles={statStyles}
                    />
                    <StatCard label="Efficiency" value={`${stats.efficiency}%`} highlight C={C} statStyles={statStyles} />
                </View>

                {/* ── Divider ── */}
                <View style={styles.divider} />

                {/* ── Menu ── */}
                <View style={[styles.menuSection, { backgroundColor: C.bg }]}>
                    <Text style={[styles.sectionLabel, { color: C.textSub }]}>Pengaturan</Text>

                    <MenuItem
                        icon="person-outline"
                        label="Edit Profile"
                        onPress={() => setShowEditModal(true)}
                        C={C}
                        menuStyles={menuStyles}
                    />
                    <MenuItem
                        icon="wallet-outline"
                        label="Finance"
                        onPress={() => router.push('/settings/finance')}
                        C={C}
                        menuStyles={menuStyles}
                    />
                </View>

                {/* ── Logout ── */}
                <TouchableOpacity
                    style={styles.logoutBtn}
                    onPress={handleLogout}
                    activeOpacity={0.82}
                >
                    <Ionicons name="log-out-outline" size={17} color={C.danger} />
                    <Text style={styles.logoutText}>Keluar</Text>
                </TouchableOpacity>

                <Text style={styles.footer}>© 2026 Taksly</Text>
            </ScrollView>

            {/* ── Edit Profile Modal ── */}
            <Modal visible={showEditModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        {/* Drag handle */}
                        <View style={styles.sheetHandle} />

                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Profile</Text>
                            <TouchableOpacity
                                style={styles.modalCloseBtn}
                                onPress={() => setShowEditModal(false)}
                            >
                                <Ionicons name="close" size={18} color={C.textMid} />
                            </TouchableOpacity>
                        </View>

                        <ModalField
                            label="Nickname"
                            placeholder="your nickname"
                            value={editNickname}
                            onChangeText={setEditNickname}
                            focused={focusedField === 'nickname'}
                            onFocus={() => setFocusedField('nickname')}
                            onBlur={() => setFocusedField(null)}
                            C={C}
                            mfStyles={mfStyles}
                        />
                        <ModalField
                            label="Bio"
                            placeholder="Ceritain sedikit tentang kamu..."
                            value={editBio}
                            onChangeText={setEditBio}
                            focused={focusedField === 'bio'}
                            onFocus={() => setFocusedField('bio')}
                            onBlur={() => setFocusedField(null)}
                            multiline
                            C={C}
                            mfStyles={mfStyles}
                        />

                        <TouchableOpacity
                            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                            onPress={handleUpdateProfile}
                            disabled={saving}
                            activeOpacity={0.88}
                        >
                            {saving
                                ? <ActivityIndicator color="#041A0C" />
                                : <Text style={styles.saveBtnText}>Simpan</Text>
                            }
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, danger = false, highlight = false, C, statStyles }: {
    label: string; value: string; danger?: boolean; highlight?: boolean; C: any; statStyles: any;
}) {
    return (
        <View style={[statStyles.card, { backgroundColor: C.surfaceHigh, borderColor: C.border }, highlight && { borderColor: C.primaryBorder, backgroundColor: C.primaryGlow }]}>
            <Text style={[statStyles.value, { color: C.text }, danger && { color: C.danger }, highlight && { color: C.primary }]}>
                {value}
            </Text>
            <Text style={[statStyles.label, { color: C.textSub }]}>{label}</Text>
        </View>
    );
}

// Cleaned up

function MenuItem({ icon, label, onPress, C, menuStyles }: {
    icon: any; label: string; onPress?: () => void; C: any; menuStyles: any;
}) {
    return (
        <TouchableOpacity
            style={[menuStyles.item, { backgroundColor: C.surfaceHigh, borderColor: C.border }]}
            onPress={onPress}
            activeOpacity={0.72}
        >
            <View style={[menuStyles.iconBox, { backgroundColor: C.primaryGlow }]}>
                <Ionicons name={icon} size={16} color={C.primaryText} />
            </View>
            <Text style={[menuStyles.label, { color: C.text }]}>{label}</Text>
            <Ionicons name="chevron-forward" size={14} color={C.textSub} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
    );
}

// Cleaned up

function ModalField({ label, placeholder, value, onChangeText, focused, onFocus, onBlur, multiline = false, C, mfStyles }: {
    label: string; placeholder: string; value: string;
    onChangeText: (t: string) => void; focused: boolean;
    onFocus: () => void; onBlur: () => void; multiline?: boolean; C: any; mfStyles: any;
}) {
    return (
        <View style={[mfStyles.wrap, { borderColor: C.border }, focused && { borderColor: C.primaryBorder, backgroundColor: C.primaryGlow }, multiline && mfStyles.wrapMulti]}>
            <Text style={[mfStyles.label, { color: C.textSub }, focused && { color: C.primaryText }]}>{label}</Text>
            <TextInput
                style={[mfStyles.input, { color: C.text }, multiline && mfStyles.inputMulti]}
                placeholder={placeholder}
                placeholderTextColor={C.textSub}
                value={value}
                onChangeText={onChangeText}
                onFocus={onFocus}
                onBlur={onBlur}
                multiline={multiline}
                numberOfLines={multiline ? 3 : 1}
                textAlignVertical={multiline ? 'top' : 'center'}
            />
            {focused && <View style={[mfStyles.activeLine, { backgroundColor: C.primary }]} />}
        </View>
    );
}

// Cleaned up

// ─── Styles ───────────────────────────────────────────────────────────────────

const getStyles = (C: any) => {
    const statStyles = StyleSheet.create({
        card: {
            flex: 1,
            backgroundColor: C.surfaceHigh,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: C.border,
            paddingVertical: 16,
            alignItems: 'center',
        },
        cardHighlight: {
            borderColor: C.primaryBorder,
            backgroundColor: C.primaryGlow,
        },
        value: {
            color: C.text,
            fontSize: 16,
            fontWeight: '700',
            letterSpacing: -0.3,
            marginBottom: 4,
        },
        label: {
            color: C.textSub,
            fontSize: 11,
            fontWeight: '600',
            letterSpacing: 0.5,
            textTransform: 'uppercase',
        },
    });

    const menuStyles = StyleSheet.create({
        item: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingVertical: 14,
            paddingHorizontal: 16,
            backgroundColor: C.surfaceHigh,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: C.border,
            marginBottom: 8,
        },
        iconBox: {
            width: 30,
            height: 30,
            borderRadius: 8,
            backgroundColor: C.primaryGlow,
            alignItems: 'center',
            justifyContent: 'center',
        },
        label: {
            color: C.text,
            fontSize: 14,
            fontWeight: '500',
        },
    });

    const mfStyles = StyleSheet.create({
        wrap: {
            backgroundColor: '#13161D',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: C.border,
            paddingHorizontal: 18,
            paddingTop: 14,
            paddingBottom: 12,
            marginBottom: 10,
            position: 'relative',
            overflow: 'hidden',
        },
        wrapFocused: {
            borderColor: C.primaryBorder,
            backgroundColor: C.primaryGlow,
        },
        wrapMulti: {
            paddingBottom: 14,
        },
        label: {
            fontSize: 10,
            fontWeight: '700',
            color: C.textSub,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            marginBottom: 6,
        },
        labelFocused: {
            color: C.primaryText,
        },
        input: {
            color: C.text,
            fontSize: 15,
            fontWeight: '400',
            padding: 0,
            letterSpacing: 0.2,
        },
        inputMulti: {
            minHeight: 60,
            lineHeight: 22,
        },
        activeLine: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 1.5,
            backgroundColor: C.primary,
        },
    });

    const styles = StyleSheet.create({
        safe: {
            flex: 1,
            backgroundColor: C.bg,
        },
    loading: {
        flex: 1,
        backgroundColor: C.bg,
        justifyContent: 'center',
        alignItems: 'center',
    },

    orbTop: {
        position: 'absolute',
        width: 280,
        height: 280,
        borderRadius: 140,
        top: -120,
        right: -100,
        backgroundColor: 'rgba(61,255,160,0.04)',
    },
    orbBottom: {
        position: 'absolute',
        width: 240,
        height: 240,
        borderRadius: 120,
        bottom: -80,
        left: -80,
        backgroundColor: 'rgba(34,211,238,0.025)',
    },

    scroll: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 40,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 36,
    },
    headerTitle: {
        color: C.text,
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -1,
    },
    editIconBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: C.primaryGlow,
        borderWidth: 1,
        borderColor: C.primaryBorder,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Identity
    identityBlock: {
        alignItems: 'center',
        marginBottom: 28,
    },
    avatarRing: {
        padding: 3,
        borderRadius: 50,
        borderWidth: 1.5,
        borderColor: C.primaryBorder,
        marginBottom: 14,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: C.primaryGlow,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: C.primary,
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -1,
    },
    displayName: {
        color: C.text,
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: -0.5,
        marginBottom: 4,
    },
    emailText: {
        color: C.textMid,
        fontSize: 13,
        fontWeight: '400',
        marginBottom: 8,
    },
    bioText: {
        color: C.textMid,
        fontSize: 13,
        lineHeight: 20,
        textAlign: 'center',
        paddingHorizontal: 20,
    },

    // Stats
    statsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 28,
    },

    // Divider
    divider: {
        height: 1,
        backgroundColor: C.borderSoft,
        marginBottom: 24,
    },

    // Menu
    menuSection: {
        marginBottom: 24,
    },
    sectionLabel: {
        color: C.textSub,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginBottom: 12,
    },

    // Logout
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.dangerBorder,
        backgroundColor: C.dangerDim,
        marginBottom: 28,
    },
    logoutText: {
        color: C.danger,
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 0.1,
    },

    footer: {
        textAlign: 'center',
        color: C.muted,
        fontSize: 11,
        fontWeight: '500',
        letterSpacing: 0.5,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: C.sheet,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderTopWidth: 1,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: C.border,
        padding: 24,
        paddingBottom: 44,
    },
    sheetHandle: {
        width: 36,
        height: 3,
        borderRadius: 2,
        backgroundColor: C.border,
        alignSelf: 'center',
        marginBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        color: C.text,
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    modalCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: C.surfaceHigh,
        borderWidth: 1,
        borderColor: C.border,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Save button
    saveBtn: {
        backgroundColor: C.primary,
        borderRadius: 12,
        paddingVertical: 17,
        alignItems: 'center',
        marginTop: 8,
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22,
        shadowRadius: 18,
        elevation: 6,
    },
    saveBtnText: {
        color: '#041A0C',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.1,
    },
});

    return { styles, statStyles, menuStyles, mfStyles };
};