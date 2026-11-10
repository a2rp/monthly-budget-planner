import { useEffect, useMemo, useRef, useState } from "react";
import {
    FiBriefcase,
    FiCoffee,
    FiHome,
    FiPlus,
    FiShoppingBag,
    FiShoppingCart,
    FiTrash2,
    FiTruck,
    FiZap,
} from "react-icons/fi";
import ConfirmDialog from "../confirmDialog";
import styles from "./styles.module.css";

const storageKey = "good-measure-budget";
const starterBudget = {
    income: 120000,
    categories: [
        { id: 1, name: "Home", icon: "home", planned: 32000, spent: 25000 },
        { id: 2, name: "Food", icon: "food", planned: 18000, spent: 9000 },
        { id: 3, name: "Getting around", icon: "travel", planned: 8000, spent: 3600 },
        { id: 4, name: "Utilities", icon: "utilities", planned: 6500, spent: 5100 },
        { id: 5, name: "Savings", icon: "savings", planned: 20000, spent: 20000 },
        { id: 6, name: "Personal", icon: "personal", planned: 7000, spent: 2600 },
    ],
};
const icons = {
    home: FiHome,
    food: FiShoppingCart,
    travel: FiTruck,
    utilities: FiZap,
    savings: FiBriefcase,
    personal: FiCoffee,
    other: FiShoppingBag,
};
const currencyFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
});

const money = (value) => currencyFormatter.format(Number(value) || 0);
const starterCopy = () => ({
    income: starterBudget.income,
    categories: starterBudget.categories.map((category) => ({ ...category })),
});

const readAmount = (value, fallback = 0) => {
    if (typeof value !== "number" && typeof value !== "string") return fallback;
    if (typeof value === "string" && value.trim() === "") return fallback;
    const amount = Number(value);
    return Number.isFinite(amount) && amount >= 0 ? amount : fallback;
};

const normalizeBudget = (saved) => {
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) {
        return { budget: starterCopy(), recovered: true };
    }

    let recovered = false;
    const incomeWasBlank = saved.income === "";
    const income = incomeWasBlank
        ? 0
        : readAmount(saved.income, starterBudget.income);
    if (!incomeWasBlank && income !== saved.income) recovered = true;

    let sourceCategories = saved.categories;
    if (!Array.isArray(sourceCategories)) {
        sourceCategories = starterBudget.categories;
        recovered = true;
    }

    const usedIds = new Set();
    const categories = sourceCategories.flatMap((category, index) => {
        if (!category || typeof category !== "object" || Array.isArray(category)) {
            recovered = true;
            return [];
        }

        const name = typeof category.name === "string" ? category.name.trim() : "";
        if (!name) {
            recovered = true;
            return [];
        }

        const hasValidId =
            (typeof category.id === "string" && category.id.trim() !== "") ||
            (typeof category.id === "number" && Number.isFinite(category.id));
        let id = hasValidId ? String(category.id) : `saved-${index}`;
        if (!hasValidId || usedIds.has(id)) {
            id = `saved-${index}`;
            let suffix = 1;
            while (usedIds.has(id)) id = `saved-${index}-${suffix++}`;
            recovered = true;
        }
        usedIds.add(id);

        const icon = Object.prototype.hasOwnProperty.call(icons, category.icon)
            ? category.icon
            : "other";
        const plannedWasBlank = category.planned === "";
        const spentWasBlank = category.spent === "";
        const planned = plannedWasBlank ? 0 : readAmount(category.planned);
        const spent = spentWasBlank ? 0 : readAmount(category.spent);
        if (
            name !== category.name ||
            icon !== category.icon ||
            (!plannedWasBlank && planned !== category.planned) ||
            (!spentWasBlank && spent !== category.spent) ||
            !hasValidId
        ) {
            recovered = true;
        }

        return [{ id, name, icon, planned, spent }];
    });

    return { budget: { income, categories }, recovered };
};

const readBudget = () => {
    try {
        const stored = localStorage.getItem(storageKey);
        if (stored === null) return { budget: starterCopy(), notice: "" };

        try {
            const { budget, recovered } = normalizeBudget(JSON.parse(stored));
            return {
                budget,
                notice: recovered
                    ? "Some saved budget data could not be read. The original browser data is left untouched until you make an edit."
                    : "",
            };
        } catch {
            return {
                budget: starterCopy(),
                notice: "Saved budget data could not be read. The original browser data is left untouched until you make an edit.",
            };
        }
    } catch {
        return {
            budget: starterCopy(),
            notice: "Browser storage could not be read. Changes may not persist after you leave.",
        };
    }
};

