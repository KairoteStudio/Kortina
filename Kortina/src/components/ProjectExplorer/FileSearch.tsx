import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import type { FileItem } from '../../utils/fileSystem';
import './FileSearch.css';
export interface FileSearchProps {
  files: FileItem[];
  onFileSelect?: (file: FileItem) => void;
  onClose?: () => void;
  placeholder?: string;
}
const FileSearch: React.FC<FileSearchProps> = ({
  files,
  onFileSelect,
  onClose,
  placeholder = "搜索文件..."
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<FileItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRefs = useRef<(HTMLDivElement | null)[]>([]);
  const searchFiles = (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      setSelectedIndex(0);
      return;
    }
    const results: FileItem[] = [];
    const searchLower = term.toLowerCase();
    const searchInFiles = (fileList: FileItem[]) => {
      for (const file of fileList) {
        if (file.name.toLowerCase().includes(searchLower)) {
          results.push(file);
        }
        if (file.children && file.children.length > 0) {
          searchInFiles(file.children);
        }
      }
    };
    searchInFiles(files);
    setSearchResults(results);
    setSelectedIndex(0);
  };
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    searchFiles(term);
  };
  const closeSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    onClose?.();
  };
  const handleFileSelect = (file: FileItem) => {
    onFileSelect?.(file);
    closeSearch();
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeSearch();
      return;
    }
    if (searchResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, searchResults.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
        handleFileSelect(searchResults[selectedIndex]);
      }
    }
  };
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    resultRefs.current[selectedIndex]?.scrollIntoView({
      block: 'nearest'
    });
  }, [selectedIndex]);
  return <div className="file-search-overlay" onClick={closeSearch}>
      <div className="file-search-container" onClick={e => e.stopPropagation()}>
        <div className="file-search-input-container">
          <Search className="file-search-icon" size={16} />
          <input ref={inputRef} type="text" className="file-search-input" placeholder={placeholder} value={searchTerm} onChange={handleSearchChange} onKeyDown={handleKeyDown} />
          <button className="file-search-close" onClick={closeSearch}>
            <X size={16} />
          </button>
        </div>

        {searchResults.length > 0 && <div className="file-search-results">
            {searchResults.map((file, index) => <div key={`${file.path}-${index}`} ref={el => {
          resultRefs.current[index] = el;
        }} className={`file-search-result-item ${selectedIndex === index ? 'selected' : ''}`} onClick={() => handleFileSelect(file)} onMouseEnter={() => setSelectedIndex(index)}>
                <div className="file-search-result-name">{file.name}</div>
                <div className="file-search-result-path">{file.path}</div>
              </div>)}
          </div>}

        {searchTerm && searchResults.length === 0 && <div className="file-search-no-results">
            未找到匹配的文件
          </div>}
      </div>
    </div>;
};
export default FileSearch;