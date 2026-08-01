import React from 'react';

export type BadgeVariant = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'INFO' | 'ADMIN' | 'USER';

interface BadgeProps {
  variant: BadgeVariant;
  children?: React.ReactNode;
  pulse?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({ variant, children, pulse }) => {
  const styles: Record<BadgeVariant, { bg: string; text: string; border: string; dot: string }> = {
    PENDING: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      dot: 'bg-amber-400',
    },
    PROCESSING: {
      bg: 'bg-indigo-500/10',
      text: 'text-indigo-400',
      border: 'border-indigo-500/30',
      dot: 'bg-indigo-400',
    },
    COMPLETED: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      dot: 'bg-emerald-400',
    },
    FAILED: {
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
      dot: 'bg-rose-400',
    },
    INFO: {
      bg: 'bg-slate-500/10',
      text: 'text-slate-300',
      border: 'border-slate-500/30',
      dot: 'bg-slate-400',
    },
    ADMIN: {
      bg: 'bg-purple-500/10',
      text: 'text-purple-400',
      border: 'border-purple-500/30',
      dot: 'bg-purple-400',
    },
    USER: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      border: 'border-blue-500/30',
      dot: 'bg-blue-400',
    },
  };

  const style = styles[variant] || styles.INFO;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${style.bg} ${style.text} ${style.border}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${style.dot} ${
          pulse || variant === 'PROCESSING' ? 'animate-pulse' : ''
        }`}
      />
      {children || variant}
    </span>
  );
};
