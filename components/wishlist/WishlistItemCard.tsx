import React, { memo, useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '../Card';
import { ProgressBar } from './ProgressBar';
import {
    WishlistItem,
    PRIORITY_CONFIG,
    CATEGORY_EMOJI,
    QUICK_AMOUNTS,
    formatIDR,
    calcSavings,
    daysLeft,
} from '../../hooks/useWishlistUtils';
import { WishlistInsight } from '../../hooks/useWishlistInsights';
import { RealityResult } from '../../utils/wishlistLogic';

interface WishlistItemCardProps {
    item: WishlistItem;
    accentColor: string;
    theme: any;
    isExpanded: boolean;
    onToggleExpand: (id: string) => void;
    onAddFunds: (id: string, amount: number) => Promise<void>;
    onDelete: (id: string) => void;
    isCustomFunding: boolean;
    onToggleCustomFund: (id: string) => void;
    loadingId?: string | null;
    monthlyIncome: number;
    monthlyExpenses: number;
    insight?: WishlistInsight;
    history?: any[];
    onUndo?: (amount: number) => void;
}

const WishlistItemCard = memo(({
    item,
    accentColor,
    theme,
    isExpanded,
    onToggleExpand,
    onAddFunds,
    onDelete,
    isCustomFunding,
    onToggleCustomFund,
    loadingId,
    monthlyIncome,
    monthlyExpenses,
    insight,
    history = [],
}: WishlistItemCardProps) => {
    const [showHistory, setShowHistory] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;
    
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 7, useNativeDriver: true }),
        ]).start();
    }, []);

    const [customAmount, setCustomAmount] = useState('');
    const progress = Math.min(1, item.currentSaved / item.targetPrice);
    const isComplete = progress >= 1;
    const savings = calcSavings(item.targetPrice, item.currentSaved, item.targetDate);
    const pCfg = PRIORITY_CONFIG[item.priority];
    const isLoading = loadingId === item.id;
    
    // Reality & Prediction from props
    const reality = insight?.reality;
    const prediction = insight?.prediction;
    const allocation = insight?.allocation || 0;

    const handleAddCustom = async () => {
        const amount = parseInt(customAmount.replace(/\D/g, ''));
        if (amount > 0) {
            await onAddFunds(item.id, amount);
            setCustomAmount('');
            onToggleCustomFund(item.id);
        }
    };

    return (
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <Card style={[styles.itemCard, isComplete && { borderColor: theme.colors.success + '40' }]}>
            {/* Completion glow overlay */}
            {isComplete && (
                <LinearGradient
                    colors={[theme.colors.success + '20', 'transparent']}
                    style={StyleSheet.absoluteFill}
                    pointerEvents="none"
                />
            )}

            {/* Top strip: emoji + name + priority + delete */}
            <View style={styles.itemTopRow}>
                <View style={styles.itemEmojiName}>
                    <View style={[styles.emojiCircle, { backgroundColor: pCfg.color + '22' }]}>
                        <Text style={styles.emojiText}>{item.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.itemName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                            {item.name}
                        </Text>
                        <View style={styles.itemMeta}>
                            <Text style={[styles.categoryTag, { color: theme.colors.textSecondary }]}>
                                {CATEGORY_EMOJI[item.category] ?? '📦'} {item.category}
                            </Text>
                            <View style={styles.metaDot} />
                            <Ionicons name="calendar-outline" size={11} color={theme.colors.textSecondary} />
                            <Text style={[styles.dateTag, { color: theme.colors.textSecondary }]}>
                                {' '}{daysLeft(item.targetDate)}
                            </Text>
                        </View>
                    </View>
                </View>
                <View style={styles.itemTopRight}>
                    <View style={[styles.priorityBadge, { backgroundColor: pCfg.color + '20', borderColor: pCfg.color + '50' }]}>
                        <Ionicons name={pCfg.icon} size={11} color={pCfg.color} />
                        <Text style={[styles.priorityText, { color: pCfg.color }]}>{pCfg.label}</Text>
                    </View>
                    <TouchableOpacity onPress={() => onDelete(item.id)} style={styles.deleteBtn}>
                        <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Progress ── */}
            <View style={styles.progressSection}>
                <View style={styles.progressInfo}>
                    <Text style={[styles.progressSaved, { color: theme.colors.textPrimary }]}>
                        {formatIDR(item.currentSaved)}
                    </Text>
                    <Text style={[styles.progressOf, { color: theme.colors.textSecondary }]}>
                        {' '}/ {formatIDR(item.targetPrice)}
                    </Text>
                    {allocation > 0 && (
                        <View style={[styles.allocationPill, { backgroundColor: theme.colors.primary + '15' }]}>
                            <Text style={[styles.allocationText, { color: theme.colors.primary }]}>
                                Plan: {formatIDR(allocation)}/mo
                            </Text>
                        </View>
                    )}
                    <View style={{ flex: 1 }} />
                    <Text style={[
                        styles.progressPct,
                        { color: isComplete ? theme.colors.success : accentColor }
                    ]}>
                        {isComplete ? '🎉 Done!' : `${Math.round(progress * 100)}%`}
                    </Text>
                </View>
                <ProgressBar progress={progress} color={isComplete ? theme.colors.success : accentColor} />
            </View>

            {/* Reasoning toggle */}
            {item.reasoning.length > 0 && (
                <TouchableOpacity
                    onPress={() => onToggleExpand(item.id)}
                    style={[styles.reasoningToggle, { borderColor: theme.colors.border }]}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name={isExpanded ? 'chevron-up' : 'bulb-outline'}
                        size={14}
                        color={accentColor}
                    />
                    <Text style={[styles.reasoningToggleText, { color: accentColor }]}>
                        {isExpanded ? 'Hide reason' : 'Why I want this'}
                    </Text>
                </TouchableOpacity>
            )}

            {/* Reality & Prediction Box */}
            {!isComplete && reality && (
                <View style={[
                    styles.aiBox, 
                    { 
                        borderColor: reality.isRealistic ? theme.colors.primary + '40' : theme.colors.danger + '40', 
                        backgroundColor: reality.isRealistic ? theme.colors.primary + '08' : theme.colors.danger + '08' 
                    }
                ]}>
                    <View style={styles.aiHeader}>
                        <Ionicons 
                            name={reality.isRealistic ? "checkmark-circle" : "alert-circle"} 
                            size={14} 
                            color={reality.isRealistic ? theme.colors.primary : theme.colors.danger} 
                        />
                        <Text style={[styles.aiTitle, { color: reality.isRealistic ? theme.colors.primary : theme.colors.danger }]}>
                            {reality.isRealistic ? 'FEASIBLE GOAL' : 'REALITY CHECK'}
                        </Text>
                    </View>
                    
                    {!reality.isRealistic ? (
                        <View style={styles.realityWarning}>
                            <Text style={[styles.aiMessage, { color: theme.colors.textPrimary }]}>
                                You need <Text style={{fontWeight:'800'}}>{formatIDR(reality.neededDaily)}/day</Text> but your disposable income is <Text style={{fontWeight:'800'}}>{formatIDR(reality.maxDaily)}/day</Text>.
                            </Text>
                            {reality.suggestion && (
                                <Text style={[styles.suggestionText, { color: theme.colors.textSecondary }]}>
                                    💡 {reality.suggestion}
                                </Text>
                            )}
                        </View>
                    ) : (
                        <Text style={[styles.aiMessage, { color: theme.colors.textPrimary }]}>
                            This goal is realistic! Keep saving <Text style={{fontWeight:'800'}}>{formatIDR(reality.neededDaily)}/day</Text> to finish by deadline.
                        </Text>
                    )}

                    {prediction && (
                        <View style={[styles.predictionRow, { borderTopColor: theme.colors.border }]}>
                            <Ionicons name="time-outline" size={12} color={theme.colors.textSecondary} />
                            <Text style={[styles.predictionText, { color: theme.colors.textSecondary }]}>
                                Estimated completion: <Text style={{color: theme.colors.textPrimary, fontWeight:'700'}}>{prediction.toLocaleDateString()}</Text>
                            </Text>
                        </View>
                    )}
                </View>
            )}

            {isExpanded && (
                <View style={[styles.reasoningBox, { backgroundColor: accentColor + '12', borderColor: accentColor + '30' }]}>
                    <Ionicons name="bulb" size={14} color={accentColor} />
                    <Text style={[styles.reasoningText, { color: theme.colors.textPrimary }]}>
                        {item.reasoning}
                    </Text>
                </View>
            )}

            {/* Savings calc */}
            {!isComplete && (
                <View style={[styles.calcSection, { backgroundColor: theme.colors.background + 'AA' }]}>
                    <Text style={[styles.calcLabel, { color: theme.colors.textSecondary }]}>
                        HARUS NABUNG PER:
                    </Text>
                    <View style={styles.calcRow}>
                        <CalcChip label="Hari" amount={formatIDR(savings.daily)} color="#FF9F0A" />
                        <CalcChip label="Minggu" amount={formatIDR(savings.weekly)} color={accentColor} />
                        <CalcChip label="Bulan" amount={formatIDR(savings.monthly)} color="#BF5AF2" />
                    </View>
                </View>
            )}

            {/* History Toggle */}
            {history.length > 0 && (
                <View style={styles.historySection}>
                    <TouchableOpacity 
                        onPress={() => setShowHistory(!showHistory)}
                        style={styles.historyToggle}
                    >
                        <Text style={[styles.historyToggleText, { color: theme.colors.textSecondary }]}>
                            {showHistory ? 'Hide History' : `View History (${history.length})`}
                        </Text>
                        <Ionicons 
                            name={showHistory ? 'chevron-up' : 'chevron-down'} 
                            size={14} 
                            color={theme.colors.textSecondary} 
                        />
                    </TouchableOpacity>

                    {showHistory && (
                        <View style={[styles.historyList, { backgroundColor: theme.colors.background + '66' }]}>
                            {history.slice(0, 5).map((h, i) => (
                                <View key={h.id || i} style={[styles.historyItem, i !== 0 && { borderTopColor: theme.colors.border }]}>
                                    <View style={styles.historyItemLeft}>
                                        <Text style={[styles.historyAmount, { color: theme.colors.success }]}>
                                            +{formatIDR(h.amount)}
                                        </Text>
                                        <Text style={[styles.historyDate, { color: theme.colors.textMuted }]}>
                                            {new Date(h.created_at).toLocaleDateString()}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            )}

            {isComplete && (
                <View style={[styles.completeBanner, { backgroundColor: theme.colors.success + '22', borderColor: theme.colors.success + '44' }]}>
                    <Text style={[styles.completeBannerText, { color: theme.colors.success }]}>🎉 Goal tercapai! Sekarang tinggal beli!</Text>
                </View>
            )}
            </Card>
        </Animated.View>
    );
});

function CalcChip({ label, amount, color }: { label: string; amount: string; color: string }) {
    return (
        <View style={[styles.calcChip, { borderColor: color + '40', backgroundColor: color + '12' }]}>
            <Text style={[styles.calcChipLabel, { color: color + 'CC' }]}>{label}</Text>
            <Text style={[styles.calcChipAmount, { color }]}>{amount}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    itemCard: { padding: 16, gap: 12, overflow: 'hidden' },
    itemTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    itemEmojiName: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    emojiCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    emojiText: { fontSize: 22 },
    itemName: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
    itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
    categoryTag: { fontSize: 11 },
    metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#555' },
    dateTag: { fontSize: 11 },
    itemTopRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    priorityBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
    priorityText: { fontSize: 10, fontWeight: '700' },
    deleteBtn: { padding: 4 },
    progressSection: { gap: 8 },
    progressInfo: { flexDirection: 'row', alignItems: 'baseline' },
    progressSaved: { fontSize: 15, fontWeight: '800' },
    progressOf: { fontSize: 12 },
    progressPct: { fontSize: 15, fontWeight: '900' },
    reasoningToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
    reasoningToggleText: { fontSize: 12, fontWeight: '600' },
    reasoningBox: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: 'flex-start' },
    reasoningText: { fontSize: 13, flex: 1, lineHeight: 18 },
    calcSection: { padding: 12, borderRadius: 14, gap: 8 },
    calcLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
    calcRow: { flexDirection: 'row', gap: 6 },
    calcChip: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, borderWidth: 1, gap: 2 },
    calcChipLabel: { fontSize: 10, fontWeight: '600' },
    calcChipAmount: { fontSize: 12, fontWeight: '800' },
    fundSection: { gap: 8 },
    fundRow: { flexDirection: 'row', gap: 6 },
    fundBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 10, borderWidth: 1, gap: 4 },
    fundBtnText: { fontSize: 12, fontWeight: '700' },
    customFundRow: { flexDirection: 'row', gap: 8 },
    customInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
    customAddBtn: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    completeBanner: { borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
    completeBannerText: { fontSize: 13, fontWeight: '700' },
    aiBox: { padding: 12, borderRadius: 14, borderWidth: 1, gap: 6, marginTop: 4 },
    aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    aiTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    aiMessage: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
    realityWarning: { gap: 4 },
    suggestionText: { fontSize: 12, fontStyle: 'italic', marginTop: 2 },
    predictionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, paddingTop: 8, borderTopWidth: 1 },
    predictionText: { fontSize: 11, fontWeight: '500' },
    allocationPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: 8 },
    allocationText: { fontSize: 10, fontWeight: '800' },
    historySection: { marginTop: 4 },
    historyToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 },
    historyToggleText: { fontSize: 12, fontWeight: '600' },
    historyList: { borderRadius: 12, overflow: 'hidden', paddingHorizontal: 12 },
    historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1 },
    historyItemLeft: { flexDirection: 'row', justifyContent: 'space-between', flex: 1, alignItems: 'center' },
    historyAmount: { fontSize: 13, fontWeight: '700' },
    historyDate: { fontSize: 11, fontWeight: '500' },
});

export default WishlistItemCard;
