// pages/index.js
import React, { useState, useMemo, useEffect, useRef } from 'react';
import LaunchCountdown from '../components/LaunchCountdown';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useWallet } from '@solana/wallet-adapter-react';
import Canvas from '../components/Canvas';
import UploadForm from '../components/UploadForm';
import Modal from '../components/Modal';
import ContactModal from '../components/ContactModal';
import TimelineModal from '../components/TimelineModal';
import TermsModal from '../components/TermsModal';
import InstructionsModal from '../components/InstructionsModal';
import { supabase } from '../lib/supabaseClient';

const WalletMultiButton = dynamic(
  () =>
    import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

// Helper: check of je selectie één verbonden shape vormt
function isConnected(blocks) {
  if (blocks.length === 0) return false;
  const key = (b) => `${b.col}-${b.row}`;
  const setOf = new Set(blocks.map(key));
  const toVisit = [blocks[0]];
  const visited = new Set([key(blocks[0])]);
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  while (toVisit.length) {
    const { col, row } = toVisit.pop();
    for (const [dx, dy] of dirs) {
      const nk = `${col + dx}-${row + dy}`;
      if (setOf.has(nk) && !visited.has(nk)) {
        visited.add(nk);
        toVisit.push({ col: col + dx, row: row + dy });
      }
    }
  }
  return visited.size === blocks.length;
}

// helper: parse numeric scalar from supabase rpc response (robust)
function parseRpcNumber(data) {
  if (data === null || typeof data === 'undefined') return null;
  if (Array.isArray(data)) {
    const first = data[0];
    if (!first) return null;
    const keys = Object.keys(first);
    if (keys.length === 1) {
      return Number(first[keys[0]]);
    }
    if ('calculate_price' in first) return Number(first.calculate_price);
    for (const k of keys) {
      const v = first[k];
      if (!isNaN(parseFloat(v))) return Number(v);
    }
    return null;
  } else if (typeof data === 'object') {
    if ('calculate_price' in data) return Number(data.calculate_price);
    const keys = Object.keys(data);
    for (const k of keys) {
      const v = data[k];
      if (!isNaN(parseFloat(v))) return Number(v);
    }
    return null;
  } else {
    const n = Number(data);
    return isNaN(n) ? null : n;
  }
}

export default function Home() {
  // NOTE: keep CSS :root --header-height in sync (fallback if not found)
  const HEADER_HEIGHT_FALLBACK = 64;

  const [hasLaunched, setHasLaunched] = useState(false);

  const { publicKey } = useWallet();

  const [selectedBlocks, setSelectedBlocks]     = useState([]);
  const [showUpload, setShowUpload]             = useState(false);
  const [refreshFlag, setRefreshFlag]           = useState(false);
  const [showContact, setShowContact]           = useState(false);
  const [showTerms, setShowTerms]               = useState(false);
  const [showTimeline, setShowTimeline]         = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [successMessage, setSuccessMessage]     = useState('');

  const connected     = useMemo(() => isConnected(selectedBlocks), [selectedBlocks]);
  const selectedCount = selectedBlocks.length;
  const bandWidthPx   = 100 * 10 + 20; // = 1020px

  const buttonBase = {
    padding: '0.4rem 0.8rem',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontFamily: 'Press Start 2P, monospace',
    fontSize: '12px',
  };

  // Dé datum en tijd van de “go live”
  const launchDate = '2025-08-08T18:00:00Z';

  // --- viewport fix (unchanged) ---
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;

    const applyViewport = () => {
      const w = window.innerWidth || document.documentElement.clientWidth;
      if (w < bandWidthPx) {
        meta.setAttribute('content', `width=${bandWidthPx}`);
      } else {
        meta.setAttribute('content', 'width=device-width, initial-scale=1');
      }
    };

    applyViewport();
    window.addEventListener('resize', applyViewport);
    window.addEventListener('orientationchange', applyViewport);

    return () => {
      window.removeEventListener('resize', applyViewport);
      window.removeEventListener('orientationchange', applyViewport);
      meta.setAttribute('content', 'width=device-width, initial-scale=1');
    };
  }, [bandWidthPx]);
  // --------------------------------------------------------------------------------------

  // Zorg dat pagina automatisch live gaat als datum verstreken is (client-side)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (new Date(launchDate).getTime() <= Date.now()) {
      setHasLaunched(true);
    }
  }, [launchDate]);

  // --- Pricing states ---
  const [currentPriceUsd, setCurrentPriceUsd] = useState(null);
  const [currentPriceLoading, setCurrentPriceLoading] = useState(false);
  const [currentPriceError, setCurrentPriceError] = useState('');

  const [selectionTotalUsd, setSelectionTotalUsd] = useState(null);
  const [selectionTotalLoading, setSelectionTotalLoading] = useState(false);
  const [selectionTotalError, setSelectionTotalError] = useState('');

  // --- Pixels sold (real-time) ---
  const [totalBlocksSold, setTotalBlocksSold] = useState(0); // blocks
  const [pixelsLoading, setPixelsLoading] = useState(false);
  const [pixelsError, setPixelsError] = useState('');

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef(null);

  // header / bottom refs for zoom compensation
  const headerRef = useRef(null);
  const bottomRef = useRef(null);

  // header visibility for scroll hide/show
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(typeof window !== 'undefined' ? window.scrollY : 0);
  const ticking = useRef(false);

  // Utility currency formatter
  const usdFmt = (v) => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(v);
    } catch {
      return `$${Number(v).toFixed(2)}`;
    }
  };

  // Fetch current single-block price (calculate_price(1))
  const fetchCurrentPrice = async () => {
    setCurrentPriceError('');
    setCurrentPriceUsd(null);
    setCurrentPriceLoading(true);
    try {
      const { data, error } = await supabase.rpc('calculate_price', { p_num_blocks: 1 });
      if (error) {
        console.error('calculate_price(1) error', error);
        setCurrentPriceError('Error fetching current price');
      } else {
        const n = parseRpcNumber(data);
        if (n === null) {
          console.warn('Could not parse calculate_price(1) response', data);
          setCurrentPriceError('Unexpected price response');
        } else {
          setCurrentPriceUsd(Number(n.toFixed(2)));
        }
      }
    } catch (err) {
      console.error('Unexpected error fetching current price', err);
      setCurrentPriceError('Unexpected error fetching current price');
    } finally {
      setCurrentPriceLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentPrice();
  }, [refreshFlag]);

  // Fetch selection total price when selectedCount changes
  const fetchSelectionTotal = async (count) => {
    setSelectionTotalError('');
    setSelectionTotalUsd(null);

    if (!count || count <= 0) {
      setSelectionTotalUsd(0);
      return;
    }

    setSelectionTotalLoading(true);
    try {
      const { data, error } = await supabase.rpc('calculate_price', { p_num_blocks: count });
      if (error) {
        console.error('calculate_price for selection error', error);
        setSelectionTotalError('Error fetching selection price');
      } else {
        const n = parseRpcNumber(data);
        if (n === null) {
          console.warn('Could not parse calculate_price response for selection', data);
          setSelectionTotalError('Unexpected price response');
        } else {
          setSelectionTotalUsd(Number(n.toFixed(2)));
        }
      }
    } catch (err) {
      console.error('Unexpected error fetching selection total', err);
      setSelectionTotalError('Unexpected error fetching selection price');
    } finally {
      setSelectionTotalLoading(false);
    }
  };

  useEffect(() => {
    fetchSelectionTotal(selectedCount);
  }, [selectedCount, refreshFlag]);

  // Fetch total sold blocks (robustly via RPC/get_sold_blocks_count)
  const fetchTotalBlocksSold = async () => {
    setPixelsError('');
    setPixelsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_sold_blocks_count');
      if (error) {
        console.error('get_sold_blocks_count error', error);
        setPixelsError('Error fetching sold count');
      } else {
        const parsed = parseRpcNumber(data);
        if (parsed === null) {
          console.warn('Could not parse get_sold_blocks_count result', data);
          setPixelsError('Unexpected response for sold count');
        } else {
          setTotalBlocksSold(Math.max(0, Math.floor(parsed)));
        }
      }
    } catch (err) {
      console.error('Unexpected error fetching sold count', err);
      setPixelsError('Unexpected error fetching sold count');
    } finally {
      setPixelsLoading(false);
    }
  };

  // subscribe to realtime changes on pixels table for live updates
  useEffect(() => {
    // initial fetch
    fetchTotalBlocksSold();

    // create channel subscription
    const channel = supabase
      .channel('public:pixels_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pixels' },
        (payload) => {
          // whenever pixels table changes, refresh sold count and prices
          console.log('realtime pixels change:', payload.eventType);
          fetchTotalBlocksSold();
          // also refresh prices shown
          setRefreshFlag((f) => !f);
        }
      )
      .subscribe((status) => {
        console.log('realtime subscription status:', status);
      });

    return () => {
      // unsubscribe properly
      try {
        channel.unsubscribe();
      } catch (e) {
        console.warn('Failed to unsubscribe realtime channel', e);
      }
    };
    // we only want to subscribe once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // computed pixels value (blocks * 100)
  const pixelsSoldDisplay = totalBlocksSold * 100;

  // Close sidebar when clicking outside
  useEffect(() => {
    function handleDocClick(e) {
      if (!sidebarRef.current) return;
      if (sidebarOpen && !sidebarRef.current.contains(e.target)) {
        setSidebarOpen(false);
      }
    }
    if (sidebarOpen) {
      document.addEventListener('mousedown', handleDocClick);
      document.addEventListener('touchstart', handleDocClick);
    } else {
      document.removeEventListener('mousedown', handleDocClick);
      document.removeEventListener('touchstart', handleDocClick);
    }
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, [sidebarOpen]);

  // visualViewport compensation: keep header and bottom visually same size when page zoom changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const vv = window.visualViewport;
    if (!vv) return; // not supported -> skip compensation

    const applyScale = () => {
      const scale = vv.scale || 1;
      // inverse scale to keep header/bottom same visual size
      const inv = 1 / (scale || 1);
      if (headerRef.current) {
        headerRef.current.style.setProperty('--header-scale', String(inv));
      }
      if (bottomRef.current) {
        bottomRef.current.style.setProperty('--bottom-scale', String(inv));
      }
    };

    applyScale();
    vv.addEventListener('resize', applyScale);
    vv.addEventListener('scroll', applyScale);
    return () => {
      try {
        vv.removeEventListener('resize', applyScale);
        vv.removeEventListener('scroll', applyScale);
      } catch (e) {}
    };
  }, []);

  // SCROLL -> hide/show header logic (throttled via rAF)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    lastScrollY.current = window.scrollY || 0;

    const THRESHOLD = 8; // px to avoid jitter
    function onScroll() {
      if (ticking.current) return;
      ticking.current = true;
      window.requestAnimationFrame(() => {
        const currentY = window.scrollY || 0;
        const delta = currentY - lastScrollY.current;

        // if near top, always show
        if (currentY < 40) {
          setHeaderVisible(true);
        } else if (sidebarOpen) {
          // keep header visible when sidebar open
          setHeaderVisible(true);
        } else {
          if (delta > THRESHOLD) {
            // scrolled down -> hide
            setHeaderVisible(false);
          } else if (delta < -THRESHOLD) {
            // scrolled up -> show
            setHeaderVisible(true);
          }
        }

        lastScrollY.current = currentY;
        ticking.current = false;
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('touchmove', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('touchmove', onScroll);
    };
  }, [sidebarOpen]);

  // bottom bar helpers
  const selectionIsValid = connected && selectedCount > 0;

  // header CSS class based on visibility
  const headerClass = headerVisible ? 'site-header' : 'site-header hidden';

  // inline transform styles for sidebar + overlay (explicit, avoids CSS/hydration mismatch)
  const sidebarTransform = sidebarOpen ? 'translateX(0)' : 'translateX(-100%)';
  const overlayStyle = {
    background: sidebarOpen ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0)',
    pointerEvents: sidebarOpen ? 'auto' : 'none',
  };

  return (
    <>
      <Head>
        <title>Million Dollar SOL Page</title>
      </Head>

      {/* Pre-launch overlay */}
      {!hasLaunched && (
        <LaunchCountdown
          launchDate={launchDate}
          onLaunch={() => setHasLaunched(true)}
        />
      )}

      {hasLaunched && (
        <div className="page-wrapper" style={{ width: bandWidthPx, margin: '0 auto' }}>
          {/* STICKY (fixed) HEADER (we keep ref for compensation) */}
          <header
            ref={headerRef}
            className={headerClass}
            style={{ zIndex: 1600 }}
          >
            <div className="header-inner" style={{ width: '100%', maxWidth: bandWidthPx, margin: '0 auto', boxSizing: 'border-box' }}>
              {/* left: hamburger */}
              <button
                className="hamburger-btn"
                aria-label="Open menu"
                onClick={() => setSidebarOpen(true)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                ☰
              </button>

              {/* center: title + small stats */}
              <div className="header-center">
                <h1 className="site-title">Million Dollar SOL Page</h1>

                <div className="header-stats" style={{ marginBottom: 6 }}>
                  {pixelsLoading ? (
                    <span className="stat">Loading sold pixels...</span>
                  ) : pixelsError ? (
                    <span className="stat">Error</span>
                  ) : (
                    <span className="stat">{pixelsSoldDisplay.toLocaleString()}/1.000.000 pixels sold</span>
                  )}

                  <span className="stat-sep">·</span>

                  {currentPriceLoading ? (
                    <span className="stat">Fetching price...</span>
                  ) : currentPriceError ? (
                    <span className="stat">Error</span>
                  ) : (
                    <span className="stat">Current block price: {usdFmt(currentPriceUsd)}</span>
                  )}
                </div>
              </div>

              {/* right: wallet (smaller via extra class) */}
              <div className="header-right">
                <WalletMultiButton className="menu-btn wallet-btn-small" />
              </div>
            </div>
          </header>

          {/* Sidebar + overlay (overlay clickable to close) */}
          <div
            className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
            aria-hidden={!sidebarOpen}
            onClick={() => setSidebarOpen(false)}
            style={overlayStyle}
          />
          <aside
            ref={sidebarRef}
            className={`sidebar ${sidebarOpen ? 'open' : ''}`}
            aria-hidden={!sidebarOpen}
            style={{ transform: sidebarTransform }}
          >
            <div className="sidebar-head">
              <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu">✕</button>
            </div>

            <nav className="sidebar-nav">
              <button className="menu-link" onClick={() => { setSidebarOpen(false); setShowInstructions(true); }}>Instructions</button>
              <button className="menu-link" onClick={() => { setSidebarOpen(false); setShowTimeline(true); }}>Whitepaper</button>
              <button className="menu-link" onClick={() => { setSidebarOpen(false); setShowTerms(true); }}>Terms</button>
              <button className="menu-link" onClick={() => { setSidebarOpen(false); setShowContact(true); }}>Contact</button>

              <hr className="sidebar-sep" />

              <a className="menu-link" href="https://pump.fun/coin/E99SqUkMfXx8ev6qwKeBNBC6635WXXH1AUsLu6YQpump" target="_blank" rel="noreferrer"> $SOLPAGE </a>

              <div className="sidebar-icons">
                <a href="https://x.com/solpagex" target="_blank" rel="noreferrer" aria-label="X">X</a>
                <a href="https://t.me/MilliondollarSolpage" target="_blank" rel="noreferrer" aria-label="Telegram">Telegram</a>
              </div>
            </nav>
          </aside>

          {/* page-inner content (centered) — paddingTop handled by CSS var so canvas won't sit under header */}
          <div
            className="page-inner"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            {/* Success message */}
            {successMessage && (
              <div
                style={{
                  backgroundColor: '#14F195',
                  color: '#000',
                  padding: '0.8rem 1rem',
                  margin: '1rem auto',
                  width: bandWidthPx,
                  borderRadius: '4px',
                  fontFamily: 'Press Start 2P, monospace',
                  fontSize: '0.75rem',
                  textAlign: 'center',
                  boxShadow: '0 0 10px rgba(0,0,0,0.2)',
                  zIndex: 200,
                }}
              >
                {successMessage}
              </div>
            )}

            {/* CANVAS */}
            <div
              className="canvas-wrapper"
              style={{
                width: bandWidthPx,
                padding: '10px',
                background: '#555',
                boxSizing: 'border-box',
                position: 'relative',
                zIndex: 1
              }}
            >
              <div className="canvas-inner">
                <Canvas
                  selectedBlocks={selectedBlocks}
                  setSelectedBlocks={setSelectedBlocks}
                  onSelectCountChange={() => {}}
                  refreshFlag={refreshFlag}
                />
              </div>
            </div>
          </div>

          {/* bottom action bar (fixed full width, flush to bottom) */}
          {selectedCount > 0 && (
            <div ref={bottomRef} className="bottom-bar" style={{ zIndex: 1700 }}>
              <div
                className="bottom-segment bottom-left"
                role="button"
                onClick={() => setSelectedBlocks([])}
                aria-disabled={false}
              >
                Clear Selection
              </div>

              <div
                className={`bottom-segment bottom-right ${selectionIsValid ? '' : 'disabled'}`}
                role="button"
                onClick={() => {
                  if (!selectionIsValid) return;
                  setShowUpload(true);
                }}
                aria-disabled={!selectionIsValid}
              >
                {selectionTotalLoading ? (
                  <>Buy Selection (calculating...)</>
                ) : selectionTotalError ? (
                  <>Buy Selection (error)</>
                ) : (
                  <>Buy Selection ({selectionTotalUsd !== null ? usdFmt(selectionTotalUsd) : '--'})</>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODALS */}
      {showUpload && (
        <Modal onClose={() => setShowUpload(false)}>
          <UploadForm
            selectedBlocks={selectedBlocks}
            onUploadComplete={() => {
              setSelectedBlocks([]);
              setShowUpload(false);
              setRefreshFlag((f) => !f);
              setSuccessMessage('✅ Upload successful!');
              setTimeout(() => setSuccessMessage(''), 4000);
            }}
            disableSubmit={!connected}
            onShowInstructions={() => setShowInstructions(true)}
            onShowTerms={() => setShowTerms(true)}
          />
        </Modal>
      )}
      {showInstructions && (
        <Modal onClose={() => setShowInstructions(false)}>
          <InstructionsModal onClose={() => setShowInstructions(false)} />
        </Modal>
      )}
      {showTimeline && (
        <Modal onClose={() => setShowTimeline(false)}>
          <TimelineModal onClose={() => setShowTimeline(false)} />
        </Modal>
      )}
      {showTerms && (
        <Modal onClose={() => setShowTerms(false)}>
          <TermsModal onClose={() => setShowTerms(false)} />
        </Modal>
      )}
      {showContact && (
        <Modal onClose={() => setShowContact(false)}>
          <ContactModal onClose={() => setShowContact(false)} />
        </Modal>
      )}
    </>
  );
}