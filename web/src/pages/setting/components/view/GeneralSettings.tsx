import { SettingItem, SettingSection } from "../ui";

export function GeneralSettings() {
    return (
        <>
            <SettingSection title="言語設定" required={false}>
                <SettingItem label="言語" description="日本語" />
            </SettingSection>
        </>
    );
}
