import React, { createContext, useContext, useState, ReactNode, createElement } from 'react';
import TakslyLoadingScreen from '../../components/common/TakslyLoadingScreen';

interface LoadingContextType {
    setGlobalLoading: (loading: boolean) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
    const [isLoading, setIsLoading] = useState(false);
    const startTimeRef = React.useRef(0);
    const loadingCountRef = React.useRef(0);

    const setGlobalLoading = React.useCallback((loading: boolean) => {
        if (loading) {
            loadingCountRef.current++;
            if (loadingCountRef.current === 1) {
                startTimeRef.current = Date.now();
                setIsLoading(true);
            }
        } else {
            loadingCountRef.current = Math.max(0, loadingCountRef.current - 1);
            if (loadingCountRef.current === 0) {
                const elapsed = Date.now() - startTimeRef.current;
                const remaining = Math.max(0, 1000 - elapsed);
                setTimeout(() => {
                    if (loadingCountRef.current === 0) {
                        setIsLoading(false);
                    }
                }, remaining);
            }
        }
    }, []);

    return (
        createElement(LoadingContext.Provider, { value: { setGlobalLoading } }, 
            children,
            isLoading && createElement(TakslyLoadingScreen, { 
                isOverlay: true, 
                key: 'global-loader'
            })
        )
    );
}

export function useLoading() {
    const context = useContext(LoadingContext);
    if (!context) {
        throw new Error('useLoading must be used within a LoadingProvider');
    }
    return context;
}
