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
import type { Category, TransactionType } from './useFinanceStore';
import { Ionicons } from '@expo/vector-icons';
import { scanReceiptFromCamera, scanReceiptFromLibrary } from './scanReceipt';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TransactionSheetProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (type: TransactionType, categoryId: string, amount: number, note: string) => void;
    expenseCategories: Category[];
    incomeCategories: Category[];
    onAddCategory: (type: TransactionType, category: Omit<Category, 'id'>) => void;
    initialOCRResult?: {
        amount: number;
        category: string;
        rawText: string;
    } | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_HEIGHT = SCREEN_HEIGHT;

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
    if (/netlfix|spotify|game|bioskop/i.test(n)) return 'hiburan';
    if (/obat|rs|klinik|apotek/i.test(n)) return 'kesehatan';
    if (/listrik|air|wifi|pln/i.test(n)) return 'tagihan';
    if (/buku|kursus|sekolah/i.test(n)) return 'pendidikan';
    return null;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function TransactionSheet({
    visible,
    onClose,
    onSubmit,
    expenseCategories,
    incomeCategories,
    onAddCategory,
    initialOCRResult,
}: TransactionSheetProps) {
    const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    const [type, setType] = useState<TransactionType>('expense');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
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

    const handleTypeChange = (newType: TransactionType) => {
        setType(newType);
        setSelectedCategory('');
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
        if (result.category) setSelectedCategory(result.category);
        setNote(result.rawText.slice(0, 100).replace(/\n/g, ' '));
        
        Alert.alert("Scan Selesai", "Data telah diisi otomatis. Silakan periksa kembali.");
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
                            data.forEach((row: any) => {
                                // Basic mapping for SeaBank/generic
                                const amountVal = Number(row.amount || row.Amount || row.jumlah || 0);
                                const desc = row.description || row.Description || row.keterangan || 'Imported CSV';
                                const cat = smartCategorize(desc) || 'lainnya';
                                
                                if (amountVal > 0) {
                                    onSubmit('expense', cat, amountVal, desc);
                                }
                            });
                            Alert.alert("Sukses", `${data.length} Transaksi berhasil diimport`);
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
        onAddCategory(type, {
            label: newCatLabel,
            icon: newCatIcon,
            color: newCatColor,
        });
        setNewCatLabel('');
        setShowAddCatModal(false);
    };

    const handleSubmit = useCallback(() => {
        const parsed = parseFloat(amount.replace(',', '.'));
        if (!parsed || parsed <= 0 || !selectedCategory) return;
        onSubmit(type, selectedCategory, parsed, note);
        onClose();
    }, [type, selectedCategory, amount, note, onSubmit, onClose]);

    const isValid = parseFloat(amount) > 0 && selectedCategory !== '';

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
                    { transform: [{ translateY: slideAnim }] },
                ]}
            >
                {/* Handle bar + Close button */}
                <View {...panResponder.panHandlers} style={styles.sheetHeader}>
                    <View style={styles.handleBar} />
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
                        <Ionicons name="close" size={20} color="#9494B0" />
                    </TouchableOpacity>
                </View>

                {/* ── Scrollable top section ── */}
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingBottom: 8 }}
                >
                    {/* Header: type toggle */}
                    <View style={styles.typeToggle}>
                        {(['expense', 'income'] as TransactionType[]).map((t) => (
                            <TouchableOpacity
                                key={t}
                                onPress={() => handleTypeChange(t)}
                                style={[
                                    styles.typeBtn,
                                    type === t && (t === 'expense' ? styles.typeBtnExpenseActive : styles.typeBtnIncomeActive),
                                ]}
                                activeOpacity={0.75}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Ionicons
                                        name={t === 'expense' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'}
                                        size={16}
                                        color={type === t ? '#F1F1F5' : '#5A5A78'}
                                    />
                                    <Text
                                        style={[
                                            styles.typeBtnText,
                                            type === t && styles.typeBtnTextActive,
                                        ]}
                                    >
                                        {t === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Amount display */}
                    <View style={styles.amountContainer}>
                        <Text style={styles.currencySymbol}>Rp</Text>
                        <Text
                            style={[
                                styles.amountText,
                                { color: type === 'expense' ? '#F87171' : '#4ADE80' },
                            ]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                        >
                            {formatDisplay(amount)}
                        </Text>
                    </View>

                    {/* Note input */}
                    <View style={styles.noteContainer}>
                        <Ionicons name="create-outline" size={20} color="#5A5A78" />
                        <TextInput
                            style={styles.noteInput}
                            placeholder="Tulis catatan... (opsional)"
                            placeholderTextColor="#5A5A78"
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
                                style={[styles.quickBtn, { borderColor: type === 'expense' ? '#F8717140' : '#4ADE8040' }]}
                                onPress={() => handleQuickAmount(val)}
                            >
                                <Text style={[styles.quickBtnText, { color: type === 'expense' ? '#F87171' : '#4ADE80' }]}>
                                    +{val / 1000}k
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Categories */}
                    <Text style={styles.sectionLabel}>Kategori</Text>
                    <FlatList
                        data={categories}
                        keyExtractor={(item) => item.id}
                        numColumns={3}
                        scrollEnabled={false}
                        ListFooterComponent={() => (
                            <TouchableOpacity
                                onPress={() => setShowAddCatModal(true)}
                                activeOpacity={0.8}
                                style={[styles.categoryBox, { borderStyle: 'dashed', borderColor: '#4C4C66' }]}
                            >
                                <Ionicons name="add" size={20} color="#9494B0" />
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
                                        selected && {
                                            backgroundColor: cat.color + '20',
                                            borderColor: cat.color,
                                        },
                                    ]}
                                >
                                    <Ionicons
                                        name={cat.icon as any}
                                        size={20}
                                        color={selected ? cat.color : '#9494B0'}
                                    />
                                    <Text
                                        style={[
                                            styles.categoryBoxLabel,
                                            selected && { color: cat.color },
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
                    <Text style={styles.sectionLabel}>Tools Pintar</Text>
                    <View style={styles.toolsRow}>
                        <TouchableOpacity style={styles.toolBtn} onPress={takePhoto} activeOpacity={0.7}>
                            <View style={[styles.toolIcon, { backgroundColor: '#7C6FFF15' }]}>
                                <Ionicons name="camera-outline" size={20} color="#7C6FFF" />
                            </View>
                            <Text style={styles.toolBtnText}>Foto</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.toolBtn} onPress={pickImage} activeOpacity={0.7}>
                            <View style={[styles.toolIcon, { backgroundColor: '#7C6FFF15' }]}>
                                <Ionicons name="image-outline" size={20} color="#7C6FFF" />
                            </View>
                            <Text style={styles.toolBtnText}>Galeri</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.toolBtn} onPress={pickCSV} activeOpacity={0.7}>
                            <View style={[styles.toolIcon, { backgroundColor: '#7C6FFF15' }]}>
                                <Ionicons name="document-attach-outline" size={20} color="#7C6FFF" />
                            </View>
                            <Text style={styles.toolBtnText}>CSV</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>

                {/* ── Fixed bottom: Keyboard + Submit ── */}
                <CustomKeyboard value={amount === '0' ? '' : amount} onChange={(v) => setAmount(v || '0')} />

                <View style={styles.submitContainer}>
                    <TouchableOpacity
                        onPress={handleSubmit}
                        activeOpacity={0.8}
                        style={[
                            styles.submitBtn,
                            !isValid && styles.submitBtnDisabled,
                            isValid && (type === 'expense' ? styles.submitBtnExpense : styles.submitBtnIncome),
                        ]}
                        disabled={!isValid}
                    >
                        <Text style={[styles.submitText, !isValid && styles.submitTextDisabled]}>
                            {isValid ? (type === 'expense' ? 'Catat Pengeluaran' : 'Catat Pemasukan') : 'Pilih kategori & masukkan nominal'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {/* Sub-modal: Add Category */}
            <Modal visible={showAddCatModal} transparent animationType="fade">
                <View style={[styles.backdrop, { justifyContent: 'center', padding: 24 }]}>
                    <View style={[styles.sheet, { height: 'auto', borderRadius: 24, padding: 24, position: 'relative' }]}>
                        <Text style={[styles.sectionLabel, { borderTopWidth: 0, paddingTop: 0, marginBottom: 20 }]}>Tambah Kategori Baru</Text>
                        
                        <View style={styles.noteContainer}>
                            <Ionicons name="pricetag-outline" size={20} color="#5A5A78" />
                            <TextInput
                                style={styles.noteInput}
                                placeholder="Nama Kategori (contoh: Internet)"
                                placeholderTextColor="#5A5A78"
                                value={newCatLabel}
                                onChangeText={setNewCatLabel}
                                autoFocus
                            />
                        </View>

                        <Text style={[styles.sectionLabel, { borderTopWidth: 0, fontSize: 10, marginTop: 10 }]}>Pilih Warna</Text>
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
                                style={[styles.submitBtn, { flex: 1, backgroundColor: '#22222E' }]} 
                                onPress={() => setShowAddCatModal(false)}
                            >
                                <Text style={{ color: '#9494B0', fontWeight: '700' }}>Batal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.submitBtn, { flex: 1, backgroundColor: newCatColor }]} 
                                onPress={handleSaveNewCategory}
                            >
                                <Text style={{ color: '#0F0F13', fontWeight: '700' }}>Simpan</Text>
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
        paddingTop: 12,
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
});