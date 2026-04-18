/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TransactionType = 'income' | 'expense';
export type PartnerWithdrawalType = 'withdrawal' | 'loan_repayment';
export type Currency = 'AFN' | 'USD' | 'IRT'; // Afghani, Dollar, Toman

export const CURRENCY_LABELS: Record<Currency, string> = {
  AFN: 'افغانی',
  USD: 'دلار',
  IRT: 'تومان'
};

export interface Company {
  id?: number;
  name: string;
  registrationDate: string;
  description?: string;
}

export interface Partner {
  id?: number;
  companyId: number;
  name: string;
  sharePercentage: number; // 0-100
  joinDate: string;
  monthlySalary?: number;
  salaryCurrency?: Currency;
}

export interface Employee {
  id?: number;
  companyId: number;
  name: string;
  role: string;
  monthlySalary: number;
  salaryCurrency: Currency;
  startDate: string;
  isActive: boolean;
}

export interface Transaction {
  id?: number;
  companyId: number;
  type: TransactionType;
  amount: number;
  currency: Currency;
  description: string;
  date: string;
  category: string;
}

export interface Advance {
  id?: number;
  companyId: number;
  employeeId?: number;
  partnerId?: number;
  amount: number;
  currency: Currency;
  date: string;
  description: string;
  isRepaid: boolean;
}

export interface PartnerWithdrawal {
  id?: number;
  companyId: number;
  partnerId: number;
  amount: number;
  currency: Currency;
  date: string;
  description: string;
  type: PartnerWithdrawalType;
}

export interface FinancialSummary {
  totalIncome: Record<Currency, number>;
  totalExpenses: Record<Currency, number>;
  netProfit: Record<Currency, number>;
  partnerShares: {
    partnerId: number;
    shares: Record<Currency, {
      shareAmount: number;
      totalWithdrawn: number;
      balance: number;
    }>;
  }[];
}

export interface PersonalCategory {
  id?: number;
  name: string;
}

export interface PersonalTransaction {
  id?: number;
  type: TransactionType;
  amount: number;
  currency: Currency;
  description: string;
  date: string;
  categoryId: number;
}
