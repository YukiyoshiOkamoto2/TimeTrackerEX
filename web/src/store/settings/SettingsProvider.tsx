/**
 * Settings Provider
 *
 * アプリケーション設定を管理するReact Context Providerです。
 * Pythonのsetting.py (Settings class with singleton pattern)を移植しました。
 */

import { appMessageDialogRef } from "@/components/message-dialog";
import {
    APP_SETTINGS_DEFINITION,
    APPEARANCE_SETTINGS_DEFINITION,
    GENERAL_SETTINGS_DEFINITION,
    getFieldDefaultValue,
    getSettingErrors,
    SettingJSON,
    TIMETRACKER_SETTINGS_DEFINITION,
    updateErrorValue,
    type SettingError,
} from "@/schema";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getStorage } from "../../lib/storage";
import type { AppearanceSettings, AppSettings, GeneralSettings, TimeTrackerSettings } from "../../types";

/**
 * ローカルストレージのキー
 */
const STORAGE_KEY = "settings";

/**
 * ストレージインスタンス
 */
const storage = getStorage();

/**
 * バリデーションエラー情報
 */
export type ValidationErrorInfo = {
    /** 一般設定のエラー */
    general: SettingError[];
    /** 外観設定のエラー */
    appearance: SettingError[];
    /** TimeTracker設定のエラー */
    timeTracker: SettingError[];
};

/**
 * 設定コンテキストの型
 */
interface SettingsContextType {
    /** 設定の状態 */
    settings: Partial<AppSettings>;
    /** 設定を更新 */
    updateSettings: (newSettings: Partial<AppSettings>) => void;
    /** 設定をリセット */
    resetSettings: () => void;
    /** バリデーションエラー情報 */
    validationErrors: ValidationErrorInfo;
}

/**
 * 設定コンテキスト
 */
const SettingsContext = createContext<SettingsContextType | null>(null);

/**
 * デフォルト設定を取得
 */
function getDefaultAppSettings(): AppSettings {
    return getFieldDefaultValue(APP_SETTINGS_DEFINITION) as AppSettings;
}

/**
 * 設定をローカルストレージから読み込み
 */
function loadSettings(): AppSettings {
    const stored = storage.getValue<string>(STORAGE_KEY);
    if (!stored) {
        appMessageDialogRef.showMessageAsync(
            "設定読み込みエラー",
            "設定のが存在しません。デフォルト設定を使用します。",
            "WARN",
        );
        return getDefaultAppSettings();
    }

    const result = SettingJSON.parse(stored);
    if (result.isError) {
        appMessageDialogRef.showMessageAsync(
            "設定読み込みエラー",
            "設定の読み込みに失敗しました。デフォルト設定を使用します。\n\n" + result.errorMessage,
            "WARN",
        );
        return getDefaultAppSettings();
    }

    try {
        // APP_SETTINGS_DEFINITIONを使って全体をバリデーション
        const validated = updateErrorValue(result.value, APP_SETTINGS_DEFINITION);
        return validated as unknown as AppSettings;
    } catch (error) {
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
    // JSON文字列に変換
    const jsonString = SettingJSON.json(settings);
    const success = storage.setValue(STORAGE_KEY, jsonString);
    if (!success) {
        appMessageDialogRef.showMessageAsync("設定保存エラー", "設定の保存に失敗しました。", "ERROR");
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
    const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

    // 設定が変更されたら保存
    useEffect(() => {
        saveSettings(settings);
    }, [settings]);

    // バリデーションエラーを計算
    const validationErrors = useMemo<ValidationErrorInfo>(() => {
        const general = settings.general
            ? getSettingErrors(settings.general as GeneralSettings, GENERAL_SETTINGS_DEFINITION)
            : [];
        const appearance = settings.appearance
            ? getSettingErrors(settings.appearance as AppearanceSettings, APPEARANCE_SETTINGS_DEFINITION)
            : [];
        const timeTracker = settings.timetracker
            ? getSettingErrors(settings.timetracker as TimeTrackerSettings, TIMETRACKER_SETTINGS_DEFINITION)
            : [];

        return {
            general,
            appearance,
            timeTracker,
        };
    }, [settings.general, settings.appearance, settings.timetracker]);

    // 設定の更新
    const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
        setSettings((prev) => ({ ...prev, ...newSettings }));
    }, []);

    // 設定のリセット
    const resetSettings = useCallback(() => {
        setSettings(getDefaultAppSettings());
    }, []);

    const value: SettingsContextType = {
        settings,
        updateSettings,
        resetSettings,
        validationErrors,
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
