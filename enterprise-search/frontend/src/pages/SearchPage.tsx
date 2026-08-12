import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X, Clock, TrendingUp, FileText, ArrowRight, ChevronRight } from 'lucide-react';
import { useSearch } from '@/hooks';
import { Badge, Spinner } from '@/components/ui';
import { timeAgo, cn } from '@/utils';
import type { SearchSuggestion } from '@/types';

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';
  const search = useSearch(initialQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Run initial search from URL param
  useEffect(() => {
    if (initialQuery) search.runSearch(initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (q?: string) => {
    const term = (q ?? search.query).trim();
    if (!term) return;
    search.runSearch(term);
    setSearchParams({ q: term });
    setFocused(false);
    inputRef.current?.blur();
  };

  const pickSuggestion = (s: SearchSuggestion) => {
    search.setQuery(s.text);
    submit(s.text);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Search bar */}
      <div className="relative">
        <div
          className={cn(
            'flex items-center gap-3 h-14 px-4 rounded-2xl border bg-white dark:bg-surface-900 shadow-soft transition-all',
            focused
              ? 'border-brand-400 dark:border-brand-500/50 shadow-glow'
              : 'border-surface-200 dark:border-surface-700',
          )}
        >
          <Search className={cn('w-5 h-5 shrink-0', focused ? 'text-brand-500' : 'text-surface-400')} />
          <input
            ref={inputRef}
            value={search.query}
            onChange={(e) => search.setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Search policies, SOPs, manuals…"
            className="flex-1 bg-transparent text-base text-surface-900 dark:text-surface-50 placeholder:text-surface-400 outline-none"
          />
          {search.query && (
            <button
              onClick={() => {
                search.clear();
                inputRef.current?.focus();
              }}
              className="p-1.5 rounded-lg text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Autocomplete dropdown */}
        {focused && search.query && (
          <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 shadow-float overflow-hidden z-10 animate-scale-in">
            {search.suggestionsLoading ? (
              <div className="flex items-center justify-center py-6">
                <Spinner />
              </div>
            ) : search.suggestions.length > 0 ? (
              <div className="py-2">
                {search.suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => pickSuggestion(s)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors text-left group"
                  >
                    {s.source === 'document' ? (
                      <FileText className="w-4 h-4 text-surface-400 shrink-0" />
                    ) : s.source === 'popular' ? (
                      <TrendingUp className="w-4 h-4 text-surface-400 shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-surface-400 shrink-0" />
                    )}
                    <span className="flex-1 text-sm text-surface-700 dark:text-surface-200">{s.text}</span>
                    {s.category && <Badge category={s.category} />}
                    <ArrowRight className="w-4 h-4 text-surface-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-surface-400">No suggestions found.</div>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="mt-6">
        {search.resultsLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Spinner size={28} />
            <p className="text-sm text-surface-400">Searching knowledge base…</p>
          </div>
        ) : search.error ? (
          <div className="text-center py-16">
            <p className="text-sm text-red-500">{search.error}</p>
          </div>
        ) : search.hasSearched ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-surface-500 dark:text-surface-400">
                {search.results.length} result{search.results.length !== 1 ? 's' : ''} for{' '}
                <span className="font-semibold text-surface-700 dark:text-surface-200">"{search.query}"</span>
              </p>
              {search.tookMs != null && (
                <span className="text-xs text-surface-400">({search.tookMs}ms)</span>
              )}
            </div>
            {search.results.length === 0 ? (
              <div className="text-center py-16">
                <Search className="w-10 h-10 text-surface-300 dark:text-surface-700 mx-auto mb-3" />
                <p className="text-sm text-surface-500">No documents matched your search.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {search.results.map((r) => (
                  <a
                    key={r.documentId}
                    href={`/documents?id=${r.documentId}`}
                    className="block card p-4 hover:shadow-float hover:-translate-y-0.5 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Badge category={r.category} />
                          <span className="text-xs text-surface-400">{timeAgo(r.updatedAt)}</span>
                        </div>
                        <h3 className="font-semibold text-surface-900 dark:text-surface-50 group-hover:text-brand-700 dark:group-hover:text-brand-300 transition-colors">
                          {r.title}
                        </h3>
                        <p className="text-sm text-surface-500 dark:text-surface-400 mt-1 line-clamp-2">{r.snippet}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-surface-300 group-hover:text-brand-500 transition-colors shrink-0 mt-1" />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </>
        ) : (
          <SearchLanding onPick={(q) => submit(q)} />
        )}
      </div>
    </div>
  );
}

function SearchLanding({ onPick }: { onPick: (q: string) => void }) {
  const popular = [
    'Leave policy',
    'WFH rules',
    'Reimbursement process',
    'How to reset my password',
    'Procurement spending limits',
    'Security incident reporting',
  ];
  return (
    <div className="py-8">
      <h2 className="text-sm font-semibold text-surface-500 dark:text-surface-400 mb-3 flex items-center gap-2">
        <TrendingUp className="w-4 h-4" /> Popular searches
      </h2>
      <div className="flex flex-wrap gap-2">
        {popular.map((p) => (
          <button
            key={p}
            onClick={() => onPick(p)}
            className="px-3.5 py-2 rounded-xl text-sm bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 hover:border-brand-300 dark:hover:border-brand-500/40 hover:text-brand-700 dark:hover:text-brand-300 transition-all"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
