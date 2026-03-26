import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlatform } from '@/contexts/PlatformContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { platformAPI } from '@/services/api';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { refreshPlatformSettings } = usePlatform();
  
  // Platform configuration state
  const [platformName, setPlatformName] = useState('EMSI Share');
  const [platformLogo, setPlatformLogo] = useState<string | null>(null);
  const [logoChanged, setLogoChanged] = useState(false);
  const [enableRegistration, setEnableRegistration] = useState(true);
  const [dbConfig, setDbConfig] = useState({
    db_host: '', db_port: '', db_name: '', db_user: '', db_password: ''
  });
  const [dbTestResult, setDbTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [dbTesting, setDbTesting] = useState(false);
  const [sshConfig, setSshConfig] = useState({
    ssh_host: '', ssh_port: '22', ssh_user: '',
    ssh_auth_type: 'password' as 'password' | 'key',
    ssh_password: '', ssh_private_key: '',
  });
  const [sshTestResult, setSshTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [sshTesting, setSshTesting] = useState(false);
  const [sshCommands, setSshCommands] = useState<{ key: string; command: string }[]>([]);
  const [commandOutputs, setCommandOutputs] = useState<Record<string, { success: boolean; output: string; error: string } | null>>({});
  const [runningCommand, setRunningCommand] = useState<string | null>(null);
  const [databaseStats, setDatabaseStats] = useState({
    used: 1.2, // GB
    total: 5, // GB
    resources: {
      documents: 450, // MB
      videos: 650, // MB
      images: 80, // MB
      code: 20, // MB
    },
    pageSizes: {
      resources: 20,
      forumPosts: 15,
      events: 10,
      users: 25
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Load settings from database on component mount
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      try {
        // Load platform settings from API
        const settings = await platformAPI.getSettings();
        if (settings) {
          // Update platform name
          if (settings.platformName) {
            setPlatformName(settings.platformName);
          }
          
          // Update page sizes
          if (settings.pageSizes) {
            setDatabaseStats(prev => ({
              ...prev,
              pageSizes: {
                ...prev.pageSizes,
                ...settings.pageSizes
              }
            }));
          }
          
          // Update general settings
          if (settings.generalSettings) {
            setEnableRegistration(settings.generalSettings.enableRegistration);
            
            if (document.getElementById('maintenance-mode')) {
              (document.getElementById('maintenance-mode') as HTMLInputElement).checked = 
                settings.generalSettings.maintenanceMode;
            }
            
            if (document.getElementById('public-profiles')) {
              (document.getElementById('public-profiles') as HTMLInputElement).checked = 
                settings.generalSettings.publicProfiles;
            }
          }
          
          // Update security settings
          if (settings.securitySettings) {
            if (document.getElementById('password-policy')) {
              (document.getElementById('password-policy') as HTMLInputElement).checked = 
                settings.securitySettings.passwordPolicy;
            }
            
            if (document.getElementById('session-timeout')) {
              (document.getElementById('session-timeout') as HTMLInputElement).checked = 
                settings.securitySettings.sessionTimeout;
            }
          }
          
          // Load platform logo
          if (settings.logo !== undefined) {
            setPlatformLogo(settings.logo);
          }
        }

        // Load DB config
        const dbCfg = await platformAPI.getDbConfig();
        if (dbCfg) setDbConfig(dbCfg);

        // Load SSH config and commands
        const [sshCfg, cmds] = await Promise.all([
          platformAPI.getSshConfig(),
          platformAPI.getSshCommands(),
        ]);
        if (sshCfg) setSshConfig(sshCfg);
        if (cmds) setSshCommands(cmds);
        
        // Load database stats
        const stats = await platformAPI.getDatabaseStats();
        console.log('Database stats from API:', stats);
        if (stats) {
          // Handle new API format with real database stats
          const resourceTypes = stats.resource_types || {};
          console.log('Resource types:', resourceTypes);
          const totalUsed = (resourceTypes.documents?.size_mb || 0) + 
                           (resourceTypes.code?.size_mb || 0) + 
                           (resourceTypes.videos?.size_mb || 0) + 
                           (resourceTypes.images?.size_mb || 0) + 
                           (resourceTypes.other?.size_mb || 0);
          
          setDatabaseStats(prev => ({
            ...prev,
            used: stats.database_size?.size_gb || 0, // Use real database size
            total: 40, // 40GB default
            resources: {
              documents: resourceTypes.documents?.size_mb || 0,
              videos: resourceTypes.videos?.size_mb || 0,
              images: resourceTypes.images?.size_mb || 0,
              code: resourceTypes.code?.size_mb || 0,
            }
          }));
        }
      } catch (error) {
        console.error('Error loading platform settings:', error);
        toast({
          title: "Error loading settings",
          description: "Could not load platform settings from the database.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSettings();
  }, []);

  const handleTestSshConnection = async () => {
    setSshTesting(true);
    setSshTestResult(null);
    try {
      const result = await platformAPI.testSshConnection(sshConfig);
      setSshTestResult(result);
    } catch (e: any) {
      setSshTestResult({ success: false, message: e.message });
    } finally {
      setSshTesting(false);
    }
  };

  const handleSaveSshConfig = async () => {
    setIsLoading(true);
    try {
      await platformAPI.saveSshConfig(sshConfig);
      toast({ title: 'SSH config saved' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunCommand = async (key: string) => {
    setRunningCommand(key);
    setCommandOutputs(prev => ({ ...prev, [key]: null }));
    try {
      const result = await platformAPI.executeSshCommand(key);
      setCommandOutputs(prev => ({ ...prev, [key]: result }));
    } catch (e: any) {
      setCommandOutputs(prev => ({ ...prev, [key]: { success: false, output: '', error: e.message } }));
    } finally {
      setRunningCommand(null);
    }
  };

  const handleTestDbConnection = async () => {
    setDbTesting(true);
    setDbTestResult(null);
    try {
      const result = await platformAPI.testDbConnection(dbConfig);
      setDbTestResult(result);
    } catch (e: any) {
      setDbTestResult({ success: false, message: e.message });
    } finally {
      setDbTesting(false);
    }
  };

  const handleSaveDbConfig = async () => {
    setIsLoading(true);
    try {
      await platformAPI.saveDbConfig(dbConfig);
      toast({ title: 'Database config saved', description: 'Restart the server to apply changes.' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const settingsToSave = {
        platformName,
        pageSizes: databaseStats.pageSizes,
        generalSettings: {
          enableRegistration: enableRegistration,
          maintenanceMode: false,
          publicProfiles: true,
        },
        securitySettings: {
          passwordPolicy: true,
          sessionTimeout: true,
        }
      };
      await platformAPI.updateSettings(settingsToSave);
      if (logoChanged && platformLogo) {
        await platformAPI.uploadLogo(platformLogo);
        setLogoChanged(false);
      }
      await refreshPlatformSettings();
      toast({
        title: "Settings saved",
        description: "Changes applied successfully.",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error saving settings",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (user?.role !== 'admin' && user?.role !== 'administration') {
    return (
      <MainLayout>
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground">
            Configure system-wide settings and preferences.
          </p>
        </div>

        <Tabs defaultValue="platform">
          <TabsList className="grid w-full md:w-auto grid-cols-1 md:grid-cols-4">
            <TabsTrigger value="platform">Platform</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="database">Database</TabsTrigger>
            <TabsTrigger value="server">Server</TabsTrigger>
          </TabsList>
          
          <TabsContent value="platform" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Platform Configuration</CardTitle>
                <CardDescription>
                  Configure platform settings and appearance.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {/* Platform Name */}
                  <div className="grid gap-2">
                    <Label htmlFor="platform-name">Platform Name</Label>
                    <input
                      id="platform-name"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={platformName}
                      onChange={(e) => setPlatformName(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  
                  {/* Platform Logo */}
                  <div className="grid gap-2">
                    <Label htmlFor="platform-logo">Platform Logo</Label>
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-md border border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                        {platformLogo ? (
                          <img 
                            src={platformLogo} 
                            alt="Platform Logo" 
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                            <circle cx="9" cy="9" r="2" />
                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <input
                          type="file"
                          id="logo-upload"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                setPlatformLogo(event.target?.result as string);
                                setLogoChanged(true);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          disabled={isLoading}
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => document.getElementById('logo-upload')?.click()}
                          disabled={isLoading}
                        >
                          Upload Logo
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Database Size */}
                  <div className="grid gap-2">
                    <Label>Database Size</Label>
                    <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Used: {databaseStats.used} GB</span>
                        <span className="text-sm font-medium">Total: {databaseStats.total} GB</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                        <div className="bg-primary h-2.5 rounded-full" style={{ width: `${(databaseStats.used / databaseStats.total) * 100}%` }}></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Resource Type Sizes */}
                  <div className="grid gap-2">
                    <Label>Resource Type Usage</Label>
                    <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md space-y-3">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">Documents</span>
                          <span className="text-sm font-medium">{typeof databaseStats.resources.documents === 'object' ? databaseStats.resources.documents.size_mb : databaseStats.resources.documents} MB</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(databaseStats.resources.documents / 1000) * 100}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">Videos</span>
                          <span className="text-sm font-medium">{typeof databaseStats.resources.videos === 'object' ? databaseStats.resources.videos.size_mb : databaseStats.resources.videos} MB</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                          <div className="bg-red-500 h-2 rounded-full" style={{ width: `${(databaseStats.resources.videos / 1000) * 100}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">Images</span>
                          <span className="text-sm font-medium">{typeof databaseStats.resources.images === 'object' ? databaseStats.resources.images.size_mb : databaseStats.resources.images} MB</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                          <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${(databaseStats.resources.images / 1000) * 100}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">Code</span>
                          <span className="text-sm font-medium">{typeof databaseStats.resources.code === 'object' ? databaseStats.resources.code.size_mb : databaseStats.resources.code} MB</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(databaseStats.resources.code / 1000) * 100}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Page Size Limits */}
                  <div className="grid gap-2">
                    <Label>Page Size Limits</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
                        <span className="text-sm font-medium">Resources per page</span>
                        <input 
                          type="number" 
                          min="5" 
                          max="100" 
                          value={databaseStats.pageSizes.resources} 
                          onChange={(e) => setDatabaseStats(prev => ({
                            ...prev, 
                            pageSizes: {
                              ...prev.pageSizes,
                              resources: parseInt(e.target.value) || 20
                            }
                          }))}
                          className="w-16 text-right p-1 rounded border"
                          disabled={isLoading}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
                        <span className="text-sm font-medium">Forum posts per page</span>
                        <input 
                          type="number" 
                          min="5" 
                          max="100" 
                          value={databaseStats.pageSizes.forumPosts} 
                          onChange={(e) => setDatabaseStats(prev => ({
                            ...prev, 
                            pageSizes: {
                              ...prev.pageSizes,
                              forumPosts: parseInt(e.target.value) || 15
                            }
                          }))}
                          className="w-16 text-right p-1 rounded border"
                          disabled={isLoading}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
                        <span className="text-sm font-medium">Events per page</span>
                        <input 
                          type="number" 
                          min="5" 
                          max="100" 
                          value={databaseStats.pageSizes.events} 
                          onChange={(e) => setDatabaseStats(prev => ({
                            ...prev, 
                            pageSizes: {
                              ...prev.pageSizes,
                              events: parseInt(e.target.value) || 10
                            }
                          }))}
                          className="w-16 text-right p-1 rounded border"
                          disabled={isLoading}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
                        <span className="text-sm font-medium">Users per page</span>
                        <input 
                          type="number" 
                          min="5" 
                          max="100" 
                          value={databaseStats.pageSizes.users} 
                          onChange={(e) => setDatabaseStats(prev => ({
                            ...prev, 
                            pageSizes: {
                              ...prev.pageSizes,
                              users: parseInt(e.target.value) || 25
                            }
                          }))}
                          className="w-16 text-right p-1 rounded border"
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="general" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Configure general platform behavior and user settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {/* User Registration */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">User Registration</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow new users to register accounts on the platform
                      </p>
                    </div>
                    <Switch
                      checked={enableRegistration}
                      onCheckedChange={setEnableRegistration}
                      disabled={isLoading}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="database" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Database Connection</CardTitle>
                <CardDescription>
                  Override the PostgreSQL connection (e.g. point to a remote server). Restart the backend to apply.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(['db_host', 'db_port', 'db_name', 'db_user'] as const).map((field) => (
                  <div key={field} className="grid gap-2">
                    <Label htmlFor={field}>{field.replace('db_', '').replace('_', ' ').toUpperCase()}</Label>
                    <input
                      id={field}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={dbConfig[field]}
                      onChange={(e) => setDbConfig(prev => ({ ...prev, [field]: e.target.value }))}
                      placeholder={field === 'db_host' ? 'localhost' : field === 'db_port' ? '5432' : ''}
                      disabled={isLoading}
                    />
                  </div>
                ))}
                <div className="grid gap-2">
                  <Label htmlFor="db_password">PASSWORD</Label>
                  <input
                    id="db_password"
                    type="password"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={dbConfig.db_password}
                    onChange={(e) => setDbConfig(prev => ({ ...prev, db_password: e.target.value }))}
                    disabled={isLoading}
                  />
                </div>

                {dbTestResult && (
                  <p className={`text-sm font-medium ${dbTestResult.success ? 'text-green-600' : 'text-red-600'}`}>
                    {dbTestResult.success ? '✓' : '✗'} {dbTestResult.message}
                  </p>
                )}

                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={handleTestDbConnection} disabled={dbTesting || isLoading}>
                    {dbTesting ? 'Testing...' : 'Test Connection'}
                  </Button>
                  <Button onClick={handleSaveDbConfig} disabled={isLoading}>
                    Save Config
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="server" className="mt-6 space-y-6">
            {/* SSH Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>SSH Configuration</CardTitle>
                <CardDescription>Connect to your server via SSH to run predefined actions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(['ssh_host', 'ssh_port', 'ssh_user'] as const).map((field) => (
                    <div key={field} className="grid gap-2">
                      <Label>{field.replace('ssh_', '').toUpperCase()}</Label>
                      <input
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={sshConfig[field]}
                        onChange={(e) => setSshConfig(prev => ({ ...prev, [field]: e.target.value }))}
                        placeholder={field === 'ssh_host' ? 'your-server.com' : field === 'ssh_port' ? '22' : 'ubuntu'}
                        disabled={isLoading}
                      />
                    </div>
                  ))}
                </div>

                {/* Auth type toggle */}
                <div className="flex items-center gap-4">
                  <Label>Auth Type</Label>
                  <div className="flex gap-2">
                    {(['password', 'key'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setSshConfig(prev => ({ ...prev, ssh_auth_type: type }))}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                          sshConfig.ssh_auth_type === type
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background border-input hover:bg-muted'
                        }`}
                      >
                        {type === 'password' ? 'Password' : 'SSH Key'}
                      </button>
                    ))}
                  </div>
                </div>

                {sshConfig.ssh_auth_type === 'password' ? (
                  <div className="grid gap-2">
                    <Label>Password</Label>
                    <input
                      type="password"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={sshConfig.ssh_password}
                      onChange={(e) => setSshConfig(prev => ({ ...prev, ssh_password: e.target.value }))}
                      disabled={isLoading}
                    />
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <Label>Private Key (PEM)</Label>
                    <textarea
                      rows={6}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                      value={sshConfig.ssh_private_key}
                      onChange={(e) => setSshConfig(prev => ({ ...prev, ssh_private_key: e.target.value }))}
                      placeholder="-----BEGIN RSA PRIVATE KEY-----
...
-----END RSA PRIVATE KEY-----"
                      disabled={isLoading}
                    />
                  </div>
                )}

                {sshTestResult && (
                  <p className={`text-sm font-medium ${sshTestResult.success ? 'text-green-600' : 'text-red-600'}`}>
                    {sshTestResult.success ? '✓' : '✗'} {sshTestResult.message}
                  </p>
                )}

                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={handleTestSshConnection} disabled={sshTesting || isLoading}>
                    {sshTesting ? 'Testing...' : 'Test Connection'}
                  </Button>
                  <Button onClick={handleSaveSshConfig} disabled={isLoading}>Save SSH Config</Button>
                </div>
              </CardContent>
            </Card>

            {/* Server Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Server Actions</CardTitle>
                <CardDescription>Run predefined commands on your server via SSH.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Migrate button - prominent */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-4 border-2 border-primary/30 bg-primary/5 rounded-md">
                    <div>
                      <p className="text-sm font-semibold">Run Migrations</p>
                      <p className="text-xs text-muted-foreground font-mono">python manage.py migrate --no-input</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleRunCommand('run_migrations')}
                      disabled={runningCommand !== null}
                    >
                      {runningCommand === 'run_migrations' ? 'Running...' : 'Migrate'}
                    </Button>
                  </div>
                  {commandOutputs['run_migrations'] && (
                    <div className={`rounded-md p-3 ${
                      commandOutputs['run_migrations']?.success ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'
                    }`}>
                      {!commandOutputs['run_migrations']?.success && (
                        <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-1">
                          ✗ Migration failed
                        </p>
                      )}
                      <pre className={`text-xs font-mono whitespace-pre-wrap max-h-64 overflow-y-auto ${
                        commandOutputs['run_migrations']?.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                      }`}>
                        {commandOutputs['run_migrations']?.output || ''}
                        {commandOutputs['run_migrations']?.error ? `\nSTDERR:\n${commandOutputs['run_migrations']?.error}` : ''}
                      </pre>
                    </div>
                  )}
                </div>

                <div className="border-t pt-3 space-y-2">
                  {sshCommands.filter(({ key }) => key !== 'run_migrations').map(({ key, command }) => (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                        <div>
                          <p className="text-sm font-medium">{key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
                          <p className="text-xs text-muted-foreground font-mono">{command}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRunCommand(key)}
                          disabled={runningCommand !== null}
                        >
                          {runningCommand === key ? 'Running...' : 'Run'}
                        </Button>
                      </div>
                      {commandOutputs[key] && (
                        <pre className={`text-xs p-3 rounded-md font-mono whitespace-pre-wrap max-h-48 overflow-y-auto ${
                          commandOutputs[key]?.success ? 'bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200' : 'bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200'
                        }`}>
                          {commandOutputs[key]?.output || commandOutputs[key]?.error}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Settings;