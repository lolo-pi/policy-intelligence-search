// App.jsx
import React, { useState, useContext } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import TopNav from './components/TopNav';
import SidebarFilters from './components/SidebarFilters';
import SearchBar from './components/SearchBar';
import SearchResults from './components/SearchResults';
import FolderPanel from './components/FolderPanel';
import FoldersPage from './components/FoldersPage';
import PiCoPilot from './components/PiCoPilot';
import LoginPage from './components/LoginPage';
import MobileLayout from './components/MobileLayout';
import { useMobileDetect } from './utils/mobileDetect';
import { FolderProvider } from './context/FolderContext';
import { WorkingFolderProvider } from './context/WorkingFolderContext';
import { FolderPageProvider } from './context/FolderPageContext';
import { SearchPageProvider, useSearchPage } from './context/SearchPageContext';
import mockDataCO2 from './mockDataCO2.js';
import mockDataNM from './mockDataNM';
import mockDataSCAQMD from './mockDataSCAQMD';
import mockDataBAAD from './mockDataBAAD';
import mockDataTX from './mockDataTX';
import mockDataWA from './mockDataWA';
import mockDataUT from './mockDataUT';
import './App.css';

// Combine all mock data
const MOCK_DOCUMENTS = [
  ...mockDataCO2,
  ...mockDataNM,
  ...mockDataSCAQMD,
  ...mockDataBAAD,
  ...mockDataTX,
  ...mockDataWA,
  ...mockDataUT
];

function MainContent() {
  const location = useLocation();
  const { results, loading, error, usingMockData, documentCounts, handleFilterChange } = useSearchPage();
  const isMobile = useMobileDetect();

  const isHomePage = location.pathname === '/' || location.hash === '#/';
  const isFoldersPage = location.pathname === '/folders' || location.hash === '#/folders';
  const isPiCoPilotPage = location.pathname === '/copilot' || location.hash === '#/copilot';

  // Return mobile layout if on mobile device
  if (isMobile) {
    console.log('Rendering mobile layout');
    return <MobileLayout />;
  }

  // Desktop layout
  return (
    <div className="app-wrapper">
      <div className="top-border" />
      <TopNav />

      <div className="main-layout">
        <aside className={`sidebar ${isPiCoPilotPage ? 'disabled' : ''}`}>
          <SidebarFilters 
            isDisabled={isPiCoPilotPage} 
            documentCounts={documentCounts}
            onFilterChange={handleFilterChange}
          />
        </aside>

        <main className={`main-section ${isPiCoPilotPage ? 'full-width' : ''}`}>
          {isHomePage && (
            <div className="center-content">
              <SearchBar />
              <SearchResults />
            </div>
          )}
          
          {isFoldersPage && (
            <FoldersPage />
          )}

          {isPiCoPilotPage && (
            <PiCoPilot />
          )}
        </main>

        {isHomePage && (
          <aside className="folder-panel">
            <FolderPanel />
          </aside>
        )}
      </div>
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <Router>
      <WorkingFolderProvider>
        <FolderProvider>
          <FolderPageProvider>
            <SearchPageProvider>
              <Routes>
                <Route 
                  path="/login" 
                  element={
                    !isAuthenticated ? (
                      <LoginPage onLogin={setIsAuthenticated} />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  } 
                />
                <Route
                  path="/*"
                  element={
                    isAuthenticated ? (
                      <MainContent />
                    ) : (
                      <Navigate to="/login" replace />
                    )
                  }
                />
              </Routes>
            </SearchPageProvider>
          </FolderPageProvider>
        </FolderProvider>
      </WorkingFolderProvider>
    </Router>
  );
}

export default App;
