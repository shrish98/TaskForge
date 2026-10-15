import type { Config } from 'tailwindcss';

// One dark theme, built like an ops console: near-black panels split by hairlines, monospace
// for anything measured, and colour reserved for job state (amber running, green done, red failed).
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b0d0f',
        panel: '#0f1215',
        raise: '#151a1f',
        line: '#1e242b',
        'line-soft': '#161a1f',
        ink: '#d6dbe0',
        strong: '#f3f5f7',
        mute: '#8b949e',
        faint: '#5d656e',
        amber: { DEFAULT: '#f5a524', soft: '#2a2010', strong: '#ffbf47' },
        ok: { DEFAULT: '#3fb950', block: '#2f8f45', soft: '#0f2416' },
        bad: { DEFAULT: '#f0605a', block: '#d9443c', soft: '#2a1212' },
        sky: { DEFAULT: '#58a6ff', soft: '#0e1d33' },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      keyframes: {
        blink: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.3' } },
        'slide-in': { from: { transform: 'translateX(24px)', opacity: '0' }, to: { transform: 'none', opacity: '1' } },
        'fade-up': { from: { transform: 'translateY(6px)', opacity: '0' }, to: { transform: 'none', opacity: '1' } },
        flash: { from: { backgroundColor: 'rgba(245,165,36,0.14)' }, to: { backgroundColor: 'transparent' } },
        sweep: { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(250%)' } },
      },
      animation: {
        blink: 'blink 1.6s ease-in-out infinite',
        'slide-in': 'slide-in 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)',
        'fade-up': 'fade-up 0.3s ease-out both',
        flash: 'flash 1.2s ease-out',
        sweep: 'sweep 1.6s linear infinite',
      },
    },
  },
  plugins: [],
};
export default config;
