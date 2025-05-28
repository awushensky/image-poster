import React from 'react';
import Header from './header';
import type { User } from '~/model/model';

interface LayoutProps {
  user: User;
  children: React.ReactNode;
  className?: string;
  onSettingsClick: () => void;
  onLogoutClick: () => void;
}

export default function Layout({ 
  user,
  children,
  onSettingsClick,
  onLogoutClick,
}: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        user={user}
        onSettingsClick={onSettingsClick}
        onLogoutClick={onLogoutClick}
      />
      <main className={`max-w-7xl mx-auto p-6`}>
        {children}
      </main>
    </div>
  );
}
