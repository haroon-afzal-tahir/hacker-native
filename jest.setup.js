import '@testing-library/jest-native/extend-expect';

// Mock Expo modules
jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  usePathname: jest.fn(() => '/'),
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  },
  Stack: {
    Screen: ({ children }) => children,
  },
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

jest.mock('expo-linking', () => ({
  openURL: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock React Native modules
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock react-native-render-html
jest.mock('react-native-render-html', () => {
  const React = require('react');
  return ({ source, baseStyle }) => {
    return React.createElement('div', { style: baseStyle }, source?.html || '');
  };
});

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const MockIcon = ({ children, ...props }) => 
    React.createElement('div', { ...props, testID: `icon-${props.name || 'mock'}` }, children);
  
  return new Proxy({}, {
    get: (target, prop) => {
      if (typeof prop === 'string' && prop !== 'then') {
        return MockIcon;
      }
      return target[prop];
    }
  });
});

// Suppress console warnings and errors in tests
const originalWarn = console.warn;
const originalError = console.error;

beforeAll(() => {
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});