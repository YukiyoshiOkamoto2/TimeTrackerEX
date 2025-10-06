import { themeHandler } from "@/main";
import { Dropdown, Option, Switch } from "@fluentui/react-components";
import { SettingItem } from "./SettingItem";
import { SettingSection } from "./SettingSection";

export function AppearanceSettings() {
    return (
        <>
            <SettingSection title="テーマ設定" description="アプリケーションの外観をカスタマイズ">
                <SettingItem
                    label="テーマ"
                    description="ライト、ダーク、またはシステム設定に従います"
                    control={
                        <Dropdown
                            placeholder="テーマを選択"
                            defaultValue="システム設定"
                            onOptionSelect={(e, d) => {
                                themeHandler.setTheme(d.optionText === "ダーク");
                            }}
                            style={{ minWidth: "200px" }}
                        >
                            <Option>ライト</Option>
                            <Option>ダーク</Option>
                            <Option>システム設定</Option>
                        </Dropdown>
                    }
                />
                <SettingItem
                    label="アクセントカラー"
                    description="システムのアクセントカラーを使用する"
                    control={<Switch defaultChecked />}
                />
            </SettingSection>

            <SettingSection title="表示設定" description="UI要素の表示に関する設定">
                <SettingItem
                    label="アニメーションを有効にする"
                    description="画面遷移時のアニメーション効果を表示します"
                    control={<Switch defaultChecked />}
                />
                <SettingItem
                    label="コンパクトモード"
                    description="UIを密度高く表示して画面スペースを節約します"
                    control={<Switch />}
                />
            </SettingSection>
        </>
    );
}
