import { Switch } from "@fluentui/react-components";
import { SettingItem, SettingSection } from "../ui";

export function GeneralSettings() {
    return (
        <>
            <SettingSection title="起動設定" description="アプリケーションの起動に関する設定" required={false}>
                <SettingItem
                    label="自動起動を有効にする"
                    description="Windowsの起動時に自動的にアプリケーションを起動します"
                    control={<Switch />}
                />
                <SettingItem
                    label="最小化で起動"
                    description="起動時にウィンドウを最小化した状態で開始します"
                    control={<Switch />}
                />
            </SettingSection>

            <SettingSection title="通知設定" description="通知に関する設定" required={false}>
                <SettingItem
                    label="デスクトップ通知を有効にする"
                    description="重要な通知をデスクトップに表示します"
                    control={<Switch defaultChecked />}
                />
                <SettingItem label="サウンドを有効にする" description="通知時に音を再生します" control={<Switch />} />
            </SettingSection>

            <SettingSection title="言語設定" required={false}>
                <SettingItem label="言語" description="日本語" />
            </SettingSection>
        </>
    );
}
