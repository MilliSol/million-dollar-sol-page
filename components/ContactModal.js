import React, { useState } from 'react';

export default function ContactModal({ onClose }) {
  const [wallet, setWallet] = useState('');        // optioneel, we vullen later
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Stel wallet in als de user geconnect is (overgenomen uit parent via prop)
  // Je kunt wallet later via prop meegeven of uit useWallet hook halen.

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback('');
    setLoading(true);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet, email, subject, message })
      });
      const body = await res.json();
      if (res.ok) {
        setFeedback('Your message was sent! We will reply as soon as we can.');
        setEmail(''); setSubject(''); setMessage('');
      } else {
        throw new Error(body.error || 'Server error');
      }
    } catch (err) {
      console.error(err);
      setFeedback('Failed to send message. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Contact Us</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <label>
          Wallet address (optional):
          <input
            type="text"
            value={wallet}
            onChange={e => setWallet(e.target.value)}
            placeholder="Your wallet address, to verify the blocks you bought"
            style={{ width: '100%' }}
          />
        </label>

        <label>
          Your email (for reply):
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            style={{ width: '100%' }}
          />
        </label>

        <label>
          Subject:
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Subject"
            required
            style={{ width: '100%' }}
          />
        </label>

        <label>
          Message:
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Your questions or comments..."
            required
            rows={5}
            style={{ width: '100%' }}
          />
        </label>

        <button type="submit" disabled={loading} style={{ padding: '0.5rem 1rem' }}>
          {loading ? 'Sending…' : 'Send Message'}
        </button>
      </form>

      {feedback && <p style={{ marginTop: '1rem' }}>{feedback}</p>}

    </div>
  );
}