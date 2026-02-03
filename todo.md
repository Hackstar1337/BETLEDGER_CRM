# Khiladi247 Management Panel - Project TODO

## Database Schema & Models

- [x] Design and implement panels table (TIGEREXCH, ALLPANEL, ALLPANEL777)
- [x] Design and implement transactions table with UTR tracking
- [x] Design and implement deposits table with bonus points
- [x] Design and implement withdrawals table
- [x] Design and implement bank accounts table
- [x] Design and implement players table for user tracking
- [x] Design and implement daily reports table for historical data
- [x] Push database schema migrations

## Backend tRPC Procedures

- [x] Create panel management procedures (CRUD operations)
- [x] Create transaction ledger procedures with filtering
- [x] Create deposit management procedures with statistics
- [x] Create withdrawal management procedures with statistics
- [x] Create bank account procedures with balance calculations
- [x] Create player reporting procedures
- [x] Create daily report generation procedures
- [x] Create dashboard statistics aggregation procedures
- [ ] Create export procedures for PDF and CSV reports

## Frontend Dashboard & Layout

- [x] Set up DashboardLayout with sidebar navigation
- [x] Configure theme and color palette for financial data
- [x] Create dashboard home page with real-time metrics
- [x] Add charts for profit/loss visualization
- [x] Add panel balance overview cards
- [x] Add bank balance summary widgets

## Panel Management Interface

- [x] Create panel list view with current balances
- [x] Create panel detail view with transaction history
- [x] Add forms for updating panel data
- [x] Add opening/closing balance tracking
- [x] Add settling and extra deposit fields
- [x] Add bonus points tracking
- [x] Add profit/loss calculations

## Transaction Management

- [x] Create transaction ledger page with date filtering
- [x] Add transaction entry forms with UTR validation
- [x] Add search and filter functionality
- [x] Add sorting by date, amount, type
- [ ] Add transaction detail modal
- [ ] Add bulk import functionality

## Deposit Management Module

- [x] Create deposits list page with player statistics
- [x] Add deposit entry form with UTR and bank name
- [x] Add bonus points allocation interface
- [x] Add player deposit statistics (count, unique players)
- [x] Add extra/wrong deposit tracking
- [x] Add deposit filtering by panel and date range

## Withdrawal Management Module

- [x] Create withdrawals list page with statistics
- [x] Add withdrawal entry form with UTR and bank name
- [x] Add player withdrawal statistics (count, unique players)
- [x] Add extra/wrong withdrawal tracking
- [x] Add withdrawal filtering by panel and date range
- [x] Add withdrawal approval workflow

## Bank Account Management

- [x] Create bank accounts list page
- [x] Add bank account detail view with transaction history
- [x] Add opening/closing balance tracking
- [x] Add account charges tracking
- [x] Add final balance calculations
- [x] Add account holder information management

## Player Reporting

- [x] Create player list page with activity tracking
- [x] Add new ID creation tracking
- [ ] Add player transaction history view
- [ ] Add player statistics dashboard
- [ ] Add player search and filtering

## Automated Reporting

- [x] Implement daily report data aggregation
- [ ] Create PDF report generation with all sections
- [x] Create CSV export functionality
- [ ] Add report scheduling interface
- [x] Add report history and download page
- [ ] Add email notification for daily reports

## Role-Based Access Control

- [x] Implement admin role procedures
- [x] Implement user role restrictions
- [x] Add role-based UI component visibility
- [x] Add permission checks on sensitive operations

## Testing & Quality Assurance

- [x] Write unit tests for panel procedures
- [x] Write unit tests for transaction procedures
- [x] Write unit tests for deposit/withdrawal procedures
- [x] Write unit tests for bank account procedures
- [x] Write unit tests for report generation
- [x] Test role-based access control
- [x] Test data validation and error handling

## Final Delivery

- [x] Create comprehensive checkpoint
- [x] Verify all features are working
- [x] Document usage instructions

## Bug Fixes

- [x] Fix reports.getByDate query returning undefined instead of null when no report exists

## Quick Entry Interface

- [x] Add quick deposit entry form on dashboard
- [x] Add quick withdrawal entry form on dashboard
- [x] Add floating action button for quick access
- [ ] Add keyboard shortcuts for faster data entry
- [ ] Add recent entries preview on dashboard

