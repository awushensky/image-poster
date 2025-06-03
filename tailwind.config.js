const { colors } = require('tailwindcss/defaultTheme')

module.exports = {
  theme: {
    colors: {
      black: colors.black,
      white: colors.white,
      gray: colors.gray,
      orange: colors.orange,
      red: colors.red,
      yellow: colors.yellow,
      green: colors.green,
      blue: colors.blue,
      indigo: colors.indigo,
      purple: colors.purple,
    }
  },
  safelist: [
    'bg-blue-50',
    'bg-green-50',
    'bg-purple-50',
    'bg-orange-50',
    'bg-red-50',
    'bg-indigo-50',
    'border-blue-200',
    'border-green-200',
    'border-purple-200',
    'border-orange-200',
    'border-red-200',
    'border-indigo-200',
    'text-blue-600',
    'text-green-600',
    'text-purple-600',
    'text-orange-600',
    'text-red-600',
    'text-indigo-600',
    'hover:text-blue-600',
    'hover:text-green-600',
    'hover:text-purple-600',
    'hover:text-orange-600',
    'hover:text-red-600',
    'hover:text-indigo-600',
  ],
}
