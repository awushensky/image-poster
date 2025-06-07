import React, { useState } from 'react';
import { User as UserIcon, LogOut, Settings, Delete } from 'lucide-react';
import type { User } from '~/model/model';

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
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-gray-900">
            Bluesky Image Scheduler
          </h1>
        </div>

        {user && (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {user.avatarUrl
                ? <img
                    src={user.avatarUrl}
                    alt={user.displayName || user.handle}
                    className="w-8 h-8 rounded-full"
                  />
                : <UserIcon className="w-8 h-8 text-gray-500" />
              }
              <span className="text-sm text-gray-700 hidden sm:block">
                {user.displayName || user.handle}
              </span>
            </button>

            {dropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setDropdownOpen(false)}
                />
                
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
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