## Player Entry Section

- [x] Create PlayerEntryDialog component with floating action button
- [x] Add player creation form with all required fields
- [x] Add player update/edit functionality
- [x] Add player search and selection for updates
- [x] Integrate PlayerEntryDialog into Players page

## Quick Actions Section

- [x] Create QuickActions page with player list view
- [x] Add quick deposit button next to each player
- [x] Add quick withdrawal button next to each player
- [x] Create inline transaction forms that pre-fill player information
- [x] Add navigation menu item for Quick Actions
- [x] Add route for Quick Actions page

## Navigation Updates

- [x] Rename "Quick Actions" to "Player Entry" in navigation menu

## Player Entry Interface Redesign

- [x] Redesign Player Entry page with table layout
- [x] Add Player Balance column to display current balance
- [x] Add Panel Name column
- [x] Add Deposit and Withdrawal buttons in each row
- [x] Add player balance field to database schema
- [ ] Update backend to track player balances automatically

## Panel Balance Update Feature

- [x] Add edit button to Panels page for each panel
- [x] Create edit dialog for updating opening and closing balances
- [x] Add backend update procedure for panel balances
- [x] Add validation for balance updates

## Quick Balance Update Button

- [x] Add "Update Balance" button next to "Add Panel" button
- [x] Create dialog with panel dropdown selector
- [x] Add opening and closing balance input fields
- [x] Connect to existing update panel procedure

## Bank Account Balance Update Button

- [x] Add "Update Balance" button to Bank Accounts page
- [x] Create dialog with bank account dropdown selector
- [x] Add opening and closing balance input fields
- [x] Connect to bank account update procedure

## Bank Account Edit Button

- [x] Add Edit button to each bank account row in the table
- [x] Create edit dialog with all bank account fields
- [x] Pre-fill form with current bank account data
- [x] Connect to bank account update procedure

## Extra/Wrong Transactions Section

- [x] Create ExtraWrongTransactions page with separate tabs for deposits and withdrawals
- [x] Add filtering to show only extra/wrong deposits
- [x] Add filtering to show only extra/wrong withdrawals
- [x] Display user ID, amount, UTR, bank name, and panel name
- [x] Add navigation menu item for Extra/Wrong Transactions
- [x] Add route for Extra/Wrong Transactions page

## Extra/Wrong Transaction Entry Forms

- [x] Add "Add Extra Deposit" button to Extra/Wrong page
- [x] Add "Add Wrong Deposit" button to Extra/Wrong page
- [x] Add "Add Extra Withdrawal" button to Extra/Wrong page
- [x] Add "Add Wrong Withdrawal" button to Extra/Wrong page
- [x] Create entry form with fields: User ID, Amount, UTR, Bank Name, Panel
- [x] Connect forms to deposits.create and withdrawals.create procedures with flags

## Bug Fixes - Extra/Wrong Section

- [x] Consolidate Extra/Wrong Deposit buttons into one "Add Deposit" button with type selector
- [x] Consolidate Extra/Wrong Withdrawal buttons into one "Add Withdrawal" button with type selector
- [x] Fix player dropdown to show only User ID (remove name field)
- [x] Ensure consistent display of User ID and Panel Name only

## Bug Fixes - Panel Name Display

- [x] Replace hardcoded panel names with dynamic loading from database
- [x] Update all dropdowns to fetch panel names from panels table
- [x] Ensure panel dropdowns are empty when no panels exist

## Remove All Hardcoded Data - Make Everything Dynamic

- [x] Audit and fix Deposits page - load panels dynamically
- [x] Audit and fix Withdrawals page - load panels dynamically
- [x] Audit and fix Transactions page - load panels dynamically
- [x] Audit and fix Player Entry (QuickActions) page - load panels dynamically
- [x] Audit and fix all bank name references - load from database
- [x] Verify all dropdowns use dynamic data from database
- [x] Remove any remaining hardcoded panel names, user IDs, or bank names

## Select and Delete Functionality

