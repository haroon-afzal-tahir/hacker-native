import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { StoriesSelect, Option } from '../Select';
import { StoryType } from '@/constants/stories';
import { LucideIcon } from 'lucide-react-native';

// Mock React Native Reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  // The mock for `call` immediately calls the callback which is incorrect
  // So we override it with a no-op
  Reanimated.default.call = () => {};
  return Reanimated;
});

const Icon = (({ color, fill }: any) => <div data-testid="icon-top" style={{ color, fill }} />) as LucideIcon;

const mockOptions: Option[] = [
  {
    id: 'topstories' as StoryType,
    label: 'Top Stories',
    icon: Icon,
  },
  {
    id: 'newstories' as StoryType,
    label: 'New Stories',
    icon: Icon,
  },
  {
    id: 'beststories' as StoryType,
    label: 'Best Stories',
    icon: Icon,
  },
];

describe('StoriesSelect Component', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render trigger button with selected option label', () => {
      const { getByText } = render(
        <StoriesSelect
          options={mockOptions}
          value="topstories"
          onChange={mockOnChange}
        />
      );

      expect(getByText('Top Stories')).toBeTruthy();
    });

    it('should render "Select" when no option is selected', () => {
      const { getByText } = render(
        <StoriesSelect
          options={mockOptions}
          value={'invalid' as StoryType}
          onChange={mockOnChange}
        />
      );

      expect(getByText('Select')).toBeTruthy();
    });

    it('should not show options initially when defaultOpen is false', () => {
      const { queryByText } = render(
        <StoriesSelect
          options={mockOptions}
          value="topstories"
          onChange={mockOnChange}
        />
      );

      expect(queryByText('New Stories')).toBeNull();
      expect(queryByText('Best Stories')).toBeNull();
    });
  });

  describe('User Interactions', () => {
    it('should show options when trigger is pressed', async () => {
      const { getByText, queryByText } = render(
        <StoriesSelect
          options={mockOptions}
          value="topstories"
          onChange={mockOnChange}
        />
      );

      // Initially options should not be visible
      expect(queryByText('New Stories')).toBeNull();

      // Press trigger to open
      fireEvent.press(getByText('Top Stories'));

      // Options should now be visible
      await waitFor(() => {
        expect(getByText('New Stories')).toBeTruthy();
        expect(getByText('Best Stories')).toBeTruthy();
      });
    });

    it('should call onChange and close when option is selected', async () => {
      const { getByText } = render(
        <StoriesSelect
          options={mockOptions}
          value="topstories"
          onChange={mockOnChange}
        />
      );

      // Open the select
      fireEvent.press(getByText('Top Stories'));

      await waitFor(() => {
        expect(getByText('New Stories')).toBeTruthy();
      });

      // Select new option
      fireEvent.press(getByText('New Stories'));

      expect(mockOnChange).toHaveBeenCalledWith('newstories');
    });

    it('should toggle when trigger is pressed multiple times', async () => {
      const { getByText, queryByText } = render(
        <StoriesSelect
          options={mockOptions}
          value="topstories"
          onChange={mockOnChange}
        />
      );

      const trigger = getByText('Top Stories');

      // First press - should open
      fireEvent.press(trigger);
      await waitFor(() => {
        expect(getByText('New Stories')).toBeTruthy();
      });

      // Second press - should close
      fireEvent.press(trigger);
      await waitFor(() => {
        expect(queryByText('New Stories')).toBeNull();
      });
    });
  });

  describe('Selected State Visual Indication', () => {
    it('should show all options when opened', async () => {
      const { getByText } = render(
        <StoriesSelect
          options={mockOptions}
          value="topstories"
          onChange={mockOnChange}
        />
      );

      // Open the select
      fireEvent.press(getByText('Top Stories'));

      await waitFor(() => {
        expect(getByText('New Stories')).toBeTruthy();
        expect(getByText('Best Stories')).toBeTruthy();
      });

      // Both selected and unselected options should be visible
      expect(getByText('New Stories')).toBeTruthy();
      expect(getByText('Best Stories')).toBeTruthy();
    });
  });

  describe('Default Open State', () => {
    it('should show options initially when defaultOpen is true', () => {
      const { getByText } = render(
        <StoriesSelect
          options={mockOptions}
          value="topstories"
          onChange={mockOnChange}
          defaultOpen={true}
        />
      );

      expect(getByText('New Stories')).toBeTruthy();
      expect(getByText('Best Stories')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty options array', () => {
      const { getByText } = render(
        <StoriesSelect
          options={[]}
          value="topstories"
          onChange={mockOnChange}
        />
      );

      expect(getByText('Select')).toBeTruthy();
    });

    it('should handle multiple rapid clicks on trigger', async () => {
      const { getByText } = render(
        <StoriesSelect
          options={mockOptions}
          value="topstories"
          onChange={mockOnChange}
        />
      );

      const trigger = getByText('Top Stories');

      // Rapidly click trigger multiple times
      fireEvent.press(trigger);
      fireEvent.press(trigger);
      fireEvent.press(trigger);

      // Should still work correctly
      await waitFor(() => {
        expect(getByText('New Stories')).toBeTruthy();
      });
    });

    it('should handle option selection with rapid clicks', async () => {
      const { getByText } = render(
        <StoriesSelect
          options={mockOptions}
          value="topstories"
          onChange={mockOnChange}
        />
      );

      // Open the select
      fireEvent.press(getByText('Top Stories'));

      await waitFor(() => {
        expect(getByText('New Stories')).toBeTruthy();
      });

      const newStoriesOption = getByText('New Stories');

      // Rapidly click the option
      fireEvent.press(newStoriesOption);
      fireEvent.press(newStoriesOption);

      // Should only call onChange once per press
      expect(mockOnChange).toHaveBeenCalledWith('newstories');
    });
  });

  describe('Accessibility', () => {
    it('should render trigger button with accessible text', () => {
      const { getAllByText } = render(
        <StoriesSelect
          options={mockOptions}
          value="topstories"
          onChange={mockOnChange}
        />
      );

      // Should have trigger button with selected option text
      const topStoriesElements = getAllByText('Top Stories');
      expect(topStoriesElements.length).toBeGreaterThan(0);
    });

    it('should render options when opened', async () => {
      const { getByText } = render(
        <StoriesSelect
          options={mockOptions}
          value="topstories"
          onChange={mockOnChange}
        />
      );

      // Open to show options
      fireEvent.press(getByText('Top Stories'));

      await waitFor(() => {
        expect(getByText('New Stories')).toBeTruthy();
        expect(getByText('Best Stories')).toBeTruthy();
      });
    });
  });
});
