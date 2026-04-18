/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Partners } from './components/Partners';
import { Employees } from './components/Employees';
import { Financials } from './components/Financials';
import { PersonalAccounting } from './components/PersonalAccounting';
import { CompanyManagement } from './components/CompanyManagement';
import { Settings } from './components/Settings';
import { Toaster } from './components/ui/sonner';

export default function App() {
  const [activeTab, setActiveTab] = React.useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'partners':
        return <Partners />;
      case 'employees':
        return <Employees />;
      case 'financials':
        return <Financials />;
      case 'personal':
        return <PersonalAccounting />;
      case 'companies':
        return <CompanyManagement />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <>
      <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
        {renderContent()}
      </Layout>
      <Toaster position="top-center" richColors />
    </>
  );
}
