import React from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    StatusBar, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

// ─── Theme ────────────────────────────────────────────────────────────────────

const C = {
    bg: '#08080E',
    surface: '#12121A',
    surfaceHigh: '#1C1C2E',
    border: '#2C2C3E',
    primary: '#7C6FFF',
    primaryGlow: 'rgba(124,111,255,0.08)',
    primaryBorder: 'rgba(124,111,255,0.2)',
    primaryText: '#B8B2FF',
    text: '#FFFFFF',
    textSub: '#9494B0',
    textMid: '#5A5A78',
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function FinanceSettingsScreen() {
    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="light-content" backgroundColor={C.bg} />
            <View style={styles.orbTop} />

            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={20} color={C.textSub} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Finance</Text>
                    <Text style={styles.headerSub}>Pengaturan keuangan</Text>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Section: Kategori ── */}
                <Text style={styles.sectionLabel}>Kategori</Text>

                <SettingsItem
                    icon="grid-outline"
                    label="Kelola Kategori"
                    description="Tambah & lihat kategori expense dan income"
                    onPress={() => router.push('/settings/finance-categories')}
                />

                {/* ── Section: Kantong ── */}
                <Text style={[styles.sectionLabel, { marginTop: 18 }]}>Kantong</Text>

                <SettingsItem
                    icon="wallet-outline"
                    label="Kelola Kantong"
                    description="Edit nama, ikon, dan kelola dompet/akun kamu"
                    onPress={() => router.push('/settings/finance-pockets')}
                />

                {/* Placeholder untuk fitur berikutnya */}
                {/* 
                <SettingsItem
                    icon="bar-chart-outline"
                    label="Laporan Bulanan"
                    description="Export & atur laporan keuangan"
                    onPress={() => {}}
                    soon
                />
                <SettingsItem
                    icon="notifications-outline"
                    label="Notifikasi Budget"
                    description="Atur kapan kamu diingatkan"
                    onPress={() => {}}
                    soon
                />
                */}
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Settings Item ────────────────────────────────────────────────────────────

function SettingsItem({ icon, label, description, onPress, soon = false }: {
    icon: string;
    label: string;
    description: string;
    onPress: () => void;
    soon?: boolean;
}) {
    return (
        <TouchableOpacity
            style={styles.item}
            onPress={onPress}
            activeOpacity={soon ? 1 : 0.75}
            disabled={soon}
        >
            <View style={styles.itemIcon}>
                <Ionicons name={icon as any} size={18} color={C.primaryText} />
            </View>
            <View style={styles.itemText}>
                <View style={styles.itemLabelRow}>
                    <Text style={styles.itemLabel}>{label}</Text>
                    {soon && (
                        <View style={styles.soonBadge}>
                            <Text style={styles.soonText}>Segera</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.itemDesc}>{description}</Text>
            </View>
            {!soon && (
                <Ionicons name="chevron-forward" size={14} color={C.textMid} />
            )}
        </TouchableOpacity>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    orbTop: {
        position: 'absolute', width: 280, height: 280, borderRadius: 140,
        top: -120, right: -100, backgroundColor: 'rgba(124,111,255,0.04)',
    },

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
    headerTitle: {
        color: C.text, fontSize: 18,
        fontWeight: '800', letterSpacing: -0.4,
    },
    headerSub: { color: C.textMid, fontSize: 11, marginTop: 1 },

    scroll: {
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 48,
    },

    sectionLabel: {
        color: C.textSub,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginBottom: 10,
    },

    item: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: C.surfaceHigh,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: C.border,
        padding: 16,
        marginBottom: 8,
    },
    itemIcon: {
        width: 38, height: 38,
        borderRadius: 11,
        backgroundColor: C.primaryGlow,
        borderWidth: 1, borderColor: C.primaryBorder,
        alignItems: 'center', justifyContent: 'center',
    },
    itemText: { flex: 1, gap: 3 },
    itemLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    itemLabel: { color: C.text, fontSize: 14, fontWeight: '600' },
    itemDesc: { color: C.textMid, fontSize: 12 },

    soonBadge: {
        backgroundColor: 'rgba(124,111,255,0.15)',
        borderRadius: 6,
        paddingHorizontal: 6, paddingVertical: 2,
    },
    soonText: { color: C.primaryText, fontSize: 9, fontWeight: '700' },
});
