import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseReceiptWithAI, parseReceiptWithRegex } from './aiParser';
import type { ReceiptItem, ParsedReceipt } from './aiParser';

// ─── API Keys ─────────────────────────────────────────────────────────────────

const VISION_API_KEY = process.env.EXPO_PUBLIC_VISION_API_KEY;
const OCRSPACE_API_KEY = process.env.EXPO_PUBLIC_OCRSPACE_API_KEY || 'helloworld';

// ─── Constants ────────────────────────────────────────────────────────────────

const CACHE_PREFIX = 'ocr_cache_';
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari

// ─── Types ────────────────────────────────────────────────────────────────────

export type { ReceiptItem, ParsedReceipt };

/**
 * Saves a manual correction to the local dictionary so the AI can use it in the future.
 */
export const saveDictionaryCorrection = async (rawName: string, correctedName: string) => {
    try {
        const dictRaw = await AsyncStorage.getItem('taksly_receipt_dict');
        const dict = dictRaw ? JSON.parse(dictRaw) : {};
        dict[rawName.toUpperCase()] = correctedName;
        await AsyncStorage.setItem('taksly_receipt_dict', JSON.stringify(dict));
        console.log(`[Dictionary] Saved correction: ${rawName} -> ${correctedName}`);
    } catch (e) {
        console.error('[Dictionary] Error saving correction:', e);
    }
};

export interface ScanResult {
    // Legacy fields (backward compat)
    amount: number;
    category: string;
    rawText: string;
    source: 'vision' | 'ocrspace' | 'none';

    // New AI-parsed fields
    store: string | null;
    store_confidence?: 'high' | 'low' | null;
    date: string | null;
    items: ReceiptItem[];
    parsedBy: 'ai' | 'regex';
    cached?: boolean;
}

interface OCROutput {
    text: string;
    source: 'vision' | 'ocrspace';
}

// ─── Image Preprocessing ──────────────────────────────────────────────────────

/**
 * Preprocess image to improve OCR accuracy:
 * - Resize to max 1200px (balance between detail and speed)
 * - Convert to grayscale (improves contrast for many OCR engines)
 */
const preprocessImage = async (uri: string): Promise<{ base64: string }> => {
    console.log('[OCR] Preprocessing image (Resize + Grayscale)...');
    
    const result = await ImageManipulator.manipulateAsync(
        uri,
        [
            { resize: { width: 1200 } }, // Limit size
        ],
        { 
            compress: 0.8, 
            format: ImageManipulator.SaveFormat.JPEG, 
            base64: true 
        }
    );

    return { base64: result.base64 || '' };
};

// ─── Normalisasi Output ───────────────────────────────────────────────────────

/**
 * Normalize raw OCR text dari engine manapun ke format yang konsisten.
 */
const normalizeOCRText = (text: string): string => {
    return text
        .trim()
        .replace(/\n{3,}/g, '\n\n')
        .replace(/ {2,}/g, ' ')
        .replace(/Rp\s*\./g, 'Rp')
        .replace(/\t/g, ' ')
        .replace(/\0/g, '');
};

// ─── Validasi Hasil OCR ───────────────────────────────────────────────────────

const isValid = (text: string | null | undefined): boolean => {
    if (!text) return false;
    if (text.trim().length < 10) return false;
    const hasNumber = /\d/.test(text);
    return hasNumber;
};

// ─── Cache System ─────────────────────────────────────────────────────────────

