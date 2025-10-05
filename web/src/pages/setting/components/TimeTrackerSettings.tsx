import { Button, Input, Switch } from "@fluentui/react-components";
import { SettingItem } from "./SettingItem";
import { SettingSection } from "./SettingSection";

export function TimeTrackerSettings() {
    return (
        <>
            <SettingSection title="データ処理設定" description="TimeTrackerのデータ処理に関する設定">
                <SettingItem
                    label="自動リンク機能"
                    description="スケジュールとアイテムコードを自動的に紐づけます"
                    control={<Switch defaultChecked />}
                />
                <SettingItem
                    label="重複チェック"
                    description="同じスケジュールが複数回登録されるのを防ぎます"
                    control={<Switch defaultChecked />}
                />
                <SettingItem
                    label="AI推論を使用"
                    description="AIを使用してアイテムコードを推論します"
                    control={<Switch />}
                />
            </SettingSection>

            <SettingSection title="ファイル処理設定" description="PDFとICSファイルの処理に関する設定">
                <SettingItem
                    label="デフォルトのPDFパス"
                    description="PDFファイルの保存場所"
                    control={
                        <Button size="small" appearance="secondary">
                            参照
                        </Button>
                    }
                />
                <SettingItem
                    label="デフォルトのICSパス"
                    description="ICSファイルの保存場所"
                    control={
                        <Button size="small" appearance="secondary">
                            参照
                        </Button>
                    }
                />
            </SettingSection>

            <SettingSection title="履歴設定" description="処理履歴の保存に関する設定">
                <SettingItem
                    label="履歴保存期間（日）"
                    description="この日数を超えた履歴は自動的に削除されます"
                    control={<Input type="number" defaultValue="90" style={{ maxWidth: "120px" }} />}
                />
                <SettingItem
                    label="処理ログを保存"
                    description="詳細な処理ログをファイルに保存します"
                    control={<Switch defaultChecked />}
                />
            </SettingSection>

            <SettingSection title="データ管理">
                <SettingItem
                    label="データをエクスポート"
                    description="すべてのデータをJSONファイルとしてエクスポートします"
                    control={
                        <Button size="small" appearance="secondary">
                            エクスポート
                        </Button>
                    }
                />
                <SettingItem
                    label="データをインポート"
                    description="バックアップからデータを復元します"
                    control={
                        <Button size="small" appearance="secondary">
                            インポート
                        </Button>
                    }
                />
                <SettingItem
                    label="すべてのデータをクリア"
                    description="すべての設定とデータを削除します（取り消せません）"
                    control={
                        <Button size="small" appearance="secondary">
                            クリア
                        </Button>
                    }
                />
            </SettingSection>
        </>
    );
}
