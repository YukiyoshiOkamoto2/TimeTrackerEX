import { SettingValueInfo } from "@/schema";
import { Button, Dropdown, Option, makeStyles, tokens } from "@fluentui/react-components";
import { Add20Regular, Dismiss20Regular } from "@fluentui/react-icons";
import type { EventPattern } from "../../../../types/settings";
import { SettingValidatedInput } from "./SettingValidatedInput";

const useStyles = makeStyles({
    patternList: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalS,
        width: "100%",
    },
    patternItem: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalS,
    },
    patternInput: {
        flexGrow: 1,
        minWidth: "200px",
    },
    matchModeDropdown: {
        minWidth: "150px",
    },
    addButton: {
        marginTop: tokens.spacingVerticalS,
    },
});

interface EventPatternEditorProps {
    patternDefinition: SettingValueInfo;
    patterns: EventPattern[];
    onChange: (patterns: EventPattern[]) => void;
    placeholder?: string;
    addButtonText?: string;
}

export function EventPatternEditor({
    patternDefinition,
    patterns,
    onChange,
    placeholder = "パターン（例: MTG, 個人作業）",
    addButtonText = "パターンを追加",
}: EventPatternEditorProps) {
    const styles = useStyles();

    const handlePatternChange = (index: number, pattern: string) => {
        const newPatterns = [...patterns];
        newPatterns[index] = { ...newPatterns[index], pattern };
        onChange(newPatterns);
    };

    const handleMatchModeChange = (index: number, matchMode: "partial" | "prefix" | "suffix") => {
        const newPatterns = [...patterns];
        newPatterns[index] = { ...newPatterns[index], matchMode };
        onChange(newPatterns);
    };

    const handleAdd = () => {
        onChange([...patterns, { pattern: "AAA", matchMode: "partial" }]);
    };

    const handleRemove = (index: number) => {
        const newPatterns = patterns.filter((_, i) => i !== index);
        onChange(newPatterns);
    };

    const getMatchModeLabel = (mode: string) => {
        switch (mode) {
            case "partial":
                return "部分一致";
            case "prefix":
                return "前方一致";
            case "suffix":
                return "後方一致";
            default:
                return mode;
        }
    };

    return (
        <div className={styles.patternList}>
            {patterns.map((item, index) => (
                <div key={index} className={styles.patternItem}>
                    <SettingValidatedInput
                        className={styles.patternInput}
                        value={item.pattern}
                        onCommit={(value) => handlePatternChange(index, value as string)}
                        definition={patternDefinition}
                        placeholder={placeholder}
                    />
                    <Dropdown
                        className={styles.matchModeDropdown}
                        value={getMatchModeLabel(item.matchMode)}
                        selectedOptions={[item.matchMode]}
                        onOptionSelect={(_, data) =>
                            handleMatchModeChange(index, data.optionValue as "partial" | "prefix" | "suffix")
                        }
                    >
                        <Option value="partial">部分一致</Option>
                        <Option value="prefix">前方一致</Option>
                        <Option value="suffix">後方一致</Option>
                    </Dropdown>
                    <Button
                        appearance="subtle"
                        icon={<Dismiss20Regular />}
                        onClick={() => handleRemove(index)}
                        size="small"
                        aria-label="削除"
                    />
                </div>
            ))}
            <Button
                className={styles.addButton}
                appearance="secondary"
                icon={<Add20Regular />}
                onClick={handleAdd}
                size="small"
            >
                {addButtonText}
            </Button>
        </div>
    );
}
