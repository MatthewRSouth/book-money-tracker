'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { searchStudents } from '@/lib/actions/search';
import type { SearchResult } from '@/types';

export default function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const r = await searchStudents(query);
        setResults(r);
        setOpen(true);
      });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(result: SearchResult) {
    setQuery('');
    setResults([]);
    setOpen(false);
    router.push(`/dashboard?tab=${result.group_id}&highlight=${result.student_id}`);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search students…"
          className="w-48 sm:w-64 bg-card border border-border rounded px-3 py-1.5 text-sm text-foreground placeholder-muted focus:outline-none focus:border-primary transition-colors"
        />
        {isPending && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted">
            <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </span>
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-72 bg-card border border-border rounded shadow-lg overflow-hidden">
          {results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted">No students found.</p>
          ) : (
            <ul>
              {results.map((r) => (
                <li key={r.student_id}>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-background transition-colors"
                    onClick={() => handleSelect(r)}
                  >
                    <span className="text-sm text-foreground">{r.student_name}</span>
                    <span className="ml-2 text-xs text-muted">{r.group_name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
