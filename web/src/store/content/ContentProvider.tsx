/**
 * Content Provider
 *
 * 各ページで保持したいデータを管理するReact Context Providerです。
 * メモリ上でページごとの状態を保持し、ページ遷移時もデータを維持します。
 */

import { createContext, ReactNode, useCallback, useContext, useState } from "react";

/**
 * ページコンテンツの型定義
 */
export interface PageContent {
    [pageName: string]: unknown;
}

/**
 * コンテンツコンテキストの型
 */
interface ContentContextType {
    /** すべてのページコンテンツ */
    content: PageContent;

    /** 特定のページのコンテンツを取得 */
    getPageContent: <T = unknown>(pageName: string) => T | null;
    /** 特定のページのコンテンツを更新 */
    setPageContent: <T = unknown>(pageName: string, data: T) => void;
    /** 特定のページのコンテンツをクリア */
    clearPageContent: (pageName: string) => void;
    /** すべてのコンテンツをクリア */
    clearAllContent: () => void;
}

/**
 * コンテンツコンテキスト
 */
const ContentContext = createContext<ContentContextType | null>(null);

/**
 * コンテンツProviderのプロパティ
 */
interface ContentProviderProps {
    children: ReactNode;
}

/**
 * コンテンツProvider
 */
export function ContentProvider({ children }: ContentProviderProps) {
    const [content, setContent] = useState<PageContent>({});

    // 特定のページのコンテンツを取得
    const getPageContent = useCallback(
        <T = any,>(pageName: string): T | null => {
            return (content[pageName] as T) || null;
        },
        [content],
    );

    // 特定のページのコンテンツを更新
    const setPageContent = useCallback(<T = any,>(pageName: string, data: T) => {
        setContent((prev) => ({
            ...prev,
            [pageName]: data,
        }));
    }, []);

    // 特定のページのコンテンツをクリア
    const clearPageContent = useCallback((pageName: string) => {
        setContent((prev) => {
            const newContent = { ...prev };
            delete newContent[pageName];
            return newContent;
        });
    }, []);

    // すべてのコンテンツをクリア
    const clearAllContent = useCallback(() => {
        setContent({});
    }, []);

    const value: ContentContextType = {
        content,
        getPageContent,
        setPageContent,
        clearPageContent,
        clearAllContent,
    };

    return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

/**
 * コンテンツを使用するためのカスタムフック
 */
export function useContent(): ContentContextType {
    const context = useContext(ContentContext);

    if (!context) {
        throw new Error("useContent must be used within a ContentProvider");
    }

    return context;
}

/**
 * 特定のページのコンテンツを使用するためのカスタムフック
 *
 * @param pageName ページ名
 * @returns [コンテンツ, セッター関数]
 */
export function usePageContent<T = any>(pageName: string): [T | null, (data: T) => void, () => void] {
    const { getPageContent, setPageContent, clearPageContent } = useContent();

    const pageContent = getPageContent<T>(pageName);

    const setContent = useCallback(
        (data: T) => {
            setPageContent(pageName, data);
        },
        [pageName, setPageContent],
    );

    const clearContent = useCallback(() => {
        clearPageContent(pageName);
    }, [pageName, clearPageContent]);

    return [pageContent, setContent, clearContent];
}
