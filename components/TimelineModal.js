// components/TimelineModal.js
import React from 'react';

export default function TimelineModal({ onClose }) {
  // Definieer je gebeurtenissen in chronologische volgorde
  const events = [
    {
      date: 'July 22, 2025',
      title: 'The start of an idea',
    },
    {
      date: 'Now',
      title: 'Building and launching the site',
    },
    {
      date: 'August 26, 2025',
      title: 'Launching our own token $SolPage',
    },
    {
      date: 'Coming Soon',
      title: 'New feature: replace image and info on your blocks',
    },
    {
      date: 'When sold out',
      title: 'Special feature unlock!',
    },
  ];

  return (
    <div style={{ position: 'relative', padding: '1rem 2rem' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>Timeline</h2>
      <div style={{ position: 'relative', marginLeft: '20px', paddingLeft: '20px', borderLeft: '2px solid #9945FF' }}>
        {events.map((evt, idx) => (
          <div key={idx} style={{ position: 'relative', marginBottom: '2rem' }}>
            {/* Bolletje */}
            <div style={{
              position: 'absolute',
              left: '-11px',
              top: '3px',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#14F195',
              border: '2px solid #fff',
              boxSizing: 'border-box'
            }} />
            {/* Content */}
            <div>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>{evt.date}</div>
              <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#333' }}>{evt.title}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}