import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FiAlertTriangle } from "react-icons/fi";
import styles from "./styles.module.css";

const focusableSelector =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const ConfirmDialog = ({
    title,
    description,
    confirmLabel = "Delete",
    onCancel,
    onConfirm,
}) => {
    const cancelRef = useRef(null);
    const dialogRef = useRef(null);
    const onCancelRef = useRef(onCancel);

    useLayoutEffect(() => {
        onCancelRef.current = onCancel;
    }, [onCancel]);

    useLayoutEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return undefined;

        const root = document.getElementById("root");
        const html = document.documentElement;
        const previousFocus = document.activeElement;
        const previousRootInert = root?.inert ?? false;
        const previousRootAriaHidden = root?.getAttribute("aria-hidden") ?? null;
        const previousOverflow = html.style.overflow;

        html.style.overflow = "hidden";
        cancelRef.current?.focus();
        if (root) {
            root.inert = true;
            root.setAttribute("aria-hidden", "true");
        }

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                onCancelRef.current?.();
                return;
            }
            if (event.key !== "Tab") return;

            const focusableElements = Array.from(
                dialog.querySelectorAll(focusableSelector),
            ).filter((element) => !element.hidden);
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (!firstElement || !lastElement) {
                event.preventDefault();
                dialog.focus();
            } else if (
                event.shiftKey &&
                (document.activeElement === firstElement || !dialog.contains(document.activeElement))
            ) {
                event.preventDefault();
                lastElement.focus();
            } else if (
                !event.shiftKey &&
                (document.activeElement === lastElement || !dialog.contains(document.activeElement))
            ) {
                event.preventDefault();
                firstElement.focus();
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            if (root) {
                root.inert = previousRootInert;
                if (previousRootAriaHidden === null) {
                    root.removeAttribute("aria-hidden");
                } else {
                    root.setAttribute("aria-hidden", previousRootAriaHidden);
                }
            }
            html.style.overflow = previousOverflow;

            const canRestoreFocus =
                previousFocus instanceof HTMLElement &&
                previousFocus !== document.body &&
                previousFocus.isConnected &&
                !previousFocus.closest("[inert]");
            const fallback = document.getElementById("envelopes-heading") ||
                root?.querySelector("main");
            (canRestoreFocus ? previousFocus : fallback)?.focus();
        };
    }, []);

    return createPortal(
        <div
            className={styles.overlay}
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onCancelRef.current?.();
            }}
        >
            <section
                ref={dialogRef}
                className={styles.dialog}
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-title"
                aria-describedby="confirm-description"
                tabIndex={-1}
            >
                <span className={styles.icon}><FiAlertTriangle aria-hidden="true" /></span>
                <h2 id="confirm-title">{title}</h2>
                <p id="confirm-description">{description}</p>
                <div className={styles.actions}>
                    <button type="button" ref={cancelRef} onClick={onCancel}>Cancel</button>
                    <button type="button" className={styles.confirm} onClick={onConfirm}>{confirmLabel}</button>
                </div>
            </section>
        </div>,
        document.body,
    );
};

export default ConfirmDialog;
