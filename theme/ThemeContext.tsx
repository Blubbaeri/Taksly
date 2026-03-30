import React, { createContext, useContext, ReactNode } from 'react';
import { ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { colors, spacing, borderRadius, typography } from './colors';

export type Theme = {
    colors: typeof colors;
    spacing: typeof spacing;
    borderRadius: typeof borderRadius;
    typography: typeof typography;
};

const defaultTheme: Theme = {
    colors,
    spacing,
    borderRadius,
    typography,
};

const ThemeContext = createContext<Theme>(defaultTheme);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    return (
        <ThemeContext.Provider value={defaultTheme}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);

// Utility to create styles with theme
export const makeStyles = <T extends Record<string, ViewStyle | TextStyle | ImageStyle>>(
    styles: (theme: Theme) => T
) => {
    return () => {
        const theme = useTheme();
        return styles(theme);
    };
};
