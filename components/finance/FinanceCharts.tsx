import React, { useMemo } from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import { BarChart, PieChart, LineChart } from 'react-native-chart-kit';
import { useTheme } from '../../theme/ThemeContext';
import { Transaction, Category } from '../../features/finance/useFinanceStore';

const screenWidth = Dimensions.get('window').width;

interface FinanceChartsProps {
    transactions: Transaction[];
    expenseCategories: Category[];
    income: number;
    expense: number;
}

export function FinanceCharts({ transactions, expenseCategories, income, expense }: FinanceChartsProps) {
    const theme = useTheme();

    const barData = {
        labels: ['Masuk', 'Keluar'],
        datasets: [{ data: [income, expense] }],
    };

    const pieData = useMemo(() => {
        const expenseTx = transactions.filter(t => t.type === 'expense' && expenseCategories.find(c => c.id === t.categoryId)?.label !== 'Transfer');
        const grouped: Record<string, number> = {};

        expenseTx.forEach(tx => {
            grouped[tx.categoryId] = (grouped[tx.categoryId] || 0) + tx.amount;
        });

        // Filter and map to pie data
        return Object.keys(grouped)
            .sort((a, b) => grouped[b] - grouped[a])
            .slice(0, 5) // Top 5 categories
            .map((catId) => {
                const cat = expenseCategories.find(c => c.id === catId);
                return {
                    name: cat?.label || 'Lainnya',
                    amount: grouped[catId],
                    color: cat?.color || '#999',
                    legendFontColor: '#A1A1AA',
                    legendFontSize: 11,
                };
            });
    }, [transactions, expenseCategories]);

    const trendData = useMemo(() => {
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
        });

        const expenseTx = transactions.filter(t => t.type === 'expense' && expenseCategories.find(c => c.id === t.categoryId)?.label !== 'Transfer');
        const dailyData = last7Days.map(date => {
            const sum = expenseTx
                .filter(t => t.createdAt.toISOString().split('T')[0] === date)
                .reduce((s, t) => s + t.amount, 0);
            return sum;
        });

        return {
            labels: last7Days.map(d => d.split('-')[2]), // Day numbers
            datasets: [{ data: dailyData }]
        };
    }, [transactions]);

    const chartConfig = {
        backgroundGradientFrom: theme.colors.card,
        backgroundGradientTo: theme.colors.card,
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(124, 111, 255, ${opacity})`,
        labelColor: (opacity = 1) => `rgba(161, 161, 170, ${opacity})`,
        style: { borderRadius: 16 },
        propsForDots: {
            r: "4",
            strokeWidth: "2",
            stroke: FINANCE_PRIMARY
        }
    };

    const totalPieAmount = useMemo(() => {
        return pieData.reduce((sum, item) => sum + item.amount, 0);
    }, [pieData]);

    return (
        <View style={styles.container}>
            {/* Spending Trend Line */}
            <View style={[styles.chartCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Text style={[styles.chartTitle, { color: theme.colors.textPrimary }]}>Tren Pengeluaran (7 Hari)</Text>
                <LineChart
                    data={trendData}
                    width={screenWidth - 64}
                    height={160}
                    chartConfig={{
                        ...chartConfig,
                        fillShadowGradient: FINANCE_PRIMARY,
                        fillShadowGradientOpacity: 0.2,
                    }}
                    bezier
                    style={styles.chart}
                    withInnerLines={false}
                    withOuterLines={false}
                    withHorizontalLabels={true}
                />
            </View>
 
            {/* Income vs Expense Bar */}
            <View style={[styles.chartCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Text style={[styles.chartTitle, { color: theme.colors.textPrimary }]}>Perbandingan Saldo</Text>
                <BarChart
                    data={barData}
                    width={screenWidth - 64}
                    height={200}
                    yAxisLabel="Rp "
                    yAxisSuffix=""
                    fromZero
                    chartConfig={chartConfig}
                    style={styles.chart}
                />
            </View>
 
            {/* Category Breakdown Pie */}
            {pieData.length > 0 && (
                <View style={[styles.chartCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    <Text style={[styles.chartTitle, { color: theme.colors.textPrimary }]}>Pengeluaran per Kategori</Text>
                    <PieChart
                        data={pieData}
                        width={screenWidth - 64}
                        height={180}
                        accessor="amount"
                        backgroundColor="transparent"
                        paddingLeft={String((screenWidth - 64) / 4)}
                        chartConfig={chartConfig}
                        style={{ ...styles.chart, alignSelf: 'center' as const }}
                        hasLegend={false}
                    />

                    {/* Custom Legend */}
                    <View style={{ gap: 10, marginTop: 16, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 16 }}>
                        {pieData.map((item, idx) => {
                            const percent = totalPieAmount > 0 ? Math.round((item.amount / totalPieAmount) * 100) : 0;
                            return (
                                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color }} />
                                        <Text style={{ color: theme.colors.textPrimary, fontSize: 13, fontWeight: '700' }}>
                                            {item.name}
                                        </Text>
                                    </View>
                                    <Text style={{ color: theme.colors.textSecondary, fontSize: 13, fontWeight: '700' }}>
                                        {percent}% (Rp {item.amount.toLocaleString('id-ID')})
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </View>
            )}
        </View>
    );
}

const FINANCE_PRIMARY = '#7C6FFF';

const styles = StyleSheet.create({
    container: { gap: 16, marginBottom: 20 },
    chartCard: {
        padding: 16,
        borderRadius: 24,
        borderWidth: 1,
    },
    chartTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 16,
        letterSpacing: -0.2,
    },
    chart: {
        borderRadius: 16,
        marginLeft: -10,
    },
});
