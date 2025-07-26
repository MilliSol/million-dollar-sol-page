// pages/api/update-pixels.js
import { createClient } from '@supabase/supabase-js';
import {
  PublicKey,
  TransactionInstruction,
  SignaturePubkeyPair,
  verifyMessage
} from '@solana/web3.js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // let op: deze key nooit in de browser!
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { wallet, timestamp, signature, newImageUrl, pixelIds } = req.body;

  // 1) Check timestamp freshness (bv binnen 5 minuten)
  if (Math.abs(Date.now() - Number(timestamp)) > 5 * 60_000) {
    return res.status(400).json({ error: 'Stale request' });
  }

  // 2) Build message & verify signature
  const message = `update-pixels:${wallet}:${timestamp}`;
  let pubkey;
  try {
    pubkey = new PublicKey(wallet);
    const sigBuffer = Buffer.from(signature, 'base64');
    const verified = verifyMessage(
      Buffer.from(message),
      sigBuffer,
      pubkey.toBytes()
    );
    if (!verified) throw new Error('Invalid signature');
  } catch (e) {
    return res.status(401).json({ error: 'Signature verification failed' });
  }

  // 3) Nu mag de server updaten
  const { error } = await supabaseAdmin
    .from('pixels')
    .update({ image_url: newImageUrl })
    .in('id', pixelIds);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ success: true });
}