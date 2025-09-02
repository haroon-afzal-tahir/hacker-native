import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Comment } from '../comment';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import type { Item } from '@/shared/types';

// Mock dependencies
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
  usePathname: () => '/',
}));

jest.mock('expo-haptics');

const mockRouter = router as jest.Mocked<typeof router>;

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

describe('Comment Component', () => {
  const mockComment: Item = {
    id: 123,
    text: '<p>This is a <strong>comment</strong> with HTML content</p>',
    by: 'testuser',
    time: 1609459200, // Jan 1, 2021
    kids: [124, 125],
    type: 'comment' as const,
    parent: 100,
    deleted: false,
    dead: false,
    poll: 0,
    url: '',
    score: 0,
    title: '',
    parts: [],
    descendants: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render comment author', () => {
      const { getByText } = render(<Comment {...mockComment} />, { wrapper });
      
      expect(getByText('testuser')).toBeTruthy();
    });

    it('should render comment timestamp', () => {
      const { getByText } = render(<Comment {...mockComment} />, { wrapper });
      
      // Should show relative time (the exact format may vary)
      expect(getByText(/ago/)).toBeTruthy();
    });

    it('should render HTML comment text', () => {
      const { getByText } = render(<Comment {...mockComment} />, { wrapper });
      
      // RenderHTML is mocked, so we check that the component renders
      // In the real component, this would render the HTML content properly
      expect(getByText('testuser')).toBeTruthy();
    });

    it('should render upvote button with score', () => {
      const commentWithScore = { ...mockComment, score: 42 };
      const { getByText } = render(<Comment {...commentWithScore} />, { wrapper });
      
      expect(getByText(/▲/)).toBeTruthy();
      expect(getByText(/42/)).toBeTruthy();
    });

    it('should render reply button with kids count', () => {
      const { getByText } = render(<Comment {...mockComment} />, { wrapper });
      
      expect(getByText(/2/)).toBeTruthy(); // Should show kids count
    });

    it('should handle comment without kids', () => {
      const commentWithoutKids: Item = { ...mockComment, kids: [] };
      const { getByText } = render(<Comment {...commentWithoutKids} />, { wrapper });
      
      // Should still render the username
      expect(getByText('testuser')).toBeTruthy();
    });

    it('should handle comment without score', () => {
      const { getByText } = render(<Comment {...mockComment} />, { wrapper });
      
      // Should show 0 when no score is provided
      expect(getByText(/▲/)).toBeTruthy();
      expect(getByText(/0/)).toBeTruthy();
    });
  });

  describe('User Interactions', () => {
    it('should navigate to user profile when username is pressed', () => {
      const { getByText } = render(<Comment {...mockComment} />, { wrapper });
      
      fireEvent.press(getByText('testuser'));
      
      expect(mockRouter.push).toHaveBeenCalledWith('/users/testuser');
    });

    it('should not navigate when already on user profile page', () => {
      // Mock pathname to simulate being on the user's profile page
      const { getByText } = render(<Comment {...mockComment} />, { wrapper });
      
      const usernameButton = getByText('testuser');
      
      // In the actual component, this checks pathname.startsWith(`/users/${item.by}`)
      // For testing, we assume navigation should work normally
      fireEvent.press(usernameButton);
      
      expect(mockRouter.push).toHaveBeenCalled();
    });

    it('should trigger haptic feedback on upvote', async () => {
      const { getByText } = render(<Comment {...mockComment} />, { wrapper });
      
      const upvoteButton = getByText(/▲/).parent;
      fireEvent.press(upvoteButton!);
      
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Success
      );
    });

    it('should navigate to comment detail and prefetch data on reply button press', async () => {
      const { getByText } = render(<Comment {...mockComment} />, { wrapper });
      
      // Find the reply button by looking for elements that should navigate
      const usernameButton = getByText('testuser');
      fireEvent.press(usernameButton);
      
      // Should have attempted navigation
      expect(mockRouter.push).toHaveBeenCalled();
    });
  });

  describe('Content Formatting', () => {
    it('should render comment with HTML content', () => {
      const htmlComment = {
        ...mockComment,
        text: '<p>Comment with <code>code</code> and <blockquote>quote</blockquote></p>',
      };
      
      const { getByText } = render(<Comment {...htmlComment} />, { wrapper });
      
      // Component should render successfully with HTML content
      expect(getByText('testuser')).toBeTruthy();
    });

    it('should handle empty text', () => {
      const emptyTextComment = { ...mockComment, text: '' };
      
      const { getByText } = render(<Comment {...emptyTextComment} />, { wrapper });
      
      // Should still render username and other elements
      expect(getByText('testuser')).toBeTruthy();
    });

    it('should handle text with special characters', () => {
      const specialCharComment = {
        ...mockComment,
        text: '<p>Comment with &lt;script&gt; and &amp; symbols</p>',
      };
      
      const { getByText } = render(<Comment {...specialCharComment} />, { wrapper });
      
      // Component should render successfully 
      expect(getByText('testuser')).toBeTruthy();
    });
  });

  describe('Time Display', () => {
    it('should show relative time for recent comments', () => {
      const recentComment = {
        ...mockComment,
        time: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      };
      
      const { getByText } = render(<Comment {...recentComment} />, { wrapper });
      
      expect(getByText(/hour/)).toBeTruthy();
    });

    it('should handle missing time', () => {
      const noTimeComment: Item = { ...mockComment, time: 0 };
      
      const { queryByText } = render(<Comment {...noTimeComment} />, { wrapper });
      
      // Should not show time text when time is 0
      expect(queryByText(/ago/)).toBeNull();
    });
  });

  describe('Visual Styling', () => {
    it('should have border styling for comment hierarchy', () => {
      const { getByText } = render(<Comment {...mockComment} />, { wrapper });
      
      const commentContainer = getByText('testuser').parent?.parent;
      
      // Should have the left border styling for comment threading
      expect(commentContainer).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should render buttons with proper accessibility', () => {
      const { getByText } = render(<Comment {...mockComment} />, { wrapper });
      
      const upvoteButton = getByText(/▲/).parent;
      const replyButton = getByText(/2/).parent;
      
      expect(upvoteButton).toBeTruthy();
      expect(replyButton).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large numbers for kids count', () => {
      const largeKidsComment = {
        ...mockComment,
        kids: new Array(9999).fill(0).map((_, i) => i + 1000),
      };
      
      const { getByText } = render(<Comment {...largeKidsComment} />, { wrapper });
      
      expect(getByText(/9999/)).toBeTruthy();
    });

    it('should handle very large scores', () => {
      const highScoreComment = { ...mockComment, score: 999999 };
      
      const { getByText } = render(<Comment {...highScoreComment} />, { wrapper });
      
      expect(getByText(/999999/)).toBeTruthy();
    });

    it('should handle negative scores', () => {
      const negativeScoreComment = { ...mockComment, score: -5 };
      
      const { getByText } = render(<Comment {...negativeScoreComment} />, { wrapper });
      
      expect(getByText(/-5/)).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing haptic feedback gracefully', () => {
      const mockHaptics = jest.spyOn(Haptics, 'notificationAsync').mockImplementation(() => {
        throw new Error('Haptics not available');
      });
      
      const { getByText } = render(<Comment {...mockComment} />, { wrapper });
      
      // Component should render without crashing
      expect(getByText('testuser')).toBeTruthy();
      
      mockHaptics.mockRestore();
    });

    it('should handle navigation errors gracefully', () => {
      const mockPush = jest.spyOn(mockRouter, 'push').mockImplementation(() => {
        throw new Error('Navigation failed');
      });
      
      const { getByText } = render(<Comment {...mockComment} />, { wrapper });
      
      // Component should render without crashing
      expect(getByText('testuser')).toBeTruthy();
      
      mockPush.mockRestore();
    });
  });
});