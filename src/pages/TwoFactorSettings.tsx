import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Shield, ShieldCheck, ShieldOff } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
const getToken = () => document.cookie.split('; ').reduce((r, v) => {
  const [k, val] = v.split('='); return k === 'emsi_access' ? decodeURIComponent(val) : r;
}, '');

const TwoFactorSettings: React.FC = () => {
  const { user } = useAuth();
  const [setup, setSetup] = useState<any>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadSetup(); }, []);

  const loadSetup = async () => {
    const res = await fetch(`${API_BASE}/auth/2fa/setup/`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setSetup(await res.json());
  };

  const handleAction = async (action: 'enable' | 'disable') => {
    if (!code.trim()) { toast.error('Enter the 6-digit code from your authenticator app'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/2fa/setup/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, action }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.detail || 'Invalid code'); return; }
      toast.success(data.detail);
      setCode('');
      loadSetup();
    } catch { toast.error('Request failed'); }
    finally { setLoading(false); }
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-lg">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Two-Factor Authentication</h1>
          <p className="text-muted-foreground">Add an extra layer of security to your account.</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              {setup?.enabled ? (
                <ShieldCheck className="h-8 w-8 text-green-600" />
              ) : (
                <Shield className="h-8 w-8 text-muted-foreground" />
              )}
              <div>
                <CardTitle>{setup?.enabled ? '2FA is Enabled' : '2FA is Disabled'}</CardTitle>
                <CardDescription>
                  {setup?.enabled
                    ? 'Your account is protected with TOTP authentication.'
                    : 'Scan the QR code with Google Authenticator or Authy.'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!setup?.enabled && setup?.qr_code && (
              <div className="flex flex-col items-center gap-3">
                <img src={setup.qr_code} alt="QR Code" className="w-48 h-48 border rounded" />
                <p className="text-xs text-muted-foreground text-center">
                  Or enter this secret manually:<br />
                  <code className="bg-muted px-2 py-1 rounded text-xs font-mono">{setup.secret}</code>
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Verification Code</Label>
              <Input
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="000000"
                maxLength={6}
                className="font-mono text-center text-lg tracking-widest"
              />
            </div>

            {!setup?.enabled ? (
              <Button className="w-full" onClick={() => handleAction('enable')} disabled={loading}>
                <ShieldCheck className="h-4 w-4 mr-2" />
                {loading ? 'Verifying...' : 'Enable 2FA'}
              </Button>
            ) : (
              <Button variant="destructive" className="w-full" onClick={() => handleAction('disable')} disabled={loading}>
                <ShieldOff className="h-4 w-4 mr-2" />
                {loading ? 'Verifying...' : 'Disable 2FA'}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default TwoFactorSettings;