- [x] Add delete procedure for panels in backend
- [x] Add delete procedure for players in backend
- [x] Add delete procedure for bank accounts in backend
- [x] Add select checkboxes to Panels table
- [x] Add bulk delete button to Panels page
- [x] Add select checkboxes to Players table
- [x] Add bulk delete button to Players page
- [x] Add select checkboxes to Bank Accounts table
- [x] Add bulk delete button to Bank Accounts page
- [x] Add confirmation dialogs for delete operations

## Complete Panel Information Display

- [x] Review current Panels page to identify missing fields
- [x] Ensure Panel Name is displayed
- [x] Ensure Opening Balance is displayed
- [x] Ensure Closing Balance is displayed
- [x] Ensure Settling is displayed
- [x] Ensure Extra Dep is displayed
- [x] Ensure Bonus Pt is displayed
- [x] Ensure Pt. Profit/Loss is displayed
- [x] Add Deposit column (total deposits for panel)
- [x] Add Withdrawal column (total withdrawals for panel)
- [x] Add Profit/Loss column (calculated from all transactions)
- [x] Update backend to calculate deposit and withdrawal totals per panel
- [x] Update UI table to display all required columns

## Today's Players Report Section

- [x] Create backend procedure to count today's deposits
- [x] Create backend procedure to count unique players who deposited today
- [x] Create backend procedure to count today's withdrawals
- [x] Create backend procedure to count unique players who withdrew today
- [x] Create backend procedure to count new IDs created today
- [x] Create TodaysPlayersReport page component
- [x] Display all five metrics with card layout
- [x] Add navigation menu item for Today's Players Report
- [x] Add route for the new page
- [x] Test all metrics with real database data

## Automatic Player Balance Updates

- [x] Update createDeposit to automatically increase player balance
- [x] Update createWithdrawal to automatically decrease player balance
- [x] Ensure player balance updates are atomic with transaction creation
- [x] Test balance updates with multiple deposits
- [x] Test balance updates with multiple withdrawals
- [x] Test balance updates with mixed transactions

## Initial Deposit on Player Creation

- [x] Add opening balance field to player creation form (optional)
- [x] Add UTR number field to player creation form (optional)
- [x] Add bank name field to player creation form (optional)
- [x] Update backend to create deposit record when opening balance is provided
- [x] Ensure deposit is only created if balance amount is greater than 0
- [x] Test player creation with initial deposit
- [x] Test player creation without initial deposit
- [x] Verify player balance updates correctly with initial deposit

## Bug Fix: Player Creation Error

- [x] Investigate database insertion failure for players table
- [x] Check for duplicate userId constraint violations
- [x] Verify database schema matches expected structure
- [x] Fix createPlayer function if needed
- [x] Test player creation with various inputs

## Dynamic Panel Sections in Side Menu

- [x] Create PanelDetail page component that accepts panel name as parameter
- [x] Filter and display only players assigned to the selected panel
- [x] Add deposit dialog functionality to panel pages
- [x] Add withdrawal dialog functionality to panel pages
- [x] Update DashboardLayout to fetch all panels from database
- [x] Dynamically generate side menu items for each panel
- [x] Add dynamic routes for /panel/:panelName
- [x] Test panel pages with different panels
- [x] Verify deposit/withdrawal works correctly from panel pages
- [x] Ensure menu updates when new panels are created

## Player Search Feature

- [x] Replace Quick Actions page with Player Search page
- [x] Add search input field for User ID or name
- [x] Implement real-time search filtering
- [x] Display search results in a clear table format
- [x] Add Deposit button to each search result row
- [x] Add Withdrawal button to each search result row
- [x] Create deposit dialog that opens with player pre-selected
- [x] Create withdrawal dialog that opens with player pre-selected
- [x] Update navigation menu label from "Player Entry" to "Player Search"
- [x] Test search functionality with various queries
- [x] Verify deposit/withdrawal works from search results

## Panel Player Search

- [x] Add search input field to PanelDetail page
- [x] Implement real-time filtering for players within the panel
- [x] Show filtered player count
- [x] Test search functionality on panel pages

## Clickable Player Rows in Panel Pages

- [x] Make player table rows clickable in PanelDetail page
- [x] Show transaction options dialog when player row is clicked
- [x] Display Deposit and Withdrawal buttons in the dialog
- [x] Test clickable rows and transaction flow

