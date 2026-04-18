/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Dexie, { type Table } from 'dexie';
import { Partner, Employee, Transaction, Advance, PartnerWithdrawal, PersonalTransaction, Company, PersonalCategory } from '../types';

export class KetabestanDB extends Dexie {
  companies!: Table<Company>;
  partners!: Table<Partner>;
  employees!: Table<Employee>;
  transactions!: Table<Transaction>;
  advances!: Table<Advance>;
  withdrawals!: Table<PartnerWithdrawal>;
  personalCategories!: Table<PersonalCategory>;
  personalTransactions!: Table<PersonalTransaction>;

  constructor() {
    super('KetabestanDB');
    this.version(2).stores({
      companies: '++id, name',
      partners: '++id, companyId, name',
      employees: '++id, companyId, name, role, isActive',
      transactions: '++id, companyId, type, date, category',
      advances: '++id, companyId, employeeId, date',
      withdrawals: '++id, companyId, partnerId, date',
      personalCategories: '++id, name',
      personalTransactions: '++id, type, date, categoryId',
    });

    this.version(3).stores({
      transactions: '++id, companyId, type, date, category, currency',
      advances: '++id, companyId, employeeId, partnerId, date, currency',
      withdrawals: '++id, companyId, partnerId, date, currency',
      personalTransactions: '++id, type, date, categoryId, currency',
    });
  }
}

export const db = new KetabestanDB();
