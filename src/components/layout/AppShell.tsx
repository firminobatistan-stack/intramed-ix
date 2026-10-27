import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { TestModeBanner } from './TestModeBanner';
import { MobileNavDrawer } from './MobileNavDrawer';

interface AppShellProps {
  title?: string;
  showBack?: boolean;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ title, showBack, children }) => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-brand-surface-muted flex flex-col lg:pl-64">
      <TestModeBanner />
      <Sidebar />
      <MobileNavDrawer
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
      />
      <Header
        title={title}
        showBack={showBack}
        onOpenMobileNav={() => setIsMobileNavOpen(true)}
      />

      <main className="flex-1 w-full max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-4 sm:pt-5 pb-28 lg:pb-12">
        {children}
      </main>

      <BottomNav onOpenMenu={() => setIsMobileNavOpen(true)} />
    </div>
  );
};
