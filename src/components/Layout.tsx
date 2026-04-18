/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  UserCircle, 
  Wallet, 
  Settings,
  Menu,
  X,
  BookOpen,
  Building2,
  ChevronDown,
  Plus
} from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard, color: 'text-blue-600' },
  { id: 'partners', label: 'شرکا', icon: Users, color: 'text-emerald-600' },
  { id: 'employees', label: 'کارمندان', icon: UserCircle, color: 'text-amber-600' },
  { id: 'financials', label: 'امور مالی', icon: Wallet, color: 'text-indigo-600' },
  { id: 'personal', label: 'حساب شخصی', icon: BookOpen, color: 'text-rose-600' },
  { id: 'companies', label: 'مدیریت شرکت‌ها', icon: Building2, color: 'text-slate-600' },
];

export function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const companies = useLiveQuery(() => db.companies.toArray());
  const activeCompanyId = localStorage.getItem('active_company_id');
  const activeCompany = companies?.find(c => c.id?.toString() === activeCompanyId);

  const handleSwitchCompany = (id: number) => {
    localStorage.setItem('active_company_id', id.toString());
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex w-72 bg-white border-l border-slate-200 flex-col sticky top-0 h-screen shadow-xl z-20">
        <div className="p-8 border-b border-slate-100 bg-gradient-to-br from-white to-slate-50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">کتابستان ERP</h1>
          </div>
          
          {/* Company Switcher */}
          <div className="relative group">
            <Button 
              variant="outline" 
              className="w-full justify-between h-12 rounded-xl bg-slate-50 border-slate-100 hover:bg-slate-100 hover:border-slate-200 transition-all px-4"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="text-sm font-bold text-slate-700 truncate">
                  {activeCompany?.name || 'انتخاب شرکت'}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </Button>
            
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <p className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">سوئیچ بین شرکت‌ها</p>
              {companies?.map(company => (
                <button
                  key={company.id}
                  className={cn(
                    "w-full text-right px-4 py-3 text-sm font-bold transition-colors hover:bg-slate-50",
                    activeCompanyId === company.id?.toString() ? "text-indigo-600 bg-indigo-50/50" : "text-slate-600"
                  )}
                  onClick={() => handleSwitchCompany(company.id!)}
                >
                  {company.name}
                </button>
              ))}
              <div className="mt-2 pt-2 border-t border-slate-50 px-2">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-2 h-10 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg"
                  onClick={() => setActiveTab('companies')}
                >
                  <Plus className="w-3 h-3" />
                  مدیریت شرکت‌ها
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-6 space-y-3">
          {menuItems.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              className={cn(
                "w-full justify-start gap-4 h-14 text-base font-semibold transition-all duration-300 rounded-2xl",
                activeTab === item.id 
                  ? "bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100/50" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
              onClick={() => setActiveTab(item.id)}
            >
              <div className={cn(
                "p-2 rounded-xl transition-colors",
                activeTab === item.id ? "bg-white shadow-sm" : "bg-slate-100"
              )}>
                <item.icon className={cn("w-5 h-5", activeTab === item.id ? item.color : "text-slate-400")} />
              </div>
              <span>{item.label}</span>
              {activeTab === item.id && (
                <motion.div 
                  layoutId="active-pill"
                  className="mr-auto w-1.5 h-6 bg-indigo-600 rounded-full"
                />
              )}
            </Button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-100">
          <Button 
            variant="ghost" 
            className={cn(
              "w-full justify-start gap-4 h-14 text-base font-semibold rounded-2xl transition-all duration-300",
              activeTab === 'settings' 
                ? "bg-slate-900 text-white shadow-lg shadow-slate-200" 
                : "text-slate-500 hover:bg-slate-50"
            )}
            onClick={() => setActiveTab('settings')}
          >
            <div className={cn(
              "p-2 rounded-xl",
              activeTab === 'settings' ? "bg-slate-800" : "bg-slate-100"
            )}>
              <Settings className={cn("w-5 h-5", activeTab === 'settings' ? "text-white" : "text-slate-400")} />
            </div>
            <span>تنظیمات</span>
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-white/80 backdrop-blur-md border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-black text-slate-900 tracking-tight">کتابستان ERP</h1>
        </div>
        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-slate-100" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </Button>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="md:hidden fixed inset-x-4 top-[75px] bg-white rounded-3xl border border-slate-200 z-50 p-6 shadow-2xl overflow-hidden"
            >
              <nav className="space-y-3">
                {menuItems.map((item) => (
                  <Button
                    key={item.id}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-4 h-14 text-base font-bold rounded-2xl",
                      activeTab === item.id ? "bg-indigo-50 text-indigo-700" : "text-slate-600"
                    )}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <item.icon className={cn("w-5 h-5", activeTab === item.id ? item.color : "text-slate-400")} />
                    <span>{item.label}</span>
                  </Button>
                ))}
                <div className="pt-3 mt-3 border-t border-slate-100">
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-4 h-14 text-base font-bold rounded-2xl",
                      activeTab === 'settings' ? "bg-slate-900 text-white" : "text-slate-600"
                    )}
                    onClick={() => {
                      setActiveTab('settings');
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <Settings className={cn("w-5 h-5", activeTab === 'settings' ? "text-white" : "text-slate-400")} />
                    <span>تنظیمات</span>
                  </Button>
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
