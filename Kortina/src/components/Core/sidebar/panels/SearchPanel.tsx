import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Search, RefreshCw, ChevronDown, ChevronRight, X, Folder } from 'lucide-react';
import { searchInFilesStreaming, SearchResult, StreamingSearchHandle } from '../../../../utils/fileSystem';
import { CollapsibleChildren } from '../../CollapsibleChildren';
import './PanelStyles.css';
interface SearchPanelProps {
  projectPath: string | null;
  onFileSelect?: (filePath: string, fileName: string) => void;
}
interface GroupedResults {
  [file: string]: SearchResult[];
}
export const SearchPanel: React.FC<SearchPanelProps> = ({
  projectPath,
  onFileSelect
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [includePattern, setIncludePattern] = useState('*');
  const [excludePattern, setExcludePattern] = useState('node_modules,dist,build,.git');
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeSearchRef = useRef<StreamingSearchHandle | null>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    return () => {
      activeSearchRef.current?.cancel();
      activeSearchRef.current = null;
    };
  }, []);
  const performSearch = useCallback(async () => {
    activeSearchRef.current?.cancel();
    activeSearchRef.current = null;
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }
    if (!projectPath) {
      setSearchResults([]);
      setSearchError('请先打开一个项目文件夹');
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);
    setExpandedFiles(new Set());
    try {
      const handle = await searchInFilesStreaming(projectPath, {
        query: searchQuery,
        caseSensitive,
        wholeWord,
        useRegex,
        includePattern,
        excludePattern
      }, {
        onBatch: batch => {
          setSearchResults(prev => [...prev, ...batch]);
          setExpandedFiles(prev => {
            const next = new Set(prev);
            for (const r of batch) next.add(r.file);
            return next;
          });
        },
        onDone: () => {
          setIsSearching(false);
        },
        onError: message => {
          console.error('搜索失败:', message);
          setSearchError(message);
          setIsSearching(false);
        }
      });
      activeSearchRef.current = handle;
    } catch (error) {
      console.error('搜索失败:', error);
      setSearchResults([]);
      setSearchError(error instanceof Error ? error.message : String(error));
      setIsSearching(false);
    }
  }, [searchQuery, projectPath, caseSensitive, wholeWord, useRegex, includePattern, excludePattern]);
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      performSearch();
    }, 500);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, caseSensitive, wholeWord, useRegex, includePattern, excludePattern, performSearch]);
  const groupedResults = useMemo(() => {
    const grouped: GroupedResults = {};
    searchResults.forEach(result => {
      if (!grouped[result.file]) {
        grouped[result.file] = [];
      }
      grouped[result.file].push(result);
    });
    return grouped;
  }, [searchResults]);
  const toggleFileExpanded = (file: string) => {
    setExpandedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(file)) {
        newSet.delete(file);
      } else {
        newSet.add(file);
      }
      return newSet;
    });
  };
  const resolveAbsolutePath = useCallback((relativeOrAbsolutePath: string) => {
    const normalized = relativeOrAbsolutePath.replace(/\\/g, '/');
    if (!projectPath) return normalized;
    if (normalized.startsWith('/') || /^[A-Za-z]:\
      return normalized;
    }
    const root = projectPath.replace(/\\/g, '/').replace(/\/$/, '');
    return `${root}/${normalized.replace(/^\//, '')}`;
  }, [projectPath]);
  const handleResultClick = (result: SearchResult) => {
    const fileName = result.file.split(/[/\\]/).pop() || result.file;
    onFileSelect?.(resolveAbsolutePath(result.file), fileName);
  };
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchError(null);
    inputRef.current?.focus();
  };
  const clipContentAroundMatches = (content: string, matches: {
    start: number;
    end: number;
  }[], radius = 28): {
    text: string;
    matches: {
      start: number;
      end: number;
    }[];
  } => {
    if (!matches.length) {
      const clipped = content.length > radius * 2 ? `${content.slice(0, radius * 2)}…` : content;
      return {
        text: clipped,
        matches: []
      };
    }
    const first = matches[0];
    const last = matches[matches.length - 1];
    let start = Math.max(0, first.start - radius);
    let end = Math.min(content.length, last.end + radius);
    if (start > 0) {
      const space = content.lastIndexOf(' ', first.start);
      if (space >= start && space < first.start) start = space + 1;
    }
    if (end < content.length) {
      const space = content.indexOf(' ', last.end);
      if (space > last.end && space <= end) end = space;
    }
    const prefix = start > 0 ? '…' : '';
    const suffix = end < content.length ? '…' : '';
    const text = `${prefix}${content.slice(start, end)}${suffix}`;
    const offset = start - (prefix ? 1 : 0);
    const remapped = matches.filter(m => m.end > start && m.start < end).map(m => ({
      start: Math.max(0, m.start - offset),
      end: Math.min(text.length, m.end - offset)
    }));
    return {
      text,
      matches: remapped
    };
  };
  const highlightMatch = (content: string, matches: {
    start: number;
    end: number;
  }[]) => {
    const {
      text,
      matches: clippedMatches
    } = clipContentAroundMatches(content, matches);
    if (!clippedMatches.length) return text;
    const parts: React.ReactNode[] = [];
    let lastEnd = 0;
    clippedMatches.forEach((match, index) => {
      if (match.start > lastEnd) {
        parts.push(text.slice(lastEnd, match.start));
      }
      parts.push(<mark key={index} className="search-match-highlight">
          {text.slice(match.start, match.end)}
        </mark>);
      lastEnd = match.end;
    });
    if (lastEnd < text.length) {
      parts.push(text.slice(lastEnd));
    }
    return parts;
  };
  const totalMatches = searchResults.length;
  const totalFiles = Object.keys(groupedResults).length;
  return <div className="sidebar-panel search-panel">
      <div className="panel-header">
        <span className="panel-title">搜索</span>
        {isSearching && <RefreshCw size={14} className="spinning" />}
      </div>

      <div className="panel-content">
        <div className="search-input-wrapper">
          <Search size={14} className="search-icon" />
          <input ref={inputRef} type="text" className="search-input" placeholder="搜索文件内容..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          {searchQuery && <button className="clear-btn" onClick={clearSearch}>
              <X size={14} />
            </button>}
        </div>

        <div className="search-options">
          <label className={`option-checkbox ${caseSensitive ? 'active' : ''}`} title="区分大小写">
            <input type="checkbox" checked={caseSensitive} onChange={e => setCaseSensitive(e.target.checked)} />
            <span>Aa</span>
          </label>
          <label className={`option-checkbox ${wholeWord ? 'active' : ''}`} title="全字匹配">
            <input type="checkbox" checked={wholeWord} onChange={e => setWholeWord(e.target.checked)} />
            <span>\b</span>
          </label>
          <label className={`option-checkbox ${useRegex ? 'active' : ''}`} title="使用正则表达式">
            <input type="checkbox" checked={useRegex} onChange={e => setUseRegex(e.target.checked)} />
            <span>.*</span>
          </label>
        </div>

        <div className="search-filters">
          <div className="filter-row">
            <label>包含:</label>
            <input type="text" value={includePattern} onChange={e => setIncludePattern(e.target.value)} placeholder="*.ts,*.tsx" />
          </div>
          <div className="filter-row">
            <label>排除:</label>
            <input type="text" value={excludePattern} onChange={e => setExcludePattern(e.target.value)} placeholder="node_modules" />
          </div>
        </div>

        <div className="search-results">
          {(totalMatches > 0 || isSearching) && <div className="results-header">
              <span>
                {totalMatches} 个匹配项
                {isSearching ? '（搜索中…）' : ''}
              </span>
              <span className="results-sub">{totalFiles} 个文件</span>
            </div>}

          <div className="results-list">
            {Object.entries(groupedResults).map(([file, results]) => <div key={file} className="result-file-group">
                <div className="result-file-header" onClick={() => toggleFileExpanded(file)}>
                  {expandedFiles.has(file) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <Folder size={14} />
                  <span className="file-name">{file.split('/').pop()}</span>
                  <span className="file-path">{file}</span>
                  <span className="match-count">{results.length}</span>
                </div>

                <CollapsibleChildren open={expandedFiles.has(file)} className="result-file-matches collapsible-children" innerClassName="result-file-matches-inner collapsible-children-inner">
                  {results.map((result, index) => <div key={index} className="result-item" onClick={() => handleResultClick(result)}>
                      <div className="result-line-num">{result.line}</div>
                      <div className="result-content">
                        {highlightMatch(result.content, result.matches)}
                      </div>
                    </div>)}
                </CollapsibleChildren>
              </div>)}
          </div>

          {!searchQuery && !searchResults.length && <div className="search-placeholder">
              <Search size={48} opacity={0.3} />
              <p>输入关键词开始搜索</p>
              <span>支持正则表达式和文件过滤</span>
            </div>}

          {searchQuery && !isSearching && searchError && <div className="search-placeholder">
              <p>搜索失败</p>
              <span>{searchError}</span>
            </div>}

          {searchQuery && !isSearching && !searchError && !searchResults.length && <div className="search-placeholder">
              <p>未找到匹配结果</p>
            </div>}
        </div>
      </div>
    </div>;
};
export default SearchPanel;