## Search Highlighting and Display Improvements

- [x] Add text highlighting for search matches in Player Search page
- [x] Add text highlighting for search matches in Panel Detail pages
- [x] Show all players by default in Player Search (before typing)
- [x] Verify Deposits page displays all deposit transaction data
- [x] Verify Withdrawals page displays all withdrawal transaction data
- [x] Test highlighting with various search queries

## Comprehensive Transactions View

- [x] Update Transactions page to fetch both deposits and withdrawals
- [x] Combine deposits and withdrawals into a single sorted list
- [x] Display transaction type (Deposit/Withdrawal) clearly
- [x] Show all transaction fields: Date, Type, User ID, Amount, UTR, Bank, Panel
- [x] Add sorting by date (newest first)
- [x] Test with mixed deposit and withdrawal data

## Clickable Player Rows in Player Search

- [x] Make player table rows clickable in Player Search page
- [x] Show Player Actions dialog when player row is clicked
- [x] Reuse the same PlayerActionDialog component from panel pages
- [x] Keep the existing Deposit/Withdrawal buttons in table for quick access
- [x] Test clickable rows and transaction flow in Player Search

## Duplicate Validation

- [x] Add duplicate UTR number validation to deposit creation
- [x] Add duplicate UTR number validation to withdrawal creation
- [x] Add duplicate player name validation to player creation
- [x] Show clear error messages when duplicates are detected
- [x] Test duplicate UTR validation with deposits
- [x] Test duplicate UTR validation with withdrawals
- [x] Test duplicate player name validation

## Withdrawal Payment Methods and Transaction Fees

- [x] Add payment method enum (IMPS, RTGS, NEFT, UPI, PhonePe, Google Pay, Paytm)
- [x] Add fee configuration fields to bank accounts table (fees per payment method)
- [x] Add paymentMethod and transactionCharge fields to withdrawals table
- [x] Create bank account fee configuration UI
- [ ] Update withdrawal forms to include payment method dropdown
- [ ] Implement automatic charge calculation based on selected bank and payment method
- [ ] Display calculated charge before withdrawal submission
- [ ] Create backend procedure to calculate daily total charges
- [ ] Create backend procedure to calculate monthly total charges
- [ ] Create Charges Report page showing daily and monthly totals
- [ ] Add charge breakdown by payment method
- [ ] Add charge breakdown by bank account
- [ ] Test fee calculation with different payment methods
- [ ] Test daily and monthly charge calculations

## Bank Account and Payment Method Selection in Forms

- [x] Update withdrawal forms to show bank account dropdown (from Bank Accounts table)
- [x] Add payment method dropdown that appears after bank account selection
- [x] Filter payment methods to show only those configured for selected bank account
- [x] Implement automatic charge calculation when payment method is selected
- [x] Display calculated charge prominently before withdrawal submission
- [x] Update deposit forms to include bank account dropdown
- [x] Update backend createWithdrawal to accept and store payment method and charge
- [ ] Update backend to accumulate charges to bank account's totalCharges field
- [x] Test withdrawal with different bank accounts and payment methods
- [x] Test charge calculation accuracy

## Automatic Bank Account Balance Updates

- [x] Update createDeposit to automatically increase bank account closing balance
- [x] Update createWithdrawal to automatically decrease bank account closing balance
- [x] Update createWithdrawal to accumulate transaction charges to bank account's totalCharges
- [x] Ensure bank account updates are atomic with transaction creation
- [x] Test bank account balance updates with deposits
- [x] Test bank account balance updates with withdrawals
- [x] Test transaction charge accumulation

## Clear All Records Feature

- [x] Create backend procedure to delete all records from all tables
- [x] Add Clear All Records button to Dashboard page
- [x] Add confirmation dialog with warning message
- [x] Test clearing all records

## Bank Account Dropdown in Player Creation

- [x] Update PlayerEntryDialog to fetch bank accounts list
- [x] Replace bank name text input with dropdown
- [x] Test player creation with bank account selection

## Bank Account Type Tagging System

