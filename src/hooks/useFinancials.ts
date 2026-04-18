/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { FinancialSummary, Currency } from '../types';
import React from 'react';

export function useFinancials() {
  const activeCompanyId = localStorage.getItem('active_company_id');
  const companyId = activeCompanyId ? parseInt(activeCompanyId) : null;

  return useLiveQuery(async () => {
    if (!companyId) return null;

    const transactions = await db.transactions.where('companyId').equals(companyId).toArray();
    const partners = await db.partners.where('companyId').equals(companyId).toArray();
    const withdrawals = await db.withdrawals.where('companyId').equals(companyId).toArray();

    const currencies: Currency[] = ['AFN', 'USD', 'IRT'];
    
    const totalIncome: Record<Currency, number> = { AFN: 0, USD: 0, IRT: 0 };
    const totalExpenses: Record<Currency, number> = { AFN: 0, USD: 0, IRT: 0 };
    const netProfit: Record<Currency, number> = { AFN: 0, USD: 0, IRT: 0 };

    transactions.forEach(t => {
      const currency = t.currency || 'AFN';
      if (t.type === 'income') totalIncome[currency] += t.amount;
      else totalExpenses[currency] += t.amount;
    });

    currencies.forEach(c => {
      netProfit[c] = totalIncome[c] - totalExpenses[c];
    });

    const partnerShares = partners.map(partner => {
      const shares: Record<Currency, { shareAmount: number; totalWithdrawn: number; balance: number }> = {
        AFN: { shareAmount: 0, totalWithdrawn: 0, balance: 0 },
        USD: { shareAmount: 0, totalWithdrawn: 0, balance: 0 },
        IRT: { shareAmount: 0, totalWithdrawn: 0, balance: 0 }
      };

      currencies.forEach(c => {
        const shareAmount = (netProfit[c] * partner.sharePercentage) / 100;
        
        const totalWithdrawn = withdrawals
          .filter(w => w.partnerId === partner.id && w.type === 'withdrawal' && (w.currency || 'AFN') === c)
          .reduce((sum, w) => sum + w.amount, 0);
        
        const totalRepaid = withdrawals
          .filter(w => w.partnerId === partner.id && w.type === 'loan_repayment' && (w.currency || 'AFN') === c)
          .reduce((sum, w) => sum + w.amount, 0);

        const netWithdrawn = totalWithdrawn - totalRepaid;

        shares[c] = {
          shareAmount,
          totalWithdrawn: netWithdrawn,
          balance: shareAmount - netWithdrawn
        };
      });

      return {
        partnerId: partner.id!,
        shares
      };
    });

    return {
      totalIncome,
      totalExpenses,
      netProfit,
      partnerShares
    } as FinancialSummary;
  }, [companyId]);
}
