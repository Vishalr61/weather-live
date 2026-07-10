import { useState } from 'react';
import type { WeatherResponse } from '../types.ts';
import { useUnit } from '../context/UnitContext.tsx';
import { renderShareCard } from '../shareCard.ts';
import '../styles/shareButton.css';

interface ShareButtonProps {
  weather: WeatherResponse;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = /:(.*?);/.exec(header)?.[1] ?? 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function ShareButton({ weather }: ShareButtonProps) {
  const { formatTemp } = useUnit();
  const [status, setStatus] = useState<'idle' | 'done'>('idle');

  const handleShare = async () => {
    const dataUrl = renderShareCard({ weather, formatTemp });
    const filename = `weather-${weather.cityId}.png`;

    // Web Share API (mobile browsers) lets the PNG go straight into the
    // OS share sheet — messages/socials/etc. Falls through to a plain
    // download when unsupported (most desktop browsers) or if the user
    // cancels the share sheet.
    if (navigator.canShare) {
      const blob = dataUrlToBlob(dataUrl);
      const file = new File([blob], filename, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `Weather in ${weather.city}` });
          return;
        } catch {
          // user cancelled or share failed — fall through to download
        }
      }
    }

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
    setStatus('done');
    setTimeout(() => setStatus('idle'), 2000);
  };

  return (
    <button type="button" className="share-btn" onClick={() => { void handleShare(); }}>
      {status === 'done' ? '✅ Saved' : '📸 Share snapshot'}
    </button>
  );
}