- [x] Add accountType field to bankAccounts table (enum: "Deposit" or "Withdrawal")
- [x] Update database schema and push migration
- [x] Update bank account creation form to include account type selection
- [x] Update bank account edit form to allow changing account type
- [x] Display account type in bank accounts list table
- [x] Filter deposit forms to show only "Deposit" type bank accounts
- [x] Filter withdrawal forms to show only "Withdrawal" type bank accounts
- [x] Update PlayerTransactionDialog to filter by account type
- [x] Update PanelTransactionDialog to filter by account type
- [x] Update PlayerEntryDialog (initial deposit) to filter by account type
- [x] Test deposit form shows only deposit accounts
- [x] Test withdrawal form shows only withdrawal accounts

## Point-Bank-Panel Accounting System

- [x] Add pointsBalance field to panels table
- [x] Update panel creation form to include initial points balance
- [x] Add manual panel points recharge functionality
- [x] Update deposit logic: Bank += cash, Panel -= (deposit + bonus) points, Player += (deposit + bonus) points
- [x] Update withdrawal logic: Player -= points, Panel += points, Bank -= cash
- [x] Add validation: prevent deposit if panel points insufficient
- [x] Add validation: prevent withdrawal if player points insufficient
- [x] Add validation: prevent withdrawal if bank cash insufficient
- [x] Add validation: prevent negative panel points
- [x] Update Panels page to display points balance prominently
- [x] Update deposit forms to show panel points before transaction
- [x] Update withdrawal forms to show panel points before transaction
- [x] Add warning when panel points are low
- [x] Test complete deposit flow with panel points tracking
- [x] Test complete withdrawal flow with panel points tracking
- [x] Test validation rules (negative balances, insufficient funds)

## Bank Account Closing Balance Bug Fix

- [x] Fix deposit logic: closing balance should ADD deposit amount, not overwrite
- [x] Fix withdrawal logic: closing balance should SUBTRACT withdrawal amount correctly
- [x] Add "Total Deposits" column to Bank Accounts page showing cumulative deposits
- [x] Test bank balance calculations with opening balance + deposits - withdrawals

## Gameplay Transactions Feature

- [x] Create gameplayTransactions database table (type: Win/Loss, amount, player, panel, notes, timestamp)
- [x] Add backend procedures: create, list, getByPlayer, getByPanel
- [x] Create Gameplay page with transaction recording form
- [x] Add transaction history table with filters (player, panel, type, date)
- [x] Automatically update player balance on Win (+) and Loss (-)
- [x] Add "Gameplay" navigation item in sidebar
- [x] Display gameplay transaction summary on Players page
- [x] Test complete win/loss flow with balance updates

## Gameplay Page Fixes

- [x] Wrap Gameplay page in DashboardLayout to show sidebar navigation
- [x] Clean up test data from gameplay transactions table
- [x] Clean up test players and panels created during testing

## Automatic Win/Loss Detection on Withdrawal

- [x] Update withdrawal logic to allow withdrawals exceeding current balance
- [x] Automatically detect win amount (withdrawal - current balance)
- [x] Create gameplay "Win" transaction for the difference
- [x] Update player balance before processing withdrawal
- [x] Test withdrawal with automatic win detection

## Clear All Records & Player Win/Loss View

- [x] Update Clear All Records to also delete gameplay transactions
- [x] Add player-wise win/loss summary columns to Players page
- [x] Verify player balance updates correctly after auto-win detection

## Player Filter in Gameplay Page

- [x] Add player dropdown/search filter to Gameplay page
- [x] Filter transaction history by selected player
- [x] Show player-specific summary stats (total wins, losses, net)
- [x] Add "Clear Filter" option to show all transactions

## Fix Auto-Detected Win Note

- [x] Update auto-win note to show final balance after withdrawal instead of balance before win

## Total Withdrawals Column in Bank Accounts

- [x] Create backend procedure to calculate total withdrawals per bank account
- [x] Add Total Withdrawals column to Bank Accounts table
- [x] Display next to Total Deposits for easy comparison

## Fix Net Balance Arrow Indicator

- [x] Change Net Balance arrow logic to compare against Opening Balance
- [x] Show DOWN arrow (red) when Net Balance < Opening Balance
- [x] Show UP arrow (green) when Net Balance > Opening Balance

