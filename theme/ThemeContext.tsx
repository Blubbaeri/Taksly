import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { ViewStyle, TextStyle, ImageStyle } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors, spacing, borderRadius, typography } from './colors';

export type Theme = {
    isDark: boolean;
    toggleTheme: () => void;
    colors: typeof darkColors;
    spacing: typeof spacing;
    borderRadius: typeof borderRadius;
    typography: typeof typography;
};

const defaultTheme: Theme = {
    isDark: true,
    toggleTheme: () => {},
    colors: darkColors,
    spacing,
    borderRadius,
    typography,
};

const ThemeContext = createContext<Theme>(defaultTheme);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        AsyncStorage.getItem('theme_mode').then((val) => {
            if (val === 'light') {
                setIsDark(false);
            }
        });
    }, []);

    const toggleTheme = () => {
        setIsDark((prev) => {
            const next = !prev;
            AsyncStorage.setItem('theme_mode', next ? 'dark' : 'light');
            return next;
        });
    };

    const theme: Theme = {
        isDark,
        toggleTheme,
        colors: isDark ? darkColors : lightColors,
        spacing,
        borderRadius,
        typography,
    };

    return (
        <ThemeContext.Provider value={theme}>
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
