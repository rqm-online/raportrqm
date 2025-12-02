import { useEffect, useState } from 'react';

export function useUnsavedChangesWarning(hasUnsavedChanges: boolean) {
    const [showWarning, setShowWarning] = useState(false);
    const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

    // Warn before leaving page (browser/tab close)
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    const interceptNavigation = (navigationFn: () => void) => {
        if (hasUnsavedChanges) {
            setPendingNavigation(() => navigationFn);
            setShowWarning(true);
        } else {
            navigationFn();
        }
    };

    const confirmNavigation = () => {
        if (pendingNavigation) {
            pendingNavigation();
        }
        setShowWarning(false);
        setPendingNavigation(null);
    };

    const cancelNavigation = () => {
        setShowWarning(false);
        setPendingNavigation(null);
    };

    return {
        showWarning,
        confirmNavigation,
        cancelNavigation,
        interceptNavigation
    };
}
