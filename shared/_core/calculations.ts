/**
 * Centralized calculation formulas for the Casino Management Panel
 * This file contains all business logic calculations used across the application
 */

// ============================================================================
// CURRENCY FORMATTING
// ============================================================================

/**
 * Format amount as Indian Rupees
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format number with Indian locale
 */
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat("en-IN").format(num);
};

// ============================================================================
// PANEL CALCULATIONS
// ============================================================================

/**
 * Calculate expected closing balance for a panel
 * Formula: Opening Balance - Total Deposits + Total Withdrawals
 */
export const calculateExpectedClosing = (panel: {
  openingBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
}): number => {
  return panel.openingBalance - panel.totalDeposits + panel.totalWithdrawals;
};

/**
 * Calculate profit/loss for a panel
 * Formula: Total Deposits - Total Withdrawals
 */
export const calculateProfitLoss = (panel: {
  totalDeposits: number;
  totalWithdrawals: number;
}): number => {
  return panel.totalDeposits - panel.totalWithdrawals;
};

/**
 * Calculate panel utilization rate
 * Formula: (Points Balance / (Opening Balance + Points Balance)) * 100
 */
export const calculateUtilizationRate = (panel: {
  pointsBalance: number;
  openingBalance: number;
}): string => {
  const total = panel.openingBalance + panel.pointsBalance;
  if (total === 0) return "0";
  return ((panel.pointsBalance / total) * 100).toFixed(2);
};

/**
 * Calculate ROI (Return on Investment) percentage
 * Formula: ((Net Balance - Opening Balance) / Opening Balance) * 100
 */
export const calculateROI = (openingBalance: number, netBalance: number): string => {
  if (openingBalance === 0) return "0.00";
  return (((netBalance - openingBalance) / openingBalance) * 100).toFixed(2);
};

/**
 * Calculate net balance after charges
 * Formula: Closing Balance - Total Charges
 */
export const calculateNetBalance = (closingBalance: number, totalCharges: number): number => {
  return closingBalance - totalCharges;
};

/**
 * Determine if panel is profitable
 */
export const isPanelProfitable = (profitLoss: number): boolean => {
  return profitLoss >= 0;
};

// ============================================================================
// BANK ACCOUNT CALCULATIONS
// ============================================================================

/**
 * Calculate bank account performance
 */
export const calculateBankAccountPerformance = (account: {
  openingBalance: number;
  closingBalance: number;
  totalCharges: number;
}) => {
  const netBalance = calculateNetBalance(account.closingBalance, account.totalCharges);
  const isProfit = netBalance > account.openingBalance;
  const isLoss = netBalance < account.openingBalance;
  const profitPercentage = calculateROI(account.openingBalance, netBalance);
  
  return {
    netBalance,
    isProfit,
    isLoss,
    profitPercentage,
    performance: isProfit ? "profitable" : "loss" as "profitable" | "loss",
  };
};

// ============================================================================
// TRANSACTION CALCULATIONS
// ============================================================================

/**
 * Calculate transaction velocity (transactions per hour)
 * Formula: Total Transactions / Hours Elapsed
 */
export const calculateTransactionVelocity = (
  transactionCount: number,
  startTime: Date,
  endTime: Date = new Date()
): string => {
  const hoursElapsed = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
  if (hoursElapsed === 0) return "0";
  return (transactionCount / hoursElapsed).toFixed(2);
};

/**
 * Calculate net cash flow
 * Formula: Total Deposits - Total Withdrawals
 */
export const calculateNetCashFlow = (
  totalDeposits: number,
  totalWithdrawals: number
): number => {
  return totalDeposits - totalWithdrawals;
};

/**
 * Calculate trend percentage compared to previous period
 * Formula: ((Current - Previous) / |Previous|) * 100
 */
export const calculateTrendPercentage = (current: number, previous: number): string => {
  if (previous === 0) return "0";
  return (((current - previous) / Math.abs(previous)) * 100).toFixed(2);
};

// ============================================================================
// TIME AND DATE CALCULATIONS
// ============================================================================

/**
 * Convert timezone string to offset in minutes
 */
export const getTimezoneOffset = (timezone: string): number => {
  const match = timezone.match(/GMT([+-]\d{2}):?(\d{2})/);
  if (!match) return 330; // Default to GMT+5:30
  const [, hours, minutes] = match;
  return parseInt(hours) * 60 + parseInt(minutes);
};

/**
 * Get date range based on time period
 */
