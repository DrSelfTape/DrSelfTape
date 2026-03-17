import React, { useState } from 'react';
import SideMenu from '../SideMenu';
import { Header } from '../Header';

export const Layout = ({ children }) => {
  const [sideMenuOpen, setSideMenuOpen] = useState(true);
  return (
    <main className='flex w-screen h-screen relative'>
      <SideMenu sideMenuOpen={sideMenuOpen} setSideMenuOpen={setSideMenuOpen} />

      <div
        className={
          sideMenuOpen
            ? 'w-full base:w-[calc(100vw-250px)]'
            : 'w-full pl-[65px] base:pl-0 base:w-[calc(100vw-65px)]'
        }
      >
        <Header />
        <div className='h-[calc(100vh-70px)] overflow-auto w-full bg-primary/5'>
          <React.Fragment>{children}</React.Fragment>
        </div>

        {/* OVERLAY */}
        {sideMenuOpen && (
          <div
            onClick={() => setSideMenuOpen(false)}
            className='w-full h-full bg-black/50 absolute top-0 left-0 base:hidden' />
        )}
      </div>
    </main>
  );
};
