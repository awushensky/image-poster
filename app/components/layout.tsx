import React from 'react';
import Header from './header';
import type { User } from "~/model/user";


interface LayoutProps {
  user: User;
  onLogoutClick: () => void;
  children: React.ReactNode;
}

export default function Layout({ 
  user,
  onLogoutClick,
  children,
}: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        user={user}
        onLogoutClick={onLogoutClick}
      />
      <main className={`max-w-7xl mx-auto p-6`}>
        {children}
      </main>
    </div>
  );
}
