import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { authAPI } from '@/services/api';
import { isPrivileged } from '@/types/user';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

const getToken = () => document.cookie.split('; ').reduce((r, v) => {
  const [k, val] = v.split('='); return k === 'emsi_access' ? decodeURIComponent(val) : r;
}, '');

const fetchReport = async (studentId?: string) => {
  const url = studentId ? `${API_BASE}/auth/progress/${studentId}/` : `${API_BASE}/auth/progress/`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) throw new Error('Failed to fetch report');
  return res.json();
};

const StatCard: React.FC<{ label: string; value: string | number; sub?: string }> = ({ label, value, sub }) => (
  <Card>
    <CardContent className="pt-6 text-center">
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm font-medium mt-1">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </CardContent>
  </Card>
);

const ProgressReport: React.FC = () => {
  const { user } = useAuth();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [studentId, setStudentId] = useState('');
  const isStaff = isPrivileged(user?.role);

  useEffect(() => {
    if (!isStaff) {
      setLoading(true);
      fetchReport().then(setReport).catch(() => toast.error('Failed to load report')).finally(() => setLoading(false));
    }
  }, []);

  const handleSearch = async () => {
    if (!studentId.trim()) return;
    setLoading(true);
    try {
      const r = await fetchReport(studentId.trim());
      setReport(r);
    } catch { toast.error('Student not found'); }
    finally { setLoading(false); }
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Progress Report</h1>
          <p className="text-muted-foreground">Comprehensive academic performance overview.</p>
        </div>

        {isStaff && (
          <div className="flex gap-2">
            <Input placeholder="Student ID" value={studentId} onChange={e => setStudentId(e.target.value)} className="max-w-xs" />
            <Button onClick={handleSearch} disabled={loading}>View Report</Button>
          </div>
        )}

        {loading && <p className="text-muted-foreground">Loading...</p>}

        {report && (
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <p className="text-xl font-bold">{report.student.name}</p>
                <p className="text-sm text-muted-foreground">{report.student.email} · <span className="capitalize">{report.student.role}</span></p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Quiz Average" value={`${report.quizzes.average_score}%`} sub={`${report.quizzes.total_attempts} attempts`} />
              <StatCard label="Assignment Avg" value={`${report.assignments.average_score}%`} sub={`${report.assignments.total_graded} graded`} />
              <StatCard label="Attendance" value={`${report.attendance.rate}%`} sub={`${report.attendance.present}/${report.attendance.total_sessions} sessions`} />
              <StatCard label="Grade Average" value={`${report.grades.average}%`} sub={`${report.grades.total_entries} entries`} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard label="Forum Posts" value={report.forum.posts} />
              <StatCard label="Forum Topics" value={report.forum.topics} />
              <StatCard label="Resources Uploaded" value={report.resources_uploaded} />
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ProgressReport;
