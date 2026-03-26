import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { platformAPI } from '@/services/api';

interface PlatformContextType {
  platformName: string;
  platformLogo: string | null;
  pageSizes: {
    resources: number;
    forumPosts: number;
    events: number;
    users: number;
  };
  generalSettings: {
    enableRegistration: boolean;
    maintenanceMode: boolean;
    publicProfiles: boolean;
  };
  securitySettings: {
    passwordPolicy: boolean;
    sessionTimeout: boolean;
  };
  isLoading: boolean;
  refreshPlatformSettings: () => Promise<void>;
}

const defaultPlatformContext: PlatformContextType = {
  platformName: 'EMSI Share',
  platformLogo: null,
  pageSizes: {
    resources: 20,
    forumPosts: 15,
    events: 10,
    users: 25
  },
  generalSettings: {
    enableRegistration: true,
    maintenanceMode: false,
    publicProfiles: true
  },
  securitySettings: {
    passwordPolicy: true,
    sessionTimeout: true
  },
  isLoading: true,
  refreshPlatformSettings: async () => {}
};

const PlatformContext = createContext<PlatformContextType>(defaultPlatformContext);

export const usePlatform = () => useContext(PlatformContext);

interface PlatformProviderProps {
  children: ReactNode;
}

export const PlatformProvider: React.FC<PlatformProviderProps> = ({ children }) => {
  const [platformName, setPlatformName] = useState<string>(defaultPlatformContext.platformName);
  const [platformLogo, setPlatformLogo] = useState<string | null>(defaultPlatformContext.platformLogo);
  const [pageSizes, setPageSizes] = useState(defaultPlatformContext.pageSizes);
  const [generalSettings, setGeneralSettings] = useState(defaultPlatformContext.generalSettings);
  const [securitySettings, setSecuritySettings] = useState(defaultPlatformContext.securitySettings);
  const [isLoading, setIsLoading] = useState(true);

  const refreshPlatformSettings = async () => {
    setIsLoading(true);
    try {
      // Get settings from API only - no localStorage fallback
      const settings = await platformAPI.getSettings();
      if (settings) {
        setPlatformName(settings.platformName || 'EMSI Share');
        document.title = settings.platformName || 'EMSI Share';

        setPlatformLogo(settings.logo || null);
        if (settings.logo) {
          const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
          if (favicon) {
            favicon.href = settings.logo;
          } else {
            const newFavicon = document.createElement('link');
            newFavicon.rel = 'icon';
            newFavicon.href = settings.logo;
            document.head.appendChild(newFavicon);
          }
        }

        if (settings.pageSizes) {
          setPageSizes(settings.pageSizes);
          document.documentElement.style.setProperty('--resources-per-page', settings.pageSizes.resources.toString());
          document.documentElement.style.setProperty('--forum-posts-per-page', settings.pageSizes.forumPosts.toString());
          document.documentElement.style.setProperty('--events-per-page', settings.pageSizes.events.toString());
          document.documentElement.style.setProperty('--users-per-page', settings.pageSizes.users.toString());
        }

        if (settings.generalSettings) {
          setGeneralSettings(settings.generalSettings);
          const existing = document.getElementById('maintenance-banner');
          if (settings.generalSettings.maintenanceMode && !existing) {
            const banner = document.createElement('div');
            banner.id = 'maintenance-banner';
            banner.style.cssText = 'position:fixed;top:0;left:0;width:100%;padding:10px;background:#f97316;color:white;text-align:center;z-index:9999';
            banner.textContent = '⚠️ System is in maintenance mode. Some features may be unavailable.';
            document.body.prepend(banner);
          } else if (!settings.generalSettings.maintenanceMode && existing) {
            existing.remove();
          }
        }

        if (settings.securitySettings) {
          setSecuritySettings(settings.securitySettings);
        }
      }
    } catch (error) {
      console.error('Error loading platform settings:', error);
      // No fallback to localStorage - just use defaults
    } finally {
      setIsLoading(false);
    }
  };

  // Load settings on mount and set up polling to check for updates
  useEffect(() => {
    // Initial load
    refreshPlatformSettings();
    
    // Set up polling to check for updates every 5 minutes
    const intervalId = setInterval(() => {
      refreshPlatformSettings();
    }, 5 * 60 * 1000); // 5 minutes in milliseconds
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  const value = {
    platformName,
    platformLogo,
    pageSizes,
    generalSettings,
    securitySettings,
    isLoading,
    refreshPlatformSettings
  };

  return (
    <PlatformContext.Provider value={value}>
      {children}
    </PlatformContext.Provider>
  );
};