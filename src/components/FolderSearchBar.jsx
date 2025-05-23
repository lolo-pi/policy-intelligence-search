import React, { useState, useEffect } from 'react';
import './SearchBar.css';
import { FaTimes } from 'react-icons/fa';
import searchIcon from '../assets/Search-Icon.png';
import { useFolderPage } from '../context/FolderPageContext';
import LoadingSpinner from './LoadingSpinner';

const FolderSearchBar = () => {
  const { searchQuery, handleSearch, loading } = useFolderPage();
  const [query, setQuery] = useState(searchQuery);
  const [localLoading, setLocalLoading] = useState(false);
  const [searchHistory] = useState([
    'air quality',
    'landfill',
    'emissions',
    'nox regulations',
    'waste management',
    'permits'
  ]);

  // Sync local state with context when searchQuery changes
  useEffect(() => {
    setQuery(searchQuery);
  }, [searchQuery]);

  // Update local loading state when context loading changes
  useEffect(() => {
    setLocalLoading(loading?.all || false);
  }, [loading]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      console.log('FolderSearchBar: Triggering search with query:', query);
      handleSearch(query);
    }
  };

  const handleClear = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setQuery('');
    setLocalLoading(false); // Immediately clear loading state
    handleSearch('');
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    setQuery(newValue);
    // If the value matches a history item exactly, trigger search
    if (searchHistory.includes(newValue)) {
      handleSearch(newValue);
    }
  };

  return (
    <div className="search-panel-header">
      <h2 className="search-title">Search documents by folder</h2>
      <div className="search-controls">
        <div className="search-input-wrapper">
          <img src={searchIcon} alt="Search" className="search-icon-img" />
          <input
            type="text"
            id="folder-document-search"
            name="folder-document-search"
            placeholder="e.g. air quality (press Enter to search)"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyPress}
            aria-label="Search documents in folder"
            list="folder-search-history"
          />
          <datalist id="folder-search-history">
            {searchHistory.map((item, index) => (
              <option key={index} value={item} />
            ))}
          </datalist>
          {localLoading && <LoadingSpinner />}
          {query && (
            <FaTimes 
              className="clear-icon" 
              onClick={handleClear}
              role="button"
              aria-label="Clear search"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default FolderSearchBar; 