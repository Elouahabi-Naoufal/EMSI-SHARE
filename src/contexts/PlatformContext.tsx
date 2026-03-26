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
        // Update platform name
        if (settings.platformName !== undefined) {
          setPlatformName(settings.platformName || 'EMSI Share');
          document.title = settings.platformName || 'EMSI Share';
        }
        
        // Update logo
        if (settings.logo !== undefined) {
          setPlatformLogo(settings.logo || null);
          const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
          if (settings.logo) {
            if (favicon) {
              favicon.href = settings.logo;
            } else {
              const newFavicon = document.createElement('link');
              newFavicon.rel = 'icon';
              newFavicon.href = settings.logo;
              document.head.appendChild(newFavicon);
            }
          }
        }
        
        // Update page sizes
        if (settings.pageSizes) {
          setPageSizes(settings.pageSizes);
          
          // Apply CSS variables for page sizes
          document.documentElement.style.setProperty('--resources-per-page', settings.pageSizes.resources.toString());
          document.documentElement.style.setProperty('--forum-posts-per-page', settings.pageSizes.forumPosts.toString());
          document.documentElement.style.setProperty('--events-per-page', settings.pageSizes.events.toString());
          document.documentElement.style.setProperty('--users-per-page', settings.pageSizes.users.toString());
        }
        
        // Update general settings
        if (settings.generalSettings) {
          setGeneralSettings(settings.generalSettings);
          
          // Apply maintenance mode if enabled
          if (settings.generalSettings.maintenanceMode) {
            const banner = document.createElement('div');
            banner.id = 'maintenance-banner';
            banner.style.position = 'fixed';
            banner.style.top = '0';
            banner.style.left = '0';
            banner.style.width = '100%';
            banner.style.padding = '10px';
            banner.style.backgroundColor = '#f97316';
            banner.style.color = 'white';
            banner.style.textAlign = 'center';
            banner.style.zIndex = '9999';
            banner.textContent = '⚠️ System is in maintenance mode. Some features may be unavailable.';
            
            if (!document.getElementById('maintenance-banner')) {
              document.body.prepend(banner);
            }
          } else {
            // Remove maintenance banner if exists
            const banner = document.getElementById('maintenance-banner');
            if (banner) {
              banner.remove();
            }
          }
        }
        
        // Update security settings
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