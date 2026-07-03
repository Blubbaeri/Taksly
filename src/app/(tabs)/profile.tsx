import React, { useEffect, useState, useMemo } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    StatusBar, ActivityIndicator,
    Modal, TextInput, ScrollView, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { useLoading } from '../../context/LoadingContext';

// ─── Theme Helper ─────────────────────────────────────────────────────────────

const getC = (t: ReturnType<typeof useTheme>) => ({
    bg: t.colors.background,
    surfaceHigh: t.colors.surfaceHighlight,
    border: t.colors.border,
    borderSoft: 'rgba(255,255,255,0.05)',
    primary: t.colors.primary,
    primaryGlow: 'rgba(124,111,255,0.12)',
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
    inputBg: t.isDark ? '#13161D' : t.colors.surfaceHighlight,
    btnText: t.isDark ? '#041A0C' : '#FFFFFF',
    cardBg: t.isDark ? '#151722' : '#F8FAFC',
    signOutBg: t.isDark ? '#1E2235' : '#EEF2F6',
});

// ─── Helper for time elapsed ──────────────────────────────────────────────────
function formatJoinedDate(createdAt?: string) {
    if (!createdAt) return 'Recently';
    const created = new Date(createdAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 3600 * 24));
    if (diffDays < 30) return `${Math.max(1, diffDays)} days ago`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
    const diffYears = Math.floor(diffMonths / 12);
    return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function Profile() {
    const theme = useTheme();
    const { isDark, toggleTheme } = theme;
    const C = getC(theme);
    const { styles, menuStyles, mfStyles } = useMemo(() => getStyles(C), [C]);

    const { setGlobalLoading } = useLoading();
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editNickname, setEditNickname] = useState('');
    const [editBio, setEditBio] = useState('');
    const [saving, setSaving] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => { fetchProfile(); }, []);

    const fetchProfile = async (silent = false) => {
        try {
            if (!silent) setGlobalLoading(true);
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
            } else {
                router.replace('/(auth)/login');
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            if (!silent) setGlobalLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchProfile(true);
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

    const rawName = profile?.nickname || profile?.full_name || user?.email?.split('@')[0] || 'User';
    const nameParts = rawName.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || profile?.bio || user?.email?.split('@')[0] || '';
    const initial = firstName.substring(0, 2).toUpperCase();
    const joinedTime = formatJoinedDate(user?.created_at);

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={C.bg} />

            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={C.primary}
                        colors={[C.primary]}
                    />
                }
            >
                {/* ── Top Header ── */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}></Text>
                    <TouchableOpacity
                        style={styles.editIconBtn}
                        onPress={() => setShowEditModal(true)}
                        activeOpacity={0.75}
                    >
                        <Ionicons name="ellipsis-vertical" size={20} color={C.text} />
                    </TouchableOpacity>
                </View>

                {/* ── Avatar row + Joined Badge ── */}
                <View style={styles.avatarRow}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initial}</Text>
                    </View>
                    <View style={styles.joinedBlock}>
                        <Text style={styles.joinedLabel}>Joined</Text>
                        <Text style={styles.joinedValue}>{joinedTime}</Text>
                    </View>
                </View>

                {/* ── Name Section ── */}
                <View style={styles.nameBlock}>
                    <Text style={styles.firstName}>{firstName}</Text>
                    {lastName ? (
                        <Text style={styles.lastName}>{lastName}</Text>
                    ) : null}
                    <Text style={styles.emailSubtext}>{user?.email}</Text>
                </View>

                {/* ── Profile Section ── */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeading}>Profile</Text>
                    <MenuItem
                        icon="person"
                        iconBg="#FF8C0018"
                        iconColor="#FF8C00"
                        label="Manage user"
                        onPress={() => setShowEditModal(true)}
                        C={C}
                        menuStyles={menuStyles}
                    />
                </View>

                {/* ── Settings Section ── */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeading}>Settings</Text>
                    <MenuItem
                        icon="sparkles"
                        iconBg="#7C6FFF18"
                        iconColor="#7C6FFF"
                        label="Taksly AI Assistant"
                        onPress={() => router.push('/settings/chatbot')}
                        C={C}
                        menuStyles={menuStyles}
                    />
                    <MenuItem
                        icon="wallet"
                        iconBg="#1D9E7518"
                        iconColor="#1D9E75"
                        label="Finance Categories"
                        onPress={() => router.push('/settings/finance')}
                        C={C}
                        menuStyles={menuStyles}
                    />
                    <MenuItem
                        icon={isDark ? "moon" : "sunny"}
                        iconBg="#0A84FF18"
                        iconColor="#0A84FF"
                        label={isDark ? "Dark Mode (Active)" : "Light Mode (Active)"}
                        onPress={toggleTheme}
                        C={C}
                        menuStyles={menuStyles}
                    />
                </View>

                {/* ── Sign Out Button ── */}
                <View style={styles.signOutWrap}>
                    <TouchableOpacity
                        style={styles.signOutBtn}
                        onPress={handleLogout}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.signOutText}>Sign Out</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* ── Edit Profile Modal ── */}
            <Modal visible={showEditModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.sheetHandle} />

                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Manage Profile</Text>
                            <TouchableOpacity
                                style={styles.modalCloseBtn}
                                onPress={() => setShowEditModal(false)}
                            >
                                <Ionicons name="close" size={18} color={C.textMid} />
                            </TouchableOpacity>
                        </View>

                        <ModalField
                            label="Nickname / First Name"
                            placeholder="Your name"
                            value={editNickname}
                            onChangeText={setEditNickname}
                            focused={focusedField === 'nickname'}
                            onFocus={() => setFocusedField('nickname')}
                            onBlur={() => setFocusedField(null)}
                            C={C}
                            mfStyles={mfStyles}
                        />
                        <ModalField
                            label="Last Name / Bio"
                            placeholder="Short description or surname"
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
                                ? <ActivityIndicator color={C.btnText} />
                                : <Text style={styles.saveBtnText}>Save Changes</Text>
                            }
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MenuItem({ icon, iconBg, iconColor, label, onPress, C, menuStyles }: {
    icon: any; iconBg: string; iconColor: string; label: string; onPress?: () => void; C: any; menuStyles: any;
}) {
    return (
        <TouchableOpacity
            style={menuStyles.item}
            onPress={onPress}
            activeOpacity={0.65}
        >
            <View style={[menuStyles.iconBox, { backgroundColor: iconBg }]}>
                <Ionicons name={icon} size={18} color={iconColor} />
            </View>
            <Text style={[menuStyles.label, { color: C.text }]}>{label}</Text>
            <Ionicons name="chevron-forward" size={16} color={C.textSub} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
    );
}

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

