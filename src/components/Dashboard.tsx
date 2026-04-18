/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useFinancials } from '../hooks/useFinancials';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';

const COLORS = ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8'];

export function Dashboard() {
  const summary = useFinancials();
  const partners = useLiveQuery(() => db.partners.toArray());
  const employees = useLiveQuery(() => db.employees.toArray());

  if (!summary) return <div>در حال بارگذاری...</div>;

  const chartData = [
    { name: 'درآمد', value: summary.totalIncome.AFN },
    { name: 'هزینه', value: summary.totalExpenses.AFN },
  ];

  const partnerData = summary.partnerShares.map(ps => {
    const partner = partners?.find(p => p.id === ps.partnerId);
    return {
      name: partner?.name || 'نامشخص',
      value: ps.shares.AFN.shareAmount
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">خلاصه وضعیت (افغانی)</h2>
          <p className="text-slate-500">مروری بر عملکرد مالی و منابع انسانی شرکت</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-md card-hover bg-white overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
          <CardContent className="pt-8 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">سود خالص (AFN)</p>
                <h3 className="text-2xl font-black text-slate-900 mt-2">
                  {summary.netProfit.AFN.toLocaleString()} <span className="text-xs font-medium text-slate-400">افغانی</span>
                </h3>
              </div>
              <div className="p-4 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-100">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-6 flex items-center text-[10px] text-emerald-600 font-bold bg-emerald-50 w-fit px-2 py-1 rounded-full">
              <ArrowUpRight className="w-3 h-3 ml-1" />
              <span>رشد مثبت در این دوره</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md card-hover bg-white overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
          <CardContent className="pt-8 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">کل درآمد (AFN)</p>
                <h3 className="text-2xl font-black text-slate-900 mt-2">
                  {summary.totalIncome.AFN.toLocaleString()} <span className="text-xs font-medium text-slate-400">افغانی</span>
                </h3>
              </div>
              <div className="p-4 bg-blue-500 rounded-2xl shadow-lg shadow-blue-100">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-6 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 w-[70%]" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md card-hover bg-white overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
          <CardContent className="pt-8 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">کل هزینه‌ها (AFN)</p>
                <h3 className="text-2xl font-black text-slate-900 mt-2">
                  {summary.totalExpenses.AFN.toLocaleString()} <span className="text-xs font-medium text-slate-400">افغانی</span>
                </h3>
              </div>
              <div className="p-4 bg-rose-500 rounded-2xl shadow-lg shadow-rose-100">
                <TrendingDown className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-6 flex items-center text-[10px] text-rose-600 font-bold bg-rose-50 w-fit px-2 py-1 rounded-full">
              <ArrowDownRight className="w-3 h-3 ml-1" />
              <span>مدیریت بهینه مخارج</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md card-hover bg-white overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
          <CardContent className="pt-8 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">تعداد پرسنل</p>
                <h3 className="text-2xl font-black text-slate-900 mt-2">
                  {employees?.length || 0} <span className="text-xs font-medium text-slate-400">نفر</span>
                </h3>
              </div>
              <div className="p-4 bg-amber-500 rounded-2xl shadow-lg shadow-amber-100">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-6 flex -space-x-2 rtl:space-x-reverse">
              {[1,2,3].map(i => (
                <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-200" />
              ))}
              <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-900 flex items-center justify-center text-[8px] text-white">
                +{employees?.length || 0}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-none shadow-md card-hover bg-white overflow-hidden">
          <CardHeader className="border-b border-slate-50 pb-6">
            <CardTitle className="text-lg font-black text-slate-900">مقایسه عملکرد مالی</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px] pt-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#4f46e5' : '#f43f5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md card-hover bg-white overflow-hidden">
          <CardHeader className="border-b border-slate-50 pb-6">
            <CardTitle className="text-lg font-black text-slate-900">توزیع سود بین شرکا</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px] pt-8">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={partnerData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {partnerData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-6 mt-4">
              {partnerData.map((entry, index) => (
                <div key={index} className="flex items-center gap-2 group cursor-default">
                  <div className="w-3 h-3 rounded-full shadow-sm transition-transform group-hover:scale-125" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-xs font-bold text-slate-600">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
