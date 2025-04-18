import React from 'react';
import './PiCoPilot.css';

const CitationsPanel = () => {
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

  return (
    <div className="citations-panel">
      <div className="citations-header">
        Citations
      </div>
      <div className="citations-list">
        {citations.map((citation, index) => (
          <div key={index} className="citation-item">
            <a href="#" className="citation-title" onClick={(e) => {
              e.preventDefault();
              // Handle citation click - you can add the actual link handling here
              console.log('Citation clicked:', citation.title);
            }}>
              {citation.title}
            </a>
            <div className="citation-text">{citation.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CitationsPanel; 