import React from 'react';
import { cn, themeClasses } from "~/utils/theme";

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div className={cn(
      "border-b",
      themeClasses.border
    )}>
      <nav className="-mb-px flex space-x-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "py-2 px-1 border-b-2 font-medium text-sm transition-colors",
              activeTab === tab.id
                ? "border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                : cn(
                    "border-transparent",
                    "text-gray-500 dark:text-gray-400",
                    "hover:text-gray-700 dark:hover:text-gray-300",
                    "hover:border-gray-300 dark:hover:border-gray-600"
                  )
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1">({tab.count})</span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Tabs;