const generateCacheKey = (base64: string): string => {
    const len = base64.length;
    const sample = base64.slice(0, 100)
        + base64.slice(Math.floor(len / 2), Math.floor(len / 2) + 100)
        + base64.slice(-100)
        + len.toString();

    let hash = 0;
    for (let i = 0; i < sample.length; i++) {
        const char = sample.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return CACHE_PREFIX + Math.abs(hash).toString(36);
};

const getCachedResult = async (key: string): Promise<ScanResult | null> => {
    try {
        const cached = await AsyncStorage.getItem(key);
        if (!cached) return null;

        const { result, timestamp } = JSON.parse(cached);

        if (Date.now() - timestamp > CACHE_EXPIRY_MS) {
            await AsyncStorage.removeItem(key);
            console.log('[Cache] ⏰ Expired, removing...');
            return null;
        }

        console.log('[Cache] ✅ Hit! Menggunakan hasil cache');
        return { ...result, cached: true };
    } catch {
        return null;
    }
};

const setCacheResult = async (key: string, result: ScanResult): Promise<void> => {
    try {
        await AsyncStorage.setItem(key, JSON.stringify({
            result,
            timestamp: Date.now(),
        }));
        console.log('[Cache] 💾 Saved to cache');
    } catch (err) {
        console.warn('[Cache] Failed to save:', err);
    }
};

// ─── OCR Engine 1: Google Cloud Vision ────────────────────────────────────────

const googleVision = async (base64: string): Promise<OCROutput | null> => {
    if (!VISION_API_KEY) {
        console.warn('[OCR] Vision API Key is missing, skipping...');
        return null;
    }

    try {
        console.log('[OCR] Trying Google Vision...');
        const response = await fetch(
            `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requests: [
                        {
                            image: { content: base64 },
                            features: [{ type: 'TEXT_DETECTION' }],
                        },
                    ],
                }),
            }
        );

        if (!response.ok) {
            console.warn(`[OCR] Vision API error: ${response.status}`);
            return null;
        }

        const result = await response.json();
        const rawText = result.responses?.[0]?.fullTextAnnotation?.text || '';
        const text = normalizeOCRText(rawText);

        if (!isValid(text)) {
            console.warn('[OCR] Vision result invalid, skipping...');
            return null;
        }

        console.log('[OCR] ✅ Google Vision success');
        return { text, source: 'vision' };
    } catch (err) {
        console.error('[OCR] Vision error:', err);
        return null;
    }
};

// ─── OCR Engine 2: OCR.space (Fallback) ───────────────────────────────────────

const ocrSpace = async (base64: string): Promise<OCROutput | null> => {
    try {
        console.log('[OCR] Trying OCR.space fallback...');

        const formData = new FormData();
        formData.append('base64Image', `data:image/jpeg;base64,${base64}`);
        // Note: 'language' is NOT sent for OCREngine 2 as it uses auto-detection
        formData.append('isOverlayRequired', 'false');
        formData.append('detectOrientation', 'true');
        formData.append('scale', 'true');
        formData.append('OCREngine', '2');

        const response = await fetch('https://api.ocr.space/parse/image', {
            method: 'POST',
            headers: {
                apikey: OCRSPACE_API_KEY,
            },
            body: formData,
        });

        if (!response.ok) {
            console.warn(`[OCR] OCR.space API error: ${response.status}`);
            return null;
        }

        const result = await response.json();

        if (result.IsErroredOnProcessing) {
            console.warn('[OCR] OCR.space processing error:', result.ErrorMessage);
            return null;
        }

        const rawText = result.ParsedResults?.[0]?.ParsedText || '';
        const text = normalizeOCRText(rawText);

        if (!isValid(text)) {
            console.warn('[OCR] OCR.space result invalid, skipping...');
            return null;
        }

        console.log('[OCR] ✅ OCR.space success');
        return { text, source: 'ocrspace' };
    } catch (err) {
        console.error('[OCR] OCR.space error:', err);
        return null;
    }
};

// ─── OCR Engine 3: Tesseract.js (Offline Fallback) ───────────────────────────

// ─── Fallback Chain ───────────────────────────────────────────────────────────

/**
 * Multi-engine OCR dengan fallback otomatis:
 * 1. Google Vision (Cloud, High accuracy)
 * 2. OCR.space (Cloud, Backup)
 */
const scanOCR = async (base64: string): Promise<OCROutput | null> => {
    // Engine 1: Google Vision (Best)
    const visionResult = await googleVision(base64);
    if (visionResult) return visionResult;

    // Engine 2: OCR.space (Good Fallback)
    const ocrSpaceResult = await ocrSpace(base64);
    if (ocrSpaceResult) return ocrSpaceResult;

    console.warn('[OCR] ❌ All compatible OCR engines failed');
    return null;
};

// ─── Main Process ─────────────────────────────────────────────────────────────

const processOCR = async (imageUri: string): Promise<ScanResult | null> => {
    // Step 1: Preprocessing — Resize & Optimize for OCR
    const { base64 } = await preprocessImage(imageUri);
    if (!base64) return null;

    // Step 2: Cek cache
    const cacheKey = generateCacheKey(base64);
    const cached = await getCachedResult(cacheKey);
    if (cached) return cached;

    // Step 3: OCR
    const ocrOutput = await scanOCR(base64);
    if (!ocrOutput) return null;

    // Step 4: AI Parsing
    let parsed: ParsedReceipt;
    let parsedBy: 'ai' | 'regex';

    let customDictionary = undefined;
    try {
        const dictRaw = await AsyncStorage.getItem('taksly_receipt_dict');
        if (dictRaw) customDictionary = JSON.parse(dictRaw);
    } catch (e) {}

    const aiResult = await parseReceiptWithAI(ocrOutput.text, customDictionary);
    if (aiResult) {
        parsed = aiResult;
        parsedBy = 'ai';
    } else {
        parsed = parseReceiptWithRegex(ocrOutput.text);
        parsedBy = 'regex';
    }

    // Step 5: Build final result
    const result: ScanResult = {
        amount: parsed.total,
        category: parsed.category,
        rawText: ocrOutput.text,
        source: ocrOutput.source,
        store: parsed.store,
        store_confidence: parsed.store_confidence,
        date: parsed.date,
        items: parsed.items,
        parsedBy,
    };

    // Step 6: Simpan ke cache
    await setCacheResult(cacheKey, result);

    return result;
};

// ─── Public API ───────────────────────────────────────────────────────────────

// 📸 Ambil foto (Kamera)
export const scanReceiptFromCamera = async (): Promise<ScanResult | null> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return null;

    const res = await ImagePicker.launchCameraAsync({
        quality: 1.0, // Start with high quality, let preprocessImage handle optimization
        base64: false, // We'll handle base64 in preprocessImage
    });

    if (res.canceled || !res.assets?.[0]?.uri) return null;
    return await processOCR(res.assets[0].uri);
};

// 🖼️ Pilih dari Galeri
export const scanReceiptFromLibrary = async (): Promise<ScanResult | null> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return null;

    const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1.0,
        base64: false,
    });

    if (res.canceled || !res.assets?.[0]?.uri) return null;
    return await processOCR(res.assets[0].uri);
};
