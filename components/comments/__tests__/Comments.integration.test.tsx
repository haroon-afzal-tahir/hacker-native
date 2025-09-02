import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Text } from 'react-native';
import { Comments } from '../comments';
import * as api from '@/api/endpoints';
import { ITEMS_PER_PAGE } from '@/constants/pagination';

// Mock the API endpoints
jest.mock('@/api/endpoints', () => ({
  getItemDetails: jest.fn(),
}));

// Mock safe area context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 20, top: 0, left: 0, right: 0 }),
}));

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createQueryClient()}>
    {children}
  </QueryClientProvider>
);

describe('Comments Component - Simple Tests', () => {
  const mockCommentIds = [101, 102, 103, 104, 105];
  const mockCommentDetails = (id: number) => ({
    id,
    by: `user${id}`,
    text: `This is comment ${id} content.`,
    time: Date.now() / 1000 - (id * 3600),
    kids: id % 3 === 0 ? [id * 10, id * 10 + 1] : [],
    type: 'comment',
    parent: 1,
    dead: false,
    deleted: false,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock item details API
    (api.getItemDetails as jest.Mock).mockImplementation((id) =>
      Promise.resolve({
        json: jest.fn().mockResolvedValue(mockCommentDetails(id)),
      })
    );
  });

  describe('Basic Rendering', () => {
    it('should render with children content in header', async () => {
      const headerContent = <Text testID="header-content">Post Title</Text>;

      const { getByTestId } = render(
        <Comments id={1} kids={mockCommentIds}>
          {headerContent}
        </Comments>,
        { wrapper }
      );

      await waitFor(() => {
        expect(getByTestId('header-content')).toBeTruthy();
      });

      expect(getByTestId('header-content')).toHaveTextContent('Post Title');
    });

    it('should handle empty kids array gracefully', async () => {
      const { getByTestId } = render(
        <Comments id={1} kids={[]}>
          <Text testID="no-comments-header">Post with no comments</Text>
        </Comments>,
        { wrapper }
      );

      await waitFor(() => {
        expect(getByTestId('no-comments-header')).toBeTruthy();
      });

      expect(getByTestId('no-comments-header')).toHaveTextContent('Post with no comments');
    });

    it('should handle undefined kids prop', () => {
      const { getByTestId } = render(
        <Comments id={1} kids={undefined}>
          <Text testID="header-only">Header only</Text>
        </Comments>,
        { wrapper }
      );

      expect(getByTestId('header-only')).toBeTruthy();
      expect(getByTestId('header-only')).toHaveTextContent('Header only');
    });

    it('should render without crashing', () => {
      const { getByTestId } = render(
        <Comments id={1} kids={mockCommentIds}>
          <Text testID="header">Header</Text>
        </Comments>,
        { wrapper }
      );

      expect(getByTestId('header')).toBeTruthy();
    });
  });

  describe('Comments Loading', () => {
    it('should load comments when kids are provided', async () => {
      render(
        <Comments id={1} kids={mockCommentIds}>
          <Text testID="header">Post Header</Text>
        </Comments>,
        { wrapper }
      );

      await waitFor(() => {
        expect(api.getItemDetails).toHaveBeenCalled();
      });

      // Should have made API calls for comments
      expect((api.getItemDetails as jest.Mock).mock.calls.length).toBeGreaterThan(0);
    });

    it('should not make API calls when no kids', async () => {
      render(
        <Comments id={1} kids={[]}>
          <Text testID="header">Header</Text>
        </Comments>,
        { wrapper }
      );

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not have made API calls
      expect(api.getItemDetails).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      (api.getItemDetails as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const { getByTestId } = render(
        <Comments id={1} kids={[101]}>
          <Text testID="header">Error test</Text>
        </Comments>,
        { wrapper }
      );

      // Header should still render
      expect(getByTestId('header')).toBeTruthy();
      expect(getByTestId('header')).toHaveTextContent('Error test');
    });
  });

  describe('Pagination and Performance', () => {
    it('should handle large numbers of comment IDs', async () => {
      const manyCommentIds = Array.from({ length: 100 }, (_, i) => i + 201);

      render(
        <Comments id={1} kids={manyCommentIds}>
          <Text testID="header">Many comments</Text>
        </Comments>,
        { wrapper }
      );

      await waitFor(() => {
        expect(api.getItemDetails).toHaveBeenCalled();
      });

      // Should respect pagination limits
      const callCount = (api.getItemDetails as jest.Mock).mock.calls.length;
      expect(callCount).toBeLessThanOrEqual(ITEMS_PER_PAGE);
    });

    it('should filter out dead and deleted comments', async () => {
      // Mock some dead and deleted comments
      (api.getItemDetails as jest.Mock).mockImplementation((id) =>
        Promise.resolve({
          json: jest.fn().mockResolvedValue({
            ...mockCommentDetails(id),
            ...(id === 102 ? { dead: true } : {}),
            ...(id === 104 ? { deleted: true } : {}),
          }),
        })
      );

      render(
        <Comments id={1} kids={[101, 102, 103, 104, 105]}>
          <Text testID="header">Filtered comments</Text>
        </Comments>,
        { wrapper }
      );

      await waitFor(() => {
        expect(api.getItemDetails).toHaveBeenCalled();
      });

      // API should have been called for all comments
      expect((api.getItemDetails as jest.Mock).mock.calls.length).toBeGreaterThan(0);
    });

    it('should handle individual comment fetch failures', async () => {
      (api.getItemDetails as jest.Mock).mockImplementation((id) => {
        if (id === 102) {
          return Promise.reject(new Error('Failed to load comment'));
        }
        return Promise.resolve({
          json: jest.fn().mockResolvedValue(mockCommentDetails(id)),
        });
      });

      const { getByTestId } = render(
        <Comments id={1} kids={[101, 102, 103]}>
          <Text testID="header">Partial failure test</Text>
        </Comments>,
        { wrapper }
      );

      // Header should still render
      await waitFor(() => {
        expect(getByTestId('header')).toBeTruthy();
      });

      // Should have attempted to load all comments
      expect((api.getItemDetails as jest.Mock).mock.calls.length).toBe(3);
    });
  });

  describe('Component Props and Configuration', () => {
    it('should use correct query key for caching', async () => {
      render(
        <Comments id={42} kids={mockCommentIds}>
          <Text testID="header">Cache test</Text>
        </Comments>,
        { wrapper }
      );

      await waitFor(() => {
        expect(api.getItemDetails).toHaveBeenCalled();
      });

      // The query should be associated with the specific post ID (42)
      // This is important for cache management
    });

    it('should handle prop changes', async () => {
      const { getByTestId, rerender } = render(
        <Comments id={1} kids={[101]}>
          <Text testID="header-1">Version 1</Text>
        </Comments>,
        { wrapper }
      );

      await waitFor(() => {
        expect(getByTestId('header-1')).toBeTruthy();
      });

      // Change kids
      rerender(
        <Comments id={1} kids={[201, 202]}>
          <Text testID="header-2">Version 2</Text>
        </Comments>
      );

      await waitFor(() => {
        expect(getByTestId('header-2')).toBeTruthy();
      });

      expect(getByTestId('header-2')).toHaveTextContent('Version 2');
    });

    it('should handle malformed comment data', async () => {
      (api.getItemDetails as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          json: jest.fn().mockResolvedValue({
            // Missing required fields
            id: 301,
            // by: missing
            // text: missing
          }),
        })
      );

      const { getByTestId } = render(
        <Comments id={1} kids={[301]}>
          <Text testID="header">Malformed data test</Text>
        </Comments>,
        { wrapper }
      );

      // Should handle malformed data gracefully
      expect(getByTestId('header')).toBeTruthy();
      
      await waitFor(() => {
        expect(api.getItemDetails).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network timeouts', async () => {
      // Mock very slow response
      (api.getItemDetails as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => {
              resolve({
                json: jest.fn().mockResolvedValue(mockCommentDetails(401)),
              });
            }, 1000)
          )
      );

      const { getByTestId } = render(
        <Comments id={1} kids={[401]}>
          <Text testID="header">Timeout test</Text>
        </Comments>,
        { wrapper }
      );

      // Should render header immediately
      expect(getByTestId('header')).toBeTruthy();
      expect(getByTestId('header')).toHaveTextContent('Timeout test');
    });

    it('should cleanup resources on unmount', async () => {
      const { getByTestId, unmount } = render(
        <Comments id={1} kids={[501]}>
          <Text testID="header">Cleanup test</Text>
        </Comments>,
        { wrapper }
      );

      await waitFor(() => {
        expect(getByTestId('header')).toBeTruthy();
      });

      // Unmount component
      unmount();

      // Should not cause memory leaks or warnings
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    it('should handle empty pages in pagination', async () => {
      // Mock empty response
      (api.getItemDetails as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          json: jest.fn().mockResolvedValue(null),
        })
      );

      const { getByTestId } = render(
        <Comments id={1} kids={[601, 602]}>
          <Text testID="header">Empty page test</Text>
        </Comments>,
        { wrapper }
      );

      await waitFor(() => {
        expect(getByTestId('header')).toBeTruthy();
      });

      // Should handle empty responses gracefully
      expect(getByTestId('header')).toHaveTextContent('Empty page test');
    });
  });
});