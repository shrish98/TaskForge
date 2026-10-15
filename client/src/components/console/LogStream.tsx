'use client';

import React from 'react';
import clsx from 'clsx';
import { LogLine, TASK_TYPES } from '@/services/task.service';
import { clock } from '@/lib/format';
import { Empty } from './bits';

const LEVEL = {
  INFO: { tag: 'text-faint', text: 'text-ink' },
  WARN: { tag: 'text-amber', text: 'text-amber' },
  ERROR: { tag: 'text-bad', text: 'text-bad' },
} as const;

/** Log lines, newest first. `compact` drops the level and task columns for narrow panels. */
export function LogStream({ lines, onOpen, compact }: { lines: LogLine[]; onOpen: (taskId: string) => void; compact?: boolean }) {
  if (lines.length === 0) return <Empty>No log lines yet.</Empty>;

  return (
    <ol className="font-mono text-[12px] leading-[1.75]">
      {lines.map((line) => (
        <li
          key={line.id}
          className={clsx(
            'grid animate-fade-up gap-x-3 border-b border-line-soft/60 py-[3px] last:border-b-0',
            compact ? 'grid-cols-[84px_1fr]' : 'grid-cols-[98px_44px_210px_1fr]'
          )}
        >
          <span className="text-faint">{clock(line.createdAt, !compact)}</span>
          {!compact && <span className={LEVEL[line.level].tag}>{line.level.toLowerCase()}</span>}
          {compact ? (
            <span className="min-w-0">
              <button type="button" onClick={() => onOpen(line.task.id)} className="mr-2 text-mute hover:text-strong hover:underline">
                {TASK_TYPES[line.task.type].short}
              </button>
              <span className={clsx('break-words', LEVEL[line.level].text)}>{line.message}</span>
            </span>
          ) : (
            <>
              <button type="button" onClick={() => onOpen(line.task.id)} className="truncate text-left text-mute hover:text-strong hover:underline">
                {line.task.title}
              </button>
              <span className={clsx('break-words', LEVEL[line.level].text)}>{line.message}</span>
            </>
          )}
        </li>
      ))}
    </ol>
  );
}
