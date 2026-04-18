/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { cn } from '../lib/utils';
import { Card, CardContent } from './ui/card';
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
import { Plus, UserPlus, Banknote, History, Edit, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from './ui/badge';
import { Currency, CURRENCY_LABELS, Employee, Advance } from '../types';
import { formatJalali } from '../lib/jalali';

export function Employees() {
  const activeCompanyId = localStorage.getItem('active_company_id');
  const companyId = activeCompanyId ? parseInt(activeCompanyId) : null;

  const employees = useLiveQuery(() => companyId ? db.employees.where('companyId').equals(companyId).toArray() : []);
  const allAdvances = useLiveQuery(() => companyId ? db.advances.where('companyId').equals(companyId).toArray() : []);
  
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = React.useState(false);
  const [isEditEmployeeOpen, setIsEditEmployeeOpen] = React.useState(false);
  const [isAdvanceOpen, setIsAdvanceOpen] = React.useState(false);
  const [isDeleteEmployeeConfirmOpen, setIsDeleteEmployeeConfirmOpen] = React.useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);

  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<number | null>(null);
  const [editingEmployee, setEditingEmployee] = React.useState<Employee | null>(null);
  const [deletingEmployeeId, setDeletingEmployeeId] = React.useState<number | null>(null);

  // History Edit States
  const [isEditAdvanceOpen, setIsEditAdvanceOpen] = React.useState(false);
  const [editingAdvance, setEditingAdvance] = React.useState<Advance | null>(null);

  const handleAddEmployee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!companyId) return;
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const role = formData.get('role') as string;
    const salary = Number(formData.get('salary'));
    const salaryCurrency = formData.get('salaryCurrency') as Currency;

    await db.employees.add({
      companyId,
      name,
      role,
      monthlySalary: salary,
      salaryCurrency,
      startDate: new Date().toISOString(),
      isActive: true
    });
    
    setIsAddEmployeeOpen(false);
    toast.success('کارمند جدید با موفقیت اضافه شد');
  };

  const handleEditEmployee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingEmployee) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const role = formData.get('role') as string;
    const salary = Number(formData.get('salary'));
    const salaryCurrency = formData.get('salaryCurrency') as Currency;
    const isActive = formData.get('isActive') === 'on';

    await db.employees.update(editingEmployee.id!, {
      name,
      role,
      monthlySalary: salary,
      salaryCurrency,
      isActive
    });
    
    setIsEditEmployeeOpen(false);
    toast.success('اطلاعات کارمند با موفقیت بروزرسانی شد');
  };

  const handleDeleteEmployee = async () => {
    if (deletingEmployeeId === null) return;
    await db.employees.delete(deletingEmployeeId);
    // Delete related advances
    const empAdvances = await db.advances.where('employeeId').equals(deletingEmployeeId).toArray();
    for (const a of empAdvances) await db.advances.delete(a.id!);
    
    setIsDeleteEmployeeConfirmOpen(false);
    toast.success('کارمند و تمام سوابق مربوطه حذف شدند');
  };

  const handleRepayAdvance = async (employeeId: number, currency: Currency) => {
    if (!companyId) return;
    const employeeAdvances = await db.advances
      .filter(a => a.employeeId === employeeId && !a.isRepaid && (a.currency || 'AFN') === currency)
      .toArray();
    
    if (employeeAdvances.length === 0) return;

    const totalToRepay = employeeAdvances.reduce((sum, a) => sum + a.amount, 0);

    if (!confirm(`آیا از تسویه تمام مساعده‌های این کارمند به مبلغ ${totalToRepay.toLocaleString()} ${CURRENCY_LABELS[currency]} اطمینان دارید؟`)) return;

    for (const a of employeeAdvances) {
      await db.advances.update(a.id!, { isRepaid: true });
    }

    await db.transactions.add({
      companyId,
      type: 'income',
      amount: totalToRepay,
      currency,
      description: `تسویه مساعده توسط ${employees?.find(emp => emp.id === employeeId)?.name}`,
      date: new Date().toISOString(),
      category: 'حقوق و دستمزد'
    });

    toast.success('مساعده‌ها با موفقیت تسویه شدند');
  };

  const handlePaySalary = async (employeeId: number, grossSalary: number, currency: Currency) => {
    if (!companyId) return;
    const employeeAdvances = await db.advances
      .filter(a => a.employeeId === employeeId && !a.isRepaid && (a.currency || 'AFN') === currency)
      .toArray();
    
    const totalAdvances = employeeAdvances.reduce((sum, a) => sum + a.amount, 0);
    const netSalary = grossSalary - totalAdvances;

    if (!confirm(`پرداخت حقوق (${currency}):
حقوق ناخالص: ${grossSalary.toLocaleString()}
کسر مساعده: ${totalAdvances.toLocaleString()}
خالص پرداختی: ${netSalary.toLocaleString()} ${CURRENCY_LABELS[currency]}
آیا تایید می‌کنید؟`)) return;

    for (const a of employeeAdvances) {
      await db.advances.update(a.id!, { isRepaid: true });
    }

    await db.transactions.add({
      companyId,
      type: 'expense',
      amount: netSalary,
      currency,
      description: `پرداخت حقوق خالص به ${employees?.find(emp => emp.id === employeeId)?.name} (پس از کسر ${totalAdvances.toLocaleString()} مساعده)`,
      date: new Date().toISOString(),
      category: 'حقوق و دستمزد'
    });

    toast.success('حقوق با موفقیت پرداخت و مساعده‌ها کسر شدند');
  };

  const handleAddAdvance = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedEmployeeId || !companyId) return;

    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get('amount'));
    const currency = formData.get('currency') as Currency;
    const description = formData.get('description') as string;

    await db.advances.add({
      companyId,
      employeeId: selectedEmployeeId,
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
      description: `مساعده به ${employees?.find(emp => emp.id === selectedEmployeeId)?.name}: ${description}`,
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">مدیریت کارمندان</h2>
          <p className="text-slate-500">تعریف نقش‌ها، حقوق و مدیریت مساعده‌ها (چند ارزی)</p>
        </div>
        <Dialog open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 btn-3d bg-indigo-600 hover:bg-indigo-700 text-white h-12 px-6">
              <UserPlus className="w-5 h-5" />
              افزودن کارمند جدید
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-slate-900">افزودن کارمند جدید</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddEmployee} className="space-y-6 mt-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-bold text-slate-700">نام و نام خانوادگی</Label>
                <Input id="name" name="name" required className="h-12 rounded-xl border-slate-200 focus:ring-indigo-500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role" className="text-sm font-bold text-slate-700">نقش / سمت</Label>
                <Input id="role" name="role" placeholder="مثلا: توسعه‌دهنده ارشد" required className="h-12 rounded-xl border-slate-200 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salary" className="text-sm font-bold text-slate-700">حقوق ماهیانه</Label>
                  <Input id="salary" name="salary" type="number" required className="h-12 rounded-xl border-slate-200 focus:ring-indigo-500" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salaryCurrency" className="text-sm font-bold text-slate-700">واحد پول</Label>
                  <select 
                    id="salaryCurrency" 
                    name="salaryCurrency" 
                    className="w-full h-12 rounded-xl border border-slate-200 bg-background px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  >
                    {Object.entries(CURRENCY_LABELS).map(([code, label]) => (
                      <option key={code} value={code}>{label} ({code})</option>
                    ))}
                  </select>
                </div>
              </div>
              <Button type="submit" className="w-full h-12 btn-3d bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-bold">ثبت کارمند</Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Employee Dialog */}
        <Dialog open={isEditEmployeeOpen} onOpenChange={setIsEditEmployeeOpen}>
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">ویرایش اطلاعات کارمند</DialogTitle>
            </DialogHeader>
            {editingEmployee && (
              <form onSubmit={handleEditEmployee} className="space-y-6 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="font-bold">نام و نام خانوادگی</Label>
                  <Input id="edit-name" name="name" defaultValue={editingEmployee.name} required className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-role" className="font-bold">نقش / سمت</Label>
                  <Input id="edit-role" name="role" defaultValue={editingEmployee.role} required className="h-12 rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-salary" className="font-bold">حقوق ماهیانه</Label>
                    <Input id="edit-salary" name="salary" type="number" defaultValue={editingEmployee.monthlySalary} required className="h-12 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-salaryCurrency" className="text-sm font-bold text-slate-700">واحد پول</Label>
                    <select 
                      id="edit-salaryCurrency" 
                      name="salaryCurrency" 
                      defaultValue={editingEmployee.salaryCurrency || 'AFN'}
                      className="w-full h-12 rounded-xl border border-slate-200 bg-background px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                      required
                    >
                      {Object.entries(CURRENCY_LABELS).map(([code, label]) => (
                        <option key={code} value={code}>{label} ({code})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                  <input type="checkbox" id="edit-active" name="isActive" defaultChecked={editingEmployee.isActive} className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  <Label htmlFor="edit-active" className="font-bold text-slate-700 cursor-pointer">کارمند فعال است</Label>
                </div>
                <Button type="submit" className="w-full h-12 btn-3d bg-indigo-600 text-white font-bold">بروزرسانی اطلاعات</Button>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Employee */}
        <Dialog open={isDeleteEmployeeConfirmOpen} onOpenChange={setIsDeleteEmployeeConfirmOpen}>
          <DialogContent className="sm:max-w-[400px] rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-rose-500" />
                تایید حذف کارمند
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 text-center">
              <p className="font-bold text-slate-600 text-lg">آیا از حذف این کارمند اطمینان دارید؟</p>
              <p className="text-rose-500 text-sm mt-3 font-medium bg-rose-50 p-3 rounded-xl">
                تمام سوابق مساعده‌ها و اطلاعات مربوط به این کارمند نیز حذف خواهند شد. این عمل غیرقابل بازگشت است.
              </p>
            </div>
            <div className="flex gap-3 mt-4">
              <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold" onClick={() => setIsDeleteEmployeeConfirmOpen(false)}>انصراف</Button>
              <Button className="flex-1 h-12 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold" onClick={handleDeleteEmployee}>بله، حذف کامل</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Employee History Dialog */}
        <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <DialogContent className="max-w-4xl rounded-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">سوابق مساعده‌های {employees?.find(e => e.id === selectedEmployeeId)?.name}</DialogTitle>
            </DialogHeader>
            <div className="mt-6 space-y-6">
              <div className="rounded-2xl border border-slate-100 overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold">تاریخ</TableHead>
                      <TableHead className="font-bold">مبلغ</TableHead>
                      <TableHead className="font-bold">ارز</TableHead>
                      <TableHead className="font-bold">وضعیت</TableHead>
                      <TableHead className="font-bold">توضیحات</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(allAdvances?.filter(a => a.employeeId === selectedEmployeeId) || [])
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((rec: any) => (
                      <TableRow key={rec.id}>
                        <TableCell className="text-xs font-bold">{formatJalali(rec.date)}</TableCell>
                        <TableCell className="font-black text-sm">{rec.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-xs font-bold text-slate-400">{rec.currency}</TableCell>
                        <TableCell>
                          <Badge variant={rec.isRepaid ? 'outline' : 'destructive'} className="font-bold text-[10px]">
                            {rec.isRepaid ? 'تسویه شده' : 'پرداخت نشده'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 max-w-[150px] truncate">{rec.description}</TableCell>
                        <TableCell className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-8 h-8 text-slate-300 hover:text-indigo-600"
                            onClick={() => { setEditingAdvance(rec); setIsEditAdvanceOpen(true); }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-8 h-8 text-slate-300 hover:text-rose-500"
                            onClick={async () => {
                              if (!confirm('آیا از حذف این مساعده اطمینان دارید؟')) return;
                              await db.advances.delete(rec.id);
                              toast.success('مساعده حذف شد');
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

        {/* Edit Advance Dialog */}
        <Dialog open={isEditAdvanceOpen} onOpenChange={setIsEditAdvanceOpen}>
          <DialogContent className="rounded-3xl">
            <DialogHeader><DialogTitle className="text-xl font-black">ویرایش مساعده کارمند</DialogTitle></DialogHeader>
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

      </div>

      <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="w-[200px] font-bold text-slate-900 py-6">نام کارمند</TableHead>
                  <TableHead className="font-bold text-slate-900">نقش</TableHead>
                  <TableHead className="font-bold text-slate-900">حقوق ماهیانه</TableHead>
                  <TableHead className="font-bold text-slate-900">مساعده‌ها</TableHead>
                  <TableHead className="font-bold text-slate-900">وضعیت</TableHead>
                  <TableHead className="text-left font-bold text-slate-900">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                  {employees?.map((employee) => {
                    const unpaidAdvances = allAdvances
                      ?.filter(a => a.employeeId === employee.id && !a.isRepaid && (a.currency || 'AFN') === (employee.salaryCurrency || 'AFN'))
                      .reduce((sum, a) => sum + a.amount, 0) || 0;

                  return (
                    <TableRow key={employee.id} className="group hover:bg-slate-50/50 transition-colors border-slate-50">
                      <TableCell className="font-bold text-slate-900 py-6">{employee.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 font-bold px-3 py-1">
                          {employee.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold text-slate-700">{employee.monthlySalary.toLocaleString()} <small className="text-[10px] font-normal">{CURRENCY_LABELS[employee.salaryCurrency || 'AFN']}</small></TableCell>
                      <TableCell>
                        {unpaidAdvances > 0 ? (
                          <Badge variant="destructive" className="font-bold px-3 py-1 rounded-full">
                            {unpaidAdvances.toLocaleString()} <small className="text-[10px] mr-1">{CURRENCY_LABELS[employee.salaryCurrency || 'AFN']}</small>
                          </Badge>
                        ) : (
                          <span className="text-slate-300 text-xs font-medium">تسویه شده</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={employee.isActive ? 'secondary' : 'outline'} className={cn(
                          "font-bold px-3 py-1 rounded-xl",
                          employee.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
                        )}>
                          {employee.isActive ? 'فعال' : 'غیرفعال'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-left flex items-center justify-end gap-2 py-6">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-10 h-10 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-emerald-50"
                            title="تاریخچه مساعده‌ها"
                            onClick={() => {
                              setSelectedEmployeeId(employee.id!);
                              setIsHistoryOpen(true);
                            }}
                          >
                            <History className="w-5 h-5 text-indigo-500" />
                          </Button>

                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-10 h-10 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                            onClick={() => {
                              setEditingEmployee(employee);
                              setIsEditEmployeeOpen(true);
                            }}
                          >
                            <Edit className="w-5 h-5" />
                          </Button>

                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-10 h-10 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            onClick={() => {
                              setDeletingEmployeeId(employee.id!);
                              setIsDeleteEmployeeConfirmOpen(true);
                            }}
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </div>

                        <div className="h-8 w-px bg-slate-100 mx-1" />

                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-10 h-10 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                            title="پرداخت حقوق"
                            onClick={() => handlePaySalary(employee.id!, employee.monthlySalary, employee.salaryCurrency || 'AFN')}
                          >
                            <History className="w-5 h-5" />
                          </Button>

                          {unpaidAdvances > 0 && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="w-10 h-10 rounded-xl text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50"
                              title="تسویه مساعده‌ها"
                              onClick={() => handleRepayAdvance(employee.id!, employee.salaryCurrency || 'AFN')}
                            >
                              <CheckCircle2 className="w-5 h-5" />
                            </Button>
                          )}
                        </div>

                        <Dialog open={isAdvanceOpen && selectedEmployeeId === employee.id} onOpenChange={(open) => {
                          setIsAdvanceOpen(open);
                          if (open) setSelectedEmployeeId(employee.id!);
                        }}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2 btn-3d h-10 px-4 rounded-xl border-slate-200 font-bold text-slate-700">
                              <Banknote className="w-4 h-4" />
                              ثبت مساعده
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="rounded-3xl">
                            <DialogHeader>
                              <DialogTitle className="text-2xl font-black">ثبت مساعده برای {employee.name}</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleAddAdvance} className="space-y-6 mt-6">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="amount" className="font-bold">مبلغ مساعده</Label>
                                  <Input id="amount" name="amount" type="number" required className="h-12 rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="currency" className="font-bold">واحد پول</Label>
                                  <select 
                                    id="currency" 
                                    name="currency" 
                                    defaultValue={employee.salaryCurrency || 'AFN'}
                                    className="w-full h-12 rounded-xl border border-slate-200 bg-background px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                                    required
                                  >
                                    {Object.entries(CURRENCY_LABELS).map(([code, label]) => (
                                      <option key={code} value={code}>{label} ({code})</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="description" className="font-bold">توضیحات</Label>
                                <Input id="description" name="description" placeholder="مثلا: مساعده فروردین ماه" className="h-12 rounded-xl" />
                              </div>
                              <Button type="submit" className="w-full h-12 btn-3d bg-amber-600 text-white font-bold text-lg">ثبت مساعده</Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(!employees || employees.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-20">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                          <UserPlus className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-slate-400 font-medium">هیچ کارمندی ثبت نشده است</p>
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
