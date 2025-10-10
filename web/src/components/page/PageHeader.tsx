/**
 * PageHeader Component
 *
 * ページヘッダーとパンくずナビゲーションを提供するコンポーネント
 */

import {
    Breadcrumb,
    BreadcrumbButton,
    BreadcrumbDivider,
    BreadcrumbItem,
    makeStyles,
} from "@fluentui/react-components";

const useStyles = makeStyles({
    navigation: {
        marginBottom: "16px",
    },
});

export type PageHeaderProps = {
    /** 戻るボタンのコールバック */
    onBack?: () => void;
    /** パンくずリストの項目 */
    breadcrumbs?: string[];
    /** パンくず項目クリック時のコールバック */
    onBreadcrumbClick?: (index: number) => void;
};

/**
 * ページヘッダーコンポーネント
 * パンくずナビゲーションを表示し、ページ間の移動を提供
 */
export function PageHeader({ onBack, breadcrumbs, onBreadcrumbClick }: PageHeaderProps) {
    const styles = useStyles();

    if (!breadcrumbs || breadcrumbs.length === 0) {
        return null;
    }

    const handleClick = (index: number) => {
        if (index === breadcrumbs.length - 1) {
            // Current page - no action
            return;
        }
        if (onBreadcrumbClick) {
            onBreadcrumbClick(index);
        } else if (index === 0 && onBack) {
            onBack();
        }
    };

    return (
        <div className={styles.navigation}>
            <Breadcrumb size="large">
                {breadcrumbs.map((crumb, index) => (
                    <BreadcrumbItem key={index}>
                        <BreadcrumbButton current={index === breadcrumbs.length - 1} onClick={() => handleClick(index)}>
                            {crumb}
                        </BreadcrumbButton>
                        {index < breadcrumbs.length - 1 && <BreadcrumbDivider />}
                    </BreadcrumbItem>
                ))}
            </Breadcrumb>
        </div>
    );
}
