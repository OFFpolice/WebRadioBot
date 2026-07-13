import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Heart, Radio, Settings, ArrowUp, Loader2, X } from 'lucide-react';
import { Station, TabType } from './types';
import Loader from './components/Loader';
import StationCard from './components/StationCard';
import PlayerBar from './components/PlayerBar';
import SettingsTab from './components/SettingsTab';
import translations from './lang.json';

const LIMIT = 100;
const FALLBACK_SERVERS = [
  'https://de1.api.radio-browser.info',
  'https://fr1.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
  'https://at1.api.radio-browser.info',
  'https://co1.api.radio-browser.info',
  'https://us1.api.radio-browser.info'
];

const sanitizeInput = (val: string): string => {
  if (!val) return '';
  // Remove HTML tag patterns (XSS prevention)
  let clean = val.replace(/<[^>]*>?/gm, '');
  
  // Remove SQL injection hazards and escape sequences
  clean = clean
    .replace(/['"`;\\]/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '');

  return clean;
};

export default function App() {
  // Navigation & View tab states
  const [activeTab, setActiveTab] = useState<TabType>('radio');
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(() => {
    try {
      const lastUrl = localStorage.getItem('webradio_last_url');
      const lastName = localStorage.getItem('webradio_last_name');
      const lastFavicon = localStorage.getItem('webradio_last_favicon');
      if (lastUrl && lastName) {
        return {
          url_resolved: lastUrl,
          name: lastName,
          favicon: lastFavicon || '',
        };
      }
    } catch (e) {
      console.warn('LocalStorage last station read failed', e);
    }
    return null;
  });
  const [favorites, setFavorites] = useState<Station[]>([]);

  // Search & Pagination triggers
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [apiServer, setApiServer] = useState(FALLBACK_SERVERS[0]);

  // Audio system events
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [status, setStatus] = useState<'idle' | 'playing' | 'paused' | 'buffering' | 'error' | 'waiting'>('idle');
  const [statusText, setStatusText] = useState('Ожидание');

  // Loading Screen transitions
  const [loaderProgress, setLoaderProgress] = useState(0);
  const [loaderText, setLoaderText] = useState('Инициализация...');
  const [isLoaderVisible, setIsLoaderVisible] = useState(true);

  // Layout UI utilities
  const [showScrollTop, setShowScrollTop] = useState(false);

  // DOM and Audio References
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const contentAreaRef = useRef<HTMLDivElement | null>(null);

  // Audio playback retry and fallback references
  const playbackUrlsRef = useRef<string[]>([]);
  const currentUrlIndexRef = useRef<number>(0);
  const playbackTimeoutRef = useRef<any>(null);
  const selectedStationRef = useRef<Station | null>(null);

  // Theme & Language states with LocalStorage persistence
  const [theme, setTheme] = useState<'white' | 'black' | 'system'>(() => {
    const saved = localStorage.getItem('webradio_theme');
    if (saved === 'white' || saved === 'black' || saved === 'system') {
      return saved as 'white' | 'black' | 'system';
    }
    // "тема по умолчанию должна быть система если не удалось определить тему"
    // Try to determine theme from Telegram colorScheme
    const tg = window.Telegram?.WebApp;
    if (tg?.colorScheme) {
      return tg.colorScheme === 'dark' ? 'black' : 'white';
    }
    return 'system';
  });

  const [lang, setLang] = useState<'system' | 'ru' | 'en' | 'uk'>(() => {
    const saved = localStorage.getItem('webradio_lang');
    if (saved === 'system' || saved === 'ru' || saved === 'en' || saved === 'uk') {
      return saved as 'system' | 'ru' | 'en' | 'uk';
    }
    return 'system';
  });

  const resolvedLang = useMemo(() => {
    if (lang !== 'system') return lang;

    // "язык нужно определить автоматически ... английский язык должен быть по умолчанию если не удалось определить язык"
    // 1. Try Telegram WebApp user language_code
    const tgLang = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
    if (tgLang) {
      const code = tgLang.toLowerCase();
      if (code.startsWith('ru')) return 'ru';
      if (code.startsWith('uk') || code.startsWith('ua')) return 'uk';
      if (code.startsWith('en')) return 'en';
    }

    // 2. Try window.navigator.language
    const navLang = window.navigator.language || (window.navigator as any).userLanguage;
    if (navLang) {
      const code = navLang.toLowerCase();
      if (code.startsWith('ru')) return 'ru';
      if (code.startsWith('uk') || code.startsWith('ua')) return 'uk';
      if (code.startsWith('en')) return 'en';
    }

    // 3. Default fallback is English
    return 'en';
  }, [lang]);

  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('webradio_theme') || 'system';
      if (saved === 'black') return 'dark';
      if (saved === 'white') return 'light';
      if (saved === 'system') {
        const tg = window.Telegram?.WebApp;
        if (tg?.colorScheme) {
          return tg.colorScheme === 'dark' ? 'dark' : 'light';
        }
        if (typeof window !== 'undefined' && window.matchMedia) {
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
      }
    } catch (e) {
      console.warn('Theme resolution during initialization missed', e);
    }
    return 'dark'; // safe default
  });

  // Sync resolved theme reactively
  useEffect(() => {
    localStorage.setItem('webradio_theme', theme);
    if (theme === 'black') {
      setResolvedTheme('dark');
      return;
    }
    if (theme === 'white') {
      setResolvedTheme('light');
      return;
    }
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      setResolvedTheme(mq.matches ? 'dark' : 'light');
      const listener = (e: MediaQueryListEvent) => {
        setResolvedTheme(e.matches ? 'dark' : 'light');
      };
      mq.addEventListener('change', listener);
      return () => mq.removeEventListener('change', listener);
    }
  }, [theme]);

  // Sync Telegram WebApp header and background colors with the active theme
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      try {
        if (resolvedTheme === 'light') {
          // "Нужно чтобы при белой теме была строка с временем была черная в Safe-Area"
          // We set header color to #000000 (black) so the status bar has a black background with white text.
          if (typeof tg.setHeaderColor === 'function') {
            tg.setHeaderColor('#000000');
          }
          if (typeof tg.setBackgroundColor === 'function') {
            tg.setBackgroundColor('#f7f8fa');
          }
        } else {
          // For dark theme, keep it dark grey matching the header background #1e1e1e
          if (typeof tg.setHeaderColor === 'function') {
            tg.setHeaderColor('#1e1e1e');
          }
          if (typeof tg.setBackgroundColor === 'function') {
            tg.setBackgroundColor('#121212');
          }
        }
      } catch (e) {
        console.warn('Failed to sync Telegram theme parameters', e);
      }
    }
  }, [resolvedTheme]);

  // Dynamically update loader text when language changes or loads
  useEffect(() => {
    if (resolvedLang === 'uk') {
      setLoaderText('Ініціалізація...');
    } else if (resolvedLang === 'en') {
      setLoaderText('Initializing...');
    } else {
      setLoaderText('Инициализация...');
    }
  }, [resolvedLang]);

  const handleLangChange = (newLang: 'system' | 'ru' | 'en' | 'uk') => {
    setLang(newLang);
    localStorage.setItem('webradio_lang', newLang);
  };

  const getLocalizedStatusText = (currentStatus: string, currentLang: 'ru' | 'en' | 'uk') => {
    const t = translations[currentLang] || translations['en'];
    switch (currentStatus) {
      case 'idle': return t.statusIdle;
      case 'playing': return t.statusPlaying;
      case 'paused': return t.statusPaused;
      case 'buffering': return t.statusBuffering;
      case 'error': return t.statusError;
      case 'waiting': return t.statusWaiting;
      default: return t.statusIdle;
    }
  };

  // 1. Initialize Telegram WebApp Hook on Mount
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      try {
        tg.ready();
        tg.expand();
        if (typeof tg.requestFullscreen === 'function' && tg.isVersionAtLeast('8.0')) {
          tg.requestFullscreen();
        }
        tg.enableClosingConfirmation();
        if (typeof tg.disableVerticalSwipes === 'function') {
          tg.disableVerticalSwipes();
        }
        if (typeof tg.lockOrientation === 'function') {
          tg.lockOrientation();
        }
      } catch (e) {
        console.warn('Telegram SDK initialization parameters omitted', e);
      }
    }
  }, []);

  // 2. Initialize App Load state transitions & persistent local cache
  useEffect(() => {
    // Stage progress indicators
    setLoaderProgress(15);
    setLoaderText('Инициализация...');

    const step2 = setTimeout(() => {
      setLoaderProgress(35);
      setLoaderText('Загрузка ресурсов...');
    }, 250);

    const step3 = setTimeout(() => {
      setLoaderProgress(55);
      setLoaderText('Подключение к серверу...');
    }, 550);

    // Initialise audio stream variables from local storage
    try {
      const storedFavs = localStorage.getItem('webradio_favorites');
      if (storedFavs) {
        setFavorites(JSON.parse(storedFavs));
      }
    } catch (e) {
      console.error('Error restoring localStorage parameters', e);
    }

    // Trigger base stations search
    bootstrapApi();

    return () => {
      clearTimeout(step2);
      clearTimeout(step3);
    };
  }, []);

  // Keep selectedStationRef in sync with selectedStation state
  useEffect(() => {
    selectedStationRef.current = selectedStation;
  }, [selectedStation]);

  // 3. Keep audio volume synced with range input updates
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // 4. Input search debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // 5. Handle stations reload when search terms vary
  useEffect(() => {
    if (!isLoaderVisible) {
      fetchStations(true, debouncedSearch);
    }
  }, [debouncedSearch]);

  // 6. Handle Back Button toggler nested within Telegram platforms
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    const backButton = tg?.BackButton;

    if (backButton) {
      if (activeTab !== 'radio') {
        backButton.show();
        const handleBackClick = () => {
          setActiveTab('radio');
        };
        backButton.onClick(handleBackClick);
        return () => {
          backButton.offClick(handleBackClick);
        };
      } else if (searchQuery.trim() !== '') {
        backButton.show();
        const handleBackClick = () => {
          setSearchQuery('');
        };
        backButton.onClick(handleBackClick);
        return () => {
          backButton.offClick(handleBackClick);
        };
      } else {
        backButton.hide();
      }
    }
  }, [activeTab, searchQuery]);

  // 6b. Handle Telegram Settings Button integration
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    const settingsButton = tg?.SettingsButton;

    if (settingsButton) {
      if (activeTab !== 'settings') {
        settingsButton.show();
        const handleSettingsClick = () => {
          setActiveTab('settings');
        };
        settingsButton.onClick(handleSettingsClick);
        return () => {
          settingsButton.offClick(handleSettingsClick);
        };
      } else {
        settingsButton.hide();
      }
    }
  }, [activeTab]);

  // Audio playback retry and fallback logic
  const tryNextSource = (station: Station) => {
    currentUrlIndexRef.current += 1;
    playUrlIndex(station, currentUrlIndexRef.current);
  };

  const playUrlIndex = (station: Station, index: number) => {
    if (playbackTimeoutRef.current) {
      clearTimeout(playbackTimeoutRef.current);
    }

    if (index >= playbackUrlsRef.current.length) {
      console.error('All stream sources failed to load');
      setStatus('error');
      
      const firstUrl = playbackUrlsRef.current[0] || '';
      if (firstUrl.startsWith('http://') && window.location.protocol === 'https:') {
        setStatusText('Ошибка: Нужен HTTPS');
      } else if (firstUrl.endsWith('.m3u') || firstUrl.endsWith('.m3u8') || firstUrl.endsWith('.pls')) {
        setStatusText('Формат плейлиста (.m3u/.pls) не поддерживается');
      } else {
        setStatusText('Источник недоступен');
      }
      setIsPlaying(false);
      return;
    }

    const targetUrl = playbackUrlsRef.current[index];
    console.log(`Attempting to play URL ${index + 1}/${playbackUrlsRef.current.length}: ${targetUrl}`);
    
    setStatus('buffering');
    setStatusText('Подключение...');

    if (!audioRef.current) {
      const audio = new Audio(targetUrl);
      audioRef.current = audio;
      setupAudioListeners(audio);
    } else {
      audioRef.current.pause();
      audioRef.current.src = targetUrl;
      audioRef.current.load();
    }

    audioRef.current.volume = volume;

    // Set a timeout of 7 seconds to try the next URL if loading hangs
    playbackTimeoutRef.current = setTimeout(() => {
      console.warn(`Playback timeout for ${targetUrl}, trying next source...`);
      tryNextSource(station);
    }, 7000);

    audioRef.current.play()
      .then(() => {
        if (playbackTimeoutRef.current) {
          clearTimeout(playbackTimeoutRef.current);
        }
        setIsPlaying(true);
        setStatus('playing');
        setStatusText('Играет');
      })
      .catch((err) => {
        console.warn(`Immediate play failure for ${targetUrl}:`, err);
        if (currentUrlIndexRef.current === index) {
          if (playbackTimeoutRef.current) {
            clearTimeout(playbackTimeoutRef.current);
          }
          tryNextSource(station);
        }
      });
  };

  // 7. Initialize Audio Event listeners to manage stream buffers
  const setupAudioListeners = (audio: HTMLAudioElement) => {
    audio.addEventListener('playing', () => {
      if (playbackTimeoutRef.current) {
        clearTimeout(playbackTimeoutRef.current);
      }
      setIsPlaying(true);
      setStatus('playing');
      setStatusText('Играет');
    });

    audio.addEventListener('pause', () => {
      setIsPlaying(false);
      setStatus('paused');
      setStatusText('Пауза');
    });

    audio.addEventListener('waiting', () => {
      setStatus('buffering');
      setStatusText('Буферизация...');
    });

    audio.addEventListener('error', () => {
      if (playbackTimeoutRef.current) {
        clearTimeout(playbackTimeoutRef.current);
      }
      console.warn(`Audio error event fired for: ${audio.src}`);
      if (selectedStationRef.current) {
        tryNextSource(selectedStationRef.current);
      } else {
        setIsPlaying(false);
        setStatus('error');
        setStatusText('Ошибка потока');
      }
    });

    audio.addEventListener('stalled', () => {
      // Stream stalls often require buffer warnings but don't strictly stop play
      setStatus('buffering');
      setStatusText('Буферизация...');
    });
  };

  // Find optimal root API mirror URL
  const bootstrapApi = async () => {
    let chosenServer = FALLBACK_SERVERS[0];
    try {
      setLoaderProgress(70);
      setLoaderText('Выбор зеркала сети...');
      const response = await fetch('https://all.api.radio-browser.info/json/servers');
      if (response.ok) {
        const servers = await response.json();
        if (servers && servers.length > 0) {
          const randomIndex = Math.floor(Math.random() * servers.length);
          chosenServer = `https://${servers[randomIndex].name}`;
        }
      }
    } catch {
      // Mute errors, pick fallback list
      const fallbackRandom = Math.floor(Math.random() * FALLBACK_SERVERS.length);
      chosenServer = FALLBACK_SERVERS[fallbackRandom];
    } finally {
      setApiServer(chosenServer);
      // Fetch initial set of popular radio sources
      fetchStations(true, '', chosenServer);
    }
  };

  const fetchStations = async (reset = false, query = '', customServer = '') => {
    if (isLoading) return;
    setIsLoading(true);

    const initialServer = customServer || apiServer;
    const offset = reset ? 0 : currentOffset;

    // Create a unique ordered list of candidate servers to try (starting with the active/custom one)
    const candidates = [initialServer];
    for (const srv of FALLBACK_SERVERS) {
      if (srv !== initialServer) {
        candidates.push(srv);
      }
    }

    let success = false;
    let lastError: any = null;

    if (reset) {
      setLoaderProgress(85);
      setLoaderText('Синхронизация эфира...');
    }

    for (const server of candidates) {
      try {
        const endpoint = query.trim()
          ? `${server}/json/stations/search?name=${encodeURIComponent(query)}&limit=${LIMIT}&offset=${offset}&order=votes&reverse=true`
          : `${server}/json/stations/search?limit=${LIMIT}&offset=${offset}&order=votes&reverse=true`;

        const response = await fetch(endpoint);
        if (!response.ok) throw new Error(`API server ${server} returned status ${response.status}`);

        const data = await response.json();
        const valid: Station[] = data.filter((s: any) => s.url_resolved && s.name);

        if (reset) {
          setStations(valid);
          setCurrentOffset(valid.length);
          // Pre-select first radio source if cache parameters omit
          if (valid.length > 0 && !selectedStation) {
            setSelectedStation(valid[0]);
          }
        } else {
          setStations((prev) => [...prev, ...valid]);
          setCurrentOffset((prev) => prev + valid.length);
        }

        setHasMore(valid.length === LIMIT);

        // If we switched to a different server due to failure, update our active apiServer state
        if (server !== apiServer) {
          setApiServer(server);
        }

        // Gracefully fade loader out
        if (reset) {
          setLoaderProgress(100);
          setLoaderText('Готово!');
          setTimeout(() => {
            setIsLoaderVisible(false);
          }, 400);
        }

        success = true;
        break; // break out of candidates loop since we succeeded
      } catch (err) {
        console.warn(`Failed to fetch stations from ${server}, trying next...`, err);
        lastError = err;
      }
    }

    if (!success) {
      console.error('All radio API servers failed', lastError);
      setStatus('error');
      setStatusText('Ошибка сети');

      if (reset) {
        setIsLoaderVisible(false);
      }
    }

    setIsLoading(false);
  };

  // 8. Dynamic pagination listener hooked to stream containers
  const handleScrollOffset = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setShowScrollTop(target.scrollTop > 300);

    if (activeTab !== 'radio' || isLoading || !hasMore) return;
    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 250;
    if (isAtBottom) {
      fetchStations(false, searchQuery);
    }
  };

  const scrollToTop = () => {
    contentAreaRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Toggle active play states
  const playStation = (station: Station) => {
    setSelectedStation(station);

    // Save playing identifiers back to persistent storage
    try {
      localStorage.setItem('webradio_last_url', station.url_resolved);
      localStorage.setItem('webradio_last_name', station.name);
      localStorage.setItem('webradio_last_favicon', station.favicon || '');
    } catch (e) {
      console.warn('LocalStorage save skipped', e);
    }

    const urlsToTry: string[] = [];
    
    // 1. Try HTTPS version of url_resolved directly
    if (station.url_resolved) {
      const secureResolved = station.url_resolved.replace(/^http:\/\//i, 'https://');
      urlsToTry.push(secureResolved);
      urlsToTry.push(station.url_resolved);
    }
    
    // 2. Try HTTPS version of original url directly
    if (station.url) {
      const secureUrl = station.url.replace(/^http:\/\//i, 'https://');
      urlsToTry.push(secureUrl);
      urlsToTry.push(station.url);
    }

    // Remove duplicates while keeping order
    const uniqueUrls = Array.from(new Set(urlsToTry)).filter(Boolean);
    
    playbackUrlsRef.current = uniqueUrls;
    currentUrlIndexRef.current = 0;
    
    playUrlIndex(station, 0);
  };

  const handlePlayToggle = () => {
    if (!selectedStation) {
      setStatusText('Выберите станцию');
      return;
    }

    if (!audioRef.current) {
      playStation(selectedStation);
    } else {
      if (isPlaying) {
        if (playbackTimeoutRef.current) {
          clearTimeout(playbackTimeoutRef.current);
        }
        audioRef.current.pause();
      } else {
        if (status === 'error' || !audioRef.current.src) {
          playStation(selectedStation);
        } else {
          audioRef.current.play().catch((err) => {
            console.warn('Play failed, restarting playback flow:', err);
            playStation(selectedStation);
          });
        }
      }
    }
  };

  const toggleFavorite = (station: Station) => {
    let updatedFavorites: Station[] = [];
    const isFav = favorites.some((f) => f.url_resolved === station.url_resolved);

    if (isFav) {
      updatedFavorites = favorites.filter((f) => f.url_resolved !== station.url_resolved);
    } else {
      updatedFavorites = [
        ...favorites,
        {
          url_resolved: station.url_resolved,
          name: station.name,
          tags: station.tags || '',
          favicon: station.favicon || '',
        },
      ];
    }

    setFavorites(updatedFavorites);
    try {
      localStorage.setItem('webradio_favorites', JSON.stringify(updatedFavorites));
    } catch (e) {
      console.warn('LocalStorage save skipped', e);
    }
  };

  const isFavorite = (station: Station) => {
    return favorites.some((f) => f.url_resolved === station.url_resolved);
  };

  const t = translations[resolvedLang] || translations['en'];

  return (
    <div className="flex justify-center w-full min-h-screen bg-[#0e0e0e] text-white font-sans antialiased">
      {/* Visual Splash transition loaders */}
      <Loader
        progress={loaderProgress}
        text={loaderText}
        isVisible={isLoaderVisible}
        resolvedTheme={resolvedTheme}
      />

      <div 
        className={`w-full max-w-[500px] h-screen flex flex-col relative overflow-hidden shadow-2xl transition-colors duration-200 ${resolvedTheme === 'light' ? 'bg-[#f7f8fa] text-[#1c1c1e]' : 'bg-[#121212] text-white'}`}
      >
        {/* Telegram Safe Area Status Bar Spacer */}
        <div 
          className={`w-full shrink-0 transition-colors duration-200 ${
            resolvedTheme === 'light' 
              ? 'bg-black' 
              : 'bg-[#1e1e1e]'
          }`}
          style={{ height: 'var(--tg-safe-area-inset-top, 0px)' }}
        />

        {/* App Title Header exactly like .app-header */}
        <header 
          className={`pt-2 safe-pl safe-pr pb-2 text-center shrink-0 transition-colors duration-200 ${
            resolvedTheme === 'light' 
              ? 'bg-white border-b border-black/[0.05]' 
              : 'bg-[#1e1e1e] border-b border-white/[0.05]'
          }`}
        >
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#c2185b] to-[#e91e63] bg-clip-text text-transparent inline-block pt-0.5 mb-1 tracking-[-0.5px] select-none">
            {activeTab === 'favorites' ? t.navFavorites : activeTab === 'settings' ? t.navSettings : 'WebRadioBot'}
          </h1>

          {/* Search bar module mimicking .search-wrapper exactly on Radio page */}
          {activeTab === 'radio' && (
            <div 
              className={`my-[4px] mx-0 rounded-[28px] p-[4px_8px_4px_16px] flex items-center border transition-all duration-200 ${
                resolvedTheme === 'light'
                  ? 'bg-neutral-100 border-black/[0.06]'
                  : 'bg-[#2c2c2c] border-white/[0.08]'
              }`}
            >
              <Search className="w-[18px] h-[18px] text-[#9e9e9e] mr-2 shrink-0" />
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                autoComplete="off"
                value={searchQuery}
                onChange={(e) => setSearchQuery(sanitizeInput(e.target.value))}
                className={`w-full bg-transparent border-none outline-none text-[16px] py-3 px-0 font-medium placeholder-[#9e9e9e] focus:outline-none ${
                  resolvedTheme === 'light' ? 'text-[#1c1c1e]' : 'text-white'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1.5 hover:bg-black/[0.05] dark:hover:bg-white/[0.05] rounded-full transition-colors shrink-0 mr-1 text-[#9e9e9e] hover:text-[#e91e63]"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {isLoading && (
                <Loader2 className="w-4 h-4 text-[#c2185b] animate-spin shrink-0 mr-1" />
              )}
            </div>
          )}
        </header>

        {/* Primary Scrollable Scroll Container */}
        <div
          ref={contentAreaRef}
          onScroll={handleScrollOffset}
          className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2 scroll-smooth"
        >
          {activeTab === 'radio' && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3 px-1.5 text-xs uppercase tracking-wider font-extrabold text-neutral-400 select-none">
                <Radio className="w-4.5 h-4.5 text-[#c2185b]" />
                <span>{t.allRadioStations}</span>
              </div>

              {stations.length === 0 && !isLoading ? (
                <div className="text-center py-12 text-[#9e9e9e] select-none">
                  <Search className="w-12 h-12 text-neutral-600 mx-auto mb-2.5" />
                  <p className="font-bold text-sm">
                    {t.noStationsFound}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {t.tryModifyingQuery}
                  </p>
                </div>
              ) : (
                <div>
                  {stations.map((item, index) => (
                    <StationCard
                      key={`${item.url_resolved}-${index}`}
                      station={item}
                      isActive={
                        selectedStation !== null &&
                        selectedStation.url_resolved === item.url_resolved
                      }
                      isFavorite={isFavorite(item)}
                      onPlay={() => playStation(item)}
                      onToggleFavorite={() => toggleFavorite(item)}
                      resolvedTheme={resolvedTheme}
                    />
                  ))}

                  {/* Infinite scrolling bottom loaders */}
                  {hasMore && (
                    <div className="text-center py-5 text-[#9e9e9e] text-xs font-bold flex items-center justify-center gap-2 select-none">
                      <Loader2 className="w-4 h-4 text-[#c2185b] animate-spin" />
                      {t.loading}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'favorites' && (
            <div className="mb-4">
              {favorites.length === 0 ? (
                <div className="text-center py-12 text-[#9e9e9e] select-none">
                  <Heart className="w-12 h-12 text-neutral-600 mx-auto mb-2.5" />
                  <p className="font-bold text-sm">
                    {t.noFavoriteStations}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {t.addFavoritesHint}
                  </p>
                </div>
              ) : (
                <div>
                  {favorites.map((item, index) => (
                    <StationCard
                      key={`${item.url_resolved}-${index}`}
                      station={item}
                      isActive={
                        selectedStation !== null &&
                        selectedStation.url_resolved === item.url_resolved
                      }
                      isFavorite={true}
                      onPlay={() => playStation(item)}
                      onToggleFavorite={() => toggleFavorite(item)}
                      resolvedTheme={resolvedTheme}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              theme={theme}
              lang={lang}
              resolvedLang={resolvedLang}
              onThemeChange={setTheme}
              onLangChange={handleLangChange}
              resolvedTheme={resolvedTheme}
            />
          )}
        </div>

        {/* Dynamic Media Controller docked at bottom */}
        <PlayerBar
          activeStation={selectedStation}
          isPlaying={isPlaying}
          status={status}
          statusText={getLocalizedStatusText(status, resolvedLang)}
          volume={volume}
          onPlayToggle={handlePlayToggle}
          onVolumeChange={setVolume}
          lang={resolvedLang}
          resolvedTheme={resolvedTheme}
          theme={theme}
        />

        {/* Base navigation controllers matching .bottom-nav */}
        <nav 
          className={`flex items-center justify-around border-t shrink-0 select-none transition-colors duration-200 ${
            resolvedTheme === 'light'
              ? 'bg-white border-black/[0.05]'
              : 'bg-[#1a1a1a] border-white/[0.05]'
          }`}
          style={{ 
            padding: '6px 8px calc(var(--tg-safe-area-inset-bottom, 0px) + 6px)'
          }}
        >
          <button
            onClick={() => setActiveTab('radio')}
            className={`flex flex-col items-center gap-[2px] text-[11px] font-semibold rounded-[30px] transition-all duration-150 flex-1 max-w-[100px] cursor-pointer py-1.5 px-3 ${
              activeTab === 'radio'
                ? 'text-[#e91e63] bg-[#e91e63]/10'
                : resolvedTheme === 'light' ? 'text-neutral-500 hover:text-neutral-800' : 'text-[#888888] hover:text-white'
            }`}
          >
            <Radio className="w-[22px] h-[22px]" />
            <span>{t.navRadio}</span>
          </button>

          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex flex-col items-center gap-[2px] text-[11px] font-semibold rounded-[30px] transition-all duration-150 flex-1 max-w-[100px] cursor-pointer py-1.5 px-3 ${
              activeTab === 'favorites'
                ? 'text-[#e91e63] bg-[#e91e63]/10'
                : resolvedTheme === 'light' ? 'text-neutral-500 hover:text-neutral-800' : 'text-[#888888] hover:text-white'
            }`}
          >
            <Heart className="w-[22px] h-[22px]" />
            <span>{t.navFavorites}</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center gap-[2px] text-[11px] font-semibold rounded-[30px] transition-all duration-150 flex-1 max-w-[100px] cursor-pointer py-1.5 px-3 ${
              activeTab === 'settings'
                ? 'text-[#e91e63] bg-[#e91e63]/10'
                : resolvedTheme === 'light' ? 'text-neutral-500 hover:text-neutral-800' : 'text-[#888888] hover:text-white'
            }`}
          >
            <Settings className="w-[22px] h-[22px]" />
            <span>{t.navSettings}</span>
          </button>
        </nav>

        {/* Float Scroll-To-Top trigger matching .scroll-to-top exactly */}
        <button
          onClick={scrollToTop}
          className={`fixed z-30 flex items-center justify-center w-12 h-12 rounded-[24px] bg-[#c2185b] text-white cursor-pointer select-none shadow-[0_4px_12px_rgba(0,0,0,0.4)] transition-all duration-200 active:scale-95 active:bg-[#ad1457] ${
            showScrollTop ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
          }`}
          style={{
            bottom: 'calc(130px + var(--tg-safe-area-inset-bottom, 0px))',
            right: 'max(20px, calc(20px + var(--tg-safe-area-inset-right, 0px)))'
          }}
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
}
