import { colors } from 'tailwindcss/defaultTheme'

export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    colors: {
      ...colors,
    }
  },
  safelist: [
    // Light mode colors
    'bg-red-50', 'bg-red-500', 'bg-orange-50', 'bg-orange-500',
    'bg-yellow-50', 'bg-yellow-500', 'bg-green-50', 'bg-green-500',
    'bg-cyan-50', 'bg-cyan-500', 'bg-blue-50', 'bg-blue-500',
    'bg-purple-50', 'bg-purple-500', 'bg-pink-50', 'bg-pink-500',
    'bg-gray-50', 'bg-gray-500', 'bg-opacity-50',
    
    'text-red-600', 'text-red-900', 'text-orange-600', 'text-orange-900',
    'text-yellow-600', 'text-yellow-900', 'text-green-600', 'text-green-900',
    'text-cyan-600', 'text-cyan-900', 'text-blue-600', 'text-blue-900',
    'text-purple-600', 'text-purple-900', 'text-pink-600', 'text-pink-900',
    'text-gray-600', 'text-gray-900',
    
    'border-red-200', 'border-orange-200', 'border-yellow-200',
    'border-green-200', 'border-cyan-200', 'border-blue-200',
    'border-purple-200', 'border-pink-200', 'border-gray-200',
    
    // Dark mode variants
    'dark:bg-red-900', 'dark:bg-red-600', 'dark:bg-orange-900', 'dark:bg-orange-600',
    'dark:bg-yellow-900', 'dark:bg-yellow-600', 'dark:bg-green-900', 'dark:bg-green-600',
    'dark:bg-cyan-900', 'dark:bg-cyan-600', 'dark:bg-blue-900', 'dark:bg-blue-600',
    'dark:bg-purple-900', 'dark:bg-purple-600', 'dark:bg-pink-900', 'dark:bg-pink-600',
    'dark:bg-gray-900', 'dark:bg-gray-600',
    
    'dark:text-red-300', 'dark:text-red-100', 'dark:text-orange-300', 'dark:text-orange-100',
    'dark:text-yellow-300', 'dark:text-yellow-100', 'dark:text-green-300', 'dark:text-green-100',
    'dark:text-cyan-300', 'dark:text-cyan-100', 'dark:text-blue-300', 'dark:text-blue-100',
    'dark:text-purple-300', 'dark:text-purple-100', 'dark:text-pink-300', 'dark:text-pink-100',
    'dark:text-gray-300', 'dark:text-gray-100',
    
    'dark:border-red-700', 'dark:border-orange-700', 'dark:border-yellow-700',
    'dark:border-green-700', 'dark:border-cyan-700', 'dark:border-blue-700',
    'dark:border-purple-700', 'dark:border-pink-700', 'dark:border-gray-700',
  ],
}
