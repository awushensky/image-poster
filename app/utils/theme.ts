import type { ResolvedTheme, ColorVariant, ColorIntensity, ThemeAwareClassName } from '~/types/theme';

/**
 * Generate theme-aware class names
 */
export const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

/**
 * Apply theme-aware class name logic
 */
export const themeClass = (
  className: ThemeAwareClassName, 
  currentTheme: ResolvedTheme
): string => {
  return typeof className === 'function' ? className(currentTheme) : className;
};

/**
 * Generate color classes for both light and dark themes
 */
export const colorClass = (
  variant: ColorVariant,
  type: 'bg' | 'text' | 'border' = 'bg',
  lightIntensity: ColorIntensity = '500',
  darkIntensity: ColorIntensity = '400'
): string => {
  return `${type}-${variant}-${lightIntensity} dark:${type}-${variant}-${darkIntensity}`;
};

/**
 * Common theme-aware component class combinations
 */
export const themeClasses = {
  // Cards and surfaces
  card: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
  surface: 'bg-gray-50 dark:bg-gray-900',
  
  // Text variants
  primary: 'text-gray-900 dark:text-gray-100',
  secondary: 'text-gray-600 dark:text-gray-400',
  muted: 'text-gray-500 dark:text-gray-500',
  
  // Interactive elements
  button: 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white',
  buttonSecondary: 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100',
  
  // Borders and dividers
  border: 'border-gray-200 dark:border-gray-700',
  divider: 'border-gray-300 dark:border-gray-600',
  
  // Focus states
  focus: 'focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-opacity-50',
} as const;

/**
 * Validate theme value
 */
export const isValidTheme = (theme: string): theme is ResolvedTheme => {
  return ['light', 'dark'].includes(theme);
};

/**
 * Get system theme preference
 */
export const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/**
 * Generate responsive theme classes
 */
export const responsiveThemeClass = (
  base: string,
  sm?: string,
  md?: string,
  lg?: string,
  xl?: string
): string => {
  const classes = [base];
  if (sm) classes.push(`sm:${sm}`);
  if (md) classes.push(`md:${md}`);
  if (lg) classes.push(`lg:${lg}`);
  if (xl) classes.push(`xl:${xl}`);
  return classes.join(' ');
};
