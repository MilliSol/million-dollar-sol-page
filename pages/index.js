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
  const usdAmount     = selectedCount * 100;
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

  // --- Client-side viewport fix: zet viewport width op bandWidthPx op small screens ---
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;

    const applyViewport = () => {
      const w = window.innerWidth || document.documentElement.clientWidth;
      if (w < bandWidthPx) {
        // toon het volledige design (bandWidthPx) in 1x op mobiel — browser zal schalen
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
      // restore default
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

      {/* Zodra hasLaunched true is, of launchDate gepasseerd, render de site */}
      {hasLaunched && (
        // belangrijk: width en centeren zodat viewport scaling klopt op mobiel
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
              {/* Titel & Wallet */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.2rem',
                }}
              >
                <h1
                  style={{
                    margin: 0,
                    color: '#fff',
                    fontSize: '2rem',
                    lineHeight: 1.2,
                  }}
                >
                  Million Dollar SOL Page
                </h1>
                <WalletMultiButton className="menu-btn" />
              </div>

              {/* Ondertitel */}
              <p
                style={{
                  margin: '0 0 0.3rem',
                  color: '#d8d8d8ff',
                  fontSize: '0.91rem',
                  textAlign: 'left',
                }}
              >
                Your Brand, Your Space. $1 Per Pixel, 10x10 blocks.
              </p>
              <p
                style={{
                  margin: '0 0 0.3rem',
                  color: '#ffffffff',
                  fontSize: '0.5rem',
                  textAlign: 'left',
                }}
              >
                10 years of ads from just 100$
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
                  {selectedCount} blocks = ${usdAmount.toLocaleString()}
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
                {/* LINKS: horizontaal scrollbaar op mobiel */}
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
                    href="https://x.com/solpagee"
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