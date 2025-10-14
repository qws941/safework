/**
 * SafeWork Unified Design System
 * 전체 시스템에서 사용하는 일관된 디자인 토큰
 */

export const SafeWorkDesignSystem = {
  // Color Palette
  colors: {
    primary: '#667eea',
    primaryDark: '#5568d3',
    secondary: '#764ba2',
    success: '#10b981',
    danger: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
    light: '#f8fafc',
    dark: '#1f2937',
  },

  // Gradients
  gradients: {
    primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    button: 'linear-gradient(135deg, #667eea, #764ba2)',
    success: 'linear-gradient(135deg, #10b981, #059669)',
    danger: 'linear-gradient(135deg, #ef4444, #dc2626)',
    warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
    info: 'linear-gradient(135deg, #3b82f6, #2563eb)',
  },

  // Typography
  fonts: {
    primary: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
  },

  // Spacing
  spacing: {
    xs: '5px',
    sm: '10px',
    md: '15px',
    lg: '20px',
    xl: '30px',
    xxl: '40px',
  },

  // Border Radius
  borderRadius: {
    sm: '8px',
    md: '12px',
    lg: '15px',
    xl: '20px',
    full: '9999px',
  },

  // Shadows
  shadows: {
    sm: '0 2px 4px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 40px rgba(0, 0, 0, 0.15)',
    button: '0 4px 15px rgba(102, 126, 234, 0.3)',
  },

  // Transitions
  transitions: {
    fast: '0.2s ease',
    normal: '0.3s ease',
    slow: '0.5s ease',
  },
};

/**
 * Generate CSS custom properties from design system
 */
export function generateCSSVariables(): string {
  return `
    :root {
      /* Colors */
      --color-primary: ${SafeWorkDesignSystem.colors.primary};
      --color-primary-dark: ${SafeWorkDesignSystem.colors.primaryDark};
      --color-secondary: ${SafeWorkDesignSystem.colors.secondary};
      --color-success: ${SafeWorkDesignSystem.colors.success};
      --color-danger: ${SafeWorkDesignSystem.colors.danger};
      --color-warning: ${SafeWorkDesignSystem.colors.warning};
      --color-info: ${SafeWorkDesignSystem.colors.info};
      --color-light: ${SafeWorkDesignSystem.colors.light};
      --color-dark: ${SafeWorkDesignSystem.colors.dark};

      /* Gradients */
      --gradient-primary: ${SafeWorkDesignSystem.gradients.primary};
      --gradient-button: ${SafeWorkDesignSystem.gradients.button};
      --gradient-success: ${SafeWorkDesignSystem.gradients.success};
      --gradient-danger: ${SafeWorkDesignSystem.gradients.danger};
      --gradient-warning: ${SafeWorkDesignSystem.gradients.warning};
      --gradient-info: ${SafeWorkDesignSystem.gradients.info};

      /* Typography */
      --font-family: ${SafeWorkDesignSystem.fonts.primary};

      /* Spacing */
      --spacing-xs: ${SafeWorkDesignSystem.spacing.xs};
      --spacing-sm: ${SafeWorkDesignSystem.spacing.sm};
      --spacing-md: ${SafeWorkDesignSystem.spacing.md};
      --spacing-lg: ${SafeWorkDesignSystem.spacing.lg};
      --spacing-xl: ${SafeWorkDesignSystem.spacing.xl};
      --spacing-xxl: ${SafeWorkDesignSystem.spacing.xxl};

      /* Border Radius */
      --radius-sm: ${SafeWorkDesignSystem.borderRadius.sm};
      --radius-md: ${SafeWorkDesignSystem.borderRadius.md};
      --radius-lg: ${SafeWorkDesignSystem.borderRadius.lg};
      --radius-xl: ${SafeWorkDesignSystem.borderRadius.xl};
      --radius-full: ${SafeWorkDesignSystem.borderRadius.full};

      /* Shadows */
      --shadow-sm: ${SafeWorkDesignSystem.shadows.sm};
      --shadow-md: ${SafeWorkDesignSystem.shadows.md};
      --shadow-lg: ${SafeWorkDesignSystem.shadows.lg};
      --shadow-xl: ${SafeWorkDesignSystem.shadows.xl};
      --shadow-button: ${SafeWorkDesignSystem.shadows.button};

      /* Transitions */
      --transition-fast: ${SafeWorkDesignSystem.transitions.fast};
      --transition-normal: ${SafeWorkDesignSystem.transitions.normal};
      --transition-slow: ${SafeWorkDesignSystem.transitions.slow};
    }

    /* Body defaults */
    body {
      font-family: var(--font-family);
      background: var(--gradient-primary);
      min-height: 100vh;
    }

    /* Button styles */
    .btn-primary {
      background: var(--gradient-button);
      border: none;
      border-radius: var(--radius-md);
      padding: 12px 30px;
      font-weight: 600;
      transition: var(--transition-fast);
      box-shadow: var(--shadow-button);
      color: white;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
    }

    /* Card styles */
    .card {
      background: white;
      border-radius: var(--radius-lg);
      padding: var(--spacing-xl);
      box-shadow: var(--shadow-lg);
      margin-bottom: var(--spacing-lg);
    }

    /* Input styles */
    .form-control, .form-select {
      border: 2px solid #e5e7eb;
      border-radius: var(--radius-sm);
      padding: 12px 14px;
      font-size: 1rem;
      transition: var(--transition-normal);
    }

    .form-control:focus, .form-select:focus {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      outline: none;
    }
  `;
}

/**
 * Generate Tailwind-compatible classes
 */
export const TailwindClasses = {
  gradient: {
    primary: 'bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600',
    button: 'bg-gradient-to-r from-indigo-600 to-purple-600',
  },
  colors: {
    primary: 'indigo-600',
    success: 'green-600',
    danger: 'red-600',
    warning: 'amber-600',
  },
};
