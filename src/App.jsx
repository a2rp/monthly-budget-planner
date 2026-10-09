import { useEffect, useState } from "react";
import styles from "./App.module.css";
import SiteHeader from "./components/siteHeader";
import SiteFooter from "./components/siteFooter";
import BackToTop from "./components/backToTop";
import MonthlyBudgetPlanner from "./components/monthlyBudgetPlanner";

const repository = "https://github.com/a2rp/monthly-budget-planner";
const App = () => {
    const [showBackToTop, setShowBackToTop] = useState(false);
    useEffect(() => {
        const onScroll = () => setShowBackToTop(window.scrollY > 50);
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener("scroll", onScroll);
    }, []);
    return <div className={styles["app-shell"]} id="top">
        <SiteHeader title="Good Measure" mark="G" navItems={[["Plan", "#workspace"], ["Envelopes", "#envelopes"], ["Add envelope", "#add"]]} repoUrl={repository} />
        <main className={styles["page-content"]}><MonthlyBudgetPlanner /></main>
        <SiteFooter repoUrl={repository} />
        <BackToTop visible={showBackToTop} />
    </div>;
};
export default App;