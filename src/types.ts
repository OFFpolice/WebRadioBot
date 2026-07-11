export interface Station {
  url_resolved: string;
  url?: string;
  name: string;
  tags?: string;
  favicon?: string;
  votes?: number;
  country?: string;
  language?: string;
}

export type TabType = 'radio' | 'favorites' | 'settings';

export interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  isVersionAtLeast: (version: string) => boolean;
  requestFullscreen?: () => void;
  enableClosingConfirmation: () => void;
  disableVerticalSwipes?: () => void;
  lockOrientation?: () => void;
  colorScheme?: 'dark' | 'light';
  initDataUnsafe?: {
    user?: {
      id?: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
      language_code?: string;
    };
  };
  BackButton?: {
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  SettingsButton?: {
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  themeParams?: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
  };
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}
