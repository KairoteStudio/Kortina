import { useState, useCallback } from 'react';
import type { FileItem } from '../utils/fileSystem';
export interface UseFileSearchResult {
  isSearchVisible: boolean;
  searchTerm: string;
  searchResults: FileItem[];
  showSearch: () => void;
  hideSearch: () => void;
  updateSearchTerm: (term: string) => void;
  updateSearchResults: (results: FileItem[]) => void;
  clearSearch: () => void;
}
export const useFileSearch = (): UseFileSearchResult => {
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<FileItem[]>([]);
  const showSearch = useCallback(() => {
    setIsSearchVisible(true);
  }, []);
  const hideSearch = useCallback(() => {
    setIsSearchVisible(false);
  }, []);
  const updateSearchTerm = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);
  const updateSearchResults = useCallback((results: FileItem[]) => {
    setSearchResults(results);
  }, []);
  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setSearchResults([]);
  }, []);
  return {
    isSearchVisible,
    searchTerm,
    searchResults,
    showSearch,
    hideSearch,
    updateSearchTerm,
    updateSearchResults,
    clearSearch
  };
};