// Theme context that avoids React hook initialization issues
// Uses a class-based approach to prevent "Cannot read properties of null" errors

import { Component, createContext, useContext, type ReactNode } from "react";

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

// Create context with a default value
const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggleTheme: () => {},
});

// Get initial theme from localStorage or DOM
function getStoredTheme(): boolean {
  if (typeof window === "undefined") return false;
  
  // Check if dark class is already set (from index.html script)
  if (document.documentElement.classList.contains("dark")) {
    return true;
  }
  
  try {
    const stored = localStorage.getItem("classify-theme");
    if (stored === "true" || stored === '"dark"' || stored === "dark") {
      return true;
    }
  } catch {
    // Ignore localStorage errors
  }
  
  return false;
}

// Class component to avoid hook initialization issues
class ThemeProvider extends Component<
  { children: ReactNode },
  { isDark: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = {
      isDark: false, // Will be set in componentDidMount
    };
    this.toggleTheme = this.toggleTheme.bind(this);
  }

  componentDidMount() {
    // Initialize theme after component mounts (client-side only)
    const initialTheme = getStoredTheme();
    this.setState({ isDark: initialTheme });
    this.applyTheme(initialTheme);
  }

  applyTheme(isDark: boolean) {
    try {
      localStorage.setItem("classify-theme", isDark ? "true" : "false");
    } catch {
      // Ignore localStorage errors
    }
    
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  toggleTheme() {
    this.setState(
      (prevState) => ({ isDark: !prevState.isDark }),
      () => {
        this.applyTheme(this.state.isDark);
      }
    );
  }

  render() {
    const value: ThemeContextType = {
      isDark: this.state.isDark,
      toggleTheme: this.toggleTheme,
    };

    return (
      <ThemeContext.Provider value={value}>
        {this.props.children}
      </ThemeContext.Provider>
    );
  }
}

// Custom hook to use theme context
function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  return context;
}

export { ThemeProvider, useTheme, ThemeContext };
