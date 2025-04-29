import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './TopNav.css';
import logo from '../assets/logo.png';
import dynamicSearchIcon from '../assets/dynamic search ii.svg';
import coPilotIcon from '../assets/AI-technology.png';
import piLogo from '../assets/PI_Logo_2024.png';

const TopNav = () => {
  const location = useLocation();

  return (
    <header className="topnav">
      <div className="topnav-left">
        <Link to="/dynamic">
          <img src={logo} alt="Policy Intelligence Logo" className="topnav-logo" />
        </Link>
      </div>
      <div className="topnav-right">
        <nav className="topnav-links">
          <Link to="/dynamic" className={location.pathname === '/dynamic' || location.pathname === '/' ? 'active' : ''}>
            <img src={dynamicSearchIcon} alt="Dynamic Search" className="nav-icon" />
            Dynamic Search
          </Link>
          <span className="nav-divider" />
          <Link to="/copilot" className={location.pathname === '/copilot' ? 'active' : ''}>
            <img src={coPilotIcon} alt="PI Co-Pilot" className="nav-icon" />
            PI Co-Pilot
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default TopNav;
