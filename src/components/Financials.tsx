/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from './ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from './ui/dialog';
import { Plus, ArrowUpCircle, ArrowDownCircle, Filter, Trash2, Wallet, Edit, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from './ui/badge';
import { formatJalali } from '../lib/jalali';
import { useFinancials } from '../hooks/useFinancials';
import { cn } from '../lib/utils';
import { Currency, CURRENCY_LABELS, Transaction } from '../types';

export function Financials() {
  const activeCompanyId = localStorage.getItem('active_company_id');
  const companyId = activeCompanyId ? parseInt(activeCompanyId) : null;

  const transactions = useLiveQuery(() => companyId ? db.transactions.where('companyId').equals(companyId).reverse().toArray() : []);
  const summary = useFinancials();
  
  const [isAddTransactionOpen, setIsAddTransactionOpen] = React.useState(false);
  const [isEditTransactionOpen, setIsEditTransactionOpen] = React.useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);
  const [editingTransaction, setEditingTransaction] = React.useState<Transaction | null>(null);
  const [deletingTransactionId, setDeletingTransactionId] = React.useState<number | null>(null);

  const monthlyStats = React.useMemo(() => {
    if (!transactions) return [];
    const months: Record<string, Record<Currency, { income: number, expense: number }>> = {};
    
    transactions.forEach(t => {
      const month = formatJalali(t.date, 'YYYY/MM');
      const currency = t.currency || 'AFN';
      if (!months[month]) {
        months[month] = {
          AFN: { income: 0, expense: 0 },
          USD: { income: 0, expense: 0 },
          IRT: { income: 0, expense: 0 }
        };
      }
      if (t.type === 'income') months[month][currency].income += t.amount;
      else months[month][currency].expense += t.amount;
    });

    return Object.entries(months).map(([month, currencies]) => ({
      month,
      currencies
    })).sort((a, b) => b.month.localeCompare(a.month));
  }, [transactions]);

  const handleAddTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!companyId) return;
    const formData = new FormData(e.currentTarget);
    const type = formData.get('type') as any;
    const amount = Number(formData.get('amount'));
    const currency = formData.get('currency') as Currency;
    const category = formData.get('category') as string;
    const description = formData.get('description') as string;

    await db.transactions.add({
      companyId,
      type,
      amount,
      currency,
      category,
      description,
      date: new Date().toISOString()
    });
    
    setIsAddTransactionOpen(false);
    toast.success('تراکنش با موفقیت ثبت شد');
  };

  const handleEditTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTransaction) return;
    const formData = new FormData(e.currentTarget);
    const type = formData.get('type') as any;
    const amount = Number(formData.get('amount'));
    const currency = formData.get('currency') as Currency;
    const category = formData.get('category') as string;
    const description = formData.get('description') as string;

    await db.transactions.update(editingTransaction.id!, {
      type,
      amount,
      currency,
      category,
      description
    });
    
    setIsEditTransactionOpen(false);
    toast.success('تراکنش بروزرسانی شد');
  };

  const handleDeleteTransaction = async () => {
    if (deletingTransactionId === null) return;
    await db.transactions.delete(deletingTransactionId);
    setIsDeleteConfirmOpen(false);
    toast.success('تراکنش حذف شد');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">امور مالی</h2>
          <p className="text-slate-500">ثبت درآمدها، هزینه‌ها و گزارشات مالی (چند ارزی)</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddTransactionOpen} onOpenChange={setIsAddTransactionOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 btn-3d bg-indigo-600 hover:bg-indigo-700 text-white h-12 px-6">
                <Plus className="w-5 h-5" />
                ثبت تراکنش جدید
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-slate-900">ثبت تراکنش جدید</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddTransaction} className="space-y-6 mt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type" className="font-bold">نوع تراکنش</Label>
                    <select 
                      id="type" 
                      name="type" 
                      className="w-full h-12 rounded-xl border border-slate-200 bg-background px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                      required
                    >
                      <option value="income">درآمد</option>
                      <option value="expense">هزینه</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency" className="font-bold">واحد پول</Label>
                    <select 
                      id="currency" 
                      name="currency" 
                      className="w-full h-12 rounded-xl border border-slate-200 bg-background px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                      required
                    >
                      {Object.entries(CURRENCY_LABELS).map(([code, label]) => (
                        <option key={code} value={code}>{label} ({code})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount" className="font-bold">مبلغ</Label>
                  <Input id="amount" name="amount" type="number" step="any" required className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category" className="font-bold">دسته‌بندی</Label>
                  <Input id="category" name="category" placeholder="مثلا: فروش پروژه، اجاره، حقوق" required className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="font-bold">توضیحات</Label>
                  <Input id="description" name="description" className="h-12 rounded-xl" />
                </div>
                <Button type="submit" className="w-full h-12 btn-3d bg-indigo-600 text-white font-bold text-lg">ثبت نهایی تراکنش</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditTransactionOpen} onOpenChange={setIsEditTransactionOpen}>
            <DialogContent className="sm:max-w-[425px] rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-slate-900">ویرایش تراکنش</DialogTitle>
              </DialogHeader>
              {editingTransaction && (
                <form onSubmit={handleEditTransaction} className="space-y-6 mt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-type" className="font-bold">نوع تراکنش</Label>
                      <select 
                        id="edit-type" 
                        name="type" 
                        defaultValue={editingTransaction.type}
                        className="w-full h-12 rounded-xl border border-slate-200 bg-background px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                        required
                      >
                        <option value="income">درآمد</option>
                        <option value="expense">هزینه</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-currency" className="font-bold">واحد پول</Label>
                      <select 
                        id="edit-currency" 
                        name="currency" 
                        defaultValue={editingTransaction.currency || 'AFN'}
                        className="w-full h-12 rounded-xl border border-slate-200 bg-background px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                        required
                      >
                        {Object.entries(CURRENCY_LABELS).map(([code, label]) => (
                          <option key={code} value={code}>{label} ({code})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-amount" className="font-bold">مبلغ</Label>
                    <Input id="edit-amount" name="amount" type="number" step="any" defaultValue={editingTransaction.amount} required className="h-12 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-category" className="font-bold">دسته‌بندی</Label>
                    <Input id="edit-category" name="category" defaultValue={editingTransaction.category} required className="h-12 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-description" className="font-bold">توضیحات</Label>
                    <Input id="edit-description" name="description" defaultValue={editingTransaction.description} className="h-12 rounded-xl" />
                  </div>
                  <Button type="submit" className="w-full h-12 btn-3d bg-indigo-600 text-white font-bold text-lg">بروزرسانی تراکنش</Button>
                </form>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
            <DialogContent className="sm:max-w-[400px] rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <AlertCircle className="w-6 h-6 text-rose-500" />
                  تایید حذف تراکنش
                </DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="text-slate-600 font-bold">آیا از حذف این تراکنش اطمینان دارید؟</p>
                <p className="text-rose-500 text-sm mt-2 font-medium">این عمل غیرقابل بازگشت است.</p>
              </div>
              <div className="flex gap-3 mt-4">
                <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold" onClick={() => setIsDeleteConfirmOpen(false)}>انصراف</Button>
                <Button className="flex-1 h-12 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold" onClick={handleDeleteTransaction}>بله، حذف شود</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Multi-Currency Summary Cards */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">خلاصه وضعیت مالی (به تفکیک ارز)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['AFN', 'USD', 'IRT'] as Currency[]).map((curr) => (
            <Card key={curr} className="border-none shadow-md card-hover bg-white overflow-hidden relative group">
              <div className="h-1.5 w-full bg-indigo-500" />
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">موجودی {CURRENCY_LABELS[curr]}</p>
                  <Badge variant="outline" className="font-bold">{curr}</Badge>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-2xl font-black text-slate-900">{(summary?.netProfit[curr] || 0).toLocaleString()}</span>
                      <span className="text-xs text-slate-400 mr-1">{CURRENCY_LABELS[curr]}</span>
                    </div>
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      (summary?.netProfit[curr] || 0) >= 0 ? "bg-emerald-50" : "bg-rose-50"
                    )}>
                      {(summary?.netProfit[curr] || 0) >= 0 ? (
                        <ArrowUpCircle className="w-6 h-6 text-emerald-600" />
                      ) : (
                        <ArrowDownCircle className="w-6 h-6 text-rose-600" />
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-50">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 font-bold">کل درآمد</span>
                      <span className="text-sm font-bold text-emerald-600">{(summary?.totalIncome[curr] || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-[10px] text-slate-400 font-bold">کل هزینه</span>
                      <span className="text-sm font-bold text-rose-600">{(summary?.totalExpenses[curr] || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 py-6 px-8">
          <CardTitle className="text-xl font-black text-slate-900">لیست تراکنش‌های اخیر</CardTitle>
          <Button variant="outline" size="sm" className="gap-2 btn-3d h-10 px-4 rounded-xl border-slate-200 font-bold text-slate-700">
            <Filter className="w-4 h-4" />
            فیلتر پیشرفته
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="font-bold text-slate-900 py-6">تاریخ</TableHead>
                  <TableHead className="font-bold text-slate-900">نوع</TableHead>
                  <TableHead className="font-bold text-slate-900">ارز</TableHead>
                  <TableHead className="font-bold text-slate-900">دسته‌بندی</TableHead>
                  <TableHead className="font-bold text-slate-900">توضیحات</TableHead>
                  <TableHead className="text-left font-bold text-slate-900">مبلغ</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions?.map((t) => (
                  <TableRow key={t.id} className="group hover:bg-slate-50/50 transition-colors border-slate-50">
                    <TableCell className="text-slate-500 font-bold text-xs py-6">{formatJalali(t.date)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shadow-sm",
                          t.type === 'income' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                        )}>
                          {t.type === 'income' ? (
                            <ArrowUpCircle className="w-5 h-5" />
                          ) : (
                            <ArrowDownCircle className="w-5 h-5" />
                          )}
                        </div>
                        <span className={cn(
                          "font-bold text-sm",
                          t.type === 'income' ? 'text-emerald-700' : 'text-rose-700'
                        )}>
                          {t.type === 'income' ? 'درآمد' : 'هزینه'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-bold">{t.currency || 'AFN'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 font-bold px-3 py-1">
                        {t.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-slate-500 font-medium" title={t.description}>
                      {t.description}
                    </TableCell>
                    <TableCell className={cn(
                      "text-left font-black text-lg",
                      t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                    )}>
                      {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()} <small className="text-[10px] font-normal">{CURRENCY_LABELS[t.currency || 'AFN']}</small>
                    </TableCell>
                    <TableCell className="text-left py-6">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-10 h-10 rounded-xl text-slate-300 hover:text-indigo-600 hover:bg-indigo-50"
                          onClick={() => {
                            setEditingTransaction(t);
                            setIsEditTransactionOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-10 h-10 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                          onClick={() => {
                            setDeletingTransactionId(t.id!);
                            setIsDeleteConfirmOpen(true);
                          }}
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!transactions || transactions.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-20">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                          <Wallet className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-slate-400 font-medium">هیچ تراکنشی ثبت نشده است</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
