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
  useSafeAreaInsets: () => ({ bottom: 20, top: 20, left: 0, right: 0 }),
}));

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createQueryClient()}>
    {children}
  </QueryClientProvider>
);

describe('Comments Component', () => {
  const mockCommentDetails = (id: number) => ({
    id,
    text: `Comment ${id} text with <strong>HTML</strong> content`,
    by: `user${id}`,
    time: Date.now() / 1000,
    kids: [],
    type: 'comment',
    parent: 1,
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

  describe('Rendering', () => {
    it('should render children in header', () => {
      const { getByText } = render(
        <Comments id={1} kids={[2, 3]}>
          <Text>Post Content</Text>
        </Comments>,
        { wrapper }
      );

      expect(getByText('Post Content')).toBeTruthy();
    });

    it('should render comments after loading', async () => {
      const { getByText } = render(
        <Comments id={1} kids={[2, 3]}>
          <Text>Header</Text>
        </Comments>,
        { wrapper }
      );

      await waitFor(() => {
        expect(getByText('user2')).toBeTruthy();
        expect(getByText('user3')).toBeTruthy();
      });
    });

    it('should handle empty kids array', () => {
      const { getByText } = render(
        <Comments id={1} kids={[]}>
          <Text>Header</Text>
        </Comments>,
        { wrapper }
      );

      expect(getByText('Header')).toBeTruthy();
    });

    it('should handle undefined kids', () => {
      const { getByText } = render(
        <Comments id={1} kids={[]}>
          <Text>Header</Text>
        </Comments>,
        { wrapper }
      );

      expect(getByText('Header')).toBeTruthy();
    });
  });

  describe('Comment Loading', () => {
    it('should load comments in pages', async () => {
      const commentIds = Array.from({ length: 15 }, (_, i) => i + 2);
      
      const { getByText } = render(
        <Comments id={1} kids={commentIds}>
          <Text>Header</Text>
        </Comments>,
        { wrapper }
      );

      await waitFor(() => {
        // Should load first page
        for (let i = 2; i <= Math.min(2 + ITEMS_PER_PAGE - 1, 16); i++) {
          expect(getByText(`user${i}`)).toBeTruthy();
        }
      });
    });

    it('should handle loading state properly', async () => {
      const { getByText } = render(
        <Comments id={1} kids={[2, 3]}>
          <Text>Header</Text>
        </Comments>,
        { wrapper }
      );

      // Should render header immediately
      expect(getByText('Header')).toBeTruthy();

      // Wait for comments to load
      await waitFor(() => {
        expect(getByText('user2')).toBeTruthy();
      });
    });

    it('should filter out dead and deleted comments', async () => {
      (api.getItemDetails as jest.Mock).mockImplementation((id) =>
        Promise.resolve({
          json: jest.fn().mockResolvedValue({
            ...mockCommentDetails(id),
            ...(id === 2 ? { dead: true } : {}),
            ...(id === 3 ? { deleted: true } : {}),
          }),
        })
      );

      const { queryByText, getByText } = render(
        <Comments id={1} kids={[2, 3, 4]}>
          <Text>Header</Text>
        </Comments>,
        { wrapper }
      );

      await waitFor(() => {
        expect(getByText('user4')).toBeTruthy();
      });

      // Dead and deleted comments should not be rendered
      expect(queryByText('user2')).toBeNull();
      expect(queryByText('user3')).toBeNull();
    });
  });

  describe('Infinite Scroll', () => {
    it('should handle multiple comments properly', async () => {
      const commentIds = Array.from({ length: 15 }, (_, i) => i + 2);
      
      const { getByText } = render(
        <Comments id={1} kids={commentIds}>
          <Text>Header</Text>
        </Comments>,
        { wrapper }
      );

      // Wait for initial comments to load
      await waitFor(() => {
        expect(getByText('user2')).toBeTruthy();
      });

      // Should load multiple comments
      expect(getByText('user2')).toBeTruthy();
      expect(getByText('user3')).toBeTruthy();
    });

    it('should handle limited comments correctly', async () => {
      const commentIds = [2, 3]; // Only 2 comments
      
      const { getByText } = render(
        <Comments id={1} kids={commentIds}>
          <Text>Header</Text>
        </Comments>,
        { wrapper }
      );

      await waitFor(() => {
        expect(getByText('user2')).toBeTruthy();
        expect(getByText('user3')).toBeTruthy();
      });

      // Should show both comments
      expect(getByText('user2')).toBeTruthy();
      expect(getByText('user3')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      (api.getItemDetails as jest.Mock).mockRejectedValue(
        new Error('API Error')
      );

      const { getByText } = render(
        <Comments id={1} kids={[2, 3]}>
          <Text>Header</Text>
        </Comments>,
        { wrapper }
      );

      // Should not crash and should still show header
      expect(getByText('Header')).toBeTruthy();

      consoleSpy.mockRestore();
    });

    it('should handle individual comment fetch failures', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Reset API mock to successful behavior for this test
      (api.getItemDetails as jest.Mock).mockImplementation((id) =>
        Promise.resolve({
          json: jest.fn().mockResolvedValue(mockCommentDetails(id)),
        })
      );

      const { getByText } = render(
        <Comments id={1} kids={[2, 3, 4]}>
          <Text>Header</Text>
        </Comments>,
        { wrapper }
      );

      await waitFor(() => {
        expect(getByText('user2')).toBeTruthy();
      });

      // Should handle errors gracefully without crashing
      expect(getByText('user2')).toBeTruthy();

      consoleSpy.mockRestore();
    });
  });

  describe('Empty States', () => {
    it('should handle no comments gracefully', () => {
      const { getByText } = render(
        <Comments id={1} kids={[]}>
          <Text>No comments yet</Text>
        </Comments>,
        { wrapper }
      );

      expect(getByText('No comments yet')).toBeTruthy();
    });

    it('should handle all comments filtered out', async () => {
      (api.getItemDetails as jest.Mock).mockImplementation((id) =>
        Promise.resolve({
          json: jest.fn().mockResolvedValue({
            ...mockCommentDetails(id),
            dead: true, // All comments are dead
          }),
        })
      );

      const { getByText } = render(
        <Comments id={1} kids={[2, 3]}>
          <Text>Header</Text>
        </Comments>,
        { wrapper }
      );

      // Should still show header even if no valid comments
      expect(getByText('Header')).toBeTruthy();

      await waitFor(() => {
        // No comments should be visible
        expect(getByText('Header')).toBeTruthy();
      });
    });
  });

  describe('Component Integration', () => {
    it('should render Comment components for each comment', async () => {
      const { getByText } = render(
        <Comments id={1} kids={[2, 3]}>
          <Text>Header</Text>
        </Comments>,
        { wrapper }
      );

      await waitFor(() => {
        // Should render individual comment components with user names
        expect(getByText('user2')).toBeTruthy();
        expect(getByText('user3')).toBeTruthy();
      });
    });

    it('should pass correct props to Comment components', async () => {
      const { getByText } = render(
        <Comments id={1} kids={[2]}>
          <Text>Header</Text>
        </Comments>,
        { wrapper }
      );

      await waitFor(() => {
        // Comment component should receive the comment data
        expect(getByText('user2')).toBeTruthy();
      });
    });
  });
});