## Update Gameplay Page Labels

- [x] Change "Total Wins" to "Player's Total Wins"
- [x] Change "Total Losses" to "Player's Total Losses"
- [x] Remove "Net Gameplay" card

## Player Search Improvements in Gameplay

- [x] Replace player dropdown with searchable input field (combobox)
- [x] Make player names in transaction table clickable
- [x] Clicking player name filters to show that player's records
- [x] Add clear visual indication when filter is active

## Gameplay Page UI Redesign

- [x] Improve summary cards with gradient backgrounds and better icons
- [x] Enhance table design with hover effects and better spacing
- [x] Add empty state when no transactions exist
- [x] Improve filter section layout and styling
- [x] Better Win/Loss badges with enhanced colors
- [x] Add subtle animations and transitions

## Player Search Enhancement

- [x] Replace "All Players" text with better visual indicator showing player count
- [x] Add user icon/avatar to selected player display
- [x] Improve search placeholder text
- [x] Add visual feedback when player is selected
- [x] Better styling for the search trigger button

## Compact Player Search Layout

- [x] Remove large card wrapper for player search
- [x] Create compact horizontal layout
- [x] Reduce vertical spacing
- [x] Make search more integrated with page layout

## Dashboard Calculation Fixes

- [x] Fix Total Panel Balance to sum all panel points balances
- [x] Fix Total Profit/Loss to calculate actual panel profit/loss from gameplay
- [x] Fix Today's Activity to show only deposit and withdrawal counts (remove total)

## Dashboard Display Fixes

- [x] Change Total Panel Balance from rupees symbol to points symbol
- [x] Capitalize "Deposits" and "Withdrawals" in Today's Activity
- [x] Add current date beside Dashboard heading to show last 24 hours data

## Timezone-Aware Filtering

- [x] Modify Dashboard backend to accept timezone offset from frontend
- [x] Update frontend to send user's timezone offset with Dashboard queries
- [x] Calculate "today" based on user's local timezone (midnight to midnight)
- [x] Update Today's Activity to show accurate local timezone data
- [x] Write tests for timezone-aware filtering logic

## Panels Page Display Issues

- [x] Fix Total Balance display (combined closing balance not showing properly)
- [x] Fix Total Profit/Loss display (combined performance not showing properly)
- [x] Fix Total Balance to show sum of Points Balances (1 pt = ₹1)

## Automatic Bonus Percentage Calculation

- [x] Replace manual bonus points input with percentage selector (5%, 10%, 15%, 20%)
- [x] Implement auto-calculation: bonus = amount × percentage
- [x] Update Player Search deposit form with bonus percentage
- [x] Update Panel Detail deposit form with bonus percentage (uses same PlayerTransactionDialog)
- [x] Update Deposits page deposit form with bonus percentage
- [x] Update Quick Entry Dialog deposit form with bonus percentage
- [x] Update Player Entry initial deposit with bonus percentage (N/A - uses same dialogs)
- [x] Display calculated bonus amount before submission
- [x] Ensure bonus is added to player balance correctly

## Transaction Ledger Display Issues

- [x] Fix "00" showing in Flags column (should show proper flag indicators)
- [x] Add color coding for transaction statuses (red for pending, green for approved, gray for rejected)
- [x] Improve Flags column formatting and readability

## 24-Hour Bonus Tracking

- [x] Create backend procedure to calculate total bonus points awarded in last 24 hours
- [x] Break down bonus calculation by panel (show which panel gave how much bonus)
- [x] Add bonus tracking card to Dashboard showing total and per-panel breakdown
- [x] Use timezone-aware filtering for accurate 24-hour calculation
- [x] Display bonus data in a clear, readable format (table or list)

## Automatic Closing Balance Calculation

- [x] Implement backend logic to calculate Closing Balance automatically
- [x] Formula: Closing Balance = Opening Balance + Total Deposits - Total Withdrawals
- [x] Update panels.list query to include calculated Closing Balance
- [x] Remove manual Closing Balance input from panel forms (make it read-only/calculated)
- [x] Update Panels page to display calculated Closing Balance
- [x] Ensure calculation updates in real-time when deposits/withdrawals are added

## Panel Performance Chart Improvements

