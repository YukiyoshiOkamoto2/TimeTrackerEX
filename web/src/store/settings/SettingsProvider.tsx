/**
 * Settings Provider
 *
 * アプリケーション設定を管理するReact Context Providerです。
 * Pythonのsetting.py (Settings class with singleton pattern)を移植しました。
 */

import { appMessageDialogRef } from "@/components/message-dialog";
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { getStorage } from "../../lib/storage";
import {
    getDefaultTimeTrackerSettings,
    isTimeTrackerSettingsComplete,
    parseAndFixTimeTrackerSettings,
    parseTimeTrackerSettings,
    stringifyTimeTrackerSettings,
    validateTimeTrackerSettings,
} from "../../schema/settings/settingsDefinition";
import type { AppSettings } from "../../types";

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
 * デフォルト設定を取得
 */
function getDefaultAppSettings(): Partial<AppSettings> {
    return {
        timetracker: getDefaultTimeTrackerSettings() as any,
    };
}

/**
 * 設定をローカルストレージから読み込み
 */
function loadSettings(): Partial<AppSettings> {
    try {
        const stored = storage.getValue<string>(STORAGE_KEY);
        if (!stored) {
            return getDefaultAppSettings();
        }

        // JSON文字列をパース
        const parseResult = parseTimeTrackerSettings(stored);
        if (parseResult.isError) {
            console.warn("Failed to parse settings:", parseResult.errorMessage);
            appMessageDialogRef.showMessageAsync(
                "設定読み込みエラー",
                `設定の読み込みに失敗しました。デフォルト設定を使用します。\n\nエラー: ${parseResult.errorMessage}`,
                "WARN",
            );
            return getDefaultAppSettings();
        }

        // バリデーションと修正
        const fixResult = parseAndFixTimeTrackerSettings(parseResult.value as any);
        if (fixResult.isError) {
            console.warn("Settings validation failed:", fixResult.errorMessage);
        }

        return {
            timetracker: parseResult.value,
        };
    } catch (error) {
        console.error("Failed to load settings from localStorage:", error);
        appMessageDialogRef.showMessageAsync(
            "設定読み込みエラー",
            `設定の読み込みに失敗しました。デフォルト設定を使用します。\n\nエラー: ${error instanceof Error ? error.message : "不明なエラー"}`,
            "WARN",
        );
        return getDefaultAppSettings();
    }
}

/**
 * 設定をローカルストレージに保存
 */
function saveSettings(settings: Partial<AppSettings>): void {
    try {
        if (!settings.timetracker) {
            throw new Error("timetracker設定が存在しません");
        }

        // JSON文字列に変換
        const jsonString = stringifyTimeTrackerSettings(settings.timetracker, true);
        const success = storage.setValue(STORAGE_KEY, jsonString);
        if (!success) {
            throw new Error("設定の保存に失敗しました");
        }
    } catch (error) {
        console.error("Failed to save settings to localStorage:", error);
        appMessageDialogRef.showMessageAsync(
            "設定保存エラー",
            `設定の保存に失敗しました。\n\nエラー: ${error instanceof Error ? error.message : "不明なエラー"}`,
            "ERROR",
        );
        throw new Error("設定の保存に失敗しました");
    }
}

/**
 * 設定のバリデーションとエラー修正
 * バリデーションエラーがある項目だけデフォルト値に置き換えます
 *
 * @param settings - 検証する設定
 * @returns 修正された設定
 */
function validateAndCorrectSettings(settings: Partial<AppSettings>): Partial<AppSettings> {
    if (!settings.timetracker) {
        return getDefaultAppSettings();
    }

    // バリデーションと自動修正
    const fixResult = parseAndFixTimeTrackerSettings(settings.timetracker as any);

    if (fixResult.isError) {
        console.warn(`ローカルストレージの設定に無効な項目があります: ${fixResult.errorMessage}`);
        appMessageDialogRef.showMessageAsync(
            "設定検証エラー",
            `設定の検証に失敗しました。デフォルト設定を使用します。\n\nエラー: ${fixResult.errorMessage}`,
            "WARN",
        );
        return getDefaultAppSettings();
    }

    return settings;
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
    const [settings, setSettings] = useState<Partial<AppSettings>>(getDefaultAppSettings());
    const [isLoading, setIsLoading] = useState(true);

    // 初回ロード
    useEffect(() => {
        const loaded = loadSettings();
        const validated = validateAndCorrectSettings(loaded);
        setSettings(validated);
        setIsLoading(false);
    }, []);

    // 設定が変更されたら保存
    useEffect(() => {
        if (!isLoading) {
            saveSettings(settings);
        }
    }, [settings, isLoading]);

    // 検証
    const validationResult = settings.timetracker
        ? validateTimeTrackerSettings(settings.timetracker)
        : { isError: true, errorMessage: "timetracker設定が存在しません" };
    const validationErrors = validationResult.isError ? [validationResult.errorMessage] : [];
    const isComplete = settings.timetracker ? isTimeTrackerSettingsComplete(settings.timetracker) : false;

    // 設定の更新
    const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
        // バリデーション
        if (newSettings.timetracker) {
            const validationResult = validateTimeTrackerSettings(newSettings.timetracker);
            if (validationResult.isError) {
                throw new Error(`設定の更新に失敗しました: ${validationResult.errorMessage}`);
            }
        }

        setSettings((prev) => ({ ...prev, ...newSettings }));
    }, []);

    // 設定のリセット
    const resetSettings = useCallback(() => {
        setSettings(getDefaultAppSettings());
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
 * @throws {Error} 設定が不完全な場合
 */
export function useCompleteSettings(): AppSettings {
    const { settings, isComplete, validationErrors } = useSettings();

    if (!isComplete) {
        throw new Error(`設定が不完全です: ${validationErrors.join(", ")}`);
    }

    return settings as AppSettings;
}
