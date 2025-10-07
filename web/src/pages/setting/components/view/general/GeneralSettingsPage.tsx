import { useMemo } from "react";
import { SettingItem, type SettingError } from "../../ui";
import { SettingSection } from "../../layout";

export function GeneralSettingsPage() {
    // バリデーションエラーを収集
    // 注: 現在GeneralSettingsには編集可能な項目がないため、エラーは常に空
    const errors = useMemo(() => {
        const errorList: SettingError[] = [];
        // 将来的に編集可能な項目が追加された場合、ここでvalidatePartialを使用
        return errorList;
    }, []);

    return (
        <>
            <SettingSection
                title="テーマ設定"
                description="アプリケーションの外観をカスタマイズ"
                required={false}
                errors={errors}
            >
                <SettingItem label="言語" description="日本語" />
            </SettingSection>
        </>
    );
}
