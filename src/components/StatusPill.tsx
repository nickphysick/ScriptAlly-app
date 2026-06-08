import React from 'react';
import { QueryStatus } from '../types';

export const normalizeStatus = (status: string | QueryStatus): QueryStatus => {
  if (!status) return QueryStatus.QUERIED;
  const s = status.trim();
  if (s.toLowerCase() === 'passed') return QueryStatus.REJECTED;
  // Map standard string keys to the enum
  for (const key of Object.values(QueryStatus)) {
    if (key.toLowerCase() === s.toLowerCase()) {
      return key;
    }
  }
  return status as QueryStatus;
};

// Returns name to display
export const getStatusLabel = (status: QueryStatus | string): string => {
  const norm = normalizeStatus(status);
  if (norm === QueryStatus.REJECTED) return 'Rejected';
  return norm;
};

export interface StatusStyle {
  bg: string;
  text: string;
  border: string;
  circleColor: string;
}

export const getStatusStyle = (status: QueryStatus | string): StatusStyle => {
  const norm = normalizeStatus(status);
  switch (norm) {
    case QueryStatus.QUERIED:
    case QueryStatus.PARTIAL_REQUESTED:
    case QueryStatus.PARTIAL_SENT:
    case QueryStatus.FULL_REQUESTED:
    case QueryStatus.FULL_SENT:
    case QueryStatus.REVISE_RESUBMIT:
      return { bg: '#FFF0F0', text: '#7c3d3d', border: '1px solid #f5c8c8', circleColor: '#7c3d3d' };
    
    case QueryStatus.OFFER:
      return { bg: '#6b0f1a', text: '#ffffff', border: '1px solid #3a0009', circleColor: '#ffffff' };
    
    case QueryStatus.REJECTED:
    case QueryStatus.WITHDRAWN:
    case QueryStatus.NO_RESPONSE:
    default:
      return { bg: '#e8e8e8', text: '#111111', border: '1px solid #b0b0b0', circleColor: '#888888' };
  }
};

export const StatusCircle: React.FC<{ status: QueryStatus | string; className?: string }> = ({ status, className }) => {
  const norm = normalizeStatus(status);

  switch (norm) {
    case QueryStatus.QUERIED:
      return (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`shrink-0 ${className || ''}`} xmlns="http://www.w3.org/2000/svg">
          <circle cx="6" cy="6" r="5" fill="none" stroke="#7c3d3d" strokeWidth="1.5"/>
        </svg>
      );

    case QueryStatus.PARTIAL_REQUESTED:
      return (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`shrink-0 ${className || ''}`} xmlns="http://www.w3.org/2000/svg">
          <circle cx="6" cy="6" r="5" fill="none" stroke="#7c3d3d" strokeWidth="1.5"/><path d="M6 1 A5 5 0 0 1 9.76 3.5 L6 6 Z" fill="#7c3d3d"/>
        </svg>
      );

    case QueryStatus.PARTIAL_SENT:
      return (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`shrink-0 ${className || ''}`} xmlns="http://www.w3.org/2000/svg">
          <circle cx="6" cy="6" r="5" fill="none" stroke="#7c3d3d" strokeWidth="1.5"/><path d="M6 1 A5 5 0 0 1 11 6 L6 6 Z" fill="#7c3d3d"/>
        </svg>
      );

    case QueryStatus.FULL_REQUESTED:
      return (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`shrink-0 ${className || ''}`} xmlns="http://www.w3.org/2000/svg">
          <circle cx="6" cy="6" r="5" fill="none" stroke="#7c3d3d" strokeWidth="1.5"/><path d="M6 1 A5 5 0 0 1 11 6 A5 5 0 0 1 6 11 L6 6 Z" fill="#7c3d3d"/>
        </svg>
      );

    case QueryStatus.FULL_SENT:
      return (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`shrink-0 ${className || ''}`} xmlns="http://www.w3.org/2000/svg">
          <circle cx="6" cy="6" r="5" fill="none" stroke="#7c3d3d" strokeWidth="1.5"/><path d="M6 1 A5 5 0 0 1 11 6 A5 5 0 0 1 2.24 8.5 L6 6 Z" fill="#7c3d3d"/>
        </svg>
      );

    case QueryStatus.REVISE_RESUBMIT:
      return (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`shrink-0 ${className || ''}`} xmlns="http://www.w3.org/2000/svg">
          <circle cx="6" cy="6" r="5" fill="none" stroke="#7c3d3d" strokeWidth="1.5"/><path d="M6 1 A5 5 0 0 1 11 6 A5 5 0 0 1 1 6 A5 5 0 0 1 4.5 1.67 L6 6 Z" fill="#7c3d3d"/>
        </svg>
      );

    case QueryStatus.OFFER:
      return (
        <svg width="12" height="12" viewBox="0 0 12 12" className={`shrink-0 ${className || ''}`} xmlns="http://www.w3.org/2000/svg">
          <circle cx="6" cy="6" r="5" fill="#7c3d3d" stroke="#7c3d3d" strokeWidth="1.5"/>
        </svg>
      );

    case QueryStatus.REJECTED:
    case QueryStatus.WITHDRAWN:
    case QueryStatus.NO_RESPONSE:
    default:
      return (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`shrink-0 ${className || ''}`} xmlns="http://www.w3.org/2000/svg">
          <circle cx="6" cy="6" r="5" fill="#888888" stroke="#888888" strokeWidth="1.5"/><line x1="4" y1="4" x2="8" y2="8" stroke="#ffffff" strokeWidth="1.5"/><line x1="8" y1="4" x2="4" y2="8" stroke="#ffffff" strokeWidth="1.5"/>
        </svg>
      );
  }
};

export const StatusPill: React.FC<{
  status: QueryStatus | string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  customLabel?: string;
}> = ({ status, className = '', size = 'md', customLabel }) => {
  const norm = normalizeStatus(status);
  const { bg, text, border } = getStatusStyle(norm);
  const label = customLabel || getStatusLabel(norm);

  const sizeClasses = {
    sm: 'text-[9.5px] px-1.5 py-0.5 gap-1',
    md: 'text-[10px] sm:text-[11px] px-2 py-0.5 gap-1.5',
    lg: 'text-[11px] sm:text-[12px] px-2.5 py-1 gap-1.5',
  };

  return (
    <div
      className={`inline-flex items-center rounded-full font-medium select-none ${sizeClasses[size]} ${className}`}
      style={{
        backgroundColor: bg,
        color: text,
        border: border,
      }}
    >
      <StatusCircle status={norm} />
      <span>{label}</span>
    </div>
  );
};
