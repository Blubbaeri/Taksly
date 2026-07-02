import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Dimensions,
    ScrollView,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    Modal,
    Alert,
    PanResponder,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import Papa from 'papaparse';
import CustomKeyboard from './CustomKeyboard';
import type { Category, TransactionType, Account } from './useFinanceStore';
import { Ionicons } from '@expo/vector-icons';
import { scanReceiptFromCamera, scanReceiptFromLibrary } from './scanReceipt';
import { useTheme } from '../../theme/ThemeContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TransactionSheetProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (type: TransactionType | 'transfer', categoryId: string, amount: number, note: string, accountId?: string, toAccountId?: string) => void;
    expenseCategories: Category[];
    incomeCategories: Category[];
    accounts?: Account[];
    onAddCategory: (type: TransactionType, category: Omit<Category, 'id'>) => void;
    initialOCRResult?: {
        amount: number;
        category: string;
        rawText: string;
    } | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.9;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDisplay = (raw: string): string => {
    if (!raw || raw === '0') return '0';
    const [int, dec] = raw.split('.');
    const formatted = parseInt(int || '0', 10).toLocaleString('id-ID');
    return dec !== undefined ? `${formatted},${dec}` : formatted;
};

const smartCategorize = (note: string): string | null => {
    const n = note.toLowerCase();
    if (/makan|resto|food|warung|kopi/i.test(n)) return 'food';
    if (/gojek|grab|transport|bensin|parkir/i.test(n)) return 'transport';
    if (/shopee|tokped|belanja|mall|pasar/i.test(n)) return 'belanja';
    if (/netflix|spotify|game|bioskop/i.test(n)) return 'hiburan';
    if (/obat|rs|klinik|apotek/i.test(n)) return 'kesehatan';
    if (/listrik|air|wifi|pln/i.test(n)) return 'tagihan';
    if (/buku|kursus|sekolah/i.test(n)) return 'pendidikan';
    return null;
};

