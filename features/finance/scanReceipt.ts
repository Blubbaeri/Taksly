import * as ImagePicker from 'expo-image-picker';

const API_KEY = process.env.EXPO_PUBLIC_VISION_API_KEY;

export interface ScanResult {
    amount: number;
    category: string;
    rawText: string;
}

// 💰 Extract amount (ambil angka terbesar)
const extractAmount = (text: string): number => {
    // Look for numbers with decimal/thousand separators like 25.000 or 1,000,000
    const matches = text.match(/(\d{1,3}([.,]\d{3})+)/g);
    if (!matches) {
        // Fallback for simple numbers
        const simpleMatches = text.match(/\d{4,}/g);
        return simpleMatches ? Math.max(...simpleMatches.map(Number)) : 0;
    }
    const numbers = matches.map(n => Number(n.replace(/[.,]/g, '')));
    return Math.max(...numbers);
};

// 🧠 Detect kategori simple
const detectCategory = (text: string): string => {
    const t = text.toLowerCase();
    if (t.includes('indomaret') || t.includes('alfamart') || t.includes('supermarket')) return 'belanja';
    if (t.includes('kopi') || t.includes('makan') || t.includes('resto') || t.includes('cafe')) return 'food';
    if (t.includes('grab') || t.includes('gojek') || t.includes('bluebird')) return 'transport';
    if (t.includes('apotek') || t.includes('rs') || t.includes('klinik')) return 'kesehatan';
    if (t.includes('pln') || t.includes('telkom') || t.includes('internet')) return 'tagihan';
    return 'lainnya';
};

// 🔍 OCR ke Google Vision
const processOCR = async (base64: string): Promise<ScanResult | null> => {
    if (!API_KEY) {
        console.warn("Vision API Key is missing");
        return null;
    }

    try {
        const response = await fetch(
            `https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`,
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

        const result = await response.json();
        const text = result.responses?.[0]?.fullTextAnnotation?.text || '';

        if (!text) return null;

        return {
            amount: extractAmount(text),
            category: detectCategory(text),
            rawText: text,
        };
    } catch (err) {
        console.error("OCR Error:", err);
        return null;
    }
};

// 📸 Ambil foto (Kamera)
export const scanReceiptFromCamera = async (): Promise<ScanResult | null> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return null;

    const res = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        base64: true,
    });

    if (res.canceled || !res.assets?.[0]?.base64) return null;

    return await processOCR(res.assets[0].base64);
};

// 🖼️ Pilih dari Galeri
export const scanReceiptFromLibrary = async (): Promise<ScanResult | null> => {
    const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        base64: true,
    });

    if (res.canceled || !res.assets?.[0]?.base64) return null;

    return await processOCR(res.assets[0].base64);
};
