import React from 'react';
import Header from './header';
import type { User } from "~/model/user";
import { cn, themeClasses } from "~/utils/theme";

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
    <div className={cn(
      "min-h-screen",
      themeClasses.surface
    )}>
      <Header 
        user={user}
        onLogoutClick={onLogoutClick}
      />
      <main className="max-w-7xl mx-auto p-6">
        {children}
      </main>
    </div>
  );
}