const getValidIcon = (iconName: string): any => {
    const isEmoji = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(iconName);
    if (isEmoji || !iconName) return 'card-outline';
    return iconName;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function TransactionSheet({
    visible,
    onClose,
    onSubmit,
    expenseCategories,
    incomeCategories,
    accounts = [],
    onAddCategory,
    initialOCRResult,
}: TransactionSheetProps) {
    const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    const [type, setType] = useState<TransactionType | 'transfer'>('expense');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedAccount, setSelectedAccount] = useState<string>('');
    const [destinationAccount, setDestinationAccount] = useState<string>('');
    const [activeDropdown, setActiveDropdown] = useState<'source' | 'destination' | null>(null);
    const [amount, setAmount] = useState<string>('0');
    const [note, setNote] = useState<string>('');
    
    // Category Adding State
    const [showAddCatModal, setShowAddCatModal] = useState(false);
    const [newCatLabel, setNewCatLabel] = useState('');
    const [newCatIcon, setNewCatIcon] = useState('apps-outline');
    const [newCatColor, setNewCatColor] = useState('#7C6FFF');

    // ─── Pan Responder for Swipe-to-close ───
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return gestureState.dy > 10; // Only swipe DOWN
            },
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    slideAnim.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 150 || gestureState.vy > 0.5) {
                    onClose();
                } else {
                    Animated.spring(slideAnim, {
                        toValue: 0,
                        damping: 22,
                        stiffness: 200,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    const categories = type === 'expense' ? expenseCategories : incomeCategories;

    // ─── Animation ────────────────────────────────────────────────────────────

    useEffect(() => {
        if (visible) {
            // Reset form
            setAmount('0');
            setNote('');
            setSelectedCategory('');
            setSelectedAccount('');
            setDestinationAccount('');
            setActiveDropdown(null);
            setType('expense');

            // Pre-fill if OCR result provided
            if (initialOCRResult) {
                setAmount(String(initialOCRResult.amount));
                if (initialOCRResult.category) setSelectedCategory(initialOCRResult.category);
                setNote(initialOCRResult.rawText.slice(0, 100).replace(/\n/g, ' '));
            }

            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    damping: 22,
                    stiffness: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(backdropAnim, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: SHEET_HEIGHT,
                    damping: 20,
                    stiffness: 180,
                    useNativeDriver: true,
                }),
                Animated.timing(backdropAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    // ─── Handlers ─────────────────────────────────────────────────────────────

    const handleTypeChange = (newType: TransactionType | 'transfer') => {
        setType(newType);
        setSelectedCategory(newType === 'transfer' ? 'transfer' : '');
        setActiveDropdown(null);
    };

    const handleQuickAmount = (val: number) => {
        setAmount(prev => {
            const current = parseFloat(prev.replace(',', '.')) || 0;
            return String(current + val);
        });
    };

    const handleNoteChange = (text: string) => {
        setNote(text);
        if (text.length > 3 && !selectedCategory) {
            const suggested = smartCategorize(text);
            if (suggested) setSelectedCategory(suggested);
        }
    };

    const handleParsedOCR = (result: any) => {
        if (!result) {
            Alert.alert("Gagal", "Gagal memproses struk. Silakan coba lagi.");
            return;
        }

        setAmount(String(result.amount));
        if (result.category) {
            const matchingCategory = categories.find(c => c.label.toLowerCase() === result.category.toLowerCase());
            if (matchingCategory) {
                setSelectedCategory(matchingCategory.id);
            }
        }

        // Build smart note from AI result
        const noteParts: string[] = [];
        if (result.store) noteParts.push(result.store);
        if (result.date) noteParts.push(result.date);
        if (result.items?.length > 0) {
            noteParts.push(`${result.items.length} item`);
        }
        // Fallback ke rawText kalau AI ga dapet info
        const smartNote = noteParts.length > 0
            ? noteParts.join(' • ')
            : result.rawText.slice(0, 100).replace(/\n/g, ' ');
        setNote(smartNote);

        // Build detail alert
        const engineLabel = result.source === 'vision' ? 'Google Vision' : 'OCR.space';
        const parserLabel = result.parsedBy === 'ai' ? 'AI (Gemini)' : 'Regex';
        const cacheLabel = result.cached ? ' (dari cache)' : '';
        
        let detail = `OCR: ${engineLabel}\nParser: ${parserLabel}${cacheLabel}`;
        if (result.store) {
            detail += `\nStore: ${result.store}`;
            if (result.store_confidence === 'low') {
                detail += ` (⚠️ AI ragu/kurang yakin)`;
            }
        }
        if (result.date) detail += `\nDate: ${result.date}`;
        if (result.items?.length > 0) detail += `\nItems: ${result.items.length} detected`;
        
        if (result.store_confidence === 'low') {
            detail += `\n\n⚠️ PERHATIAN: AI kurang yakin dengan nama toko. Mohon periksa kembali.`;
        } else {
            detail += `\n\nSilakan periksa kembali.`;
        }

        Alert.alert("Scan Selesai", detail);
    };

    // ─── CSV Import ───
    const pickCSV = async () => {
        try {
            const res = await DocumentPicker.getDocumentAsync({
                type: ['text/comma-separated-values', 'text/csv'],
            });

            if (!res.canceled && res.assets.length > 0) {
                await parseCSV(res.assets[0].uri);
            }
        } catch (err) {
            console.error("Error picking CSV:", err);
            Alert.alert("Error", "Gagal mengambil file CSV");
        }
    };

    const parseCSV = async (uri: string) => {
        try {
            const fileContent = await FileSystem.readAsStringAsync(uri);
            const { data } = Papa.parse(fileContent, {
                header: true,
                skipEmptyLines: true,
            });

            if (data.length === 0) {
                Alert.alert("Info", "File CSV kosong atau format tidak sesuai");
                return;
            }

            Alert.alert(
                "Konfirmasi Import",
                `Ditemukan ${data.length} transaksi. Import sekarang?`,
                [
                    { text: "Batal", style: 'cancel' },
                    { 
                        text: "Import", 
                        onPress: () => {
                            let importCount = 0;
                            data.forEach((row: any) => {
                                // Basic mapping for SeaBank/generic
                                const amountVal = Number(row.amount || row.Amount || row.jumlah || 0);
                                const desc = row.description || row.Description || row.keterangan || 'Imported CSV';
                                const cat = smartCategorize(desc) || 'lainnya';
                                
                                if (amountVal > 0) {
                                    onSubmit('expense', cat, amountVal, desc, selectedAccount);
                                    importCount++;  // Bug #15 fix: count only valid rows
                                }
                            });
                            Alert.alert("Sukses", `${importCount} transaksi berhasil diimport`);
                            onClose();
                        }
                    }
                ]
            );
        } catch (err) {
            console.error("Error parsing CSV:", err);
            Alert.alert("Error", "Gagal membaca isi CSV");
        }
    };

    // ─── OCR Scanner ───
    const takePhoto = async () => {
        Alert.alert("Scanning...", "Sedang membaca struk Anda...");
        const result = await scanReceiptFromCamera();
        handleParsedOCR(result);
    };

    const pickImage = async () => {
        Alert.alert("Scanning...", "Sedang membaca struk Anda...");
        const result = await scanReceiptFromLibrary();
        handleParsedOCR(result);
    };

    const handleSaveNewCategory = () => {
        if (!newCatLabel) return;
        onAddCategory(type === 'transfer' ? 'expense' : type, {
            label: newCatLabel,
            icon: newCatIcon,
            color: newCatColor,
        });
        setNewCatLabel('');
        setShowAddCatModal(false);
    };

    const handleSubmit = useCallback(() => {
        const parsed = parseFloat(amount.replace(',', '.'));
        if (!parsed || parsed <= 0) return;
        if (type === 'transfer') {
            if (!selectedAccount || !destinationAccount) return;
            onSubmit('transfer', 'transfer', parsed, note, selectedAccount, destinationAccount);
        } else {
            if (!selectedCategory) return;
            onSubmit(type, selectedCategory, parsed, note, selectedAccount);
        }
        onClose();
    }, [type, selectedCategory, amount, note, selectedAccount, destinationAccount, onSubmit, onClose]);

    const theme = useTheme();
    const { colors, isDark } = theme;

    const C = {
        sheetBg: isDark ? '#1A1A22' : colors.surface,
        cardBg: isDark ? '#22222E' : colors.surfaceHighlight,
        border: isDark ? '#2C2C3E' : colors.border,
        text: colors.textPrimary,
        textMuted: colors.textMuted,
        textSecondary: colors.textSecondary,
        innerBg: isDark ? '#0F0F13' : colors.background,
        quickBg: isDark ? '#1E1E2A' : colors.surfaceHighlight,
        closeBtnBg: isDark ? '#22222E' : colors.surfaceHighlight,
        submitDisabledBg: isDark ? '#22222E' : colors.surfaceHighlight,
        btnText: isDark ? '#0F0F13' : '#FFFFFF',
    };

    const parsed = parseFloat(amount.replace(',', '.'));
    const isValid = type === 'transfer'
        ? parsed > 0 && selectedAccount !== '' && destinationAccount !== '' && selectedAccount !== destinationAccount && (accounts.find(a => a.id === selectedAccount)?.balance ?? 0) >= parsed
        : parsed > 0 && selectedCategory !== '';

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
            {/* Backdrop */}
            <Animated.View
                style={[styles.backdrop, { opacity: backdropAnim }]}
            >
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
            </Animated.View>

            {/* Sheet */}
            <Animated.View
                style={[
                    styles.sheet,
                    { transform: [{ translateY: slideAnim }], backgroundColor: C.sheetBg },
                ]}
            >
                {/* Handle bar + Close button */}
                <View {...panResponder.panHandlers} style={styles.sheetHeader}>
                    <View style={styles.handleBar} />
                    <TouchableOpacity style={[styles.closeBtn, { backgroundColor: C.closeBtnBg }]} onPress={onClose} activeOpacity={0.7}>
                        <Ionicons name="close" size={20} color={C.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* ── Scrollable top section ── */}
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingBottom: 8 }}
                >
                    {/* Header: type toggle */}
                    <View style={[styles.typeToggle, { backgroundColor: C.innerBg }]}>
                        {(['expense', 'income', 'transfer'] as const).map((t) => (
                            <TouchableOpacity
                                key={t}
                                onPress={() => handleTypeChange(t)}
                                style={[
                                    styles.typeBtn,
                                    type === t && (
                                        t === 'expense'
                                            ? styles.typeBtnExpenseActive
                                            : t === 'income'
                                                ? styles.typeBtnIncomeActive
                                                : styles.typeBtnTransferActive
                                    ),
                                ]}
                                activeOpacity={0.75}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Ionicons
                                        name={
                                            t === 'expense'
                                                ? 'arrow-down-circle-outline'
                                                : t === 'income'
                                                    ? 'arrow-up-circle-outline'
                                                    : 'swap-horizontal-outline'
                                        }
                                        size={16}
                                        color={type === t ? (isDark ? '#F1F1F5' : '#111827') : C.textMuted}
                                    />
                                    <Text
                                        style={[
                                            styles.typeBtnText,
                                            type === t ? { color: isDark ? '#F1F1F5' : '#111827' } : { color: C.textMuted },
                                        ]}
                                    >
                                        {t === 'expense' ? 'Pengeluaran' : t === 'income' ? 'Pemasukan' : 'Transfer'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Amount display */}
                    <View style={styles.amountContainer}>
                        <Text style={[styles.currencySymbol, { color: C.textMuted }]}>Rp</Text>
                        <Text
                            style={[
                                styles.amountText,
                                { color: type === 'expense' ? '#F87171' : (type === 'income' ? '#4ADE80' : '#60A5FA') },
                            ]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                        >
                            {formatDisplay(amount)}
                        </Text>
                    </View>

                    {/* Note input */}
                    <View style={[styles.noteContainer, { backgroundColor: C.cardBg, borderColor: C.border }]}>
                        <Ionicons name="create-outline" size={20} color={C.textMuted} />
                        <TextInput
                            style={[styles.noteInput, { color: C.text }]}
                            placeholder="Tulis catatan... (opsional)"
                            placeholderTextColor={C.textMuted}
                            value={note}
                            onChangeText={handleNoteChange}
                            maxLength={120}
                            returnKeyType="done"
                            multiline={false}
                        />
                    </View>

                    {/* Quick Amounts */}
                    <View style={styles.quickAmountRow}>
                        {[10000, 20000, 50000, 100000].map(val => (
                            <TouchableOpacity
                                key={val}
                                style={[styles.quickBtn, { backgroundColor: C.quickBg, borderColor: type === 'expense' ? '#F8717140' : '#4ADE8040' }]}
                                onPress={() => handleQuickAmount(val)}
                            >
                                <Text style={[styles.quickBtnText, { color: type === 'expense' ? '#F87171' : '#4ADE80' }]}>
                                    +{val / 1000}k
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {type === 'transfer' ? (
                        accounts.length < 2 ? (
                            <View style={{ padding: 24, marginHorizontal: 16, borderRadius: 16, backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.border, alignItems: 'center', gap: 10, marginTop: 10 }}>
                                <Ionicons name="warning-outline" size={32} color="#FBBF24" />
                                <Text style={{ color: C.text, fontSize: 14, fontWeight: '700', textAlign: 'center' }}>
                                    Butuh minimal 2 kantong untuk transfer
                                </Text>
                                <Text style={{ color: C.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
                                    Silakan tambah kantong/dompet baru terlebih dahulu di menu utama.
                                </Text>
                            </View>
                        ) : (
                            <View style={{ paddingHorizontal: 16, marginTop: 10, gap: 16, zIndex: 10 }}>
                                {/* Dari Kantong (Source) */}
                                <View style={{ position: 'relative', zIndex: 30 }}>
                                    <Text style={[styles.sectionLabel, { borderTopWidth: 0, paddingTop: 0, marginHorizontal: 0, marginBottom: 8, color: C.textMuted }]}>Dari Kantong (Sumber)</Text>
                                    <TouchableOpacity
                                        style={[styles.dropdownTrigger, { borderColor: C.border, backgroundColor: C.cardBg }]}
                                        onPress={() => setActiveDropdown(activeDropdown === 'source' ? null : 'source')}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                            {(() => {
                                                const acc = accounts.find(a => a.id === selectedAccount);
                                                if (acc) {
                                                    const isEmoji = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(acc.emoji);
                                                    return (
                                                        <>
                                                            {isEmoji ? (
                                                                <Text style={{ fontSize: 16 }}>{acc.emoji}</Text>
                                                            ) : (
                                                                <Ionicons name={acc.emoji as any || 'wallet-outline'} size={16} color={colors.primary} />
                                                            )}
                                                            <Text style={{ color: C.text, fontSize: 14, fontWeight: '700' }}>
                                                                {acc.name} (Rp {acc.balance.toLocaleString('id-ID')})
                                                            </Text>
                                                        </>
                                                    );
                                                }
                                                return <Text style={{ color: C.textMuted, fontSize: 14 }}>Pilih Kantong Asal</Text>;
                                            })()}
                                        </View>
                                        <Ionicons name={activeDropdown === 'source' ? 'chevron-up' : 'chevron-down'} size={16} color={C.textMuted} />
                                    </TouchableOpacity>

                                    {activeDropdown === 'source' && (
                                        <ScrollView style={[styles.dropdownList, { backgroundColor: C.cardBg, borderColor: C.border, maxHeight: 200 }]} keyboardShouldPersistTaps="handled">
                                            {accounts.map(acc => {
                                                const isEmoji = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(acc.emoji);
                                                return (
                                                    <TouchableOpacity
                                                        key={acc.id}
                                                        style={[styles.dropdownItem, { borderBottomColor: C.border }]}
                                                        onPress={() => {
                                                            setSelectedAccount(acc.id);
                                                            setActiveDropdown(null);
                                                        }}
                                                    >
                                                        {isEmoji ? (
                                                            <Text style={{ fontSize: 16 }}>{acc.emoji}</Text>
                                                        ) : (
                                                            <Ionicons name={acc.emoji as any || 'wallet-outline'} size={16} color={colors.primary} />
                                                        )}
                                                        <Text style={[styles.dropdownItemText, { color: C.text }]} numberOfLines={1}>
                                                            {acc.name} (Rp {acc.balance.toLocaleString('id-ID')})
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </ScrollView>
                                    )}
                                </View>

                                {/* Ke Kantong (Destination) */}
                                <View style={{ position: 'relative', zIndex: 20 }}>
                                    <Text style={[styles.sectionLabel, { borderTopWidth: 0, paddingTop: 0, marginHorizontal: 0, marginBottom: 8, color: C.textMuted }]}>Ke Kantong (Tujuan)</Text>
                                    <TouchableOpacity
                                        style={[styles.dropdownTrigger, { borderColor: C.border, backgroundColor: C.cardBg }]}
                                        onPress={() => setActiveDropdown(activeDropdown === 'destination' ? null : 'destination')}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                            {(() => {
                                                const acc = accounts.find(a => a.id === destinationAccount);
                                                if (acc) {
                                                    const isEmoji = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(acc.emoji);
                                                    return (
                                                        <>
                                                            {isEmoji ? (
                                                                <Text style={{ fontSize: 16 }}>{acc.emoji}</Text>
                                                            ) : (
                                                                <Ionicons name={acc.emoji as any || 'wallet-outline'} size={16} color={colors.primary} />
                                                            )}
                                                            <Text style={{ color: C.text, fontSize: 14, fontWeight: '700' }}>
                                                                {acc.name} (Rp {acc.balance.toLocaleString('id-ID')})
                                                            </Text>
                                                        </>
                                                    );
                                                }
                                                return <Text style={{ color: C.textMuted, fontSize: 14 }}>Pilih Kantong Tujuan</Text>;
                                            })()}
                                        </View>
                                        <Ionicons name={activeDropdown === 'destination' ? 'chevron-up' : 'chevron-down'} size={16} color={C.textMuted} />
                                    </TouchableOpacity>

                                    {activeDropdown === 'destination' && (
                                        <ScrollView style={[styles.dropdownList, { backgroundColor: C.cardBg, borderColor: C.border, maxHeight: 200 }]} keyboardShouldPersistTaps="handled">
                                            {accounts.map(acc => {
                                                const isEmoji = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(acc.emoji);
                                                return (
                                                    <TouchableOpacity
                                                        key={acc.id}
                                                        style={[styles.dropdownItem, { borderBottomColor: C.border }]}
                                                        onPress={() => {
                                                            setDestinationAccount(acc.id);
                                                            setActiveDropdown(null);
                                                        }}
                                                    >
                                                        {isEmoji ? (
                                                            <Text style={{ fontSize: 16 }}>{acc.emoji}</Text>
                                                        ) : (
                                                            <Ionicons name={acc.emoji as any || 'wallet-outline'} size={16} color={colors.primary} />
                                                        )}
                                                        <Text style={[styles.dropdownItemText, { color: C.text }]} numberOfLines={1}>
                                                            {acc.name} (Rp {acc.balance.toLocaleString('id-ID')})
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </ScrollView>
                                    )}
                                </View>
                            </View>
                        )
                    ) : (
                        <>
                            {/* Accounts / Wallets */}
                            {accounts.length > 0 && (
                                <>
                                    <Text style={[styles.sectionLabel, { borderTopColor: C.border, color: C.textMuted }]}>Sumber Dana</Text>
                                    <ScrollView 
                                        horizontal 
                                        showsHorizontalScrollIndicator={false} 
                                        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 6, gap: 8 }}
                                        style={{ marginBottom: 12 }}
                                    >
                                        {accounts.map(acc => {
                                            const isSelected = selectedAccount === acc.id;
                                            return (
                                                <TouchableOpacity
                                                    key={acc.id}
                                                    onPress={() => setSelectedAccount(isSelected ? '' : acc.id)}
                                                    style={[
                                                        styles.accountBtn,
                                                        isSelected ? { backgroundColor: colors.primary + '20', borderColor: colors.primary } : { backgroundColor: C.cardBg, borderColor: C.border }
                                                    ]}
                                                >
                                                    <Ionicons 
                                                        name={getValidIcon(acc.emoji)} 
                                                        size={16} 
                                                        color={isSelected ? colors.primary : C.textMuted} 
                                                    />
                                                    <Text style={[styles.accountBtnText, { color: isSelected ? colors.primary : C.textMuted }]}>{acc.name}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                </>
                            )}

                            {/* Categories */}
                            <Text style={[styles.sectionLabel, { borderTopColor: C.border, color: C.textMuted }]}>Kategori</Text>
                            <FlatList
                                data={categories}
                                keyExtractor={(item) => item.id}
                                numColumns={3}
                                scrollEnabled={false}
                                ListFooterComponent={() => (
                                    <TouchableOpacity
                                        onPress={() => setShowAddCatModal(true)}
                                        activeOpacity={0.8}
                                        style={[styles.categoryBox, { borderStyle: 'dashed', borderColor: C.border, backgroundColor: C.cardBg }]}
                                    >
                                        <Ionicons name="add" size={20} color={C.textSecondary} />
                                        <Text style={styles.categoryBoxLabel}>Tambah</Text>
                                    </TouchableOpacity>
                                )}
                                contentContainerStyle={styles.categoryGrid}
                                columnWrapperStyle={{ justifyContent: 'space-between' }}
                                renderItem={({ item: cat }) => {
                                    const selected = selectedCategory === cat.id;
                                    return (
                                        <TouchableOpacity
                                            onPress={() => setSelectedCategory(cat.id)}
                                            activeOpacity={0.8}
                                            style={[
                                                styles.categoryBox,
                                                selected ? {
                                                    backgroundColor: cat.color + '20',
                                                    borderColor: cat.color,
                                                } : {
                                                    backgroundColor: C.cardBg,
                                                    borderColor: C.border,
                                                },
                                            ]}
                                        >
                                            <Ionicons
                                                name={cat.icon as any}
                                                size={20}
                                                color={selected ? cat.color : C.textSecondary}
                                            />
                                            <Text
                                                style={[
                                                    styles.categoryBoxLabel,
                                                    selected ? { color: cat.color } : { color: C.textSecondary },
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {cat.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                }}
                            />

                            {/* Tools Section */}
                            <Text style={[styles.sectionLabel, { borderTopColor: C.border, color: C.textMuted }]}>Tools Pintar</Text>
                            <View style={styles.toolsRow}>
                                <TouchableOpacity style={[styles.toolBtn, { backgroundColor: C.cardBg, borderColor: C.border }]} onPress={takePhoto} activeOpacity={0.7}>
                                    <View style={[styles.toolIcon, { backgroundColor: colors.primary + '15' }]}>
                                        <Ionicons name="camera-outline" size={20} color={colors.primary} />
                                    </View>
                                    <Text style={[styles.toolBtnText, { color: C.textSecondary }]}>Foto</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.toolBtn, { backgroundColor: C.cardBg, borderColor: C.border }]} onPress={pickImage} activeOpacity={0.7}>
                                    <View style={[styles.toolIcon, { backgroundColor: colors.primary + '15' }]}>
                                        <Ionicons name="image-outline" size={20} color={colors.primary} />
                                    </View>
                                    <Text style={[styles.toolBtnText, { color: C.textSecondary }]}>Galeri</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.toolBtn, { backgroundColor: C.cardBg, borderColor: C.border }]} onPress={pickCSV} activeOpacity={0.7}>
                                    <View style={[styles.toolIcon, { backgroundColor: colors.primary + '15' }]}>
                                        <Ionicons name="document-attach-outline" size={20} color={colors.primary} />
                                    </View>
                                    <Text style={[styles.toolBtnText, { color: C.textSecondary }]}>CSV</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </ScrollView>

                {/* ── Fixed bottom: Keyboard + Submit ── */}
                <CustomKeyboard value={amount === '0' ? '' : amount} onChange={(v) => setAmount(v || '0')} />

                <View style={styles.submitContainer}>
                    <TouchableOpacity
                        onPress={handleSubmit}
                        activeOpacity={0.8}
                        style={[
                            styles.submitBtn,
                            !isValid ? { backgroundColor: C.submitDisabledBg, borderColor: C.border, borderWidth: 1 } : (type === 'expense' ? styles.submitBtnExpense : (type === 'income' ? styles.submitBtnIncome : styles.submitBtnTransfer)),
                        ]}
                        disabled={!isValid}
                    >
                        <Text style={[styles.submitText, !isValid ? { color: C.textMuted } : { color: isDark ? '#0F0F13' : '#FFFFFF' }]}>
                            {isValid
                                ? (type === 'expense'
                                    ? 'Catat Pengeluaran'
                                    : type === 'income'
                                        ? 'Catat Pemasukan'
                                        : 'Lakukan Transfer')
                                : (type === 'transfer'
                                    ? (accounts.length < 2
                                        ? 'Butuh minimal 2 kantong untuk transfer'
                                        : (selectedAccount === destinationAccount && selectedAccount !== ''
                                            ? 'Kantong asal & tujuan tidak boleh sama'
                                            : (selectedAccount !== '' && (accounts.find(a => a.id === selectedAccount)?.balance ?? 0) < parsed
                                                ? 'Saldo kantong asal tidak mencukupi'
                                                : 'Pilih kantong & masukkan nominal')))
                                    : 'Pilih kategori & masukkan nominal')}
                        </Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {/* Sub-modal: Add Category */}
            <Modal visible={showAddCatModal} transparent animationType="fade">
                <View style={[styles.backdrop, { justifyContent: 'center', padding: 24 }]}>
                    <View style={[styles.sheet, { height: 'auto', borderRadius: 24, padding: 24, position: 'relative', backgroundColor: C.sheetBg }]}>
                        <Text style={[styles.sectionLabel, { borderTopWidth: 0, paddingTop: 0, marginBottom: 20, color: C.textMuted }]}>Tambah Kategori Baru</Text>
                        
                        <View style={[styles.noteContainer, { backgroundColor: C.cardBg, borderColor: C.border }]}>
                            <Ionicons name="pricetag-outline" size={20} color={C.textMuted} />
                            <TextInput
                                style={[styles.noteInput, { color: C.text }]}
                                placeholder="Nama Kategori (contoh: Internet)"
                                placeholderTextColor={C.textMuted}
                                value={newCatLabel}
                                onChangeText={setNewCatLabel}
                                autoFocus
                            />
                        </View>

                        <Text style={[styles.sectionLabel, { borderTopWidth: 0, fontSize: 10, marginTop: 10, color: C.textMuted }]}>Pilih Warna</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                            {['#7C6FFF', '#F87171', '#4ADE80', '#FBBF24', '#EC4899', '#06B6D4', '#60A5FA', '#A78BFA'].map(color => (
                                <TouchableOpacity 
                                    key={color} 
                                    onPress={() => setNewCatColor(color)}
                                    style={{ 
                                        width: 36, height: 36, borderRadius: 18, backgroundColor: color,
                                        borderWidth: 3, borderColor: newCatColor === color ? '#FFFFFF' : 'transparent' 
                                    }} 
                                />
                            ))}
                        </View>

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity 
                                style={[styles.submitBtn, { flex: 1, backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.border }]} 
                                onPress={() => setShowAddCatModal(false)}
                            >
                                <Text style={{ color: C.textSecondary, fontWeight: '700' }}>Batal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.submitBtn, { flex: 1, backgroundColor: newCatColor }]} 
                                onPress={handleSaveNewCategory}
                            >
                                <Text style={{ color: isDark ? '#0F0F13' : '#FFFFFF', fontWeight: '700' }}>Simpan</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </Modal>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.65)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: SHEET_HEIGHT,
        backgroundColor: '#1A1A22',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 20,
        overflow: 'hidden',
    },
    sheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        paddingVertical: 12,
        marginBottom: 8,
    },
    handleBar: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#3C3C52',
    },
    closeBtn: {
        position: 'absolute',
        right: 16,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#22222E',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Type toggle ──
    typeToggle: {
        flexDirection: 'row',
        marginHorizontal: 16,
        backgroundColor: '#0F0F13',
        borderRadius: 14,
        padding: 4,
        marginBottom: 12,
        gap: 4,
    },
    typeBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
    },
    typeBtnExpenseActive: {
        backgroundColor: '#F871711A',
        borderWidth: 1,
        borderColor: '#F87171',
    },
    typeBtnIncomeActive: {
        backgroundColor: '#4ADE801A',
        borderWidth: 1,
        borderColor: '#4ADE80',
    },
    typeBtnTransferActive: {
        backgroundColor: '#3B82F61A',
        borderWidth: 1,
        borderColor: '#3B82F6',
    },
    typeBtnText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#5A5A78',
    },
    typeBtnTextActive: {
        color: '#F1F1F5',
    },

    // ── Amount ──
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'center',
        marginBottom: 20,
        paddingHorizontal: 24,
        gap: 6,
    },
    currencySymbol: {
        fontSize: 22,
        fontWeight: '600',
        color: '#5A5A78',
        marginBottom: 2,
    },
    amountText: {
        fontSize: 36,
        fontWeight: '700',
        letterSpacing: -1,
        flex: 1,
        textAlign: 'right',
    },

    // ── Note ──
    noteContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginBottom: 24,
        marginTop: 10,
        backgroundColor: '#22222E',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#2C2C3E',
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 8,
    },
    noteInput: {
        flex: 1,
        fontSize: 14,
        color: '#F1F1F5',
        padding: 0,
    },

    // ── Categories ──
    sectionLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#5A5A78',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginHorizontal: 16,
        marginBottom: 10,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#2C2C3E',
    },
    categoryGrid: {
        paddingHorizontal: 16,
        gap: 8,
    },
    categoryBox: {
        width: '31%',
        height: 68,
        borderRadius: 14,
        backgroundColor: '#22222E',
        borderWidth: 1,
        borderColor: '#2C2C3E',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
    },
    categoryBoxLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: '#9494B0',
        textAlign: 'center',
    },

    // ── Submit ──
    submitContainer: {
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    },
    submitBtn: {
        height: 54,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitBtnDisabled: {
        backgroundColor: '#22222E',
        borderWidth: 1,
        borderColor: '#2C2C3E',
    },
    submitBtnExpense: {
        backgroundColor: '#F87171',
    },
    submitBtnIncome: {
        backgroundColor: '#4ADE80',
    },
    submitBtnTransfer: {
        backgroundColor: '#3B82F6',
    },
    submitText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F0F13',
    },
    submitTextDisabled: {
        color: '#5A5A78',
    },
    // Smart Input Styles
    quickAmountRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 8,
        marginBottom: 16,
    },
    quickBtn: {
        flex: 1,
        height: 34,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1E1E2A',
    },
    quickBtnText: {
        fontSize: 11,
        fontWeight: '700',
    },
    // Account Select Styles
    accountBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: '#22222E',
        borderWidth: 1,
        borderColor: '#2C2C3E',
        gap: 6,
    },
    accountBtnSelected: {
        backgroundColor: '#7C6FFF20',
        borderColor: '#7C6FFF',
    },
    accountBtnEmoji: {
        fontSize: 14,
    },
    accountBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#5A5A78',
    },
    // Tools Styles
    toolsRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 12,
        marginBottom: 24,
        marginTop: 4,
    },
    toolBtn: {
        flex: 1,
        backgroundColor: '#22222E',
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2C2C3E',
        gap: 8,
    },
    toolIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toolBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#EEEEF5',
        textAlign: 'center',
    },
    dropdownTrigger: {
        height: 48,
        borderWidth: 1.2,
        borderRadius: 12,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dropdownList: {
        borderWidth: 1.2,
        borderRadius: 12,
        marginTop: 4,
        overflow: 'hidden',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
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
});