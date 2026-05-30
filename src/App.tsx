import React, { useState, useEffect, useRef } from 'react';
import { Search, Heart, Radio, Info, ArrowUp, Loader2 } from 'lucide-react';
import { Station, TabType } from './types';
import Loader from './components/Loader';
import StationCard from './components/StationCard';
import PlayerBar from './components/PlayerBar';
import AboutTab from './components/AboutTab';

const LIMIT = 100;
const FALLBACK_SERVERS = [
  'https://de1.api.radio-browser.info',
  'https://fr1.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
  'https://at1.api.radio-browser.info'
];

export default function App() {
  // Navigation & View tab states
  const [activeTab, setActiveTab] = useState<TabType>('radio');
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
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

      const lastUrl = localStorage.getItem('webradio_last_url');
      const lastName = localStorage.getItem('webradio_last_name');
      const lastFavicon = localStorage.getItem('webradio_last_favicon');

      if (lastUrl && lastName) {
        const cachedStation: Station = {
          url_resolved: lastUrl,
          name: lastName,
          favicon: lastFavicon || '',
        };
        setSelectedStation(cachedStation);
        setStatus('idle');
        setStatusText('Готово');
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
      } else {
        backButton.hide();
      }
    }
  }, [activeTab]);

  // 7. Initialize Audio Event listeners to manage stream buffers
  const setupAudioListeners = (audio: HTMLAudioElement) => {
    audio.addEventListener('playing', () => {
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
      setIsPlaying(false);
      setStatus('error');
      setStatusText('Ошибка потока');
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
        const servers = await response.ok ? await response.json() : [];
        if (servers.length > 0) {
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

    const activeServer = customServer || apiServer;
    const offset = reset ? 0 : currentOffset;

    try {
      if (reset) {
        setLoaderProgress(85);
        setLoaderText('Синхронизация эфира...');
      }

      const endpoint = query.trim()
        ? `${activeServer}/json/stations/search?name=${encodeURIComponent(query)}&limit=${LIMIT}&offset=${offset}&order=votes&reverse=true`
        : `${activeServer}/json/stations/search?limit=${LIMIT}&offset=${offset}&order=votes&reverse=true`;

      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('API server failed');

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

      // Gracefully fade loader out
      if (reset) {
        setLoaderProgress(100);
        setLoaderText('Готово!');
        setTimeout(() => {
          setIsLoaderVisible(false);
        }, 400);
      }
    } catch (err) {
      console.error('Error requesting stations list', err);
      setStatus('error');
      setStatusText('Ошибка сети');

      if (reset) {
        setIsLoaderVisible(false);
      }
    } finally {
      setIsLoading(false);
    }
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

    if (!audioRef.current) {
      const audio = new Audio(station.url_resolved);
      audioRef.current = audio;
      setupAudioListeners(audio);
    } else {
      audioRef.current.pause();
      audioRef.current.src = station.url_resolved;
      audioRef.current.load();
    }

    // Set precise sound boundaries
    audioRef.current.volume = volume;

    audioRef.current.play().catch((err) => {
      console.error('Audio play failed', err);
      setStatus('error');
      setStatusText('Ошибка воспроизведения');
    });
  };

  const handlePlayToggle = () => {
    if (!selectedStation) {
      setStatusText('Выберите станцию');
      return;
    }

    if (!audioRef.current) {
      // Lazy construct player interface
      const audio = new Audio(selectedStation.url_resolved);
      audioRef.current = audio;
      setupAudioListeners(audio);
      audioRef.current.volume = volume;
      audioRef.current.play().catch(() => {
        setStatus('error');
        setStatusText('Ошибка воспроизведения');
      });
    } else {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => {
          setStatus('error');
          setStatusText('Ошибка воспроизведения');
        });
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

  return (
    <div className="flex justify-center w-full min-h-screen bg-[#0e0e0e] text-white font-sans antialiased">
      {/* Visual Splash transition loaders */}
      <Loader
        progress={loaderProgress}
        text={loaderText}
        isVisible={isLoaderVisible}
      />

      <div className="w-full max-w-[500px] h-screen flex flex-col bg-[#121212] relative overflow-hidden shadow-2xl">
        {/* App Title Header exactly like .app-header */}
        <header className="safe-pt safe-pl safe-pr pb-2 bg-[#1e1e1e] border-b border-white/[0.05] text-center shrink-0">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#c2185b] to-[#e91e63] bg-clip-text text-transparent inline-block mb-1 tracking-[-0.5px] select-none">
            WebRadioBot
          </h1>

          {/* Search bar module mimicking .search-wrapper exactly on Radio page */}
          {activeTab === 'radio' && (
            <div className="my-[4px] mx-0 bg-[#2c2c2c] rounded-[28px] p-[4px_8px_4px_16px] flex items-center border border-white/[0.08]">
              <Search className="w-[18px] h-[18px] text-[#9e9e9e] mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Поиск станций..."
                autoComplete="off"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-white text-[16px] py-3 px-0 font-medium placeholder-[#9e9e9e] focus:outline-none"
              />
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
                <span>Все радиостанции</span>
              </div>

              {stations.length === 0 && !isLoading ? (
                <div className="text-center py-12 text-[#9e9e9e] select-none">
                  <Search className="w-12 h-12 text-neutral-600 mx-auto mb-2.5" />
                  <p className="font-bold text-sm">Ничего не найдено</p>
                  <p className="text-xs text-neutral-500 mt-1">Попробуйте изменить запрос</p>
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
                    />
                  ))}

                  {/* Infinite scrolling bottom loaders */}
                  {hasMore && (
                    <div className="text-center py-5 text-[#9e9e9e] text-xs font-bold flex items-center justify-center gap-2 select-none">
                      <Loader2 className="w-4 h-4 text-[#c2185b] animate-spin" />
                      Загрузка...
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'favorites' && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3 px-1.5 text-xs uppercase tracking-wider font-extrabold text-neutral-400 select-none">
                <Heart className="w-4.5 h-4.5 text-[#c2185b] fill-[#c2185b]" />
                <span>Избранное</span>
              </div>

              {favorites.length === 0 ? (
                <div className="text-center py-12 text-[#9e9e9e] select-none">
                  <Heart className="w-12 h-12 text-neutral-600 mx-auto mb-2.5" />
                  <p className="font-bold text-sm">Нет избранных станций</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Добавляйте любимые волны спонтанно!
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
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'about' && <AboutTab />}
        </div>

        {/* Dynamic Media Controller docked at bottom */}
        <PlayerBar
          activeStation={selectedStation}
          isPlaying={isPlaying}
          status={status}
          statusText={statusText}
          volume={volume}
          onPlayToggle={handlePlayToggle}
          onVolumeChange={setVolume}
        />

        {/* Base navigation controllers matching .bottom-nav */}
        <nav 
          className="flex items-center justify-around bg-[#1a1a1a] border-t border-white/[0.05] shrink-0 select-none"
          style={{ padding: '6px 8px calc(var(--tg-safe-area-inset-bottom, 0px) + 6px)' }}
        >
          <button
            onClick={() => setActiveTab('radio')}
            className={`flex flex-col items-center gap-[2px] text-[11px] font-semibold rounded-[30px] transition-all duration-150 flex-1 max-w-[100px] cursor-pointer py-1.5 px-3 ${
              activeTab === 'radio'
                ? 'text-[#e91e63] bg-[#e91e63]/10'
                : 'text-[#888888]'
            }`}
          >
            <Radio className="w-[22px] h-[22px]" />
            <span>Радио</span>
          </button>

          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex flex-col items-center gap-[2px] text-[11px] font-semibold rounded-[30px] transition-all duration-150 flex-1 max-w-[100px] cursor-pointer py-1.5 px-3 ${
              activeTab === 'favorites'
                ? 'text-[#e91e63] bg-[#e91e63]/10'
                : 'text-[#888888]'
            }`}
          >
            <Heart className="w-[22px] h-[22px]" />
            <span>Избранное</span>
          </button>

          <button
            onClick={() => setActiveTab('about')}
            className={`flex flex-col items-center gap-[2px] text-[11px] font-semibold rounded-[30px] transition-all duration-150 flex-1 max-w-[100px] cursor-pointer py-1.5 px-3 ${
              activeTab === 'about'
                ? 'text-[#e91e63] bg-[#e91e63]/10'
                : 'text-[#888888]'
            }`}
          >
            <Info className="w-[22px] h-[22px]" />
            <span>О нас</span>
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
