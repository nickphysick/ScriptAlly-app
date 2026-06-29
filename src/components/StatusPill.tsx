import React from 'react';
import { QueryStatus } from '../types';
import { StatusDot } from './StatusDot';

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

/**
 * Canonical one-line description for each QueryStatus — the user-facing teaching copy for
 * ScriptAlly's vocabulary (first used on the Smart Import review, reusable anywhere a status
 * needs explaining). Single source: never hardcode these per screen.
 */
export const STATUS_DESCRIPTIONS: Record<QueryStatus, string> = {
  [QueryStatus.QUERIED]: "Sent — waiting to hear back",
  [QueryStatus.PARTIAL_REQUESTED]: "Agent asked to see a partial",
  [QueryStatus.PARTIAL_SENT]: "You've sent the partial",
  [QueryStatus.FULL_REQUESTED]: "Agent asked for the full",
  [QueryStatus.FULL_SENT]: "You've sent the full manuscript",
  [QueryStatus.REVISE_RESUBMIT]: "Invited to revise & resubmit",
  [QueryStatus.OFFER]: "The agent offered representation",
  [QueryStatus.REJECTED]: "A pass",
  [QueryStatus.WITHDRAWN]: "You withdrew this query",
  [QueryStatus.NO_RESPONSE]: "Closed with no reply",
};

export const getStatusDescription = (status: QueryStatus | string): string =>
  STATUS_DESCRIPTIONS[normalizeStatus(status)] ?? "";

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
      <StatusDot status={norm} size={size === 'lg' ? 16 : 12} decorative />
      <span>{label}</span>
    </div>
  );
};
