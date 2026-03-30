export const colors = {
    // Base
    background: '#08080E',
    surface: '#12121A',
    surfaceHighlight: '#1C1C2E',

    // Accents
    primary: '#7C6FFF', // Premium Purple/Blue
    secondary: '#B8B2FF', // Lighter Purple

    // Text
    textPrimary: '#FFFFFF',
    textSecondary: '#9494B0',
    textMuted: '#5A5A78',

    // Semantic
    success: '#4ADE80',
    danger: '#F87171',
    warning: '#FBBF24',

    // Borders
    border: '#1C1C2E',

    // Cards
    card: '#12121A',
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const borderRadius = {
    sm: 8,
    md: 14,
    lg: 18,
    xl: 24,
    round: 9999,
};

export const typography = {
    h1: { fontSize: 32, fontWeight: '700' as const },
    h2: { fontSize: 24, fontWeight: '700' as const },
    h3: { fontSize: 20, fontWeight: '600' as const },
    body1: { fontSize: 16, fontWeight: '400' as const },
    body2: { fontSize: 14, fontWeight: '400' as const },
    caption: { fontSize: 12, fontWeight: '500' as const },
};
