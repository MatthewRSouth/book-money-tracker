'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

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
  const [mounted, setMounted] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => { setMounted(true); }, []);

  function computeMenuStyle() {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuHeight = 36 * items.length + 8;
    const menuWidth = 160;

    const top =
      window.innerHeight - rect.bottom >= menuHeight
        ? rect.bottom + window.scrollY
        : rect.top + window.scrollY - menuHeight;

    const left =
      window.innerWidth - rect.left >= menuWidth
        ? rect.left + window.scrollX
        : rect.right + window.scrollX - menuWidth;

    setMenuStyle({ position: 'absolute', top, left, zIndex: 9999 });
  }

  useEffect(() => {
    if (open) computeMenuStyle();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (buttonRef.current?.contains(e.target as Node)) return;
      if (menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    function handleScroll() { setOpen(false); }
    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (e.key === 'ArrowDown' && open) {
      e.preventDefault();
      const curr = itemRefs.current.findIndex((el) => el === document.activeElement);
      const next = curr === -1 ? 0 : (curr + 1) % items.length;
      itemRefs.current[next]?.focus();
    } else if (e.key === 'ArrowUp' && open) {
      e.preventDefault();
      const curr = itemRefs.current.findIndex((el) => el === document.activeElement);
      const next = curr <= 0 ? items.length - 1 : curr - 1;
      itemRefs.current[next]?.focus();
    }
  }

  const menu = open ? (
    <div
      ref={menuRef}
      role="menu"
      style={menuStyle}
      className="min-w-[140px] bg-card border border-border rounded-lg shadow-xl py-1"
      onKeyDown={handleKeyDown}
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
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        onKeyDown={handleKeyDown}
        className={trigger ? '' : 'p-1 rounded text-muted hover:text-foreground hover:bg-background transition-colors leading-none'}
      >
        {trigger ?? '⋯'}
      </button>
      {mounted && createPortal(menu, document.body)}
    </>
  );
}
