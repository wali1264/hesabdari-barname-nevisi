import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { db } from './lib/db';

// Force clear database once to remove any leftover test data from previous versions
const CLEANUP_VERSION = '2.0';
const currentCleanup = localStorage.getItem('db_cleanup_version');

async function init() {
  if (currentCleanup !== CLEANUP_VERSION) {
    try {
      await db.companies.clear();
      await db.partners.clear();
      await db.employees.clear();
      await db.transactions.clear();
      await db.advances.clear();
      await db.withdrawals.clear();
      await db.personalTransactions.clear();
      await db.personalCategories.clear();
      localStorage.setItem('db_cleanup_version', CLEANUP_VERSION);
      console.log('Database cleared for production use.');
    } catch (e) {
      console.error('Failed to clear database:', e);
    }
  }

  // Ensure at least one company exists
  const companyCount = await db.companies.count();
  if (companyCount === 0) {
    const defaultCompanyId = await db.companies.add({
      name: 'شرکت پیش‌فرض',
      registrationDate: new Date().toISOString(),
      description: 'اولین شرکت ثبت شده در سیستم'
    });
    localStorage.setItem('active_company_id', defaultCompanyId.toString());
  } else if (!localStorage.getItem('active_company_id')) {
    const firstCompany = await db.companies.toCollection().first();
    if (firstCompany) {
      localStorage.setItem('active_company_id', firstCompany.id!.toString());
    }
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

init();
