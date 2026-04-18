/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { useFinancials } from '../hooks/useFinancials';
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
import { Plus, Wallet, History, AlertCircle, Edit, Trash2, Banknote, Coins, Terminal } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';
import { Users, FileText, Calendar } from 'lucide-react';
import { Currency, CURRENCY_LABELS, Partner, Advance, PartnerWithdrawal } from '../types';
import { formatJalali } from '../lib/jalali';

export function Partners() {
  const activeCompanyId = localStorage.getItem('active_company_id');
  const companyId = activeCompanyId ? parseInt(activeCompanyId) : null;

  const partners = useLiveQuery(() => companyId ? db.partners.where('companyId').equals(companyId).toArray() : []);
  const allAdvances = useLiveQuery(() => companyId ? db.advances.where('companyId').equals(companyId).toArray() : []);
  const allWithdrawals = useLiveQuery(() => companyId ? db.withdrawals.where('companyId').equals(companyId).toArray() : []);
  const summary = useFinancials();
  
  const [isAddPartnerOpen, setIsAddPartnerOpen] = React.useState(false);
  const [isEditPartnerOpen, setIsEditPartnerOpen] = React.useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = React.useState(false);
  const [isAdvanceOpen, setIsAdvanceOpen] = React.useState(false);
  const [isDeletePartnerConfirmOpen, setIsDeletePartnerConfirmOpen] = React.useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);
  
  const [selectedPartnerId, setSelectedPartnerId] = React.useState<number | null>(null);
  const [editingPartner, setEditingPartner] = React.useState<Partner | null>(null);
  const [deletingPartnerId, setDeletingPartnerId] = React.useState<number | null>(null);

  // History Edit States
  const [isEditAdvanceOpen, setIsEditAdvanceOpen] = React.useState(false);
  const [editingAdvance, setEditingAdvance] = React.useState<Advance | null>(null);
  const [isEditWithdrawalOpen, setIsEditWithdrawalOpen] = React.useState(false);
  const [editingWithdrawal, setEditingWithdrawal] = React.useState<PartnerWithdrawal | null>(null);

  const handleAddPartner = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!companyId) return;
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const share = Number(formData.get('share'));
    const salary = Number(formData.get('salary')) || 0;
    const salaryCurrency = formData.get('salaryCurrency') as Currency;

    const totalShare = (partners?.reduce((sum, p) => sum + p.sharePercentage, 0) || 0) + share;
    if (totalShare > 100) {
      toast.error('مجموع سهم‌ها نمی‌تواند بیشتر از ۱۰۰ درصد باشد');
      return;
    }

    await db.partners.add({
      companyId,
      name,
      sharePercentage: share,
      monthlySalary: salary,
      salaryCurrency,
      joinDate: new Date().toISOString()
    });
    
    setIsAddPartnerOpen(false);
    toast.success('شریک جدید با موفقیت اضافه شد');
  };

  const handleEditPartner = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPartner) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const share = Number(formData.get('share'));
    const salary = Number(formData.get('salary')) || 0;
    const salaryCurrency = formData.get('salaryCurrency') as Currency;

    const otherPartnersShare = partners
      ?.filter(p => p.id !== editingPartner.id)
      .reduce((sum, p) => sum + p.sharePercentage, 0) || 0;

    if (otherPartnersShare + share > 100) {
      toast.error('مجموع سهم‌ها نمی‌تواند بیشتر از ۱۰۰ درصد باشد');
      return;
    }

    await db.partners.update(editingPartner.id!, {
      name,
      sharePercentage: share,
      monthlySalary: salary,
      salaryCurrency
    });
    
    setIsEditPartnerOpen(false);
    toast.success('اطلاعات شریک با موفقیت بروزرسانی شد');
  };

  const handleDeletePartner = async () => {
    if (deletingPartnerId === null) return;
    
    await db.partners.delete(deletingPartnerId);
    // Delete withdrawals/advances
    const partnerWithdrawals = await db.withdrawals.where('partnerId').equals(deletingPartnerId).toArray();
    for (const w of partnerWithdrawals) await db.withdrawals.delete(w.id!);
    const partnerAdvances = await db.advances.where('partnerId').equals(deletingPartnerId).toArray();
    for (const a of partnerAdvances) await db.advances.delete(a.id!);
    
    setIsDeletePartnerConfirmOpen(false);
    toast.success('شریک و تمام سوابق مربوطه حذف شدند');
  };

  const handleAddAdvance = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPartnerId || !companyId) return;

    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get('amount'));
    const currency = formData.get('currency') as Currency;
    const description = formData.get('description') as string;

    await db.advances.add({
      companyId,
      partnerId: selectedPartnerId,
      amount,
      currency,
      description,
      date: new Date().toISOString(),
      isRepaid: false
    });

    await db.transactions.add({
      companyId,
      type: 'expense',
      amount,
      currency,
      description: `مساعده حقوق به شریک (${partners?.find(p => p.id === selectedPartnerId)?.name}): ${description}`,
      date: new Date().toISOString(),
      category: 'حقوق و دستمزد'
    });

    setIsAdvanceOpen(false);
    toast.success('مساعده با موفقیت ثبت شد');
  };

  const handleEditAdvance = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingAdvance) return;
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get('amount'));
    const currency = formData.get('currency') as Currency;
    const description = formData.get('description') as string;

    await db.advances.update(editingAdvance.id!, {
      amount,
      currency,
      description
    });
    
    setIsEditAdvanceOpen(false);
    toast.success('مساعده بروزرسانی شد');
  };

  const handleEditWithdrawal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingWithdrawal) return;
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get('amount'));
    const currency = formData.get('currency') as Currency;
    const description = formData.get('description') as string;
    const type = formData.get('type') as any;

    await db.withdrawals.update(editingWithdrawal.id!, {
      amount,
      currency,
      description,
      type
    });
    
    setIsEditWithdrawalOpen(false);
    toast.success('تراکنش بروزرسانی شد');
  };

  const handlePaySalary = async (partnerId: number, grossSalary: number, currency: Currency) => {
    if (!companyId) return;
    const partnerAdvances = await db.advances
      .filter(a => a.partnerId === partnerId && !a.isRepaid && (a.currency || 'AFN') === currency)
      .toArray();
    
    const totalAdvances = partnerAdvances.reduce((sum, a) => sum + a.amount, 0);
    const netSalary = grossSalary - totalAdvances;

    if (!confirm(`پرداخت حقوق شریک (${currency}):
حقوق ناخالص: ${grossSalary.toLocaleString()}
کسر مساعده: ${totalAdvances.toLocaleString()}
خالص پرداختی: ${netSalary.toLocaleString()} ${CURRENCY_LABELS[currency]}
آیا تایید می‌کنید؟`)) return;

    for (const a of partnerAdvances) {
      await db.advances.update(a.id!, { isRepaid: true });
    }

    await db.transactions.add({
      companyId,
      type: 'expense',
      amount: netSalary,
      currency,
      description: `پرداخت حقوق خالص به شریک (${partners?.find(p => p.id === partnerId)?.name})`,
      date: new Date().toISOString(),
      category: 'حقوق و دستمزد'
    });

    toast.success('حقوق شریک با موفقیت پرداخت شد');
  };

  const handleWithdraw = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPartnerId || !companyId) return;

    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get('amount'));
    const currency = formData.get('currency') as Currency;
    const description = formData.get('description') as string;
    const type = formData.get('type') as any;

    await db.withdrawals.add({
      companyId,
      partnerId: selectedPartnerId,
      amount,
      currency,
      description,
      type,
      date: new Date().toISOString()
    });

    setIsWithdrawOpen(false);
    toast.success('تراکنش با موفقیت ثبت شد');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">مدیریت شرکا</h2>
          <p className="text-slate-500">مشاهده سهم، سود و برداشت‌های شرکا (چند ارزی)</p>
        </div>
        <Dialog open={isAddPartnerOpen} onOpenChange={setIsAddPartnerOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 btn-3d bg-indigo-600 hover:bg-indigo-700 text-white h-12 px-6">
              <Plus className="w-5 h-5" />
              افزودن شریک جدید
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-slate-900">افزودن شریک جدید</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddPartner} className="space-y-6 mt-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-bold text-slate-700">نام و نام خانوادگی</Label>
                <Input id="name" name="name" required className="h-12 rounded-xl border-slate-200 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="share" className="text-sm font-bold text-slate-700">درصد سهم</Label>
                  <Input id="share" name="share" type="number" min="1" max="100" required className="h-12 rounded-xl border-slate-200 focus:ring-indigo-500" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salary" className="text-sm font-bold text-slate-700">مبلغ حقوق</Label>
                  <Input id="salary" name="salary" type="number" placeholder="اختیاری" className="h-12 rounded-xl border-slate-200 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="salaryCurrency" className="text-sm font-bold text-slate-700">واحد پول حقوق</Label>
                <select 
                  id="salaryCurrency" 
                  name="salaryCurrency" 
                  className="w-full h-12 rounded-xl border border-slate-200 bg-background px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {Object.entries(CURRENCY_LABELS).map(([code, label]) => (
                    <option key={code} value={code}>{label} ({code})</option>
                  ))}
                </select>
              </div>
              <Button type="submit" className="w-full h-12 btn-3d bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-bold">ثبت شریک</Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Partner Dialog */}
        <Dialog open={isEditPartnerOpen} onOpenChange={setIsEditPartnerOpen}>
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">ویرایش اطلاعات شریک</DialogTitle>
            </DialogHeader>
            {editingPartner && (
              <form onSubmit={handleEditPartner} className="space-y-6 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="font-bold">نام و نام خانوادگی</Label>
                  <Input id="edit-name" name="name" defaultValue={editingPartner.name} required className="h-12 rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-share" className="font-bold">درصد سهم</Label>
                    <Input id="edit-share" name="share" type="number" min="1" max="100" defaultValue={editingPartner.sharePercentage} required className="h-12 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-salary" className="font-bold">مبلغ حقوق</Label>
                    <Input id="edit-salary" name="salary" type="number" defaultValue={editingPartner.monthlySalary} className="h-12 rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-salaryCurrency" className="text-sm font-bold text-slate-700">واحد پول حقوق</Label>
                  <select 
                    id="edit-salaryCurrency" 
                    name="salaryCurrency" 
                    defaultValue={editingPartner.salaryCurrency || 'AFN'}
                    className="w-full h-12 rounded-xl border border-slate-200 bg-background px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {Object.entries(CURRENCY_LABELS).map(([code, label]) => (
                      <option key={code} value={code}>{label} ({code})</option>
                    ))}
                  </select>
                </div>
                <Button type="submit" className="w-full h-12 btn-3d bg-indigo-600 text-white font-bold">بروزرسانی اطلاعات</Button>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Partner */}
        <Dialog open={isDeletePartnerConfirmOpen} onOpenChange={setIsDeletePartnerConfirmOpen}>
          <DialogContent className="sm:max-w-[400px] rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-rose-500" />
                تایید حذف شریک
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 text-center space-y-3">
              <p className="font-bold text-slate-600">آیا از حذف این شریک اطمینان دارید؟</p>
              <p className="text-rose-500 text-sm font-medium bg-rose-50 p-3 rounded-xl">
                تمام تراکنش‌ها، برداشت‌ها و مساعده‌های مربوط به این شریک نیز حذف خواهند شد. این عمل غیرقابل بازگشت است.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold" onClick={() => setIsDeletePartnerConfirmOpen(false)}>انصراف</Button>
              <Button className="flex-1 h-12 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold" onClick={handleDeletePartner}>بله، حذف کامل</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Partner History Dialog */}
        <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <DialogContent className="max-w-4xl rounded-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">سوابق تراکنش‌های {partners?.find(p => p.id === selectedPartnerId)?.name}</DialogTitle>
            </DialogHeader>
            <div className="mt-6 space-y-6">
              <div className="rounded-2xl border border-slate-100 overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold">تاریخ</TableHead>
                      <TableHead className="font-bold">نوع</TableHead>
                      <TableHead className="font-bold">مبلغ</TableHead>
                      <TableHead className="font-bold">ارز</TableHead>
                      <TableHead className="font-bold">توضیحات</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      ...(allAdvances?.filter(a => a.partnerId === selectedPartnerId) || []).map(a => ({ ...a, recordType: 'advance' })),
                      ...(allWithdrawals?.filter(w => w.partnerId === selectedPartnerId) || []).map(w => ({ ...w, recordType: 'withdrawal' }))
                    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((rec: any) => (
                      <TableRow key={`${rec.recordType}-${rec.id}`}>
                        <TableCell className="text-xs font-bold">{formatJalali(rec.date)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(
                            "font-bold text-[10px]",
                            rec.recordType === 'advance' ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-indigo-50 text-indigo-600 border-indigo-200"
                          )}>
                            {rec.recordType === 'advance' ? 'مساعده' : (rec.type === 'withdrawal' ? 'برداشت سود' : 'واریز/بازپرداخت')}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-black text-sm">{rec.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-xs font-bold text-slate-400">{rec.currency}</TableCell>
                        <TableCell className="text-xs text-slate-500 max-w-[150px] truncate">{rec.description}</TableCell>
                        <TableCell className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-8 h-8 text-slate-300 hover:text-indigo-600"
                            onClick={() => {
                              if (rec.recordType === 'advance') { setEditingAdvance(rec); setIsEditAdvanceOpen(true); }
                              else { setEditingWithdrawal(rec); setIsEditWithdrawalOpen(true); }
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-8 h-8 text-slate-300 hover:text-rose-500"
                            onClick={async () => {
                              if (!confirm('آیا از حذف این رکورد اطمینان دارید؟')) return;
                              if (rec.recordType === 'advance') await db.advances.delete(rec.id);
                              else await db.withdrawals.delete(rec.id);
                              toast.success('رکورد حذف شد');
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Advance/Withdrawal Dialogs */}
        <Dialog open={isEditAdvanceOpen} onOpenChange={setIsEditAdvanceOpen}>
          <DialogContent className="rounded-3xl">
            <DialogHeader><DialogTitle className="text-xl font-black">ویرایش مساعده</DialogTitle></DialogHeader>
            {editingAdvance && (
              <form onSubmit={handleEditAdvance} className="space-y-6 mt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold">مبلغ</Label>
                    <Input name="amount" type="number" defaultValue={editingAdvance.amount} required className="h-12 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">ارز</Label>
                    <select name="currency" defaultValue={editingAdvance.currency || 'AFN'} className="w-full h-12 rounded-xl border px-3">
                      {Object.keys(CURRENCY_LABELS).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">توضیحات</Label>
                  <Input name="description" defaultValue={editingAdvance.description} className="h-12 rounded-xl" />
                </div>
                <Button type="submit" className="w-full h-12 bg-indigo-600 text-white font-bold rounded-xl">ذخیره تغییرات</Button>
              </form>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={isEditWithdrawalOpen} onOpenChange={setIsEditWithdrawalOpen}>
          <DialogContent className="rounded-3xl">
            <DialogHeader><DialogTitle className="text-xl font-black">ویرایش تراکنش شریک</DialogTitle></DialogHeader>
            {editingWithdrawal && (
              <form onSubmit={handleEditWithdrawal} className="space-y-6 mt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold">مبلغ</Label>
                    <Input name="amount" type="number" defaultValue={editingWithdrawal.amount} required className="h-12 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">نوع</Label>
                    <select name="type" defaultValue={editingWithdrawal.type} className="w-full h-12 rounded-xl border px-3">
                      <option value="withdrawal">برداشت سود</option>
                      <option value="loan_repayment">واریز بدهی</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">واحد پول</Label>
                  <select name="currency" defaultValue={editingWithdrawal.currency || 'AFN'} className="w-full h-12 rounded-xl border px-3">
                    {Object.keys(CURRENCY_LABELS).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">توضیحات</Label>
                  <Input name="description" defaultValue={editingWithdrawal.description} className="h-12 rounded-xl" />
                </div>
                <Button type="submit" className="w-full h-12 bg-indigo-600 text-white font-bold rounded-xl">ذخیره تغییرات</Button>
              </form>
            )}
          </DialogContent>
        </Dialog>

      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="w-[200px] font-bold text-slate-900 py-6">نام شریک</TableHead>
                    <TableHead className="font-bold text-slate-900">سهم</TableHead>
                    <TableHead className="font-bold text-slate-900">حقوق ماهیانه</TableHead>
                    <TableHead className="font-bold text-slate-900">وضعیت حساب (ارزها)</TableHead>
                    <TableHead className="text-left font-bold text-slate-900">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partners?.map((partner) => {
                    const ps = summary?.partnerShares.find(s => s.partnerId === partner.id);
                    
                    return (
                      <TableRow key={partner.id} className="group hover:bg-slate-50/50 transition-colors border-slate-50">
                        <TableCell className="font-bold text-slate-900 py-6">{partner.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-indigo-50/50 text-indigo-700 border-indigo-100 font-bold px-3 py-1">
                            {partner.sharePercentage}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {partner.monthlySalary ? (
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-700">{partner.monthlySalary.toLocaleString()} <small className="text-[10px] font-normal">{CURRENCY_LABELS[partner.salaryCurrency || 'AFN']}</small></span>
                              {allAdvances?.filter(a => a.partnerId === partner.id && !a.isRepaid && (a.currency || 'AFN') === (partner.salaryCurrency || 'AFN')).length > 0 && (
                                <span className="text-[10px] font-bold text-rose-500 mt-1 bg-rose-50 w-fit px-2 py-0.5 rounded-full">دارای مساعده</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300 text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-2 py-2">
                            {(['AFN', 'USD', 'IRT'] as Currency[]).map(curr => {
                              const share = ps?.shares[curr];
                              if (!share || (share.shareAmount === 0 && share.totalWithdrawn === 0)) return null;
                              const isLoan = share.balance < 0;
                              return (
                                <div key={curr} className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-[10px] font-black">{curr}</Badge>
                                  <Badge variant={isLoan ? 'destructive' : 'secondary'} className={cn(
                                    "gap-1.5 px-2 py-1 font-bold rounded-lg text-[10px]",
                                    !isLoan && "bg-emerald-50 text-emerald-700 border-emerald-100"
                                  )}>
                                    {Math.abs(share.balance).toLocaleString()}
                                    <span className="opacity-70 mr-1">({isLoan ? 'بدهکار' : 'طلبکار'})</span>
                                  </Badge>
                                </div>
                              );
                            })}
                            {(!ps || Object.values(ps.shares).every(s => s.shareAmount === 0 && s.totalWithdrawn === 0)) && (
                              <span className="text-slate-300 text-xs">بدون تراکنش</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-left flex items-center justify-end gap-2 py-6">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="w-10 h-10 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-emerald-50"
                              title="تاریخچه تراکنش‌ها"
                              onClick={() => {
                                setSelectedPartnerId(partner.id!);
                                setIsHistoryOpen(true);
                              }}
                            >
                              <History className="w-5 h-5 text-indigo-500" />
                            </Button>

                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="w-10 h-10 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-50"
                              onClick={() => {
                                setEditingPartner(partner);
                                setIsEditPartnerOpen(true);
                              }}
                            >
                              <Edit className="w-5 h-5" />
                            </Button>

                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="w-10 h-10 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              onClick={() => {
                                setDeletingPartnerId(partner.id!);
                                setIsDeletePartnerConfirmOpen(true);
                              }}
                            >
                              <Trash2 className="w-5 h-5" />
                            </Button>
                          </div>

                          <div className="h-8 w-px bg-slate-100 mx-1" />

                          {partner.monthlySalary && partner.monthlySalary > 0 && (
                            <div className="flex items-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="w-10 h-10 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                                title="پرداخت حقوق شریک"
                                onClick={() => handlePaySalary(partner.id!, partner.monthlySalary!, partner.salaryCurrency || 'AFN')}
                              >
                                <History className="w-5 h-5" />
                              </Button>

                              <Dialog open={isAdvanceOpen && selectedPartnerId === partner.id} onOpenChange={(open) => {
                                setIsAdvanceOpen(open);
                                if (open) setSelectedPartnerId(partner.id!);
                              }}>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50" title="ثبت مساعده حقوق">
                                    <Banknote className="w-5 h-5" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="rounded-3xl">
                                  <DialogHeader>
                                    <DialogTitle className="text-2xl font-black">ثبت مساعده برای {partner.name}</DialogTitle>
                                  </DialogHeader>
                                  <form onSubmit={handleAddAdvance} className="space-y-6 mt-6">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label htmlFor="adv-amount" className="font-bold">مبلغ مساعده</Label>
                                        <Input id="adv-amount" name="amount" type="number" required className="h-12 rounded-xl" />
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="adv-currency" className="font-bold">واحد پول</Label>
                                        <select 
                                          id="adv-currency" 
                                          name="currency" 
                                          defaultValue={partner.salaryCurrency || 'AFN'}
                                          className="w-full h-12 rounded-xl border border-slate-200 bg-background px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                                        >
                                          {Object.entries(CURRENCY_LABELS).map(([code, label]) => (
                                            <option key={code} value={code}>{label} ({code})</option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="adv-description" className="font-bold">توضیحات</Label>
                                      <Input id="adv-description" name="description" placeholder="مثلا: مساعده وسط ماه" className="h-12 rounded-xl" />
                                    </div>
                                    <Button type="submit" className="w-full h-12 btn-3d bg-amber-600 text-white font-bold">ثبت مساعده</Button>
                                  </form>
                                </DialogContent>
                              </Dialog>
                            </div>
                          )}

                          <Dialog open={isWithdrawOpen && selectedPartnerId === partner.id} onOpenChange={(open) => {
                            setIsWithdrawOpen(open);
                            if (open) setSelectedPartnerId(partner.id!);
                          }}>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="gap-2 btn-3d h-10 px-4 rounded-xl border-slate-200 font-bold text-slate-700">
                                <Coins className="w-4 h-4" />
                                ثبت تراکنش
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="rounded-3xl">
                              <DialogHeader>
                                <DialogTitle className="text-2xl font-black">ثبت تراکنش برای {partner.name}</DialogTitle>
                              </DialogHeader>
                              <form onSubmit={handleWithdraw} className="space-y-6 mt-6">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="type" className="font-bold">نوع تراکنش</Label>
                                    <select 
                                      id="type" 
                                      name="type" 
                                      className="w-full h-12 rounded-xl border border-slate-200 bg-background px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                      required
                                    >
                                      <option value="withdrawal">برداشت سود</option>
                                      <option value="loan_repayment">بازپرداخت بدهی (واریز)</option>
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
                                  <Input id="amount" name="amount" type="number" required className="h-12 rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="description" className="font-bold">توضیحات</Label>
                                  <Input id="description" name="description" className="h-12 rounded-xl" />
                                </div>
                                <Button type="submit" className="w-full h-12 btn-3d bg-indigo-600 text-white font-bold text-lg">ثبت نهایی تراکنش</Button>
                              </form>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(!partners || partners.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-20">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                            <Users className="w-8 h-8 text-slate-300" />
                          </div>
                          <p className="text-slate-400 font-medium">هیچ شریکی ثبت نشده است</p>
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
    </div>
  );
}
