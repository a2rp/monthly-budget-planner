import { useEffect, useMemo, useState } from "react";
import { FiBriefcase, FiCoffee, FiHome, FiPlus, FiShoppingBag, FiShoppingCart, FiTrash2, FiTruck, FiZap } from "react-icons/fi";
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
const icons = { home: FiHome, food: FiShoppingCart, travel: FiTruck, utilities: FiZap, savings: FiBriefcase, personal: FiCoffee, other: FiShoppingBag };
const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value) || 0);
const readBudget = () => {
    try { const saved = localStorage.getItem(storageKey); return saved ? { ...starterBudget, ...JSON.parse(saved) } : starterBudget; } catch { return starterBudget; }
};

const MonthlyBudgetPlanner = () => {
    const [budget, setBudget] = useState(readBudget);
    const [draft, setDraft] = useState({ name: "", planned: "", spent: "0" });
    const [pendingDelete, setPendingDelete] = useState(null);
    useEffect(() => localStorage.setItem(storageKey, JSON.stringify(budget)), [budget]);

    const totals = useMemo(() => {
        const planned = budget.categories.reduce((sum, item) => sum + Number(item.planned), 0);
        const spent = budget.categories.reduce((sum, item) => sum + Number(item.spent), 0);
        return { planned, spent, unassigned: Number(budget.income) - planned };
    }, [budget]);
    const updateCategory = (id, key, value) => setBudget((current) => ({ ...current, categories: current.categories.map((item) => item.id === id ? { ...item, [key]: Math.max(0, Number(value)) } : item) }));
    const addCategory = (event) => {
        event.preventDefault();
        if (!draft.name.trim()) return;
        setBudget((current) => ({ ...current, categories: [...current.categories, { id: Date.now(), name: draft.name.trim(), icon: "other", planned: Number(draft.planned) || 0, spent: Number(draft.spent) || 0 }] }));
        setDraft({ name: "", planned: "", spent: "0" });
    };
    const removeCategory = () => {
        setBudget((current) => ({ ...current, categories: current.categories.filter((item) => item.id !== pendingDelete.id) }));
        setPendingDelete(null);
    };
    const allocation = Number(budget.income) ? Math.max(0, Math.min(100, totals.planned / Number(budget.income) * 100)) : 0;
    const remaining = Number(budget.income) - totals.spent;

    return <section className={styles.monthlyBudgetPlanner} id="workspace">
        <div className={styles.hero}><div><p className={styles.period}>A PLAN FOR THIS MONTH</p><h1>Give each rupee<br /><span>a place to go.</span></h1><p className={styles.description}>Make a plan before the month begins. Adjust it as real life happens.</p></div><label className={styles.incomeInput}><span>Monthly take-home</span><div><span>₹</span><input type="number" min="0" value={budget.income} onChange={(event) => setBudget((current) => ({ ...current, income: Math.max(0, Number(event.target.value)) }))} aria-label="Monthly take-home income" /></div></label></div>

        <div className={styles.summaryGrid}>
            <article className={styles.mainSummary}><span>Still available</span><strong>{money(remaining)}</strong><small>After {money(totals.spent)} in recorded spending</small></article>
            <article><span>Income</span><strong>{money(budget.income)}</strong><small>Monthly take-home</small></article>
            <article><span>Assigned</span><strong>{money(totals.planned)}</strong><small>{Math.round(allocation)}% of income</small></article>
            <article><span>Spent so far</span><strong>{money(totals.spent)}</strong><small>Across {budget.categories.length} envelopes</small></article>
        </div>

        <div className={styles.plannerGrid}>
            <section className={styles.envelopePanel} id="envelopes">
                <div className={styles.panelHeading}><div><h2>Your envelopes</h2><p>Set a plan, then keep actual spending up to date.</p></div><span>{budget.categories.length} categories</span></div>
                <div className={styles.tableHeader}><span>Category</span><span>Planned</span><span>Spent</span><span>Left</span><span></span></div>
                <div className={styles.envelopeList}>{budget.categories.map((item) => {
                    const Icon = icons[item.icon] || FiShoppingBag;
                    const left = Number(item.planned) - Number(item.spent);
                    const pct = Number(item.planned) ? Math.min(100, Number(item.spent) / Number(item.planned) * 100) : 0;
                    const over = Number(item.spent) > Number(item.planned);
                    return <article className={styles.envelopeRow} key={item.id}>
                        <span className={styles.categoryIcon}><Icon aria-hidden="true" /></span><div className={styles.categoryName}><strong>{item.name}</strong><span>{over ? money(Math.abs(left)) + " over plan" : Math.round(pct) + "% used"}</span><div className={over ? styles.overBar : styles.bar}><i style={{ width: Math.max(0, pct) + "%" }} /></div></div>
                        <label className={styles.amountField}><span className={styles.mobileLabel}>Plan</span><span>₹</span><input aria-label={item.name + " planned amount"} type="number" min="0" value={item.planned} onChange={(event) => updateCategory(item.id, "planned", event.target.value)} /></label>
                        <label className={styles.amountField}><span className={styles.mobileLabel}>Spent</span><span>₹</span><input aria-label={item.name + " spent amount"} type="number" min="0" value={item.spent} onChange={(event) => updateCategory(item.id, "spent", event.target.value)} /></label>
                        <strong className={over ? styles.overValue : styles.leftValue}>{left < 0 ? "−" : ""}{money(Math.abs(left))}</strong>
                        <button type="button" className={styles.deleteButton} aria-label={"Remove " + item.name + " envelope"} onClick={() => setPendingDelete(item)}><FiTrash2 aria-hidden="true" /></button>
                    </article>;
                })}</div>
                <form className={styles.addForm} id="add" onSubmit={addCategory}><div><h3>Add an envelope</h3><p>Give another expense a home.</p></div><label>Name<input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="e.g. Pet care" /></label><label>Planned<input type="number" min="0" value={draft.planned} onChange={(event) => setDraft({ ...draft, planned: event.target.value })} placeholder="0" /></label><label>Spent<input type="number" min="0" value={draft.spent} onChange={(event) => setDraft({ ...draft, spent: event.target.value })} /></label><button type="submit"><FiPlus aria-hidden="true" /> Add</button></form>
            </section>

            <aside className={styles.sideColumn}>
                <section className={styles.allocationCard}><p className={styles.cardLabel}>MONTHLY PLAN</p><h2>Every rupee<br />has a job.</h2><div className={styles.wheelRow}><div className={styles.wheel} style={{ background: "conic-gradient(var(--accent) " + allocation * 3.6 + "deg, #e9e6d8 0deg)" }} role="img" aria-label={Math.round(allocation) + " percent of income assigned"}><span>{Math.round(allocation)}<small>%</small></span></div><div className={styles.wheelLegend}><span><i /> Assigned <strong>{money(totals.planned)}</strong></span><span><i /> Unassigned <strong>{money(totals.unassigned)}</strong></span></div></div><p className={totals.unassigned < 0 ? styles.shortfall : styles.availableNote}>{totals.unassigned < 0 ? "Your plan is " + money(Math.abs(totals.unassigned)) + " over your income." : "You still have " + money(totals.unassigned) + " to assign."}</p></section>
                <section className={styles.tipCard}><span className={styles.tipMark}>01</span><div><h3>Make room for real life</h3><p>Planned amounts can change. Update the spent column as the month unfolds and use the remaining figures to guide your next decision.</p></div></section>
            </aside>
        </div>
        {pendingDelete && <ConfirmDialog title="Remove this envelope?" description={'"' + pendingDelete.name + '" and its budget figures will be removed.'} confirmLabel="Remove envelope" onCancel={() => setPendingDelete(null)} onConfirm={removeCategory} />}
    </section>;
};
export default MonthlyBudgetPlanner;