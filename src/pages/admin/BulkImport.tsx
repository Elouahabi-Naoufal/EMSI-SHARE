import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { authExtrasAPI } from '@/services/api';
import { Upload, Download, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const BulkImport: React.FC = () => {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  if (user?.role !== 'admin' && user?.role !== 'administration') {
    return <MainLayout><Card><CardContent className="py-12 text-center text-muted-foreground">Access denied.</CardContent></Card></MainLayout>;
  }

  const handleImport = async () => {
    if (!file) { toast.error('Please select a CSV file'); return; }
    setLoading(true);
    try {
      const res = await authExtrasAPI.bulkImport(file);
      setResult(res);
      if (res.created > 0) toast.success(`${res.created} users created`);
      if (res.skipped > 0) toast.info(`${res.skipped} users skipped (already exist)`);
      if (res.errors?.length > 0) toast.error(`${res.errors.length} errors`);
    } catch { toast.error('Import failed'); }
    finally { setLoading(false); }
  };

  const downloadTemplate = () => {
    const csv = 'first_name,last_name,email,role,password\nJohn,Doe,john.doe@school.com,student,\nJane,Smith,jane.smith@school.com,teacher,';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'import_template.csv';
    link.click();
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bulk User Import</h1>
          <p className="text-muted-foreground">Import multiple users at once from a CSV file.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>CSV Format</CardTitle>
            <CardDescription>Required columns: first_name, last_name, email, role. Password is optional (auto-generated if empty).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted rounded p-3 font-mono text-xs">
              first_name,last_name,email,role,password<br />
              John,Doe,john@school.com,student,<br />
              Jane,Smith,jane@school.com,teacher,
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />Download Template
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Upload CSV</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>CSV File</Label>
              <Input type="file" accept=".csv" onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>
            <Button onClick={handleImport} disabled={loading || !file} className="w-full">
              <Upload className="h-4 w-4 mr-2" />{loading ? 'Importing...' : 'Import Users'}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader><CardTitle>Import Results</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div><p className="text-2xl font-bold text-green-600">{result.created}</p><p className="text-xs text-muted-foreground">Created</p></div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 rounded">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <div><p className="text-2xl font-bold text-yellow-600">{result.skipped}</p><p className="text-xs text-muted-foreground">Skipped</p></div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 rounded">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <div><p className="text-2xl font-bold text-red-600">{result.errors?.length || 0}</p><p className="text-xs text-muted-foreground">Errors</p></div>
                </div>
              </div>
              {result.errors?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Errors:</p>
                  {result.errors.map((e: any, i: number) => (
                    <p key={i} className="text-xs text-red-600">Row {e.row}: {e.error}</p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default BulkImport;