- [x] Redesign chart with better color scheme (green for profit, red for loss)
- [x] Add data labels showing exact values on bars
- [x] Improve chart layout and spacing for better readability
- [x] Add grid lines and better axis formatting
- [x] Consider using grouped bar chart or separate charts for clarity
- [x] Add tooltips with detailed information on hover

## Chart X-Axis Label Overlap Fix

- [x] Fix overlapping panel names on chart X-axis
- [x] Rotate X-axis labels at 45-degree angle for better readability
- [x] Increase bottom margin to accommodate angled labels

## Chart Design Improvements

- [x] Remove angled labels and use horizontal labels with better spacing
- [x] Use full panel names with horizontal layout
- [x] Increase chart height to 400px for better proportions
- [x] Improve tooltip styling with better colors
- [x] Set fixed bar size for consistent appearance

## Profit/Loss Chart Fix

- [ ] Fix chart to display negative profit/loss values correctly
- [ ] Configure Y-axis to allow negative domain
- [ ] Use conditional coloring (green for profit, red for loss) on single bar
- [ ] Remove stacked bar approach for simpler visualization

## Profit/Loss Chart Fix

- [x] Fix Profit/Loss chart to display negative values correctly
- [x] Add proper color coding (red for negative, green for positive)
- [x] Ensure Y-axis domain includes negative range
- [x] Add profitLoss calculation to getAllPanels backend function

## Standalone Admin Authentication System

- [x] Create admin_users table in database schema (username, password_hash, email, created_at)
- [x] Implement password hashing with bcrypt for secure storage
- [x] Install bcryptjs package for password hashing
- [x] Create standalone-auth.ts helper functions
- [x] Create admin login procedure (validate username/password)
- [x] Create admin logout procedure (clear session)
- [x] Add standaloneAuth router with login/logout/me procedures
- [x] Build admin login page UI with username/password form
- [x] Update App.tsx to use standaloneAuth.me for auth checking
- [x] Add login page route and auth gate in App.tsx
- [x] Update DashboardLayout to use standaloneAuth instead of useAuth hook
- [x] Replace OAuth user references with standalone admin user fields
- [x] Generate default admin credentials (username: admin, random secure password)
- [x] Install cookie-parser for session management
- [x] Test standalone login functionality
- [x] Verify Dashboard loads after successful login
- [x] Create deployment documentation (DEPLOYMENT_GUIDE.md)
- [x] Create PM2 ecosystem configuration
- [x] Document admin credentials and security recommendations
- [ ] Remove OAuth routes from server (optional - not breaking standalone functionality)
- [ ] Test complete independence from Manus platform

## Change Password Feature

- [x] Create changePassword procedure in standaloneAuth router (requires current password, new password)
- [x] Validate current password before allowing change
- [x] Hash new password with bcrypt before storing
- [x] Create Settings page with Change Password form
- [x] Add password validation (minimum length, complexity requirements)
- [x] Show success/error messages after password change
- [x] Add Settings route to App.tsx
- [x] Add Settings menu item to DashboardLayout sidebar
- [x] Test password change flow end-to-end

## Complete Manus Dependency Removal

- [x] Audit package.json for Manus-specific packages
- [x] Search codebase for Manus imports and references
- [x] Update useAuth hook to use standalone authentication
- [x] Remove vite-plugin-manus-runtime from package.json
- [x] Remove vitePluginManusRuntime from vite.config.ts
- [ ] Remove unused OAuth-related code from server/\_core (optional - not breaking functionality)
- [x] Test application runs without any Manus services
- [x] Verify database migrations work independently
- [x] Create standalone environment configuration guide (ENV_SETUP_GUIDE.md)

## Auto-Deployment Package

- [x] Create automated database setup script (creates tables on first run)
- [x] Create automated admin user creation script (generates credentials)
- [x] Add Railway deployment configuration (railway.json)
- [x] Add Render deployment configuration (render.yaml)
- [x] Create comprehensive DEPLOYMENT_README.md
- [x] Create startup script that runs setup automatically
- [x] Add health check endpoint for deployment platforms
- [ ] Package everything into deployable ZIP file
- [ ] Test ZIP deployment on clean environment
