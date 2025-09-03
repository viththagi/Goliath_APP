// src/contexts/CmdVelContext.js
import React, { createContext, useContext, useState } from 'react';

const CmdVelContext = createContext();

export const useCmdVel = () => {
  const context = useContext(CmdVelContext);
  if (!context) {
    throw new Error('useCmdVel must be used within a CmdVelProvider');
  }
  return context;
};

export const CmdVelProvider = ({ children }) => {
  const [cmdVelEnabled, setCmdVelEnabled] = useState(true);

  return (
    <CmdVelContext.Provider value={{ cmdVelEnabled, setCmdVelEnabled }}>
      {children}
    </CmdVelContext.Provider>
  );
};
