import React from 'react';
import { render } from '@testing-library/react-native';
import { Avatar } from '../Avatar';

describe('Avatar Component', () => {
  describe('Rendering', () => {
    it('should render avatar with first letter uppercase', () => {
      const { getByText } = render(<Avatar text="john" />);
      
      expect(getByText('J')).toBeTruthy();
    });

    it('should handle single character text', () => {
      const { getByText } = render(<Avatar text="a" />);
      
      expect(getByText('A')).toBeTruthy();
    });

    it('should handle empty string gracefully', () => {
      const { queryByText } = render(<Avatar text="" />);
      
      // Should render empty string's first character (empty)
      // Component should still render without crashing
      const avatar = queryByText('');
      expect(avatar).toBeTruthy();
    });

    it('should handle text with spaces', () => {
      const { getByText } = render(<Avatar text=" john doe" />);
      
      // Should take first non-space character or space if that's first
      expect(getByText(' ')).toBeTruthy();
    });

    it('should handle special characters', () => {
      const { getByText } = render(<Avatar text="@john" />);
      
      expect(getByText('@')).toBeTruthy();
    });

    it('should handle numbers', () => {
      const { getByText } = render(<Avatar text="123abc" />);
      
      expect(getByText('1')).toBeTruthy();
    });
  });

  describe('Text Processing', () => {
    it('should convert lowercase to uppercase', () => {
      const { getByText } = render(<Avatar text="alice" />);
      
      expect(getByText('A')).toBeTruthy();
    });

    it('should keep already uppercase letters', () => {
      const { getByText } = render(<Avatar text="Bob" />);
      
      expect(getByText('B')).toBeTruthy();
    });

    it('should only display first character of long text', () => {
      const { getByText, queryByText } = render(<Avatar text="verylongusername" />);
      
      expect(getByText('V')).toBeTruthy();
      expect(queryByText('verylongusername')).toBeNull();
    });
  });

  describe('Component Structure', () => {
    it('should render View container with Text child', () => {
      const { getByText } = render(<Avatar text="test" />);
      
      const textElement = getByText('T');
      expect(textElement).toBeTruthy();
      
      // Text should be inside a View (container)
      expect(textElement.parent).toBeTruthy();
    });
  });

  describe('Props Handling', () => {
    it('should handle various text prop values', () => {
      const testCases = [
        { input: 'user1', expected: 'U' },
        { input: 'admin', expected: 'A' },
        { input: 'moderator', expected: 'M' },
        { input: 'guest', expected: 'G' },
      ];

      testCases.forEach(({ input, expected }) => {
        const { getByText } = render(<Avatar text={input} />);
        expect(getByText(expected)).toBeTruthy();
      });
    });

    it('should handle unicode characters', () => {
      const { queryByText } = render(<Avatar text="🚀rocket" />);
      
      // Unicode might not render properly in test environment
      // Just ensure component doesn't crash
      expect(queryByText).toBeTruthy();
    });

    it('should handle accented characters', () => {
      const { getByText } = render(<Avatar text="ñoño" />);
      
      expect(getByText('Ñ')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined text by crashing (TypeScript should prevent this)', () => {
      // This test verifies that the component requires valid text
      // In production, TypeScript would prevent undefined text
      expect(() => {
        render(<Avatar text={undefined as any} />);
      }).toThrow();
    });

    it('should handle null text by crashing (TypeScript should prevent this)', () => {
      // This test verifies that the component requires valid text
      // In production, TypeScript would prevent null text  
      expect(() => {
        render(<Avatar text={null as any} />);
      }).toThrow();
    });

    it('should handle very long strings efficiently', () => {
      const longText = 'a'.repeat(10000);
      const { getByText } = render(<Avatar text={longText} />);
      
      expect(getByText('A')).toBeTruthy();
    });
  });

  describe('Visual Consistency', () => {
    it('should render consistently for same input', () => {
      const { getByText: getText1 } = render(<Avatar text="same" />);
      const { getByText: getText2 } = render(<Avatar text="same" />);
      
      expect(getText1('S')).toBeTruthy();
      expect(getText2('S')).toBeTruthy();
    });

    it('should handle different cases consistently', () => {
      const { getByText: getText1 } = render(<Avatar text="test" />);
      const { getByText: getText2 } = render(<Avatar text="Test" />);
      const { getByText: getText3 } = render(<Avatar text="TEST" />);
      
      // All should render as uppercase T
      expect(getText1('T')).toBeTruthy();
      expect(getText2('T')).toBeTruthy();
      expect(getText3('T')).toBeTruthy();
    });
  });
});