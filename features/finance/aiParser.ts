// ─── AI Receipt Parser ────────────────────────────────────────────────────────
// Pakai Supabase Edge Function buat parsing raw OCR text → structured JSON
// Fallback ke regex kalau AI gagal

import { supabase } from '../../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReceiptItem {
    name: string;
    price: number;
}

export interface ParsedReceipt {
    store: string | null;
    store_confidence?: 'high' | 'low' | null;
    date: string | null;
    total: number;
    items: ReceiptItem[];
    category: string;
}

// ─── Edge Function Call ──────────────────────────────────────────────────────────

export const parseReceiptWithAI = async (
    rawText: string, 
    customDictionary?: Record<string, string>,
    retries = 1
): Promise<ParsedReceipt | null> => {
    try {
        console.log(`[AI Parser] Sending to Supabase Edge Function (ai-receipt)...`);

        const { data, error } = await supabase.functions.invoke('ai-receipt', {
            body: { rawText, customDictionary }
        });

        if (error) {
            console.warn(`[AI Parser] Supabase Edge Function error: ${error.message}`);
            throw error; // trigger retry if available
        }

        // The edge function directly returns the JSON string from Gemini (or object if parsed by supabase-js)
        // supabase.functions.invoke automatically parses JSON responses.
        // Let's ensure it's handled correctly:
        let parsed: ParsedReceipt;
        if (typeof data === 'string') {
            parsed = JSON.parse(data);
        } else {
            parsed = data;
        }

        // Validasi minimal
        if (!parsed || typeof parsed.total !== 'number' || parsed.total <= 0) {
            console.warn('[AI Parser] Invalid total amount');
            return null;
        }

        console.log('[AI Parser] ✅ AI parsing success');
        return parsed;
    } catch (err) {
        console.error(`[AI Parser] Error (retries left: ${retries}):`, err);
        if (retries > 0) {
            console.log('[AI Parser] Retrying in 1 second...');
            await new Promise(res => setTimeout(res, 1000)); // 1 second backoff
            return parseReceiptWithAI(rawText, customDictionary, retries - 1);
        }
        return null;
    }
};

// ─── Regex Fallback (Legacy) ──────────────────────────────────────────────────

/**
 * Fallback kalau AI gagal — pakai regex sederhana seperti sebelumnya.
 */
export const parseReceiptWithRegex = (rawText: string): ParsedReceipt => {
    // 1. Cari angka dengan separator ribuan (contoh: 15.000 atau 1,500,000)
    const matchesWithSeparators = rawText.match(/(\d{1,3}([.,]\d{3})+)/g);
    let total = 0;

    if (matchesWithSeparators) {
        const numbers = matchesWithSeparators
            .map(n => Number(n.replace(/[.,]/g, '')))
            .filter(n => n < 100000000); // Filter out numbers > 100jt (unlikely for daily receipt)
        
        if (numbers.length > 0) {
            total = Math.max(...numbers);
        }
    }

    // 2. Kalau ga ada separator, cari angka biasa (minimal 4 digit)
    if (total === 0) {
        const simpleMatches = rawText.match(/\d{4,}/g);
        if (simpleMatches) {
            const numbers = simpleMatches
                .map(Number)
                .filter(n => n < 100000000); // Filter out serial numbers
            
            if (numbers.length > 0) {
                total = Math.max(...numbers);
            }
        }
    }

    // Detect category (Basic)
    const t = rawText.toLowerCase();
    let category = 'Lainnya';
    if (t.includes('indomaret') || t.includes('alfamart') || t.includes('supermarket')) category = 'Belanja';
    else if (t.includes('kopi') || t.includes('makan') || t.includes('resto') || t.includes('cafe')) category = 'Makan';
    else if (t.includes('grab') || t.includes('gojek') || t.includes('bluebird')) category = 'Transport';
    else if (t.includes('apotek') || t.includes('rs') || t.includes('klinik')) category = 'Kesehatan';
    else if (t.includes('pln') || t.includes('telkom') || t.includes('internet')) category = 'Tagihan';

    console.log('[AI Parser] ⚠️ Used regex fallback');
    return {
        store: null,
        store_confidence: null,
        date: null,
        total,
        items: [],
        category,
    };
};