const amountFromInput = (value) => {
    if (value === "") return "";
    const amount = Number(value);
    return Number.isFinite(amount) ? Math.max(0, amount) : 0;
};

const MonthlyBudgetPlanner = () => {
    const [initialState] = useState(readBudget);
    const [budget, setBudget] = useState(initialState.budget);
    const [storageNotice, setStorageNotice] = useState(initialState.notice);
    const [draft, setDraft] = useState({ name: "", planned: "", spent: "0" });
    const [draftError, setDraftError] = useState("");
    const [pendingDelete, setPendingDelete] = useState(null);
    const hasUserEditedBudget = useRef(false);

    useEffect(() => {
        if (!hasUserEditedBudget.current) return;
        try {
            localStorage.setItem(storageKey, JSON.stringify(budget));
            setStorageNotice("");
        } catch {
            setStorageNotice("Browser storage is unavailable. Your latest changes may be lost when you leave.");
        }
    }, [budget]);

    const updateBudget = (updater) => {
        hasUserEditedBudget.current = true;
        setBudget(updater);
    };

    const totals = useMemo(() => {
        const planned = budget.categories.reduce((sum, item) => sum + Number(item.planned || 0), 0);
        const spent = budget.categories.reduce((sum, item) => sum + Number(item.spent || 0), 0);
        return { planned, spent, unassigned: Number(budget.income || 0) - planned };
    }, [budget]);

    const updateCategory = (id, key, value) => {
        const amount = amountFromInput(value);
        updateBudget((current) => ({
            ...current,
            categories: current.categories.map((item) =>
                item.id === id ? { ...item, [key]: amount } : item,
            ),
        }));
    };

    const addCategory = (event) => {
        event.preventDefault();
        const name = draft.name.trim();
        if (!name) {
            setDraftError("Enter a category name.");
            return;
        }

        updateBudget((current) => ({
            ...current,
            categories: [
                ...current.categories,
                {
                    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    name,
                    icon: "other",
                    planned: readAmount(draft.planned),
                    spent: readAmount(draft.spent),
                },
            ],
        }));
        setDraft({ name: "", planned: "", spent: "0" });
        setDraftError("");
    };

    const removeCategory = () => {
        if (!pendingDelete) return;
        updateBudget((current) => ({
            ...current,
            categories: current.categories.filter((item) => item.id !== pendingDelete.id),
        }));
        setPendingDelete(null);
    };

    const allocation = Number(budget.income)
        ? Math.max(0, Math.min(100, totals.planned / Number(budget.income) * 100))
        : 0;
    const remaining = Number(budget.income || 0) - totals.spent;

    return (
        <section className={styles.monthlyBudgetPlanner} id="workspace">
            <div className={styles.hero}>
                <div>
                    <p className={styles.period}>A PLAN FOR THIS MONTH</p>
                    <h1>Give each rupee<br /><span>a place to go.</span></h1>
                    <p className={styles.description}>Make a plan before the month begins. Adjust it as real life happens.</p>
                </div>
                <label className={styles.incomeInput}>
                    <span>Monthly take-home</span>
                    <div><span aria-hidden="true">₹</span><input
                        type="number"
                        min="0"
                        step="0.01"
                        value={budget.income}
                        onChange={(event) => {
                            const amount = amountFromInput(event.target.value);
                            updateBudget((current) => ({ ...current, income: amount }));
                        }}
                        aria-label="Monthly take-home income"
                    /></div>
                </label>
            </div>

            {storageNotice && <p className={styles.storageNotice} role="status" aria-live="polite">{storageNotice}</p>}

            <div className={styles.summaryGrid}>
                <article className={styles.mainSummary}><span>Still available</span><strong>{money(remaining)}</strong><small>After {money(totals.spent)} in recorded spending</small></article>
                <article><span>Income</span><strong>{money(budget.income)}</strong><small>Monthly take-home</small></article>
                <article><span>Assigned</span><strong>{money(totals.planned)}</strong><small>{Math.round(allocation)}% of income</small></article>
                <article><span>Spent so far</span><strong>{money(totals.spent)}</strong><small>Across {budget.categories.length} envelopes</small></article>
            </div>

            <div className={styles.plannerGrid}>
                <section className={styles.envelopePanel} id="envelopes">
                    <div className={styles.panelHeading}>
                        <div><h2 id="envelopes-heading" tabIndex={-1}>Your envelopes</h2><p>Set a plan, then keep actual spending up to date.</p></div>
                        <span>{budget.categories.length} categories</span>
                    </div>
                    <div className={styles.tableHeader}><span>Category</span><span>Planned</span><span>Spent</span><span>Left</span><span></span></div>
                    <div className={styles.envelopeList}>{budget.categories.map((item) => {
                        const Icon = icons[item.icon] || FiShoppingBag;
                        const left = Number(item.planned) - Number(item.spent);
                        const pct = Number(item.planned) ? Math.min(100, Number(item.spent) / Number(item.planned) * 100) : 0;
                        const over = Number(item.spent) > Number(item.planned);
                        return <article className={styles.envelopeRow} key={item.id}>
                            <span className={styles.categoryIcon}><Icon aria-hidden="true" /></span>
                            <div className={styles.categoryName}>
                                <strong>{item.name}</strong>
                                <span>{over ? `${money(Math.abs(left))} over plan` : `${Math.round(pct)}% used`}</span>
                                <div className={over ? styles.overBar : styles.bar} aria-hidden="true"><i style={{ width: `${Math.max(0, pct)}%` }} /></div>
                            </div>
                            <label className={styles.amountField}>
                                <span className={styles.mobileLabel}>Plan</span><span aria-hidden="true">₹</span>
                                <input aria-label={`${item.name} planned amount`} type="number" min="0" step="0.01" value={item.planned} onChange={(event) => updateCategory(item.id, "planned", event.target.value)} />
                            </label>
                            <label className={styles.amountField}>
                                <span className={styles.mobileLabel}>Spent</span><span aria-hidden="true">₹</span>
                                <input aria-label={`${item.name} spent amount`} type="number" min="0" step="0.01" value={item.spent} onChange={(event) => updateCategory(item.id, "spent", event.target.value)} />
                            </label>
                            <strong className={over ? styles.overValue : styles.leftValue}>{left < 0 ? "−" : ""}{money(Math.abs(left))}</strong>
                            <button type="button" className={styles.deleteButton} aria-label={`Remove ${item.name} envelope`} onClick={() => setPendingDelete(item)}><FiTrash2 aria-hidden="true" /></button>
                        </article>;
                    })}</div>

                    <form className={styles.addForm} id="add" onSubmit={addCategory}>
                        <div><h3>Add an envelope</h3><p>Give another expense a home.</p></div>
                        <label>Name<input required aria-invalid={Boolean(draftError)} aria-describedby={draftError ? "category-name-error" : undefined} value={draft.name} onChange={(event) => { setDraft({ ...draft, name: event.target.value }); setDraftError(""); }} placeholder="e.g. Pet care" />{draftError && <span className={styles.draftError} id="category-name-error" role="alert">{draftError}</span>}</label>
                        <label>Planned<input type="number" min="0" step="0.01" value={draft.planned} onChange={(event) => setDraft({ ...draft, planned: event.target.value })} placeholder="0" /></label>
                        <label>Spent<input type="number" min="0" step="0.01" value={draft.spent} onChange={(event) => setDraft({ ...draft, spent: event.target.value })} /></label>
                        <button type="submit"><FiPlus aria-hidden="true" /> Add</button>
                    </form>
                </section>

                <aside className={styles.sideColumn}>
                    <section className={styles.allocationCard}>
                        <p className={styles.cardLabel}>MONTHLY PLAN</p>
                        <h2>Every rupee<br />has a job.</h2>
                        <div className={styles.wheelRow}>
                            <div className={styles.wheel} style={{ background: `conic-gradient(var(--accent) ${allocation * 3.6}deg, #e9e6d8 0deg)` }} role="img" aria-label={`${Math.round(allocation)} percent of income assigned`}>
                                <span>{Math.round(allocation)}<small>%</small></span>
                            </div>
                            <div className={styles.wheelLegend}>
                                <span><i /> Assigned <strong>{money(totals.planned)}</strong></span>
                                <span><i /> Unassigned <strong>{money(totals.unassigned)}</strong></span>
                            </div>
                        </div>
                        <p className={totals.unassigned < 0 ? styles.shortfall : styles.availableNote}>
                            {totals.unassigned < 0 ? `Your plan is ${money(Math.abs(totals.unassigned))} over your income.` : `You still have ${money(totals.unassigned)} to assign.`}
                        </p>
                    </section>
                    <section className={styles.tipCard}>
                        <span className={styles.tipMark}>01</span>
                        <div><h3>Make room for real life</h3><p>Planned amounts can change. Update the spent column as the month unfolds and use the remaining figures to guide your next decision.</p></div>
                    </section>
                </aside>
            </div>

            {pendingDelete && <ConfirmDialog
                title="Remove this envelope?"
                description={`“${pendingDelete.name}” and its budget figures will be removed.`}
                confirmLabel="Remove envelope"
                onCancel={() => setPendingDelete(null)}
                onConfirm={removeCategory}
            />}
        </section>
    );
};

export default MonthlyBudgetPlanner;