export const getDateRange = (timeRange: "1h" | "6h" | "24h" | "7d", timezone: string) => {
  const now = new Date();
  const timezoneOffset = getTimezoneOffset(timezone);
  const localTime = new Date(
    now.getTime() + now.getTimezoneOffset() * 60000 + timezoneOffset * 60000
  );
  
  let startDate: Date;
  
  switch (timeRange) {
    case "1h":
      startDate = new Date(localTime.getTime() - 60 * 60 * 1000);
      break;
    case "6h":
      startDate = new Date(localTime.getTime() - 6 * 60 * 60 * 1000);
      break;
    case "24h":
      startDate = new Date(localTime.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "7d":
      startDate = new Date(localTime.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
  }
  
  // Convert back to UTC for database queries
  const utcStart = new Date(
    startDate.getTime() - timezoneOffset * 60000 - now.getTimezoneOffset() * 60000
  );
  
  return { start: utcStart, end: new Date() };
};

// ============================================================================
// GAMEPLAY CALCULATIONS
// ============================================================================

/**
 * Calculate expected winning amount
 * Formula: Bet Amount * Odds
 */
export const calculateExpectedWinning = (betAmount: number, odds: number): number => {
  return betAmount * odds;
};

/**
 * Calculate profit from winning bet
 * Formula: (Bet Amount * Odds) - Bet Amount
 */
export const calculateBetProfit = (betAmount: number, odds: number): number => {
  return calculateExpectedWinning(betAmount, odds) - betAmount;
};

/**
 * Calculate commission amount
 * Formula: Amount * Commission Rate
 */
export const calculateCommission = (amount: number, commissionRate: number): number => {
  return amount * (commissionRate / 100);
};

// ============================================================================
// ANALYTICS CALCULATIONS
// ============================================================================

/**
 * Calculate active players (unique users)
 */
export const calculateActivePlayers = (
  deposits: Array<{ userId: string }>,
  withdrawals: Array<{ userId: string }>,
  gameplayTransactions: Array<{ userId: string }>
): number => {
  const uniqueUsers = new Set([
    ...deposits.map(d => d.userId),
    ...withdrawals.map(w => w.userId),
    ...gameplayTransactions.map(g => g.userId),
  ]);
  return uniqueUsers.size;
};

/**
 * Calculate average transaction amount
 * Formula: Total Amount / Transaction Count
 */
export const calculateAverageTransaction = (
  totalAmount: number,
  transactionCount: number
): number => {
  return transactionCount === 0 ? 0 : totalAmount / transactionCount;
};

/**
 * Calculate percentage change
 */
export const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

// ============================================================================
// VALIDATION CALCULATIONS
// ============================================================================

/**
 * Validate if calculated closing balance matches expected
 */
export const validateClosingBalance = (panel: {
  openingBalance: number;
  closingBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
}): boolean => {
  const expected = calculateExpectedClosing(panel);
  return Math.abs(panel.closingBalance - expected) < 0.01; // Allow for rounding errors
};

/**
 * Check if balance needs correction
 */
export const needsBalanceCorrection = (panel: {
  openingBalance: number;
  closingBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
}): boolean => {
  return !validateClosingBalance(panel);
};

// ============================================================================
// MISC CALCULATIONS
// ============================================================================

/**
 * Calculate settlement amount
 */
export const calculateSettlement = (balance: number, settlementRate: number = 0.1): number => {
  return balance * settlementRate;
};

/**
 * Calculate bonus points from deposit
 * Formula: Deposit Amount * Bonus Rate
 */
export const calculateBonusPoints = (depositAmount: number, bonusRate: number): number => {
  return Math.floor(depositAmount * bonusRate);
};

/**
 * Round to nearest integer (for points)
 */
export const roundToPoints = (amount: number): number => {
  return Math.round(amount);
};

/**
 * Calculate daily interest rate
 */
export const calculateDailyRate = (annualRate: number): number => {
  return annualRate / 365;
};

// Export all calculations as a single object for easy importing
export const Calculations = {
  // Currency
  formatCurrency,
  formatNumber,
  
  // Panel
  calculateExpectedClosing,
  calculateProfitLoss,
  calculateUtilizationRate,
  calculateROI,
  calculateNetBalance,
  isPanelProfitable,
  
  // Bank Account
  calculateBankAccountPerformance,
  
  // Transaction
  calculateTransactionVelocity,
  calculateNetCashFlow,
  calculateTrendPercentage,
  
  // Time
  getTimezoneOffset,
  getDateRange,
  
  // Gameplay
  calculateExpectedWinning,
  calculateBetProfit,
  calculateCommission,
  
  // Analytics
  calculateActivePlayers,
  calculateAverageTransaction,
  calculatePercentageChange,
  
  // Validation
  validateClosingBalance,
  needsBalanceCorrection,
  
  // Misc
  calculateSettlement,
  calculateBonusPoints,
  roundToPoints,
  calculateDailyRate,
};

export default Calculations;
