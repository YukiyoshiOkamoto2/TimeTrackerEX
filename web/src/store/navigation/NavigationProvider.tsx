import React, { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";

export const MAX_HISTORY_SIZE = 30;

export interface NavigationHistoryItem {
    pageName: NavigationPageName;
    parameter: string | null;
    link: string | null;
}

export type NavigationPageName = "Home" | "TimeTracker" | "Settings"

export interface NavigationContextType {
    currentPageName: NavigationPageName;
    parameter: string | null;
    link: string | null;
    history: NavigationHistoryItem[];
    canGoBack: boolean;
    navigate: (pageName: NavigationPageName, parameter?: string | null, link?: string | null) => void;
    goBack: () => void;
    clearHistory: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export interface NavigationProviderProps {
    children: ReactNode;
    initialPageName: NavigationPageName;
    initialParameter?: string | null;
    initialLink?: string | null;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({
    children,
    initialPageName,
    initialParameter = null,
    initialLink = null,
}) => {
    const [currentPageName, setCurrentPageName] = useState<NavigationPageName>(initialPageName);
    const [parameter, setParameter] = useState<string | null>(initialParameter);
    const [link, setLink] = useState<string | null>(initialLink);
    const [history, setHistory] = useState<NavigationHistoryItem[]>([]);

    const navigate = useCallback(
        (pageName: NavigationPageName, newParameter: string | null = null, newLink: string | null = null) => {
            // 現在のページを履歴に追加（最大30個まで）
            setHistory((prev) => {
                const newHistory = [
                    ...prev,
                    {
                        pageName: currentPageName,
                        parameter: parameter,
                        link: link,
                    },
                ];
                // 履歴が最大サイズを超えたら古いものから削除
                if (newHistory.length > MAX_HISTORY_SIZE) {
                    return newHistory.slice(newHistory.length - MAX_HISTORY_SIZE);
                }
                return newHistory;
            });

            // 新しいページに遷移
            setCurrentPageName(pageName);
            setParameter(newParameter);
            setLink(newLink);
        },
        [currentPageName, parameter, link],
    );

    const goBack = useCallback(() => {
        if (history.length > 0) {
            const previousPage = history[history.length - 1];
            setCurrentPageName(previousPage.pageName);
            setParameter(previousPage.parameter);
            setLink(previousPage.link);
            setHistory((prev) => prev.slice(0, -1));
        }
    }, [history]);

    const clearHistory = useCallback(() => {
        setHistory([]);
    }, []);

    const canGoBack = useMemo(() => history.length > 0, [history]);

    const value: NavigationContextType = {
        currentPageName,
        parameter,
        link,
        history,
        canGoBack,
        navigate,
        goBack,
        clearHistory,
    };

    return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
};

export const useNavigation = (): NavigationContextType => {
    const context = useContext(NavigationContext);
    if (!context) {
        throw new Error("useNavigation must be used within a NavigationProvider");
    }
    return context;
};
