import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { TestModeBanner } from './TestModeBanner';

interface AppShellProps {
  title?: string;
  showBack?: boolean;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ title, showBack, children }) => {
  return (
    <div className="min-h-screen bg-brand-surface-muted flex flex-col lg:pl-64">
      <TestModeBanner />
      <Sidebar />
      <Header title={title} showBack={showBack} />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-28 lg:pb-12">
        {children}
      </main>

      <BottomNav />
    </div>
  );
};
