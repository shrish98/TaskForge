import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hover?: boolean;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, hover = true, className = '', ...props }) => {
  return (
    <div
      className={`rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-xl ${
        hover ? 'transition-all duration-300 hover:border-indigo-500/40 hover:bg-slate-900/80 hover:shadow-lg hover:shadow-indigo-500/10' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
