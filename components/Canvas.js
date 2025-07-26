// components/Canvas.js
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Canvas({
  onSelectCountChange,
  selectedBlocks,
  setSelectedBlocks,
  refreshFlag
}) {
  const SIZE = 100;
  const BLOCK = 10;

  const [occupiedPixels, setOccupiedPixels] = useState([]);

  // 1) Initial load & refresh
  useEffect(() => {
    const fetchPixels = async () => {
      const { data, error } = await supabase.from('pixels').select('*');
      if (error) console.error('Fout bij ophalen pixels:', error);
      else setOccupiedPixels(data || []);
    };
    fetchPixels();
  }, [refreshFlag]);

  // 2) Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('realtime-pixels')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pixels' },
        ({ new: rec }) => {
          setOccupiedPixels((prev) => [...prev, rec]);

          // deselect any blocks that got sold
          setSelectedBlocks((prevSel) => {
            const filtered = prevSel.filter(
              (b) =>
                !rec.selected_blocks.some(
                  (sb) => sb.col === b.col && sb.row === b.row
                )
            );
            onSelectCountChange(filtered.length);
            return filtered;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setSelectedBlocks, onSelectCountChange]);

  // Toggle‐handler
  const toggle = (col, row) => {
    const sold = occupiedPixels.some((p) =>
      p.selected_blocks.some((b) => b.col === col && b.row === row)
    );
    if (sold) return;

    setSelectedBlocks((prev) => {
      const exists = prev.some((b) => b.col === col && b.row === row);
      const next = exists
        ? prev.filter((b) => !(b.col === col && b.row === row))
        : [...prev, { col, row }];
      onSelectCountChange(next.length);
      return next;
    });
  };

  return (
    <div
      style={{
        position: 'relative',
        width: SIZE * BLOCK,
        height: SIZE * BLOCK,
        margin: '0 auto'
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          display: 'grid',
          gridTemplateColumns: `repeat(${SIZE}, ${BLOCK}px)`,
          gridTemplateRows: `repeat(${SIZE}, ${BLOCK}px)`,
          gap: 0
        }}
      >
        {Array.from({ length: SIZE }).flatMap((_, row) =>
          Array.from({ length: SIZE }).map((_, col) => {
            // vind record als dit blok verkocht is
            const record = occupiedPixels.find((p) =>
              p.selected_blocks.some((b) => b.col === col && b.row === row)
            );
            const sold = Boolean(record);
            const isSel = selectedBlocks.some(
              (b) => b.col === col && b.row === row
            );

            // basisstijl
            const style = {
              width: BLOCK,
              height: BLOCK,
              boxSizing: 'border-box',
              cursor: sold ? 'pointer' : 'pointer',
              transition: 'background-color 0.3s ease'
            };

            if (sold && record) {
              // bereken offsets en afmetingen
              const { image_url, bounds } = record;
              const offsetX = (col - bounds.x) * BLOCK;
              const offsetY = (row - bounds.y) * BLOCK;
              style.background = 
                `url(${image_url}) no-repeat ` +
                `-${offsetX}px -${offsetY}px ` +
                `/${bounds.width * BLOCK}px ${bounds.height * BLOCK}px`;
            } else if (isSel) {
              // geselecteerd: paars
              style.backgroundColor = '#9945FF';
            } else {
              // vrij: lichtgrijs
              style.backgroundColor = '#f0f0f0';
            }

            // hover-effect via inline voor vrije blokken
            const onMouseEnter = (e) => {
              if (!sold && !isSel) {
                e.currentTarget.style.backgroundColor = '#14F195';
              }
            };
            const onMouseLeave = (e) => {
              if (!sold && !isSel) {
                e.currentTarget.style.backgroundColor = '#f0f0f0';
              }
            };

            return (
              <div
                key={`${col},${row}`}
                onClick={() =>
                  sold
                    ? window.open(record.link, '_blank')
                    : toggle(col, row)
                }
                title={sold ? record.alt_text || record.link : undefined}
                style={style}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
              />
            );
          })
        )}
      </div>
    </div>
  );
}