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
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-300',
      dot: 'bg-amber-500',
    },
    PROCESSING: {
      bg: 'bg-[#fff4f0]',
      text: 'text-[#f05228]',
      border: 'border-[#fcd5c7]',
      dot: 'bg-[#f05228]',
    },
    COMPLETED: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-300',
      dot: 'bg-emerald-500',
    },
    FAILED: {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-300',
      dot: 'bg-rose-500',
    },
    INFO: {
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-300',
      dot: 'bg-slate-500',
    },
    ADMIN: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-300',
      dot: 'bg-purple-500',
    },
    USER: {
      bg: 'bg-[#fff4f0]',
      text: 'text-[#c23a15]',
      border: 'border-[#fcd5c7]',
      dot: 'bg-[#f05228]',
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
