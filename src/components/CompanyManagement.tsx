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
import { Plus, Building2, Trash2, Calendar, FileText, ArrowRightCircle, Edit, AlertCircle } from 'lucide-react';
import { Company } from '../types';
import { toast } from 'sonner';
import { formatJalali } from '../lib/jalali';

export function CompanyManagement() {
  const companies = useLiveQuery(() => db.companies.toArray());
  const [isAddCompanyOpen, setIsAddCompanyOpen] = React.useState(false);
  const [isEditCompanyOpen, setIsEditCompanyOpen] = React.useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);
  const [editingCompany, setEditingCompany] = React.useState<Company | null>(null);
  const [deletingCompanyId, setDeletingCompanyId] = React.useState<number | null>(null);

  const handleAddCompany = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    await db.companies.add({
      name,
      description,
      registrationDate: new Date().toISOString()
    });
    
    setIsAddCompanyOpen(false);
    toast.success('شرکت جدید با موفقیت ثبت شد');
  };

  const handleEditCompany = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingCompany) return;
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    await db.companies.update(editingCompany.id!, {
      name,
      description
    });
    
    setIsEditCompanyOpen(false);
    toast.success('اطلاعات شرکت بروزرسانی شد');
  };

  const handleDeleteCompany = async () => {
    if (deletingCompanyId === null) return;
    const count = await db.companies.count();
    if (count <= 1) {
      toast.error('حداقل یک شرکت باید در سیستم باقی بماند');
      setIsDeleteConfirmOpen(false);
      return;
    }

    await db.companies.delete(deletingCompanyId);
    
    if (localStorage.getItem('active_company_id') === deletingCompanyId.toString()) {
      const first = await db.companies.toCollection().first();
      if (first) {
        localStorage.setItem('active_company_id', first.id!.toString());
        window.location.reload();
      }
    }
    
    setIsDeleteConfirmOpen(false);
    toast.success('شرکت حذف شد');
  };

  const handleSwitchCompany = (id: number) => {
    localStorage.setItem('active_company_id', id.toString());
    window.location.reload();
    toast.success('شرکت فعال تغییر کرد');
  };

  const activeCompanyId = localStorage.getItem('active_company_id');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">مدیریت شرکت‌ها</h2>
          <p className="text-slate-500">ثبت و مدیریت چندین شرکت و کسب‌وکار به صورت مجزا</p>
        </div>
        <Dialog open={isAddCompanyOpen} onOpenChange={setIsAddCompanyOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 btn-3d bg-indigo-600 hover:bg-indigo-700 text-white h-12 px-6">
              <Plus className="w-5 h-5" />
              ثبت شرکت جدید
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-slate-900">ثبت شرکت جدید</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddCompany} className="space-y-6 mt-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="font-bold">نام شرکت</Label>
                <Input id="name" name="name" required className="h-12 rounded-xl" placeholder="مثلا: شرکت بازرگانی کتابستان" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="font-bold">توضیحات کوتاه</Label>
                <Input id="description" name="description" className="h-12 rounded-xl" placeholder="زمینه فعالیت شرکت" />
              </div>
              <Button type="submit" className="w-full h-12 btn-3d bg-indigo-600 text-white font-bold text-lg">ذخیره شرکت</Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Company Dialog */}
        <Dialog open={isEditCompanyOpen} onOpenChange={setIsEditCompanyOpen}>
          <DialogContent className="sm:max-w-[425px] rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-slate-900">ویرایش اطلاعات شرکت</DialogTitle>
            </DialogHeader>
            {editingCompany && (
              <form onSubmit={handleEditCompany} className="space-y-6 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="font-bold">نام شرکت</Label>
                  <Input id="edit-name" name="name" defaultValue={editingCompany.name} required className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description" className="font-bold">توضیحات کوتاه</Label>
                  <Input id="edit-description" name="description" defaultValue={editingCompany.description} className="h-12 rounded-xl" />
                </div>
                <Button type="submit" className="w-full h-12 btn-3d bg-indigo-600 text-white font-bold text-lg">بروزرسانی تغییرات</Button>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
          <DialogContent className="sm:max-w-[400px] rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-rose-500" />
                تایید حذف شرکت
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-slate-600 font-bold">
                آیا از حذف این شرکت اطمینان دارید؟ 
              </p>
              <p className="text-rose-500 text-sm mt-2 font-medium">
                توجه: این عمل غیرقابل بازگشت است و تمام داده‌های مالی مربوط به این شرکت حذف خواهند شد.
              </p>
            </div>
            <div className="flex gap-3 mt-4">
              <Button 
                variant="outline" 
                className="flex-1 h-12 rounded-xl font-bold"
                onClick={() => setIsDeleteConfirmOpen(false)}
              >
                انصراف
              </Button>
              <Button 
                className="flex-1 h-12 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
                onClick={handleDeleteCompany}
              >
                بله، حذف شود
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
          <CardHeader className="border-b border-slate-50 py-6 px-8">
            <CardTitle className="text-xl font-black text-slate-900">لیست شرکت‌های ثبت شده</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="font-bold text-slate-900 py-6">نام شرکت</TableHead>
                    <TableHead className="font-bold text-slate-900">تاریخ ثبت</TableHead>
                    <TableHead className="font-bold text-slate-900">توضیحات</TableHead>
                    <TableHead className="font-bold text-slate-900 text-center">وضعیت</TableHead>
                    <TableHead className="w-[150px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies?.map((company) => (
                    <TableRow key={company.id} className="group hover:bg-slate-50/50 transition-colors border-slate-50">
                      <TableCell className="py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-indigo-600" />
                          </div>
                          <span className="font-bold text-slate-900">{company.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500 font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 opacity-40" />
                          {formatJalali(company.registrationDate)}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500 font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 opacity-40" />
                          {company.description || '---'}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {activeCompanyId === company.id?.toString() ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black">
                            شرکت فعال
                          </span>
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-indigo-600 hover:bg-indigo-50 font-bold"
                            onClick={() => handleSwitchCompany(company.id!)}
                          >
                            <ArrowRightCircle className="w-4 h-4 ml-1" />
                            سوئیچ به این شرکت
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-left py-6">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-10 h-10 rounded-xl text-slate-300 hover:text-indigo-600 hover:bg-indigo-50"
                            onClick={() => {
                              setEditingCompany(company);
                              setIsEditCompanyOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-10 h-10 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                            onClick={() => {
                              setDeletingCompanyId(company.id!);
                              setIsDeleteConfirmOpen(true);
                            }}
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
