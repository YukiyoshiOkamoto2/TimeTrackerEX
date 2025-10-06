import { makeStyles, tokens } from "@fluentui/react-components";
import type { ReactNode } from "react";
import { Card } from "../../../components/card";

const useStyles = makeStyles({
    section: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalM,
    },
    sectionTitle: {
        fontSize: tokens.fontSizeBase500,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
        marginBottom: tokens.spacingVerticalXS,
    },
    sectionDescription: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground3,
        marginTop: tokens.spacingVerticalXXS,
    },
});

export type SettingSectionProps = {
    title: string;
    description?: string;
    children: ReactNode;
};

export function SettingSection({ title, description, children }: SettingSectionProps) {
    const styles = useStyles();

    return (
        <div className={styles.section}>
            <div>
                <div className={styles.sectionTitle}>{title}</div>
                {description && <div className={styles.sectionDescription}>{description}</div>}
            </div>
            <Card>{children}</Card>
        </div>
    );
}
