import { useCallback, useEffect, useState } from 'react';
import type { SearchSuggestion, SearchResult } from '@/types';
import { apiService } from '@/services';
import { useDebounce } from './useDebounce';

interface SearchState {
  query: string;
  setQuery: (q: string) => void;
  debouncedQuery: string;
  suggestions: SearchSuggestion[];
  suggestionsLoading: boolean;
  results: SearchResult[];
  resultsLoading: boolean;
  error: string | null;
  hasSearched: boolean;
  tookMs: number | null;
  runSearch: (q?: string) => Promise<void>;
  clear: () => void;
}

export function useSearch(initial?: string): SearchState {
  const [query, setQuery] = useState(initial ?? '');
  const debouncedQuery = useDebounce(query, 250);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [tookMs, setTookMs] = useState<number | null>(null);

  // Suggestions follow the debounced query.
  useEffect(() => {
    let active = true;
    setSuggestionsLoading(true);
    apiService
      .getSuggestions({ query: debouncedQuery })
      .then((res) => {
        if (active) setSuggestions(res.suggestions);
      })
      .catch(() => {
        if (active) setSuggestions([]);
      })
      .finally(() => {
        if (active) setSuggestionsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [debouncedQuery]);

  const runSearch = useCallback(
    async (q?: string) => {
      const term = (q ?? query).trim();
      if (!term) return;
      setQuery(term);
      setResultsLoading(true);
      setError(null);
      setHasSearched(true);
      try {
        const res = await apiService.search({ query: term });
        setResults(res.results);
        setTookMs(res.tookMs);
      } catch (e) {
        setError((e as { message?: string })?.message ?? 'Search failed.');
        setResults([]);
      } finally {
        setResultsLoading(false);
      }
    },
    [query],
  );

  const clear = () => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
    setTookMs(null);
  };

  return {
    query,
    setQuery,
    debouncedQuery,
    suggestions,
    suggestionsLoading,
    results,
    resultsLoading,
    error,
    hasSearched,
    tookMs,
    runSearch,
    clear,
  };
}
