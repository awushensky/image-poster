import React, { useState } from 'react';
import { User as UserIcon, LogOut } from 'lucide-react';
import type { User } from "~/model/user";
import { cn, themeClasses } from '~/utils/theme';

interface HeaderProps {
  user: User;
  onLogoutClick: () => void;
}

export default function Header({ user, onLogoutClick }: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    setDropdownOpen(false);
    onLogoutClick();
  };

  return (
    <header className={cn(
      "bg-white dark:bg-gray-900 px-6 py-4",
      "border-b",
      themeClasses.border
    )}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className={cn(
            "text-xl font-semibold",
            themeClasses.primary
          )}>
            Bluesky Image Scheduler
          </h1>
        </div>

        {user && (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={cn(
                "flex items-center space-x-2 p-2 rounded-lg transition-colors",
                "hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              {user.avatarUrl
                ? <img
                    src={user.avatarUrl}
                    alt={user.displayName || user.handle}
                    className="w-8 h-8 rounded-full"
                  />
                : <UserIcon className={cn(
                    "w-8 h-8",
                    themeClasses.muted
                  )} />
              }
              <span className={cn(
                "text-sm hidden sm:block",
                themeClasses.secondary
              )}>
                {user.displayName || user.handle}
              </span>
            </button>

            {dropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setDropdownOpen(false)}
                />
                
                <div className={cn(
                  "absolute right-0 mt-2 w-48 rounded-lg shadow-lg py-1 z-50",
                  "bg-white dark:bg-gray-800",
                  "border",
                  themeClasses.border
                )}>
                  <button
                    onClick={handleLogout}
                    className={cn(
                      "flex items-center w-full px-4 py-2 text-sm transition-colors",
                      "text-gray-700 dark:text-gray-300",
                      "hover:bg-gray-100 dark:hover:bg-gray-700"
                    )}
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Log Out
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
