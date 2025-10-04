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
    onBack?: () => void;
    breadcrumbs?: string[];
    onBreadcrumbClick?: (index: number) => void;
};

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
