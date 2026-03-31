import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { auditLogsAPI } from '@/services/api';
import { Download } from 'lucide-react';

const ACTION_TYPES = [
  'user_created', 'user_deleted', 'user_role_changed', 'resource_approved',
  'resource_rejected', 'grade_added', 'grade_modified', 'assignment_graded',
  'settings_changed', 'bulk_import', 'certificate_issued', 'login', 'logout',
];

const AuditLogs: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => {
    if (user?.role !== 'admin' && user?.role !== 'administration') return;
    load();
  }, [actionFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const params = actionFilter !== 'all' ? { action: actionFilter } : undefined;
      const d = await auditLogsAPI.getLogs(params);
      setLogs(Array.isArray(d) ? d : d?.results || []);
    } catch { toast.error('Failed to load audit logs'); }
    finally { setLoading(false); }
  };

  const handleExport = async () => {
    try {
      const blob = await auditLogsAPI.exportCsv();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'audit_logs.csv';
      link.click();
    } catch { toast.error('Export failed'); }
  };

  if (user?.role !== 'admin' && user?.role !== 'administration') {
    return <MainLayout><Card><CardContent className="py-12 text-center text-muted-foreground">Access denied.</CardContent></Card></MainLayout>;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
            <p className="text-muted-foreground">Track all sensitive actions on the platform.</p>
          </div>
          <Button variant="outline" onClick={handleExport}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
        </div>

        <div className="w-64">
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger><SelectValue placeholder="Filter by action" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {ACTION_TYPES.map(a => <SelectItem key={a} value={a}>{a.replace(/_/g, ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : logs.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No logs found.</TableCell></TableRow>
                ) : logs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.actor_name}</TableCell>
                    <TableCell><span className="text-xs bg-muted px-2 py-1 rounded">{log.action_display}</span></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.target_type} {log.target_id ? `#${log.target_id}` : ''}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{log.ip_address || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default AuditLogs;
