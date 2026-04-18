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
import { Plus, ArrowUpCircle, ArrowDownCircle, Filter, Trash2, BookOpen, Wallet, Coins, Edit, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from './ui/badge';
import { formatJalali } from '../lib/jalali';
import { cn } from '../lib/utils';
import { Currency, CURRENCY_LABELS, PersonalTransaction, PersonalCategory } from '../types';

export function PersonalAccounting() {
  const transactions = useLiveQuery(() => db.personalTransactions.orderBy('date').reverse().toArray());
  const categories = useLiveQuery(() => db.personalCategories.toArray());
  
  const [isAddTransactionOpen, setIsAddTransactionOpen] = React.useState(false);
  const [isEditTransactionOpen, setIsEditTransactionOpen] = React.useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = React.useState(false);
  const [isEditCategoryOpen, setIsEditCategoryOpen] = React.useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);
  const [isDeleteCategoryConfirmOpen, setIsDeleteCategoryConfirmOpen] = React.useState(false);

  const [editingTransaction, setEditingTransaction] = React.useState<PersonalTransaction | null>(null);
  const [editingCategory, setEditingCategory] = React.useState<PersonalCategory | null>(null);
  const [deletingTransactionId, setDeletingTransactionId] = React.useState<number | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = React.useState<number | null>(null);

  const stats = React.useMemo(() => {
    const initialStats: Record<Currency, { income: number; expense: number; balance: number }> = {
      AFN: { income: 0, expense: 0, balance: 0 },
      USD: { income: 0, expense: 0, balance: 0 },
      IRT: { income: 0, expense: 0, balance: 0 }
    };

    if (!transactions) return initialStats;

    return transactions.reduce((acc, t) => {
      const curr = (t.currency || 'AFN') as Currency;
      if (!acc[curr]) {
        acc[curr] = { income: 0, expense: 0, balance: 0 };
      }
      if (t.type === 'income') acc[curr].income += t.amount;
      else acc[curr].expense += t.amount;
      acc[curr].balance = acc[curr].income - acc[curr].expense;
      return acc;
    }, initialStats);
  }, [transactions]);

  const handleAddTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const type = formData.get('type') as any;
    const amount = Number(formData.get('amount'));
    const currency = formData.get('currency') as Currency;
    const categoryId = Number(formData.get('categoryId'));
    const description = formData.get('description') as string;

    if (!categoryId) {
      toast.error('لطفا ابتدا یک دسته‌بندی انتخاب کنید');
      return;
    }

    await db.personalTransactions.add({
      type,
      amount,
      currency,
      categoryId,
      description,
      date: new Date().toISOString()
    });
    
    setIsAddTransactionOpen(false);
    toast.success('تراکنش شخصی با موفقیت ثبت شد');
  };

  const handleEditTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTransaction) return;
    const formData = new FormData(e.currentTarget);
    const type = formData.get('type') as any;
    const amount = Number(formData.get('amount'));
    const currency = formData.get('currency') as Currency;
    const categoryId = Number(formData.get('categoryId'));
    const description = formData.get('description') as string;

    await db.personalTransactions.update(editingTransaction.id!, {
      type,
      amount,
      currency,
      categoryId,
      description
    });
    
    setIsEditTransactionOpen(false);
    toast.success('تراکنش شخصی بروزرسانی شد');
  };

  const handleAddCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    
    await db.personalCategories.add({ name });
    (e.target as HTMLFormElement).reset();
    toast.success('دسته‌بندی جدید اضافه شد');
  };

  const handleEditCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingCategory) return;
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;

    await db.personalCategories.update(editingCategory.id!, { name });
    setIsEditCategoryOpen(false);
    toast.success('نام دسته‌بندی تغییر یافت');
  };

  const handleDeleteCategory = async () => {
    if (deletingCategoryId === null) return;
    const usageCount = await db.personalTransactions.where('categoryId').equals(deletingCategoryId).count();
    if (usageCount > 0) {
      toast.error('این دسته‌بندی دارای تراکنش است و قابل حذف نیست');
      setIsDeleteCategoryConfirmOpen(false);
      return;
    }
    await db.personalCategories.delete(deletingCategoryId);
    setIsDeleteCategoryConfirmOpen(false);
    toast.success('دسته‌بندی حذف شد');
  };

  const handleDeleteTransaction = async () => {
    if (deletingTransactionId === null) return;
    await db.personalTransactions.delete(deletingTransactionId);
    setIsDeleteConfirmOpen(false);
    toast.success('تراکنش حذف شد');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">مدیریت حساب شخصی</h2>
          <p className="text-slate-500">دفترچه یادداشت هزینه‌ها و برداشت‌های شخصی مدیر (چند ارزی)</p>
        </div>
        <div className="flex gap-3">
          <Dialog open={isManageCategoriesOpen} onOpenChange={setIsManageCategoriesOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 rounded-xl border-slate-200 h-12">
                <Filter className="w-5 h-5 text-slate-500" />
                مدیریت دسته‌ها
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-slate-900">مدیریت دسته‌بندی‌ها</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 mt-6">
                <form onSubmit={handleAddCategory} className="flex gap-2">
                  <Input name="name" placeholder="نام دسته جدید..." required className="h-12 rounded-xl" />
                  <Button type="submit" className="h-12 px-6 bg-slate-900 text-white rounded-xl">افزودن</Button>
                </form>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {categories?.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="font-bold text-slate-700">{cat.name}</span>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-8 h-8 text-slate-300 hover:text-indigo-600"
                          onClick={() => {
                            setEditingCategory(cat);
                            setIsEditCategoryOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-8 h-8 text-slate-300 hover:text-rose-500"
                          onClick={() => {
                            setDeletingCategoryId(cat.id!);
                            setIsDeleteCategoryConfirmOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditCategoryOpen} onOpenChange={setIsEditCategoryOpen}>
            <DialogContent className="sm:max-w-[400px] rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-black">ویرایش دسته‌بندی</DialogTitle>
              </DialogHeader>
              {editingCategory && (
                <form onSubmit={handleEditCategory} className="space-y-6 mt-6">
                  <div className="space-y-2">
                    <Label htmlFor="cat-name" className="font-bold">نام جدید</Label>
                    <Input id="cat-name" name="name" defaultValue={editingCategory.name} required className="h-12 rounded-xl" />
                  </div>
                  <Button type="submit" className="w-full h-12 btn-3d bg-slate-900 text-white font-bold">بروزرسانی</Button>
                </form>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={isDeleteCategoryConfirmOpen} onOpenChange={setIsDeleteCategoryConfirmOpen}>
            <DialogContent className="sm:max-w-[400px] rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <AlertCircle className="w-6 h-6 text-rose-500" />
                  تایید حذف دسته
                </DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="text-slate-600 font-bold">آیا از حذف این دسته‌بندی اطمینان دارید؟</p>
                <p className="text-rose-500 text-sm mt-2 font-medium">این عمل غیرقابل بازگشت است.</p>
              </div>
              <div className="flex gap-3 mt-4">
                <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold" onClick={() => setIsDeleteCategoryConfirmOpen(false)}>انصراف</Button>
                <Button className="flex-1 h-12 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold" onClick={handleDeleteCategory}>بله، حذف شود</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddTransactionOpen} onOpenChange={setIsAddTransactionOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 btn-3d bg-rose-600 hover:bg-rose-700 text-white h-12 px-6">
                <Plus className="w-5 h-5" />
                ثبت هزینه/برداشت جدید
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-slate-900">ثبت تراکنش شخصی</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddTransaction} className="space-y-6 mt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type" className="font-bold">نوع تراکنش</Label>
                    <select 
                      id="type" 
                      name="type" 
                      className="w-full h-12 rounded-xl border border-slate-200 bg-background px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-rose-500 outline-none"
                      required
                    >
                      <option value="expense">هزینه شخصی</option>
                      <option value="income">دریافتی/برداشت</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency" className="font-bold">واحد پول</Label>
                    <select 
                      id="currency" 
                      name="currency" 
                      className="w-full h-12 rounded-xl border border-slate-200 bg-background px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-rose-500 outline-none"
                      required
                    >
                      {Object.entries(CURRENCY_LABELS).map(([code, label]) => (
                        <option key={code} value={code}>{label} ({code})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="categoryId" className="font-bold">دسته‌بندی</Label>
                  <select 
                    id="categoryId" 
                    name="categoryId" 
                    className="w-full h-12 rounded-xl border border-slate-200 bg-background px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-rose-500 outline-none"
                    required
                  >
                    <option value="">انتخاب دسته...</option>
                    {categories?.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  {(!categories || categories.length === 0) && (
                    <p className="text-[10px] text-rose-500 font-bold">ابتدا باید دسته‌بندی تعریف کنید</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount" className="font-bold">مبلغ</Label>
                  <Input id="amount" name="amount" type="number" required className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="font-bold">توضیحات</Label>
                  <Input id="description" name="description" className="h-12 rounded-xl" />
                </div>
                <Button type="submit" className="w-full h-12 btn-3d bg-rose-600 text-white font-bold text-lg">ذخیره در دفترچه</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditTransactionOpen} onOpenChange={setIsEditTransactionOpen}>
            <DialogContent className="sm:max-w-[425px] rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-slate-900">ویرایش تراکنش شخصی</DialogTitle>
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
                        className="w-full h-12 rounded-xl border border-slate-200 bg-background px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-rose-500 outline-none"
                        required
                      >
                        <option value="expense">هزینه شخصی</option>
                        <option value="income">دریافتی/برداشت</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-currency" className="font-bold">واحد پول</Label>
                      <select 
                        id="edit-currency" 
                        name="currency" 
                        defaultValue={editingTransaction.currency || 'AFN'}
                        className="w-full h-12 rounded-xl border border-slate-200 bg-background px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-rose-500 outline-none"
                        required
                      >
                        {Object.entries(CURRENCY_LABELS).map(([code, label]) => (
                          <option key={code} value={code}>{label} ({code})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-categoryId" className="font-bold">دسته‌بندی</Label>
                    <select 
                      id="edit-categoryId" 
                      name="categoryId" 
                      defaultValue={editingTransaction.categoryId}
                      className="w-full h-12 rounded-xl border border-slate-200 bg-background px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-rose-500 outline-none"
                      required
                    >
                      {categories?.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-amount" className="font-bold">مبلغ</Label>
                    <Input id="edit-amount" name="amount" type="number" defaultValue={editingTransaction.amount} required className="h-12 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-description" className="font-bold">توضیحات</Label>
                    <Input id="edit-description" name="description" defaultValue={editingTransaction.description} className="h-12 rounded-xl" />
                  </div>
                  <Button type="submit" className="w-full h-12 btn-3d bg-rose-600 text-white font-bold text-lg">بروزرسانی تغییرات</Button>
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
                <p className="text-slate-600 font-bold">آیا از حذف این تراکنش شخصی اطمینان دارید؟</p>
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

      {/* Personal Stats per Currency */}
      <div className="space-y-6">
        {(['AFN', 'USD', 'IRT'] as Currency[]).map(curr => {
          const s = stats[curr];
          if (s.income === 0 && s.expense === 0) return null;

          return (
            <div key={curr} className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-slate-900 text-white px-3 py-1 rounded-lg font-black">{CURRENCY_LABELS[curr]}</Badge>
                <div className="h-px flex-1 bg-slate-100" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-none shadow-md card-hover bg-white overflow-hidden relative group">
                  <div className="h-1.5 w-full bg-rose-500" />
                  <CardContent className="pt-6">
                    <p className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">هزینه‌های شخصی ({curr})</p>
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-2xl font-black text-slate-900">{s.expense.toLocaleString()}</span>
                        <span className="text-xs text-slate-400 mr-1">{CURRENCY_LABELS[curr]}</span>
                      </div>
                      <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
                        <ArrowDownCircle className="w-6 h-6 text-rose-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-md card-hover bg-white overflow-hidden relative group">
                  <div className="h-1.5 w-full bg-emerald-500" />
                  <CardContent className="pt-6">
                    <p className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">دریافتی/برداشت‌ها ({curr})</p>
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-2xl font-black text-slate-900">{s.income.toLocaleString()}</span>
                        <span className="text-xs text-slate-400 mr-1">{CURRENCY_LABELS[curr]}</span>
                      </div>
                      <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                        <ArrowUpCircle className="w-6 h-6 text-emerald-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-md card-hover bg-slate-900 overflow-hidden relative group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12" />
                  <CardContent className="pt-6">
                    <p className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">مانده حساب شخصی ({curr})</p>
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-2xl font-black text-white">{s.balance.toLocaleString()}</span>
                        <span className="text-xs text-slate-400 mr-1">{CURRENCY_LABELS[curr]}</span>
                      </div>
                      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          );
        })}
        {(Object.values(stats) as { income: number; expense: number; balance: number }[]).every(s => s.income === 0 && s.expense === 0) && (
          <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 font-bold">هنوز هیچ تراکنشی ثبت نشده است</p>
          </div>
        )}
      </div>

      <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 py-6 px-8">
          <CardTitle className="text-xl font-black text-slate-900">دفترچه هزینه‌های شخصی</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-100 font-bold px-3 py-1">
              حساب شخصی (مجزا از شرکت)
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="font-bold text-slate-900 py-6">تاریخ</TableHead>
                  <TableHead className="font-bold text-slate-900">نوع</TableHead>
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
                          {t.type === 'income' ? 'دریافتی' : 'هزینه شخصی'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 font-bold px-3 py-1">
                        {categories?.find(c => c.id === t.categoryId)?.name || 'نامشخص'}
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
                    <TableCell colSpan={6} className="text-center py-20">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                          <BookOpen className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-slate-400 font-medium">دفترچه هزینه‌های شخصی خالی است</p>
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
