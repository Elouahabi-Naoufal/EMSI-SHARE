import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
const getToken = () => document.cookie.split('; ').reduce((r, v) => {
  const [k, val] = v.split('='); return k === 'emsi_access' ? decodeURIComponent(val) : r;
}, '');

const ParentPortal: React.FC = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.role !== 'parent') return;
    setLoading(true);
    fetch(`${API_BASE}/auth/parent/`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(setChildren)
      .catch(() => toast.error('Failed to load children data'))
      .finally(() => setLoading(false));
  }, [user]);

  if (user?.role !== 'parent') {
    return (
      <MainLayout>
        <Card><CardContent className="py-12 text-center text-muted-foreground">This page is only accessible to parents/guardians.</CardContent></Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Parent Portal</h1>
          <p className="text-muted-foreground">Monitor your children's academic progress.</p>
        </div>

        {loading ? <p className="text-muted-foreground">Loading...</p> :
          children.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No children linked to your account. Contact the administration.</CardContent></Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {children.map((child: any) => (
                <Card key={child.student_id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{child.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{child.email} · <span className="capitalize">{child.relationship}</span></p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-blue-600">{child.quiz_average}%</p>
                        <p className="text-xs text-muted-foreground">Quiz Average</p>
                      </div>
                      <div>
                        <p className={`text-2xl font-bold ${child.attendance_rate >= 75 ? 'text-green-600' : 'text-red-600'}`}>
                          {child.attendance_rate}%
                        </p>
                        <p className="text-xs text-muted-foreground">Attendance</p>
                      </div>
                      <div>
                        <p className={`text-2xl font-bold ${child.pending_assignments === 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {child.pending_assignments}
                        </p>
                        <p className="text-xs text-muted-foreground">Pending</p>
                      </div>
                    </div>
                    {child.attendance_rate < 75 && (
                      <div className="mt-3 p-2 bg-red-50 dark:bg-red-950 rounded text-xs text-red-600 font-medium">
                        Warning: Attendance below 75% threshold
                      </div>
                    )}
                    {child.pending_assignments > 0 && (
                      <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-950 rounded text-xs text-yellow-700 font-medium">
                        {child.pending_assignments} assignment(s) missing or late
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        }
      </div>
    </MainLayout>
  );
};

export default ParentPortal;
