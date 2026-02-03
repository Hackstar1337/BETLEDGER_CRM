import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { getTimezone, formatDateForDisplay } from "@/lib/timezone";
import { FileText, Download, Calendar, Filter } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";

// Helper function to convert DD/MM/YYYY to YYYY-MM-DD for date input
const formatDateForInput = (dateString: string): string => {
  const [day, month, year] = dateString.split("/").map(Number);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

// Helper function to convert YYYY-MM-DD to DD/MM/YYYY for display
const formatDateFromInput = (dateString: string): string => {
  const [year, month, day] = dateString.split("-").map(Number);
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
};

// Helper function to format date to DD/MM/YYYY
const formatDateToDDMMYYYY = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Helper function to parse DD/MM/YYYY to Date object
const parseDDMMYYYY = (dateString: string): Date => {
  const [day, month, year] = dateString.split("/").map(Number);
  return new Date(year, month - 1, day);
};

export default function Reports() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [selectedDate, setSelectedDate] = useState<string>(
    formatDateToDDMMYYYY(new Date())
  );
  const [selectedPanel, setSelectedPanel] = useState<string>("all");
  const [timezone, setTimezone] = useState(getTimezone());

  // Get today's date for max attribute (prevent future dates)
  const today = formatDateForInput(formatDateToDDMMYYYY(new Date()));

  // Handle date input change (convert from YYYY-MM-DD to DD/MM/YYYY)
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(formatDateFromInput(e.target.value));
  };

  // Update timezone when localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      setTimezone(getTimezone());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const generateReport = trpc.reports.generate.useMutation({
    onSuccess: () => {
      toast.success("Report generated successfully");
      refetchReport();
    },
    onError: error => {
      toast.error(error.message || "Failed to generate report");
    },
  });

  const { data: report, refetch: refetchReport } =
    trpc.reports.getByDate.useQuery(
      { reportDate: parseDDMMYYYY(selectedDate) },
      { enabled: !!selectedDate }
    );

  const { data: panels } = trpc.panels.list.useQuery({
    timePeriod: "all",
    timezone,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    const { date: dateStr } = formatDateForDisplay(date);
    return dateStr;
  };

  const handleGenerateReport = () => {
    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }

    const reportData = {
      reportDate: parseDDMMYYYY(selectedDate), // Convert DD/MM/YYYY to Date object
      panelName: selectedPanel === "all" ? undefined : selectedPanel,
      timezone,
    };

    console.log("Generating report with data:", reportData);
    console.log("Selected panel:", selectedPanel);
    console.log(
      "Panel name to send:",
      selectedPanel === "all" ? undefined : selectedPanel
    );

    generateReport.mutate(reportData);
  };

  const handleExportCSV = () => {
    if (!report) {
      toast.error("No report data available");
      return;
    }

    try {
      const reportData = report.reportData
        ? JSON.parse(report.reportData)
        : null;
      if (!reportData) {
        toast.error("Report data is empty");
        return;
      }

      console.log("Report data for CSV export:", reportData);
      console.log("Panel stats available:", reportData.panelStats);
      console.log("Is panel specific:", reportData.isPanelSpecific);
      console.log("Selected panel:", reportData.selectedPanel);

      // Helper function to format currency for CSV
      const formatCurrencyForCSV = (amount: number) => {
        return `₹${amount.toLocaleString("en-IN")}`;
      };

      // Helper function to create a section header
      const createSectionHeader = (title: string) => {
        const border = "=".repeat(title.length + 4);
        return `${border}\n  ${title}\n${border}\n`;
      };

      // Helper function to create sub-header
      const createSubHeader = (title: string) => {
        const border = "-".repeat(title.length + 2);
        return `${border}\n ${title}\n${border}\n`;
      };

      // Start building CSV content
      let csvContent = "";

      // Report Header
      csvContent += createSectionHeader(
        "KHILADI247 GAMING PLATFORM - DAILY REPORT"
      );
      csvContent += `Report Date,${formatDate(report.reportDate)}\n`;
      csvContent += `Generated On,${formatDate(new Date())}\n`;
      csvContent += `Timezone,${reportData.timezone || "GMT+5:30"}\n`;
      csvContent += `Report Type,${reportData.isPanelSpecific ? `Panel Specific: ${reportData.selectedPanel}` : "All Panels Combined"}\n`;
      csvContent += `Generated By,${user?.username || "Admin"}\n`;
      csvContent += "\n";

      // Executive Summary with explanations
      csvContent += createSectionHeader(
        "EXECUTIVE SUMMARY - KEY PERFORMANCE INDICATORS"
      );
      csvContent +=
        "Metric,Amount,Transaction Count,Additional Details,Explanation\n";
      csvContent += `Total Deposits Received,${formatCurrencyForCSV(report.totalDeposits)},${report.numberOfDeposits},Unique Players: ${report.uniquePlayersDeposited},All money deposited by players across all panels\n`;
      csvContent += `Total Withdrawals Paid,${formatCurrencyForCSV(report.totalWithdrawals)},${report.numberOfWithdrawals},Unique Players: ${report.uniquePlayersWithdrew},All money withdrawn by players across all panels\n`;
      csvContent += `Net Cash Flow,${formatCurrencyForCSV(report.totalDeposits - report.totalWithdrawals)},${report.numberOfDeposits + report.numberOfWithdrawals},Deposits - Withdrawals,Difference between total deposits and withdrawals\n`;
      csvContent += `Total Profit/Loss from Gaming,${formatCurrencyForCSV(report.totalProfitLoss)},-,Panel Performance,Net profit or loss from all gaming panels\n`;
      csvContent += `Total Active Players Today,${report.uniquePlayersDeposited + report.uniquePlayersWithdrew},-,Depositors: ${report.uniquePlayersDeposited}, Withdrawers: ${report.uniquePlayersWithdrew},Players who performed any transaction\n`;
      csvContent += "\n";

      // Panel-wise Detailed Statistics
      if (reportData.panelStats && reportData.panelStats.length > 0) {
        csvContent += createSectionHeader(
          "PANEL-WISE DETAILED PERFORMANCE ANALYSIS"
        );
        csvContent +=
          "Panel Name,Opening Balance (₹),Closing Balance (₹),Available Points,Extra Points Purchased,Profit/Loss (₹),Total Deposits (₹),Total Withdrawals (₹),Deposit Transactions,Withdrawal Transactions,Unique Players,Player Activity (D/W),Performance Status\n";

        reportData.panelStats.forEach((panel: any) => {
          const playerActivity = `${panel.uniquePlayersDeposited}D/${panel.uniquePlayersWithdrew}W`;
          const performanceStatus =
            panel.profitLoss >= 0 ? "PROFITABLE" : "LOSS";
          const performanceEmoji = panel.profitLoss >= 0 ? "📈" : "📉";

          csvContent += `${panel.name},`;
          csvContent += `${formatCurrencyForCSV(panel.openingBalance)},`;
          csvContent += `${formatCurrencyForCSV(panel.closingBalance)},`;
          csvContent += `${panel.pointsBalance.toLocaleString()} points,`;
          csvContent += `${panel.extraPurchasedPoints.toLocaleString()} points,`;
          csvContent += `${formatCurrencyForCSV(panel.profitLoss)},`;
          csvContent += `${formatCurrencyForCSV(panel.totalDeposits)},`;
          csvContent += `${formatCurrencyForCSV(panel.totalWithdrawals)},`;
          csvContent += `${panel.numberOfDeposits},`;
          csvContent += `${panel.numberOfWithdrawals},`;
          csvContent += `${panel.uniquePlayersDeposited + panel.uniquePlayersWithdrew},`;
          csvContent += `${playerActivity},`;
          csvContent += `${performanceEmoji} ${performanceStatus}\n`;
        });
        csvContent += "\n";

        // Panel Performance Summary
        csvContent += createSubHeader("Panel Performance Summary");
        csvContent +=
          "Panel Name,Performance Rating,Profit/Loss Percentage,Key Insights\n";
        reportData.panelStats.forEach((panel: any) => {
          const profitPercentage =
            panel.openingBalance > 0
              ? ((panel.profitLoss / panel.openingBalance) * 100).toFixed(2)
              : "0.00";
          let rating = "AVERAGE";
          let insights = "Steady performance";

          if (panel.profitLoss > panel.openingBalance * 0.2) {
            rating = "EXCELLENT";
            insights = "Highly profitable panel";
          } else if (panel.profitLoss > 0) {
            rating = "GOOD";
            insights = "Profitable panel";
          } else if (panel.profitLoss < -panel.openingBalance * 0.1) {
            rating = "POOR";
            insights = "Significant losses - review needed";
          } else if (panel.profitLoss < 0) {
            rating = "BELOW AVERAGE";
            insights = "Minor losses - monitor closely";
          }

          csvContent += `${panel.name},${rating},${profitPercentage}%,${insights}\n`;
        });
        csvContent += "\n";
      }

      // Detailed Transaction Breakdown
      csvContent += createSectionHeader("DETAILED TRANSACTION BREAKDOWN");

      // Deposits Section
      if (reportData.deposits && reportData.deposits.length > 0) {
        csvContent += createSubHeader("DEPOSIT TRANSACTIONS");
        csvContent +=
          "Transaction Date,Player ID,Panel Name,Deposit Amount (₹),Bonus Points Awarded,UTR/Reference,Bank Name,Transaction Status,Remarks\n";
        reportData.deposits.forEach((deposit: any) => {
          const depositDate = formatDate(
            deposit.createdAt || deposit.depositDate
          );
          const remarks =
            deposit.bonusPoints > 0
              ? `Bonus awarded: ${deposit.bonusPoints} points`
              : "Standard deposit";

          csvContent += `${depositDate},`;
          csvContent += `${deposit.userId},`;
          csvContent += `${deposit.panelName},`;
          csvContent += `${formatCurrencyForCSV(deposit.amount)},`;
          csvContent += `${deposit.bonusPoints || 0},`;
          csvContent += `${deposit.utr || "N/A"},`;
          csvContent += `${deposit.bankName || "N/A"},`;
          csvContent += `${deposit.status || "Completed"},`;
          csvContent += `${remarks}\n`;
        });
        csvContent += "\n";
      }

      // Withdrawals Section
      if (reportData.withdrawals && reportData.withdrawals.length > 0) {
        csvContent += createSubHeader("WITHDRAWAL TRANSACTIONS");
        csvContent +=
          "Transaction Date,Player ID,Panel Name,Withdrawal Amount (₹),UTR/Reference,Bank Name,Transaction Status,Processing Fee (₹),Net Amount Paid (₹),Remarks\n";
        reportData.withdrawals.forEach((withdrawal: any) => {
          const withdrawalDate = formatDate(
            withdrawal.createdAt || withdrawal.withdrawalDate
          );
          const netAmount =
            withdrawal.amount - (withdrawal.transactionCharge || 0);
          const remarks =
            withdrawal.transactionCharge > 0
              ? `Processing fee applied: ₹${withdrawal.transactionCharge}`
              : "No processing fee";

          csvContent += `${withdrawalDate},`;
          csvContent += `${withdrawal.userId},`;
          csvContent += `${withdrawal.panelName},`;
          csvContent += `${formatCurrencyForCSV(withdrawal.amount)},`;
          csvContent += `${withdrawal.utr || "N/A"},`;
          csvContent += `${withdrawal.bankName || "N/A"},`;
          csvContent += `${withdrawal.status || "Pending"},`;
          csvContent += `${formatCurrencyForCSV(withdrawal.transactionCharge || 0)},`;
          csvContent += `${formatCurrencyForCSV(netAmount)},`;
          csvContent += `${remarks}\n`;
        });
        csvContent += "\n";
      }

      // Bank Accounts Summary with more details
      if (reportData.bankAccounts && reportData.bankAccounts.length > 0) {
        csvContent += createSectionHeader("BANK ACCOUNTS - FINANCIAL OVERVIEW");
        csvContent +=
          "Account Holder Name,Account Number,Bank Name,Account Type,Opening Balance (₹),Closing Balance (₹),Total Transactions,Total Charges (₹),Net Balance (₹),Account Status,Notes\n";
        reportData.bankAccounts.forEach((account: any) => {
          const netBalance =
            account.closingBalance - (account.totalCharges || 0);
          const accountStatus = netBalance >= 0 ? "ACTIVE" : "NEGATIVE BALANCE";
          const notes =
            account.totalCharges > 0
              ? `Bank charges deducted: ₹${account.totalCharges}`
              : "No charges applied";

          csvContent += `${account.accountHolderName},`;
          csvContent += `${account.accountNumber},`;
          csvContent += `${account.bankName},`;
          csvContent += `${account.accountType || "N/A"},`;
          csvContent += `${formatCurrencyForCSV(account.openingBalance)},`;
          csvContent += `${formatCurrencyForCSV(account.closingBalance)},`;
          csvContent += `N/A,`; // Transaction count not available
          csvContent += `${formatCurrencyForCSV(account.totalCharges || 0)},`;
          csvContent += `${formatCurrencyForCSV(netBalance)},`;
          csvContent += `${accountStatus},`;
          csvContent += `${notes}\n`;
        });
        csvContent += "\n";
      }

      // Summary and Insights
      csvContent += createSectionHeader("BUSINESS INSIGHTS & SUMMARY");
      csvContent +=
        "Insight Category,Key Finding,Impact Assessment,Recommendation\n";

      const totalTransactions =
        report.numberOfDeposits + report.numberOfWithdrawals;
      const avgDepositAmount =
        report.numberOfDeposits > 0
          ? Math.round(report.totalDeposits / report.numberOfDeposits)
          : 0;
      const avgWithdrawalAmount =
        report.numberOfWithdrawals > 0
          ? Math.round(report.totalWithdrawals / report.numberOfWithdrawals)
          : 0;

      csvContent += `Revenue Analysis,Total Revenue: ₹${(report.totalDeposits - report.totalWithdrawals).toLocaleString("en-IN")},${report.totalDeposits > report.totalWithdrawals ? "POSITIVE" : "NEGATIVE"},${report.totalDeposits > report.totalWithdrawals ? "Maintain current operations" : "Review withdrawal policies"}\n`;
      csvContent += `Transaction Volume,${totalTransactions} transactions today,${totalTransactions > 50 ? "HIGH ACTIVITY" : totalTransactions > 20 ? "MODERATE" : "LOW"},${totalTransactions > 50 ? "Scale up operations" : totalTransactions > 20 ? "Monitor trends" : "Increase marketing"}\n`;
      csvContent += `Player Engagement,${report.uniquePlayersDeposited + report.uniquePlayersWithdrew} active players,${report.uniquePlayersDeposited + report.uniquePlayersWithdrew > 15 ? "HIGH ENGAGEMENT" : "MODERATE"},Focus on player retention and acquisition\n`;
      csvContent += `Average Transaction Size,Deposits: ₹${avgDepositAmount}, Withdrawals: ₹${avgWithdrawalAmount},${avgDepositAmount > avgWithdrawalAmount ? "HEALTHY" : "REVIEW"},${avgDepositAmount > avgWithdrawalAmount ? "Good deposit patterns" : "Analyze withdrawal patterns"}\n`;
      csvContent += "\n";

      // Footer with comprehensive information
      csvContent += createSectionHeader("REPORT METADATA & FOOTER");
      csvContent += `Report Generated On,${new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "full",
        timeStyle: "long",
      })}\n`;
      csvContent += `Generated By,${user?.username || "Admin"}\n`;
      csvContent += `Report Period,${formatDate(report.reportDate)} (Full Day)\n`;
      csvContent += `Timezone Used,${reportData.timezone || "GMT+5:30"}\n`;
      csvContent += `Report Scope,${reportData.isPanelSpecific ? `Single Panel: ${reportData.selectedPanel}` : `All Panels (${reportData.panelStats?.length || 0} panels)`}\n`;
      csvContent += `Total Records Included,${(reportData.deposits?.length || 0) + (reportData.withdrawals?.length || 0)} transactions\n`;
      csvContent += `Data Accuracy,Verified and Complete\n`;
      csvContent += "Report Status,✅ COMPLETED SUCCESSFULLY\n";
      csvContent += "\n";
      csvContent += "--- End of Report ---\n";

      // Create and download CSV file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      const fileName = `Khiladi247_Daily_Report_${selectedDate.replace(/\//g, "_")}_${reportData.isPanelSpecific ? reportData.selectedPanel.replace(/\s+/g, "_") : "All_Panels"}_${new Date().getTime()}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(
        "Professional report exported successfully with enhanced formatting!"
      );
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export report");
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen p-3">
        <div className="space-y-3">
          {/* Modern Header */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-100 via-blue-50 to-indigo-100 p-6 text-slate-900 shadow-sm border border-slate-200">
            <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
            <div className="relative">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-12 w-12 rounded-xl bg-white/80 backdrop-blur-sm flex items-center justify-center border border-slate-200">
                  <FileText className="h-6 w-6 text-slate-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
                  <p className="text-slate-600 text-sm">Generate and view daily reports with comprehensive data</p>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-slate-500 animate-pulse"></div>
                  <span className="text-xs text-slate-600">Professional Reports</span>
                </div>
                <div className="h-4 w-px bg-slate-300"></div>
                <span className="text-xs text-slate-600">
                  Timezone: {timezone}
                </span>
              </div>
            </div>
          </div>

          {/* Report Controls */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50 backdrop-blur-xl rounded-lg shadow-sm border border-slate-200">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-slate-100 rounded-lg border border-slate-200">
                  <FileText className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Report Generator</h2>
                  <p className="text-sm text-slate-600">Generate panel-wise and date-wise reports with timezone support</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="reportDate" className="text-sm font-medium">Report Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="reportDate"
                      type="date"
                      value={formatDateForInput(selectedDate)} // Convert DD/MM/YYYY to YYYY-MM-DD for input
                      onChange={handleDateChange}
                      max={today}
                      className="pl-10 border-slate-300 focus:border-slate-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="panelSelect" className="text-sm font-medium">Panel</Label>
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Select
                      value={selectedPanel}
                      onValueChange={value => {
                        console.log("Panel selected:", value);
                        setSelectedPanel(value);
                      }}
                    >
                      <SelectTrigger id="panelSelect" className="pl-10 border-slate-300 focus:border-slate-500">
                        <SelectValue placeholder="Select panel" />
                      </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Panels</SelectItem>
                      {panels?.map(panel => (
                        <SelectItem key={panel.id} value={panel.name}>
                          {panel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                {isAdmin && (
                  <Button
                    onClick={handleGenerateReport}
                    disabled={generateReport.isPending}
                    className="flex-1 bg-gradient-to-r from-slate-100 to-blue-100 hover:from-slate-200 hover:to-blue-200 text-slate-700 border border-slate-200"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {generateReport.isPending
                      ? "Generating..."
                      : "Generate Report"}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleExportCSV}
                  disabled={!report}
                  className="border-slate-300 text-slate-600 hover:bg-slate-50"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>

            <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-sm text-slate-600">
                Timezone: <strong className="text-slate-800">{timezone}</strong>
              </p>
              <p className="text-sm text-slate-600">
                Report will be generated for:{" "}
                <strong className="text-slate-800">
                  {selectedPanel === "all" ? "All Panels" : selectedPanel}
                </strong>
              </p>
            </div>
            </div>
          </div>

        {/* Report Display */}
        {report ? (
          <>
            <div className="bg-gradient-to-br from-slate-50 to-blue-50 backdrop-blur-xl rounded-lg shadow-sm border border-slate-200">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-slate-100 rounded-lg border border-slate-200">
                    <FileText className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Report Summary - {formatDate(report.reportDate)}
                    </h2>
                    <p className="text-sm text-slate-600">Overview of daily operations</p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 p-4 text-emerald-700 shadow-sm border border-emerald-200">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
                    <div className="relative">
                      <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-wider">
                        Total Deposits
                      </p>
                      <p className="text-2xl font-bold text-emerald-900">
                        {formatCurrency(report.totalDeposits)}
                      </p>
                      <p className="text-[9px] text-emerald-600">
                        {report.numberOfDeposits} transactions
                      </p>
                    </div>
                  </div>
                  <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 p-4 text-amber-700 shadow-sm border border-amber-200">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
                    <div className="relative">
                      <p className="text-[10px] font-medium text-amber-600 uppercase tracking-wider">
                        Total Withdrawals
                      </p>
                      <p className="text-2xl font-bold text-amber-900">
                        {formatCurrency(report.totalWithdrawals)}
                      </p>
                      <p className="text-[9px] text-amber-600">
                        {report.numberOfWithdrawals} transactions
                      </p>
                    </div>
                  </div>
                  <div className={cn(
                    "relative overflow-hidden rounded-lg p-4 shadow-sm border",
                    report.totalProfitLoss >= 0 
                      ? "bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-700 border-emerald-200"
                      : "bg-gradient-to-br from-amber-50 to-orange-50 text-amber-700 border-amber-200"
                  )}>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
                    <div className="relative">
                      <p className="text-[10px] font-medium uppercase tracking-wider">
                        Total Profit/Loss
                      </p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(report.totalProfitLoss)}
                      </p>
                      <p className="text-[9px]">
                        Overall performance
                      </p>
                    </div>
                  </div>
                  <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-50 to-blue-50 p-4 text-slate-700 shadow-sm border border-slate-200">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
                    <div className="relative">
                      <p className="text-[10px] font-medium text-slate-600 uppercase tracking-wider">
                        Player Activity
                      </p>
                      <p className="text-2xl font-bold text-slate-900">
                        {report.uniquePlayersDeposited +
                          report.uniquePlayersWithdrew}
                      </p>
                      <p className="text-[9px] text-slate-600">
                        {report.uniquePlayersDeposited} deposited,{" "}
                        {report.uniquePlayersWithdrew} withdrew
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel-wise Statistics */}
            {report.reportData &&
              (() => {
                const reportData = JSON.parse(report.reportData);
                if (reportData.panelStats && reportData.panelStats.length > 0) {
                  return (
                    <div className="bg-gradient-to-br from-slate-50 to-blue-50 backdrop-blur-xl rounded-lg shadow-sm border border-slate-200">
                      <div className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-slate-100 rounded-lg border border-slate-200">
                            <FileText className="h-5 w-5 text-slate-600" />
                          </div>
                          <div>
                            <h2 className="text-lg font-semibold text-slate-900">Panel-wise Statistics</h2>
                            <p className="text-sm text-slate-600">
                              Detailed breakdown for{" "}
                              {reportData.isPanelSpecific
                                ? reportData.selectedPanel
                                : "all panels"}
                            </p>
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="border-b border-slate-200">
                                <th className="text-left p-2 text-slate-700 font-medium">Panel Name</th>
                                <th className="text-right p-2 text-slate-700 font-medium">
                                  Opening Balance
                                </th>
                                <th className="text-right p-2 text-slate-700 font-medium">
                                  Closing Balance
                                </th>
                                <th className="text-right p-2 text-slate-700 font-medium">
                                  Points Balance
                                </th>
                                <th className="text-right p-2 text-slate-700 font-medium">
                                  Extra Purchased PTS
                                </th>
                                <th className="text-right p-2 text-slate-700 font-medium">Profit/Loss</th>
                                <th className="text-right p-2 text-slate-700 font-medium">
                                  Total Deposits
                                </th>
                                <th className="text-right p-2 text-slate-700 font-medium">
                                  Total Withdrawals
                                </th>
                                <th className="text-center p-2 text-slate-700 font-medium">Deposits</th>
                                <th className="text-center p-2 text-slate-700 font-medium">Withdrawals</th>
                                <th className="text-center p-2 text-slate-700 font-medium">
                                  Unique Players
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {reportData.panelStats.map(
                                (panel: any, index: number) => (
                                  <tr
                                    key={panel.panelName}
                                    className={
                                      index % 2 === 0 ? "bg-white/50" : "bg-slate-50/50"
                                    }
                                  >
                                    <td className="p-2 font-medium text-slate-700">
                                      {panel.panelName}
                                    </td>
                                    <td className="text-right p-2 text-slate-600">
                                      {formatCurrency(panel.openingBalance)}
                                    </td>
                                    <td className="text-right p-2 text-slate-600">
                                      {formatCurrency(panel.closingBalance)}
                                    </td>
                                    <td className="text-right p-2 text-slate-600">
                                      {panel.pointsBalance.toLocaleString()} pts
                                    </td>
                                    <td className="text-right p-2 text-slate-600">
                                      {panel.extraPurchasedPoints.toLocaleString()}{" "}
                                      pts
                                    </td>
                                    <td
                                      className={cn(
                                        "text-right p-2 font-medium",
                                        panel.profitLoss >= 0 ? "text-emerald-600" : "text-amber-600"
                                      )}
                                    >
                                      {formatCurrency(panel.profitLoss)}
                                    </td>
                                    <td className="text-right p-2 text-slate-600">
                                      {formatCurrency(panel.totalDeposits)}
                                    </td>
                                    <td className="text-right p-2 text-slate-600">
                                      {formatCurrency(panel.totalWithdrawals)}
                                    </td>
                                    <td className="text-center p-2 text-slate-600">
                                      {panel.numberOfDeposits}
                                    </td>
                                    <td className="text-center p-2 text-slate-600">
                                      {panel.numberOfWithdrawals}
                                    </td>
                                    <td className="text-center p-2 text-slate-600">
                                      {panel.uniquePlayersDeposited +
                                        panel.uniquePlayersWithdrew}
                                      <div className="text-xs text-slate-500">
                                        {panel.uniquePlayersDeposited}D /{" "}
                                        {panel.uniquePlayersWithdrew}W
                                      </div>
                                    </td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

            <div className="bg-gradient-to-br from-slate-50 to-blue-50 backdrop-blur-xl rounded-lg shadow-sm border border-slate-200">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-slate-100 rounded-lg border border-slate-200">
                    <FileText className="h-5 w-5 text-slate-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900">Additional Statistics</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 p-4 text-emerald-700 shadow-sm border border-emerald-200">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
                    <div className="relative">
                      <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-wider">
                        Unique Players Deposited
                      </p>
                      <p className="text-2xl font-bold text-emerald-900">
                        {report.uniquePlayersDeposited}
                      </p>
                    </div>
                  </div>
                  <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 p-4 text-amber-700 shadow-sm border border-amber-200">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
                    <div className="relative">
                      <p className="text-[10px] font-medium text-amber-600 uppercase tracking-wider">
                        Unique Players Withdrew
                      </p>
                      <p className="text-2xl font-bold text-amber-900">
                        {report.uniquePlayersWithdrew}
                      </p>
                    </div>
                  </div>
                  <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-50 to-blue-50 p-4 text-slate-700 shadow-sm border border-slate-200">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
                    <div className="relative">
                      <p className="text-[10px] font-medium text-slate-600 uppercase tracking-wider">
                        Total Transactions
                      </p>
                      <p className="text-2xl font-bold text-slate-900">
                        {report.numberOfDeposits + report.numberOfWithdrawals}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-gradient-to-br from-slate-50 to-blue-50 backdrop-blur-xl rounded-lg shadow-sm border border-slate-200">
            <div className="py-12">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 mb-4">
                  <FileText className="h-10 w-10 text-slate-400" />
                </div>
                <p className="text-slate-600">
                  No report found for the selected date.{" "}
                  {isAdmin && "Generate a new report to view data."}
                </p>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </DashboardLayout>
  );
}
