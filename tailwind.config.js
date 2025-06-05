import { colors } from 'tailwindcss/defaultTheme'

export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    colors: {
      ...colors,
    }
  },
  safelist: [
    'bg-red-50', 'bg-red-500', 'bg-orange-50', 'bg-orange-500',
    'bg-yellow-50', 'bg-yellow-500', 'bg-green-50', 'bg-green-500',
    'bg-cyan-50', 'bg-cyan-500', 'bg-blue-50', 'bg-blue-500',
    'bg-purple-50', 'bg-purple-500', 'bg-pink-50', 'bg-pink-500',
    'bg-gray-50', 'bg-gray-500',
    
    'text-red-600', 'text-red-900', 'text-orange-600', 'text-orange-900',
    'text-yellow-600', 'text-yellow-900', 'text-green-600', 'text-green-900',
    'text-cyan-600', 'text-cyan-900', 'text-blue-600', 'text-blue-900',
    'text-purple-600', 'text-purple-900', 'text-pink-600', 'text-pink-900',
    'text-gray-600', 'text-gray-900',
    
    'border-red-200', 'border-orange-200', 'border-yellow-200',
    'border-green-200', 'border-cyan-200', 'border-blue-200',
    'border-purple-200', 'border-pink-200', 'border-gray-200',
  ],
}
