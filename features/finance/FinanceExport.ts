import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Transaction, Category } from './useFinanceStore';

const formatRupiah = (amount: number): string => {
    return `Rp ${amount.toLocaleString('id-ID')}`;
};

export const generateFinancePDF = async (
    transactions: Transaction[],
    categories: Map<string, Category>,
    summary: { income: number; expense: number; balance: number }
) => {
    const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #111; }
            .header { text-align: center; margin-bottom: 40px; }
            .title { font-size: 24px; font-weight: bold; color: #7C6FFF; }
            .subtitle { font-size: 14px; color: #666; margin-top: 4px; }
            
            .summary-box { 
                background: #F8FAFC; 
                padding: 20px; 
                border-radius: 12px; 
                display: flex; 
                justify-content: space-between; 
                margin-bottom: 30px; 
                border: 1px solid #E2E8F0;
            }
            .summary-item { text-align: center; flex: 1; }
            .summary-label { font-size: 10px; text-transform: uppercase; color: #64748B; font-weight: bold; margin-bottom: 5px; }
            .summary-value { font-size: 16px; font-weight: bold; }
            .income { color: #10B981; }
            .expense { color: #EF4444; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; padding: 12px; background: #F1F5F9; font-size: 12px; color: #475569; }
            td { padding: 12px; border-bottom: 1px solid #E2E8F0; font-size: 12px; }
            .type-badge { padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; }
            .badge-income { background: #DCFCE7; color: #166534; }
            .badge-expense { background: #FEE2E2; color: #991B1B; }
            .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #94A3B8; }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="title">Taksly Finance Report</div>
            <div class="subtitle">Generated on ${new Date().toLocaleDateString('id-ID')}</div>
        </div>

        <div class="summary-box">
            <div class="summary-item">
                <div class="summary-label">Total Pemasukan</div>
                <div class="summary-value income">${formatRupiah(summary.income)}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Total Pengeluaran</div>
                <div class="summary-value expense">${formatRupiah(summary.expense)}</div>
            </div>
            <div class="summary-item" style="border-left: 1px solid #CBD5E1;">
                <div class="summary-label">Sisa Saldo</div>
                <div class="summary-value" style="color: #7C6FFF;">${formatRupiah(summary.balance)}</div>
            </div>
        </div>

        <h3>Rincian Transaksi</h3>
        <table>
            <thead>
                <tr>
                    <th>Tanggal</th>
                    <th>Kategori</th>
                    <th>Keterangan</th>
                    <th>Tipe</th>
                    <th style="text-align: right;">Jumlah</th>
                </tr>
            </thead>
            <tbody>
                ${transactions.map(t => {
                    const cat = categories.get(t.categoryId);
                    return `
                    <tr>
                        <td>${t.createdAt.toLocaleDateString('id-ID')}</td>
                        <td>${cat?.label || 'Lainnya'}</td>
                        <td style="color: #64748B;">${t.note || '-'}</td>
                        <td>
                            <span class="type-badge ${t.type === 'income' ? 'badge-income' : 'badge-expense'}">
                                ${t.type === 'income' ? 'MASUK' : 'KELUAR'}
                            </span>
                        </td>
                        <td style="text-align: right; font-weight: bold; color: ${t.type === 'income' ? '#059669' : '#DC2626'};">
                            ${formatRupiah(t.amount)}
                        </td>
                    </tr>
                    `;
                }).join('')}
            </tbody>
        </table>

        <div class="footer">
            © ${new Date().getFullYear()} Taksly Application • Manage Your Finance Better
        </div>
    </body>
    </html>
    `;

    try {
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
        console.error("Error generating PDF:", error);
        alert("Gagal membuat laporan PDF");
    }
};
