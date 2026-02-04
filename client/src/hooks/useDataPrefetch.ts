import { useEffect } from "react";
import { trpc } from "@/lib/trpc";

/**
 * Hook to prefetch and cache commonly used data
 * This prevents loading delays when switching between sections
 */
export function useDataPrefetch() {
  const utils = trpc.useUtils();

  useEffect(() => {
    // Prefetch commonly used data on app load
    const prefetchData = async () => {
      try {
        // Prefetch panels data (used in multiple sections)
        await utils.panels.list.prefetch({
          timePeriod: "today",
          timezone: localStorage.getItem("appTimezone") || "GMT+5:30"
        });

        // Prefetch bank accounts data (used in multiple sections)
        await utils.bankAccounts.list.prefetch({
          timePeriod: "today",
          timezone: localStorage.getItem("appTimezone") || "GMT+5:30"
        });

        // Prefetch players data (used in search and quick actions)
        await utils.players.list.prefetch();

        // Prefetch dashboard overview
        await utils.dashboard.overview.prefetch();

        console.log("🚀 Data prefetched successfully - sections will load instantly!");
      } catch (error) {
        console.warn("⚠️ Failed to prefetch data:", error);
      }
    };

    // Prefetch data immediately
    prefetchData();

    // Also prefetch when user logs in or timezone changes
    const handleStorageChange = () => {
      prefetchData();
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [utils]);

  return null;
}

/**
 * Hook to invalidate and refetch data when mutations occur
 * This ensures data stays fresh across all sections
 */
export function useDataInvalidation() {
  const utils = trpc.useUtils();

  const invalidateAllData = () => {
    // Invalidate all commonly used queries
    utils.panels.list.invalidate();
    utils.bankAccounts.list.invalidate();
    utils.players.list.invalidate();
    utils.dashboard.overview.invalidate();
    utils.deposits.list.invalidate();
    utils.withdrawals.list.invalidate();
  };

  const invalidatePanels = () => {
    utils.panels.list.invalidate();
    utils.dashboard.overview.invalidate();
  };

  const invalidateBankAccounts = () => {
    utils.bankAccounts.list.invalidate();
    utils.dashboard.overview.invalidate();
  };

  const invalidateTransactions = () => {
    utils.deposits.list.invalidate();
    utils.withdrawals.list.invalidate();
    utils.panels.list.invalidate();
    utils.bankAccounts.list.invalidate();
  };

  return {
    invalidateAllData,
    invalidatePanels,
    invalidateBankAccounts,
    invalidateTransactions,
  };
}