// ─── Styles ───────────────────────────────────────────────────────────────────

const getStyles = (C: any) => {
    const menuStyles = StyleSheet.create({
        item: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            paddingVertical: 12,
        },
        iconBox: {
            width: 42,
            height: 42,
            borderRadius: 21,
            alignItems: 'center',
            justifyContent: 'center',
        },
        label: {
            fontSize: 15,
            fontWeight: '600',
        },
    });

    const mfStyles = StyleSheet.create({
        wrap: {
            backgroundColor: C.inputBg,
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
        wrapMulti: {
            paddingBottom: 14,
        },
        label: {
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            marginBottom: 6,
        },
        input: {
            color: C.text,
            fontSize: 15,
            fontWeight: '400',
            padding: 0,
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
        },
    });

    const styles = StyleSheet.create({
        safe: {
            flex: 1,
            backgroundColor: C.bg,
        },
        scroll: {
            paddingHorizontal: 24,
            paddingTop: 12,
            paddingBottom: 100,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
        },
        headerTitle: {
            fontSize: 18,
            fontWeight: '700',
            color: C.text,
        },
        editIconBtn: {
            width: 38,
            height: 38,
            borderRadius: 19,
            alignItems: 'center',
            justifyContent: 'center',
        },
        avatarRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 20,
            marginBottom: 20,
        },
        avatar: {
            width: 90,
            height: 90,
            borderRadius: 45,
            backgroundColor: '#1C2030',
            alignItems: 'center',
            justifyContent: 'center',
        },
        avatarText: {
            color: '#FFFFFF',
            fontSize: 32,
            fontWeight: '800',
        },
        joinedBlock: {
            justifyContent: 'center',
        },
        joinedLabel: {
            fontSize: 13,
            color: C.textMid,
            marginBottom: 2,
        },
        joinedValue: {
            fontSize: 16,
            fontWeight: '800',
            color: C.text,
        },
        nameBlock: {
            marginBottom: 36,
        },
        firstName: {
            fontSize: 34,
            fontWeight: '800',
            color: C.text,
            letterSpacing: -0.8,
            lineHeight: 38,
        },
        lastName: {
            fontSize: 32,
            fontWeight: '400',
            color: C.textMid,
            letterSpacing: -0.5,
            lineHeight: 36,
            marginBottom: 6,
        },
        emailSubtext: {
            fontSize: 13,
            color: C.textSub,
            marginTop: 4,
        },
        section: {
            marginBottom: 32,
        },
        sectionHeading: {
            fontSize: 18,
            fontWeight: '700',
            color: C.text,
            marginBottom: 14,
        },
        signOutWrap: {
            alignItems: 'flex-start',
            marginTop: 8,
        },
        signOutBtn: {
            backgroundColor: C.signOutBg,
            paddingHorizontal: 28,
            paddingVertical: 14,
            borderRadius: 14,
        },
        signOutText: {
            color: '#3B82F6',
            fontSize: 15,
            fontWeight: '700',
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
        },
        modalCloseBtn: {
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: C.surfaceHigh,
            alignItems: 'center',
            justifyContent: 'center',
        },
        saveBtn: {
            backgroundColor: C.primary,
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: 'center',
            marginTop: 8,
        },
        saveBtnText: {
            color: C.btnText,
            fontSize: 15,
            fontWeight: '700',
        },
    });

    return { styles, menuStyles, mfStyles };
};