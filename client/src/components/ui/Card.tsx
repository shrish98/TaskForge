import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hover?: boolean;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, hover = true, className = '', ...props }) => {
  return (
    <div
      className={`rounded-2xl border border-[#e5e3dc] bg-white p-6 shadow-sm backdrop-blur-xl ${
        hover ? 'transition-all duration-300 hover:border-[#f05228]/40 hover:shadow-md hover:shadow-orange-500/10' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
