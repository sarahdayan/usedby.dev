import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'usedby.dev — Showcase your open-source dependents';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const interSemiBold = fetch(
  new URL(
    'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fMZhrib2Bg-4.ttf'
  )
).then((res) => res.arrayBuffer());

export default async function OgImage() {
  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        backgroundColor: '#0a0a0a',
        color: '#e5e5e5',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {['#e5e5e5', '#999', '#999', '#666'].map((color, i) => (
          <div
            key={i}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: color,
            }}
          />
        ))}
      </div>
      <div
        style={{
          fontSize: '64px',
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: 'hsl(163, 72%, 41%)',
        }}
      >
        usedby.dev
      </div>
      <div
        style={{
          fontSize: '28px',
          color: '#999',
          marginTop: '16px',
          textAlign: 'center',
          maxWidth: '800px',
        }}
      >
        Showcase your open-source dependents
      </div>
    </div>,
    {
      ...size,
      fonts: [
        {
          name: 'Inter',
          data: await interSemiBold,
          weight: 600,
          style: 'normal',
        },
      ],
    }
  );
}
