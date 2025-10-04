/**
 * Settings Provider
 *
 * アプリケーション設定を管理するReact Context Providerです。
 * Pythonのsetting.py (Settings class with singleton pattern)を移植しました。
 */

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { getStorage } from "../../lib/storage";
import type { AppSettings } from "../../schema/settings/settings";
import {
    DEFAULT_SETTINGS,
    isSettingsComplete,
    SettingsValidationError,
    validateSettings,
} from "../../schema/settings/settings";

/**
 * ローカルストレージのキー
 */
const STORAGE_KEY = "time-tracker-settings";

/**
 * ストレージインスタンス
 */
const storage = getStorage();

/**
 * 設定コンテキストの型
 */
interface SettingsContextType {
    /** 設定の状態 */
    settings: Partial<AppSettings>;
    /** 設定が完全かどうか */
    isComplete: boolean;
    /** 検証エラーのリスト */
    validationErrors: string[];
    /** 設定をロード中かどうか */
    isLoading: boolean;

    /** 設定を更新 */
    updateSettings: (newSettings: Partial<AppSettings>) => void;
    /** 設定をリセット */
    resetSettings: () => void;
}

/**
 * 設定コンテキスト
 */
const SettingsContext = createContext<SettingsContextType | null>(null);

/**
 * 設定をローカルストレージから読み込み
 */
function loadSettings(): Partial<AppSettings> {
    try {
        const stored = storage.getValue<Partial<AppSettings>>(STORAGE_KEY);
        if (!stored) {
            return DEFAULT_SETTINGS;
        }

        // デフォルト値とマージ
        return {
            ...DEFAULT_SETTINGS,
            ...stored,
        };
    } catch (error) {
        console.error("Failed to load settings from localStorage:", error);
        return DEFAULT_SETTINGS;
    }
}

/**
 * 設定をローカルストレージに保存
 */
function saveSettings(settings: Partial<AppSettings>): void {
    try {
        const success = storage.setValue(STORAGE_KEY, settings);
        if (!success) {
            throw new Error("設定の保存に失敗しました");
        }
    } catch (error) {
        console.error("Failed to save settings to localStorage:", error);
        throw new Error("設定の保存に失敗しました");
    }
}

/**
 * 設定Providerのプロパティ
 */
interface SettingsProviderProps {
    children: ReactNode;
}

/**
 * 設定Provider
 */
export function SettingsProvider({ children }: SettingsProviderProps) {
    const [settings, setSettings] = useState<Partial<AppSettings>>(DEFAULT_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);

    // 初回ロード
    useEffect(() => {
        const loaded = loadSettings();
        setSettings(loaded);
        setIsLoading(false);
    }, []);

    // 設定が変更されたら保存
    useEffect(() => {
        if (!isLoading) {
            saveSettings(settings);
        }
    }, [settings, isLoading]);

    // 検証
    const validationErrors = validateSettings(settings);
    const isComplete = isSettingsComplete(settings);

    // 設定の更新
    const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
        setSettings((prev) => ({ ...prev, ...newSettings }));
    }, []);

    // 設定のリセット
    const resetSettings = useCallback(() => {
        setSettings(DEFAULT_SETTINGS);
    }, []);

    const value: SettingsContextType = {
        settings,
        isComplete,
        validationErrors,
        isLoading,
        updateSettings,
        resetSettings,
    };

    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

/**
 * 設定を使用するためのカスタムフック
 */
export function useSettings(): SettingsContextType {
    const context = useContext(SettingsContext);

    if (!context) {
        throw new Error("useSettings must be used within a SettingsProvider");
    }

    return context;
}

/**
 * 設定が完全な場合のみ取得するカスタムフック
 *
 * @throws {SettingsValidationError} 設定が不完全な場合
 */
export function useCompleteSettings(): AppSettings {
    const { settings, isComplete, validationErrors } = useSettings();

    if (!isComplete) {
        throw new SettingsValidationError(`設定が不完全です: ${validationErrors.join(", ")}`);
    }

    return settings as AppSettings;
}
