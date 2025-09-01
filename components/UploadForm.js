// components/UploadForm.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '../lib/supabaseClient';

export default function UploadForm({
  selectedBlocks,
  onUploadComplete,
  disableSubmit,
  onShowTerms,
  onShowInstructions
}) {
  const { publicKey, sendTransaction } = useWallet();
  const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL);
  const treasury = new PublicKey(process.env.NEXT_PUBLIC_TREASURY_ADDRESS);

  // form state
  const [image, setImage] = useState(null);
  const [link, setLink] = useState('');
  const [altText, setAltText] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [understandInstr, setUnderstandInstr] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [solPrice, setSolPrice] = useState(null);

  // referral state
  const [referralCode, setReferralCode] = useState('');
  const [checkingReferral, setCheckingReferral] = useState(false);
  const [referralValid, setReferralValid] = useState(false);
  const [referralDiscountPct, setReferralDiscountPct] = useState(0);
  const [referralMessage, setReferralMessage] = useState('');

  // pricing state (server)
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState('');
  const [remoteTotalUsd, setRemoteTotalUsd] = useState(null); // USD total from calculate_price

  const blocksCount = selectedBlocks.length;

  // Fetch SOL price
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(
          'https://api.coingecko.com/api/v3/simple/price',
          { params: { ids: 'solana', vs_currencies: 'usd' } }
        );
        if (!cancelled) setSolPrice(res.data.solana.usd);
      } catch (err) {
        console.error('Could not fetch SOL price:', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // When selectedBlocks changes, ask DB for total USD price (calculate_price)
  useEffect(() => {
    let mounted = true;
    const fetchPrice = async () => {
      setPriceError('');
      setRemoteTotalUsd(null);

      if (!blocksCount || blocksCount <= 0) {
        if (mounted) setRemoteTotalUsd(0);
        return;
      }

      setPriceLoading(true);
      try {
        console.log('Calling RPC calculate_price for', blocksCount, 'blocks');
        const { data, error } = await supabase.rpc('calculate_price', { p_num_blocks: blocksCount });

        console.log('calculate_price RPC returned:', { data, error });

        if (error) {
          console.error('calculate_price RPC error:', error);
          if (mounted) {
            setPriceError('Error fetching price. See console.');
            setRemoteTotalUsd(null);
          }
        } else {
          // parse supabase result into a number
          let value = null;
          if (data === null || typeof data === 'undefined') {
            value = null;
          } else if (Array.isArray(data)) {
            const first = data[0];
            if (first) {
              const keys = Object.keys(first);
              if (keys.length === 1) value = first[keys[0]];
              else if ('calculate_price' in first) value = first.calculate_price;
              else {
                for (const k of keys) {
                  if (!isNaN(parseFloat(first[k]))) { value = first[k]; break; }
                }
              }
            }
          } else if (typeof data === 'object' && data !== null) {
            if ('calculate_price' in data) value = data.calculate_price;
            else {
              const keys = Object.keys(data);
              for (const k of keys) {
                if (!isNaN(parseFloat(data[k]))) { value = data[k]; break; }
              }
            }
          } else {
            value = data;
          }

          if (value !== null && value !== undefined && !isNaN(Number(value))) {
            if (mounted) setRemoteTotalUsd(Number(Number(value).toFixed(2)));
          } else {
            console.warn('Unexpected calculate_price response', data);
            if (mounted) {
              setPriceError('Unexpected price response.');
              setRemoteTotalUsd(null);
            }
          }
        }
      } catch (err) {
        console.error('Error calling calculate_price RPC:', err);
        if (mounted) {
          setPriceError('Unexpected error fetching price. See console.');
          setRemoteTotalUsd(null);
        }
      } finally {
        if (mounted) setPriceLoading(false);
      }
    };

    fetchPrice();
    return () => { mounted = false; };
  }, [blocksCount]);

  function calculateBounds(blocks) {
    const xs = blocks.map((b) => b.col);
    const ys = blocks.map((b) => b.row);
    const minX = Math.min(...xs), minY = Math.min(...ys);
    const maxX = Math.max(...xs), maxY = Math.max(...ys);
    return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
  }

  const handleImageUploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET);
    const res = await axios.post(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      formData
    );
    return res.data.secure_url;
  };

  // Discounted USD after referral
  function getDiscountedUsd() {
    const base = remoteTotalUsd ?? 0;
    if (referralValid && referralDiscountPct) {
      return Math.round((base * (1 - referralDiscountPct / 100)) * 100) / 100;
    }
    return Math.round(base * 100) / 100;
  }

  // estimated SOL to pay
  function getEstimatedSol() {
    if (!solPrice) return null;
    const usd = getDiscountedUsd();
    const sol = usd / solPrice;
    return sol;
  }

  // Check referral via RPC
  const checkReferralCode = async () => {
    setReferralMessage('');
    setReferralValid(false);
    setReferralDiscountPct(0);

    const code = (referralCode || '').toUpperCase().trim();
    if (!code) {
      setReferralMessage('Please enter a code.');
      return;
    }

    setCheckingReferral(true);
    try {
      console.log('Calling RPC check_referral with', code);
      const { data, error } = await supabase.rpc('check_referral', { p_code: code });

      console.log('RPC response:', { data, error });

      if (error) {
        console.error('Referral RPC error:', error);
        setReferralMessage('Error checking code (see console).');
        setReferralValid(false);
      } else if (!data || (Array.isArray(data) && data.length === 0)) {
        setReferralMessage('Invalid or inactive referral code.');
        setReferralValid(false);
      } else {
        const row = Array.isArray(data) ? data[0] : data;
        if (!row || typeof row.discount_pct === 'undefined') {
          console.warn('Unexpected RPC row shape:', row);
          setReferralMessage('Invalid response from server.');
          setReferralValid(false);
        } else {
          setReferralValid(true);
          setReferralDiscountPct(row.discount_pct);
          setReferralMessage(`Valid code — ${row.discount_pct}% discount applied.`);
        }
      }
    } catch (err) {
      console.error('Unexpected referral RPC error:', err);
      setReferralMessage('Unexpected error while checking code (see console).');
      setReferralValid(false);
    } finally {
      setCheckingReferral(false);
    }
  };

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!publicKey) {
      setError('Please connect your wallet first.');
      return;
    }
    if (!image || !link || selectedBlocks.length === 0) {
      setError('Please upload an image, provide a URL, and select blocks.');
      return;
    }
    if (!understandInstr) {
      setError('You must confirm you have read the upload instructions.');
      return;
    }
    if (!agreeTerms) {
      setError('You must agree to the terms & conditions.');
      return;
    }
    if (!solPrice) {
      setError('Please wait until the SOL price has loaded.');
      return;
    }
    if (priceLoading || remoteTotalUsd === null) {
      setError('Please wait until the USD price has been calculated.');
      return;
    }
    if (priceError) {
      setError(priceError);
      return;
    }

    setLoading(true);
    try {
      // compute totals (USD from DB, then discounted, then SOL)
      const totalUsd = getDiscountedUsd();
      const totalSol = totalUsd / solPrice;

      // convert to lamports
      const lamports = Math.round(totalSol * LAMPORTS_PER_SOL);

      // on-chain transfer
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: treasury,
          lamports
        })
      );
      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      // upload image then insert record
      const imageUrl = await handleImageUploadToCloudinary(image);
      const bounds = calculateBounds(selectedBlocks);

      // insert into pixels (including purchase_blocks)
      const insertObj = {
        image_url: imageUrl,
        link,
        alt_text: altText || null,
        selected_blocks: selectedBlocks,
        purchase_blocks: selectedBlocks.length, // <-- important
        bounds,
        wallet_address: publicKey.toBase58(),
        price_paid: totalSol,
        confirmed: true,
        referral_code: referralValid ? referralCode.toUpperCase() : null
      };

      const { error: supabaseError } = await supabase
        .from('pixels')
        .insert([insertObj]);

      if (supabaseError) throw supabaseError;

      // increment referral stats (non-blocking but log)
      if (referralValid && referralCode) {
        try {
          const { data: rpcData, error: rpcError } = await supabase.rpc(
            'increment_referral_stats',
            {
              ref_code: referralCode.toUpperCase(),
              blocks_added: selectedBlocks.length
            }
          );
          if (rpcError) {
            console.error('increment_referral_stats rpc error:', rpcError);
          } else {
            console.log('Referral RPC result:', rpcData);
          }
        } catch (rpcErr) {
          console.error('RPC call failed:', rpcErr);
        }
      }

      onUploadComplete();
    } catch (err) {
      console.error('Error during payment/upload:', err);
      const msg = err.error?.message || err.message || JSON.stringify(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        marginTop: '2rem',
        maxWidth: '520px',
        margin: '0 auto',
        padding: '1rem',
        border: '1px solid #ddd',
        borderRadius: '6px',
        backgroundColor: '#fff',
        fontSize: '13px'
      }}
    >
      <h4 style={{ margin: '0 0 0.5rem', fontSize: '15px' }}>
        Upload image and information
      </h4>

      {/* Image upload */}
      <label style={{ display: 'block', marginBottom: '0.5rem' }}>
        Image (required):
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImage(e.target.files[0])}
          required
          style={{ display: 'block', marginTop: '0.25rem', fontSize: '13px' }}
        />
      </label>

      {/* Destination URL */}
      <label style={{ display: 'block', marginBottom: '0.5rem' }}>
        Destination URL (required):
        <input
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://example.com"
          required
          style={{ width: '95%', padding: '0.45rem', marginTop: '0.25rem', fontSize: '13px' }}
        />
      </label>

      {/* Alt text */}
      <label style={{ display: 'block', marginBottom: '0.5rem' }}>
        Alt text for hover (optional):
        <input
          type="text"
          value={altText}
          onChange={(e) => setAltText(e.target.value)}
          placeholder="Short description"
          style={{ width: '95%', padding: '0.45rem', marginTop: '0.25rem', fontSize: '13px' }}
        />
      </label>

      {/* Referral code */}
      <label style={{ display: 'block', marginBottom: '0.5rem' }}>
        Referral code (optional):
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: '0.25rem' }}>
          <input
            type="text"
            value={referralCode}
            onChange={(e) => {
              setReferralCode(e.target.value.toUpperCase());
              setReferralValid(false);
              setReferralDiscountPct(0);
              setReferralMessage('');
            }}
            placeholder="ABCDE"
            style={{ flex: '1 1 auto', padding: '0.4rem', fontSize: '13px' }}
          />
          <button type="button" onClick={checkReferralCode} disabled={checkingReferral}>
            {checkingReferral ? 'Checking…' : 'Check code'}
          </button>
        </div>

        {referralMessage && (
          <div style={{ marginTop: '0.4rem', color: referralValid ? 'green' : 'red', fontSize: '12px' }}>
            {referralMessage}
          </div>
        )}
      </label>

      {/* Understanding */}
      <label style={{ display: 'block', margin: '0.5rem 0', fontSize: '13px', lineHeight: 1.4 }}>
        <input
          type="checkbox"
          checked={understandInstr}
          onChange={e => setUnderstandInstr(e.target.checked)}
          style={{ marginRight: '0.25rem', verticalAlign: 'middle' }}
        />
        I have read and understand the{' '}
        <button
          type="button"
          onClick={onShowInstructions}
          style={{ background: 'none', border: 'none', padding: 0, color: '#0070f3', textDecoration: 'underline', cursor: 'pointer', fontSize: '13px' }}
        >
          Upload Instructions
        </button>.
      </label>

      {/* Terms */}
      <label style={{ display: 'block', margin: '0.5rem 0', fontSize: '13px', lineHeight: 1.4 }}>
        <input
          type="checkbox"
          checked={agreeTerms}
          onChange={e => setAgreeTerms(e.target.checked)}
          style={{ marginRight: '0.25rem', verticalAlign: 'middle' }}
        />
        I have read and agree to the{' '}
        <button
          type="button"
          onClick={onShowTerms}
          style={{ background: 'none', border: 'none', padding: 0, color: '#0070f3', textDecoration: 'underline', cursor: 'pointer', fontSize: '13px' }}
        >
          Terms & Conditions
        </button>.
      </label>

      {/* Price display */}
      {priceLoading && (
        <p style={{ marginTop: '0.5rem', fontSize: '13px' }}>Calculating price...</p>
      )}
      {!priceLoading && remoteTotalUsd !== null && (
        <p style={{ marginTop: '0.5rem', fontSize: '13px' }}>
          Price to pay:{' '}
          <strong>{(getEstimatedSol() !== null ? getEstimatedSol().toFixed(6) : '...')} SOL</strong>{' '}
          (~${getDiscountedUsd().toLocaleString()} USD)
        </p>
      )}
      {priceError && <p style={{ color: 'red', fontSize: '13px' }}>{priceError}</p>}

      {/* Errors */}
      {error && <p style={{ color: 'red', fontSize: '13px' }}>{error}</p>}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || disableSubmit || priceLoading}
        style={{
          marginTop: '1rem',
          padding: '0.6rem 1rem',
          fontSize: '13px',
          cursor: loading || disableSubmit ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Processing…' : 'Confirm & Pay'}
      </button>
    </form>
  );
}