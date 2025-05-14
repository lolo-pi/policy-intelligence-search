import React, { useState, useEffect } from 'react';
import './PiCoPilot.css';
import MessageHistory from './MessageHistory';
import PiCoPilotChat from './PiCoPilotChat';
import SourcesPanel from './CitationsPanel';
import SidebarFilters from './SidebarFilters';
import { useSearchPage } from '../context/SearchPageContext';
import { useSidebar } from '../context/SidebarContext';
import { useLocation } from 'react-router-dom';
import { useChat } from '../context/ChatContext';

// Import the AI avatar image
import aiAvatar from '../assets/AI-technology.png';
import sourcesIcon from '../assets/sources_icon.svg';

const PiCoPilot = () => {
  const { results } = useSearchPage();
  const { showHistory, setShowHistory } = useChat();
  const { sidebarCollapsed, resetSidebarAnimation } = useSidebar();
  const location = useLocation();

  // Example history items
  const historyItems = [
    'Tell me about PM2.5 regulations in...',
    'How does California\'s oil and gas e...',
    'Tell me about PM2.5 regulations in...',
    'What bills related to electric vehicl...',
    'How have states implemented co...',
    'What state-level policies incentiv...',
    'Which cities have adopted congest...',
  ];

  // Example citations
  const citations = [
    {
      title: 'Colorado - Regulation Number 20 - Colorado Low Emission Automobile Regulation',
      text: '...pursuant to §25-7-122, C.R.S. PART E HEAVY DUTY LOW NOx REGULATION (HD LOW NOx) I. Purpose The purpose of this Part E is to establish Colorado heavy-duty engine and vehicle standards that incorporate California engine and vehicle emission standards as provided for under Section...'
    },
    {
      title: 'Colorado - Regulation Number 12 - Reduction of Diesel Vehicle Emissions',
      text: 'I.B.27. "Heavy-duty Diesel Vehicle" as applicable to the Diesel Opacity Inspection Program refers to diesel vehicles of greater than fourteen thousand pounds GVWR. I.B.28. "Heavy-duty Diesel Opacity Inspection Station" means a facility licensed to inspect heavy-duty diesel vehicles only. I...'
    },
    {
      title: 'Colorado - Regulation Number 11 - Motor Vehicle Emissions Inspection Program',
      text: '...Emissions Limits for Motor Vehicle Exhaust, Evaporative and Visible Emissions for Light-Duty and Heavy-Duty Vehicles In order for a vehicle (owner) to obtain a Certificate of Emissions Compliance, the exhaust and evaporative emissions from the motor vehicle subject to an EPA approved...'
    }
  ];

  const [showSourcesPanel, setShowSourcesPanel] = useState(() => {
    const stored = localStorage.getItem('showSourcesPanel');
    return stored === null ? true : stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem('showSourcesPanel', showSourcesPanel);
  }, [showSourcesPanel]);

  const handleFilterChange = (filters) => {
    // Handle filter changes if needed
    console.log('Filters changed:', filters);
  };

  useEffect(() => {
    resetSidebarAnimation();
  }, [location, resetSidebarAnimation]);

  return (
    <div className="app-wrapper">
      <div className="main-layout">
        <aside className={`sidebar${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
          <SidebarFilters 
            onFilterChange={handleFilterChange}
            instanceId="copilot-page"
            jurisdictionsInactive={true}
            documentTypesInactive={true}
          />
        </aside>
        <div className={`copilot-container${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
          <div className="copilot-content">
            {showHistory && <MessageHistory onClose={() => setShowHistory(false)} />}
            <PiCoPilotChat
              showHistory={showHistory}
              setShowHistory={setShowHistory}
              showToggleButton={!showHistory}
              showSourcesPanel={showSourcesPanel}
              setShowSourcesPanel={setShowSourcesPanel}
              showSourcesToggleButton={!showSourcesPanel}
            />
            <SourcesPanel showSourcesPanel={showSourcesPanel} setShowSourcesPanel={setShowSourcesPanel} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PiCoPilot; 