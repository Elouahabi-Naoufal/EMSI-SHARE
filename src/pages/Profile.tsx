import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { ProfileForm } from '@/components/ui/ProfileEditDialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { dataExportAPI } from '@/services/api';
import { Download } from 'lucide-react';

const Profile: React.FC = () => {
  const handleExport = async () => {
    try {
      const blob = await dataExportAPI.exportMyData();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'my_data.json';
      link.click();
      toast.success('Data exported');
    } catch { toast.error('Export failed'); }
  };

  return (
    <MainLayout>
      <div className="max-w-xl mx-auto mt-10 bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 flex flex-col items-center">
        <ProfileForm />
        <div className="mt-6 w-full border-t pt-6">
          <p className="text-sm text-muted-foreground mb-3">Download all your personal data (GDPR).</p>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />Export My Data
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default Profile;