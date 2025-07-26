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
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function UploadForm({
  selectedBlocks,
  onUploadComplete,
  disableSubmit,
  onShowTerms,
  onShowInstructions
}) {
  const { publicKey, sendTransaction } = useWallet();
  const connection = new Connection('https://api.devnet.solana.com');
  const treasury = new PublicKey(process.env.NEXT_PUBLIC_TREASURY_ADDRESS);

  const [image, setImage] = useState(null);
  const [link, setLink] = useState('');
  const [contract, setContract] = useState('');
  const [altText, setAltText] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [understandInstr, setUnderstandInstr] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [solPrice, setSolPrice] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(
          'https://api.coingecko.com/api/v3/simple/price',
          { params: { ids: 'solana', vs_currencies: 'usd' } }
        );
        setSolPrice(res.data.solana.usd);
      } catch (err) {
        console.error('Could not fetch SOL price:', err);
      }
    })();
  }, []);

  function calculateBounds(blocks) {
    const xs = blocks.map((b) => b.col);
    const ys = blocks.map((b) => b.row);
    const minX = Math.min(...xs),
      minY = Math.min(...ys);
    const maxX = Math.max(...xs),
      maxY = Math.max(...ys);
    return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
  }

  const handleImageUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append(
      'upload_preset',
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
    );
    const res = await axios.post(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      formData
    );
    return res.data.secure_url;
  };

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

    setLoading(true);
    try {
      const totalUsd = selectedBlocks.length * 100;
      const totalSol = totalUsd / solPrice;
      const lamports = Math.round(totalSol * LAMPORTS_PER_SOL);

      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: treasury,
          lamports
        })
      );
      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      const imageUrl = await handleImageUpload(image);
      const bounds = calculateBounds(selectedBlocks);

      const { error: supabaseError } = await supabase
        .from('pixels')
        .insert([{
          image_url: imageUrl,
          link,
          contract: contract || null,
          alt_text: altText || null,
          selected_blocks: selectedBlocks,
          bounds,
          wallet_address: publicKey.toBase58(),
          price_paid: totalSol,
          confirmed: true
        }]);
      if (supabaseError) throw supabaseError;

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
        maxWidth: '400px',
        margin: '0 auto',
        padding: '1rem',
        border: '1px solid #ddd',
        borderRadius: '6px',
        backgroundColor: '#fff',
        fontSize: '12px'
      }}
    >
      <h4 style={{ margin: '0 0 0.5rem', fontSize: '14px' }}>
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
          style={{
            display: 'block',
            marginTop: '0.25rem',
            fontSize: '12px'
          }}
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
          style={{
            width: '90%',
            padding: '0.4rem',
            marginTop: '0.25rem',
            fontSize: '12px'
          }}
        />
      </label>

      {/* Contract address */}
      <label style={{ display: 'block', marginBottom: '0.5rem' }}>
        Token contract address (optional):
        <input
          type="text"
          value={contract}
          onChange={(e) => setContract(e.target.value)}
          placeholder="0xABC123..."
          style={{
            width: '90%',
            padding: '0.4rem',
            marginTop: '0.25rem',
            fontSize: '12px'
          }}
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
          style={{
            width: '90%',
            padding: '0.4rem',
            marginTop: '0.25rem',
            fontSize: '12px'
          }}
        />
      </label>

      {/* Checkbox Uitleg gelezen */}
      <label style={{ display: 'block', margin: '0.5rem 0', fontSize: '12px', lineHeight: 1.4 }}>
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
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: '#0070f3',
            textDecoration: 'underline',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Upload Instructions
        </button>.
      </label>

      {/* Checkbox Voorwaarden */}
      <label style={{ display: 'block', margin: '0.5rem 0', fontSize: '12px', lineHeight: 1.4 }}>
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
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: '#0070f3',
            textDecoration: 'underline',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Terms & Conditions
        </button>.
      </label>

      {/* Price display */}
      {solPrice && (
        <p style={{ marginTop: '0.5rem', fontSize: '12px' }}>
          Price to pay:{' '}
          <strong>
            {(selectedBlocks.length * 100 / solPrice).toFixed(4)} SOL
          </strong>{' '}
          (~${(selectedBlocks.length * 100).toLocaleString()} USD)
        </p>
      )}

      {/* Errors */}
      {error && (
        <p style={{ color: 'red', fontSize: '12px' }}>{error}</p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || disableSubmit}
        style={{
          marginTop: '1rem',
          padding: '0.5rem 1rem',
          fontSize: '12px',
          cursor: loading || disableSubmit ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Processing…' : 'Confirm & Pay'}
      </button>
    </form>
  );
}