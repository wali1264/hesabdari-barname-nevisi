/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { db } from '../lib/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Download, Upload, Trash2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { exportDB, importDB } from 'dexie-export-import';

export function Settings() {
  const handleExport = async () => {
    try {
      const blob = await exportDB(db);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ketabestan_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('فایل پشتیبان با موفقیت دانلود شد');
    } catch (error) {
      console.error(error);
      toast.error('خطا در تهیه نسخه پشتیبان');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('آیا از بازگردانی نسخه پشتیبان اطمینان دارید؟ تمام داده‌های فعلی جایگزین خواهند شد.')) {
      e.target.value = '';
      return;
    }

    try {
      await db.delete();
      await importDB(file);
      toast.success('داده‌ها با موفقیت بازگردانی شدند. برنامه را مجدداً بارگذاری کنید.');
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      console.error(error);
      toast.error('خطا در بازگردانی داده‌ها. اطمینان حاصل کنید که فایل معتبر است.');
    }
  };

  const handleClearData = async () => {
    if (!confirm('هشدار جدی: آیا از حذف تمام داده‌ها اطمینان دارید؟ این عمل غیرقابل بازگشت است.')) return;
    
    try {
      await db.partners.clear();
      await db.employees.clear();
      await db.transactions.clear();
      await db.advances.clear();
      await db.withdrawals.clear();
      toast.success('تمام داده‌ها با موفقیت حذف شدند');
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error(error);
      toast.error('خطا در حذف داده‌ها');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">تنظیمات سیستم</h2>
        <p className="text-slate-500">مدیریت داده‌ها، پشتیبان‌گیری و امنیت برنامه</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-md card-hover bg-white overflow-hidden">
          <div className="h-2 bg-blue-500" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Download className="w-5 h-5" />
              پشتیبان‌گیری
            </CardTitle>
            <CardDescription>
              یک نسخه کامل از تمام داده‌های خود را برای نگهداری در محلی امن دانلود کنید.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleExport} className="w-full gap-2 btn-3d bg-blue-600 hover:bg-blue-700 text-white h-12">
              <Download className="w-5 h-5" />
              دانلود فایل پشتیبان
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md card-hover bg-white overflow-hidden">
          <div className="h-2 bg-emerald-500" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-700">
              <Upload className="w-5 h-5" />
              بازگردانی داده‌ها
            </CardTitle>
            <CardDescription>
              فایل پشتیبانی که قبلاً تهیه کرده‌اید را برای بازگردانی اطلاعات انتخاب کنید.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <input 
                type="file" 
                accept=".json" 
                onChange={handleImport}
                className="hidden" 
                id="import-file"
              />
              <Button asChild variant="outline" className="w-full gap-2 btn-3d border-emerald-200 text-emerald-700 hover:bg-emerald-50 h-12 cursor-pointer">
                <label htmlFor="import-file">
                  <Upload className="w-5 h-5" />
                  انتخاب فایل و بازگردانی
                </label>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md card-hover bg-rose-50/50 md:col-span-2 overflow-hidden">
          <div className="h-2 bg-rose-500" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-rose-700">
              <ShieldAlert className="w-5 h-5" />
              منطقه خطر
            </CardTitle>
            <CardDescription className="text-rose-600/80">
              عملیات زیر غیرقابل بازگشت هستند. لطفاً با احتیاط عمل کنید.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-center gap-6">
            <Button onClick={handleClearData} variant="destructive" className="gap-2 btn-3d h-12 px-8">
              <Trash2 className="w-5 h-5" />
              حذف کامل تمام اطلاعات
            </Button>
            <div className="flex-1 p-4 bg-white/50 rounded-lg border border-rose-100">
              <p className="text-sm text-rose-600 font-medium">
                * توجه: با کلیک بر روی این دکمه، تمام شرکا، کارمندان و تراکنش‌ها برای همیشه پاک خواهند شد.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}
