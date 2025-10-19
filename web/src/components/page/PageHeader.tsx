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
import { memo, useCallback, useMemo } from "react";

const useStyles = makeStyles({
    navigation: {
        marginBottom: "4px",
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
 *
 * パフォーマンス最適化:
 * - React.memoでラップして不要な再レンダリングを防止
 * - handleClickをuseCallbackで最適化
 * - breadcrumbs要素のレンダリングをuseMemoで最適化
 */
export const PageHeader = memo(function PageHeader({ onBack, breadcrumbs, onBreadcrumbClick }: PageHeaderProps) {
    const styles = useStyles();

    // handleClickを最適化
    const handleClick = useCallback(
        (index: number) => {
            if (!breadcrumbs || index === breadcrumbs.length - 1) {
                // Current page - no action
                return;
            }
            if (onBreadcrumbClick) {
                onBreadcrumbClick(index);
            } else if (index === 0 && onBack) {
                onBack();
            }
        },
        [breadcrumbs, onBreadcrumbClick, onBack],
    );

    // breadcrumbsレンダリングを最適化
    const breadcrumbItems = useMemo(() => {
        if (!breadcrumbs || breadcrumbs.length === 0) {
            return null;
        }

        const items = [];
        for (let index = 0; index < breadcrumbs.length; index++) {
            const crumb = breadcrumbs[index];
            items.push(
                <BreadcrumbItem key={index}>
                    <BreadcrumbButton current={index === breadcrumbs.length - 1} onClick={() => handleClick(index)}>
                        {crumb}
                    </BreadcrumbButton>
                </BreadcrumbItem>,
            );
            // 最後の要素以外にDividerを追加
            if (index < breadcrumbs.length - 1) {
                items.push(<BreadcrumbDivider key={`divider-${index}`} />);
            }
        }
        return items;
    }, [breadcrumbs, handleClick]);

    if (!breadcrumbItems) {
        return null;
    }

    return (
        <div className={styles.navigation}>
            <Breadcrumb size="large">{breadcrumbItems}</Breadcrumb>
        </div>
    );
});
