'use client';

import { useEffect, useRef, useState } from 'react';

export interface DropdownMenuItem {
  label: string;
  onClick: () => void;
  destructive?: boolean;
}

interface DropdownMenuProps {
  items: DropdownMenuItem[];
  trigger?: React.ReactNode;
}

export default function DropdownMenu({ items, trigger }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      setFocusedIndex(-1);
    }
  }, [open]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((i) => {
        const next = (i + 1) % items.length;
        itemRefs.current[next]?.focus();
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((i) => {
        const next = (i - 1 + items.length) % items.length;
        itemRefs.current[next]?.focus();
        return next;
      });
    }
  }

  // Determine if menu should flip upward or leftward
  function getMenuPosition(): React.CSSProperties {
    if (!containerRef.current) return { top: '100%', right: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceRight = window.innerWidth - rect.right;
    const vertical: React.CSSProperties = spaceBelow < 150 ? { bottom: '100%' } : { top: '100%' };
    const horizontal: React.CSSProperties = spaceRight < 160 ? { right: 0 } : { left: 0 };
    return { ...vertical, ...horizontal };
  }

  return (
    <div ref={containerRef} className="relative inline-flex items-center" onKeyDown={handleKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={trigger ? '' : 'p-1 rounded text-muted hover:text-foreground hover:bg-background transition-colors leading-none'}
      >
        {trigger ?? '⋯'}
      </button>

      {open && (
        <div
          role="menu"
          style={getMenuPosition()}
          className="absolute z-50 min-w-[140px] bg-card border border-border rounded-lg shadow-xl py-1"
        >
          {items.map((item, i) => (
            <button
              key={i}
              ref={(el) => { itemRefs.current[i] = el; }}
              role="menuitem"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                item.onClick();
              }}
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-background transition-colors ${
                item.destructive ? 'text-red-600' : 'text-foreground'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
