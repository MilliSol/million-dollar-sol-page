// pages/index.js
import React, { useState, useMemo, useEffect } from 'react';
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
        // supabase returns scalar or array — parse robustly
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
          <div
            className="page-inner"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {/* STICKY HEADER */}
            <div
              className="sticky-header"
              style={{
                position: 'sticky',
                top: 0,
                width: bandWidthPx,
                backgroundColor: 'rgba(153,69,255,0.85)',
                backdropFilter: 'blur(8px)',
                padding: '1rem',
                boxSizing: 'border-box',
                zIndex: 100,
              }}
            >
              {/* Titel & Wallet (title centered, wallet right) */}
              <div
                style={{
                  position: 'relative',
                  marginBottom: '0.0rem',
                  height: '48px', // gives space for centered title and right button
                }}
              >
                <h1
                  style={{
                    position: 'absolute',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    margin: 0,
                    color: '#fff',
                    fontSize: '1.7rem',
                    lineHeight: 0.8,
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Million Dollar SOL Page
                </h1>

                <div style={{ position: 'absolute', right: 0 }}>
                  <WalletMultiButton className="menu-btn" />
                </div>
              </div>

              {/* Ondertitel */}
              <p
                style={{
                  margin: '0 0 0.2rem',
                  color: '#d8d8d8ff',
                  fontSize: '1rem',
                  textAlign: 'center',
                }}
              >
                Your Brand, Your Space. 
              </p>

              {/* Pixels sold (realtime) */}
              <p
                style={{
                  margin: '0 0 0.6rem',
                  color: '#ffffffff',
                  fontSize: '0.7rem',
                  textAlign: 'center',
                }}
              >
                {pixelsLoading && 'Loading sold pixels...'}
                {!pixelsLoading && pixelsError && `Error: ${pixelsError}`}
                {!pixelsLoading && !pixelsError && (
                  <>
                    <strong>{pixelsSoldDisplay.toLocaleString()}</strong> pixels sold
                  </>
                )}
              </p>

              {/* CURRENT PRICE */}
              <p
                style={{
                  margin: '0 0 0.1rem',
                  color: '#ffffffff',
                  fontSize: '0.7rem',
                  textAlign: 'center',
                }}
              >
                {currentPriceLoading && 'Fetching current block price...'}
                {!currentPriceLoading && currentPriceError && `Error: ${currentPriceError}`}
                {!currentPriceLoading && !currentPriceError && currentPriceUsd !== null && (
                  <>
                    Current block price: <strong>{usdFmt(currentPriceUsd)}</strong>
                  </>
                )}
              </p>

              {/* Buy + Teller */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  marginBottom: '0.5rem',
                }}
              >
                <button
                  onClick={() => setShowUpload(true)}
                  disabled={!connected || selectedCount === 0}
                  className="no-hover-btn"
                  style={{
                    ...buttonBase,
                    width: '150px',
                    background:
                      connected && selectedCount > 0 ? '#14F195' : '#888',
                    marginBottom: '0.4rem',
                    cursor:
                      connected && selectedCount > 0
                        ? 'pointer'
                        : 'not-allowed',
                  }}
                >
                  Buy Selection
                </button>

                <div style={{ color: '#fff', fontSize: '0.7rem' }}>
                  {selectedCount} blocks =&nbsp;
                  {selectionTotalLoading && 'calculating...'}
                  {!selectionTotalLoading && selectionTotalError && `Error`}
                  {!selectionTotalLoading && !selectionTotalError && selectionTotalUsd !== null && (
                    <>{usdFmt(selectionTotalUsd)}</>
                  )}
                </div>
              </div>

              {/* Menu-buttons (links) & Clear (rechts) */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                {/* LINKS: horizontaal scrollbaar on mobiel */}
                <div
                  className="menu-button-row"
                  style={{ display: 'flex', gap: '0.05rem' }}
                >
                  <a
                    href="https://pump.fun/coin/E99SqUkMfXx8ev6qwKeBNBC6635WXXH1AUsLu6YQpump"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="menu-btn"
                    style={{ ...buttonBase, background: '#9945FF' }}
                  >
                    $SOLPAGE
                  </a>
                  <a
                    href="https://x.com/solpagex"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="menu-btn"
                    style={{ ...buttonBase, background: '#9945FF' }}
                  >
                    X
                  </a>
                  <a
                    href="https://t.me/MilliondollarSolpage"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="menu-btn"
                    style={{ ...buttonBase, background: '#9945FF' }}
                  >
                    Telegram
                  </a>
                  <button
                    onClick={() => setShowInstructions(true)}
                    className="menu-btn"
                    style={{ ...buttonBase, background: '#9945FF' }}
                  >
                    Instructions
                  </button>
                  <button
                    onClick={() => setShowTimeline(true)}
                    className="menu-btn"
                    style={{ ...buttonBase, background: '#9945FF' }}
                  >
                    Whitepaper
                  </button>
                  <button
                    onClick={() => setShowTerms(true)}
                    className="menu-btn"
                    style={{ ...buttonBase, background: '#9945FF' }}
                  >
                    Terms
                  </button>
                  <button
                    onClick={() => setShowContact(true)}
                    className="menu-btn"
                    style={{ ...buttonBase, background: '#9945FF' }}
                  >
                    Contact
                  </button>
                </div>

                {/* CLEAR SELECTION */}
                <button
                  onClick={() => setSelectedBlocks([])}
                  disabled={selectedCount === 0}
                  className="no-hover-btn clear-btn"
                  style={{
                    ...buttonBase,
                    width: '150px',
                    background: selectedCount === 0 ? '#888' : '#555',
                    cursor:
                      selectedCount === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Clear Selection
                </button>
              </div>
            </div>

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