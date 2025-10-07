/**
 * Settings Provider
 *
 * アプリケーション設定を管理するReact Context Providerです。
 * Pythonのsetting.py (Settings class with singleton pattern)を移植しました。
 */

import { appMessageDialogRef } from "@/components/message-dialog";
import { getLogger } from "@/lib";
import { APP_SETTINGS_DEFINITION, getFieldDefaultValue, updateErrorValue } from "@/schema";

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { getStorage } from "../../lib/storage";
import type { AppSettings } from "../../types";

const logger = getLogger("SettingsProvider");

/**
 * ローカルストレージのキー
 */
const STORAGE_KEY = "settings";

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
function getDefaultAppSettings(): AppSettings {
    return getFieldDefaultValue(APP_SETTINGS_DEFINITION) as AppSettings;
}

function parse(json: string): AppSettings | undefined {
    let obj;
    try {
        obj = JSON.parse(json);
    } catch (e) {
        logger.error(e instanceof Error ? e.message : "Faild parse json.");
    }
    return obj;
}

/**
 * 設定をローカルストレージから読み込み
 */
function loadSettings(): AppSettings {
    try {
        const stored = storage.getValue<string>(STORAGE_KEY);
        if (!stored) {
            appMessageDialogRef.showMessageAsync(
                "設定読み込みエラー",
                "設定のが存在しません。デフォルト設定を使用します。",
                "WARN",
            );
            return getDefaultAppSettings();
        }

        const obj = parse(stored);
        if (!obj) {
            appMessageDialogRef.showMessageAsync(
                "設定読み込みエラー",
                "設定の読み込みに失敗しました。デフォルト設定を使用します。",
                "WARN",
            );
            return getDefaultAppSettings();
        }

        // APP_SETTINGS_DEFINITIONを使って全体をバリデーション
        const validated = updateErrorValue(obj as unknown as Record<string, unknown>, APP_SETTINGS_DEFINITION);
        return validated as unknown as AppSettings;
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
        const jsonString = JSON.stringify(settings);
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
 * 設定Providerのプロパティ
 */
interface SettingsProviderProps {
    children: ReactNode;
}

/**
 * 設定Provider
 */
export function SettingsProvider({ children }: SettingsProviderProps) {
    const [settings, setSettings] = useState<AppSettings>(loadSettings());

    // 設定が変更されたら保存
    useEffect(() => {
        saveSettings(settings);
    }, [settings]);

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
