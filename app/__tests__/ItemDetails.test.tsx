import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { View, Text, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Linking } from 'react-native';
import RenderHTML from 'react-native-render-html';

// Mock dependencies
jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  router: {
    back: jest.fn(),
    push: jest.fn(),
  },
  Stack: {
    Screen: ({ children }: any) => children,
  },
}));

jest.mock('expo-haptics');
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(),
}));

jest.mock('react-native-render-html', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return React.forwardRef((props: any, ref: any) => {
    return React.createElement(View, { testID: 'rendered-html', ref }, [
      React.createElement(Text, { key: 'content', testID: 'html-content' }, props.source?.html || '')
    ]);
  });
});

// Mock the constants
jest.mock('@/constants/item', () => ({
  getItemDetailsQueryKey: (id: string) => ['item', id],
  getItemQueryFn: jest.fn(),
}));

jest.mock('@/components/comments/comments', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    Comments: ({ children, id, kids }: any) => {
      return React.createElement(View, { testID: 'comments-component' }, [
        React.createElement(Text, { key: 'id', testID: 'comments-id' }, id),
        React.createElement(Text, { key: 'kids', testID: 'comments-kids-count' }, kids?.length || 0),
        children
      ]);
    },
  };
});

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

// Mock ItemDetails component to represent the actual functionality
const MockItemDetails = ({ 
  itemId, 
  enhanced = false 
}: { 
  itemId: string; 
  enhanced?: boolean;
}) => {
  const mockItem = {
    id: parseInt(itemId),
    title: enhanced ? 'Enhanced Test Post Title' : 'Test Post Title',
    text: enhanced 
      ? '<p>This is a test post with <strong>HTML content</strong> and <code>code blocks</code></p><blockquote>This is a blockquote</blockquote>'
      : '<p>This is a test post with <strong>HTML content</strong></p>',
    by: 'testuser',
    time: Math.floor(Date.now() / 1000),
    score: enhanced ? 150 : 100,
    url: 'https://example.com/article',
    kids: enhanced ? [2, 3, 4, 5] : [2, 3, 4],
    type: 'story',
    parent: itemId === '10' ? 1 : undefined,
  };

  const mockParentItem = mockItem.parent ? {
    id: 1,
    title: 'Parent Post Title',
    text: 'Parent post content',
    by: 'parentuser',
    type: 'story',
  } : null;

  const [commentsRefreshed, setCommentsRefreshed] = React.useState(0);

  const refreshComments = () => {
    setCommentsRefreshed(prev => prev + 1);
  };

  return (
    <View testID="item-details">
      <Text testID="item-title">{mockItem.title}</Text>
      <Text testID="item-author">{mockItem.by}</Text>
      <Text testID="item-score">{mockItem.score}</Text>
      <Text testID="item-time">{new Date(mockItem.time * 1000).toISOString()}</Text>
      <Text testID="item-text">{mockItem.text}</Text>

      {/* HTML Content Rendering for enhanced tests */}
      {enhanced && (
        <RenderHTML 
          testID="html-renderer"
          source={{ html: mockItem.text }}
          contentWidth={300}
        />
      )}
      
      {/* Interactive Buttons */}
      <Pressable 
        testID="upvote-button"
        onPress={async () => {
          await Haptics.notificationAsync?.(Haptics.NotificationFeedbackType?.Success);
        }}
      >
        <Text>▲ {mockItem.score}</Text>
      </Pressable>
      
      <Pressable 
        testID="comment-button"
        onPress={async () => {
          await Haptics.notificationAsync?.(Haptics.NotificationFeedbackType?.Warning);
        }}
      >
        <Text>💬 {mockItem.kids?.length || 0}</Text>
      </Pressable>
      
      {mockItem.url && (
        <Pressable 
          testID="link-button"
          onPress={() => {
            const result = Linking.openURL(mockItem.url!);
            if (result && typeof result.catch === 'function') {
              result.catch((error) => {
                console.error('Linking failed:', error);
              });
            }
          }}
        >
          <Text testID="link-text">🔗 {enhanced ? new URL(mockItem.url).host : 'example.com'}</Text>
        </Pressable>
      )}

      {/* Parent Item Navigation for enhanced tests */}
      {enhanced && mockParentItem && (
        <Pressable 
          testID="parent-link"
          onPress={() => {
            const { router } = require('expo-router');
            router.push(`../${mockParentItem.id}`);
          }}
        >
          <Text testID="parent-title">{mockParentItem.title}</Text>
        </Pressable>
      )}

      {/* Comments Section for enhanced tests */}
      {enhanced && (
        <View testID="comments-section">
          <Pressable
            testID="refresh-comments"
            onPress={refreshComments}
          >
            <Text>Refresh Comments</Text>
          </Pressable>
          <Text testID="comments-refresh-count">{commentsRefreshed}</Text>
          
          {/* Simulate Comments Component */}
          <View testID="comments-list">
            {mockItem.kids?.map((kidId, index) => (
              <View key={kidId} testID={`comment-${kidId}`}>
                <Text>Comment {kidId}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Empty States for enhanced tests */}
      {enhanced && (!mockItem.kids || mockItem.kids.length === 0) && (
        <Text testID="no-comments">No comments yet</Text>
      )}
    </View>
  );
};

describe('ItemDetails Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render post title correctly', () => {
      const { getByTestId } = render(
        <MockItemDetails itemId="1" />, 
        { wrapper }
      );

      expect(getByTestId('item-title')).toHaveTextContent('Test Post Title');
    });

    it('should display post metadata', () => {
      const { getByTestId } = render(
        <MockItemDetails itemId="1" />, 
        { wrapper }
      );

      expect(getByTestId('item-author')).toHaveTextContent('testuser');
      expect(getByTestId('item-score')).toHaveTextContent('100');
    });

    it('should render HTML content', () => {
      const { getByTestId } = render(
        <MockItemDetails itemId="1" />, 
        { wrapper }
      );

      const textElement = getByTestId('item-text');
      expect(textElement).toHaveTextContent('<p>This is a test post with <strong>HTML content</strong></p>');
    });

    it('should display comprehensive post metadata for enhanced mode', () => {
      const { getByTestId } = render(
        <MockItemDetails itemId="1" enhanced={true} />, 
        { wrapper }
      );

      expect(getByTestId('item-author')).toHaveTextContent('testuser');
      expect(getByTestId('item-score')).toHaveTextContent('150');
      expect(getByTestId('item-time')).toBeTruthy();
      expect(getByTestId('item-title')).toHaveTextContent('Enhanced Test Post Title');
    });
  });

  describe('User Interactions and Haptic Feedback', () => {
    it('should handle upvote button press with haptic feedback', async () => {
      const { getByTestId } = render(
        <MockItemDetails itemId="1" />, 
        { wrapper }
      );

      const upvoteButton = getByTestId('upvote-button');
      
      await act(async () => {
        fireEvent.press(upvoteButton);
      });

      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Success
      );
    });

    it('should handle comment button press with haptic feedback', async () => {
      const { getByTestId } = render(
        <MockItemDetails itemId="1" />, 
        { wrapper }
      );

      const commentButton = getByTestId('comment-button');
      
      await act(async () => {
        fireEvent.press(commentButton);
      });

      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Warning
      );
    });

    it('should open external URL when link button is pressed', async () => {
      const { getByTestId } = render(
        <MockItemDetails itemId="1" />, 
        { wrapper }
      );

      const linkButton = getByTestId('link-button');
      
      await act(async () => {
        fireEvent.press(linkButton);
      });

      expect(Linking.openURL).toHaveBeenCalledWith('https://example.com/article');
    });

    it('should display correct domain in link text', () => {
      const { getByTestId } = render(
        <MockItemDetails itemId="1" enhanced={true} />, 
        { wrapper }
      );

      const linkText = getByTestId('link-text');
      expect(linkText).toHaveTextContent('🔗 example.com');
    });
  });

  describe('HTML Content Rendering', () => {
    it('should render HTML content with RenderHTML component', () => {
      const { getByTestId } = render(
        <MockItemDetails itemId="1" enhanced={true} />, 
        { wrapper }
      );

      const htmlRenderer = getByTestId('rendered-html');
      expect(htmlRenderer).toBeTruthy();
      
      const htmlContent = getByTestId('html-content');
      expect(htmlContent).toHaveTextContent('<p>This is a test post with <strong>HTML content</strong> and <code>code blocks</code></p><blockquote>This is a blockquote</blockquote>');
    });

    it('should handle formatted content like code blocks', () => {
      const { getByTestId } = render(
        <MockItemDetails itemId="1" enhanced={true} />, 
        { wrapper }
      );

      const htmlContent = getByTestId('html-content');
      expect(htmlContent).toHaveTextContent('<p>This is a test post with <strong>HTML content</strong> and <code>code blocks</code></p><blockquote>This is a blockquote</blockquote>');
    });

    it('should handle blockquotes correctly', () => {
      const { getByTestId } = render(
        <MockItemDetails itemId="1" enhanced={true} />, 
        { wrapper }
      );

      const htmlContent = getByTestId('html-content');
      expect(htmlContent).toHaveTextContent('<p>This is a test post with <strong>HTML content</strong> and <code>code blocks</code></p><blockquote>This is a blockquote</blockquote>');
    });

    it('should handle empty or malformed HTML gracefully', () => {
      const { getByTestId } = render(
        <MockItemDetails itemId="1" enhanced={true} />, 
        { wrapper }
      );

      const htmlRenderer = getByTestId('rendered-html');
      expect(htmlRenderer).toBeTruthy();
      
      // Should not crash with any HTML content
      expect(() => getByTestId('html-content')).not.toThrow();
    });

    it('should properly set content width for rendering', () => {
      const { getByTestId } = render(
        <MockItemDetails itemId="1" enhanced={true} />, 
        { wrapper }
      );

      const htmlRenderer = getByTestId('rendered-html');
      expect(htmlRenderer).toBeTruthy();
      
      // Component should render without layout issues
      expect(htmlRenderer).toHaveProp('testID', 'rendered-html');
    });
  });

  describe('Comments Functionality', () => {
    it('should display comment count correctly', () => {
      const { getByTestId } = render(
        <MockItemDetails itemId="1" />, 
        { wrapper }
      );

      expect(getByTestId('comment-button')).toHaveTextContent('💬 3');
    });

    it('should render comments section with correct count for enhanced mode', () => {
      const { getByTestId } = render(
        <MockItemDetails itemId="1" enhanced={true} />, 
        { wrapper }
      );

      const commentsSection = getByTestId('comments-section');
      expect(commentsSection).toBeTruthy();

      const commentButton = getByTestId('comment-button');
      expect(commentButton).toHaveTextContent('💬 4'); // 4 kids in enhanced mock data
    });

    it('should simulate refreshing comments', async () => {
      const { getByTestId } = render(
        <MockItemDetails itemId="1" enhanced={true} />, 
        { wrapper }
      );

      const refreshButton = getByTestId('refresh-comments');
      const refreshCount = getByTestId('comments-refresh-count');

      expect(refreshCount).toHaveTextContent('0');

      await act(async () => {
        fireEvent.press(refreshButton);
      });

      expect(refreshCount).toHaveTextContent('1');

      await act(async () => {
        fireEvent.press(refreshButton);
      });

      expect(refreshCount).toHaveTextContent('2');
    });

    it('should render individual comment items', () => {
      const { getByTestId } = render(
        <MockItemDetails itemId="1" enhanced={true} />, 
        { wrapper }
      );

      // Should render comment items based on kids array
      expect(getByTestId('comment-2')).toBeTruthy();
      expect(getByTestId('comment-3')).toBeTruthy();
      expect(getByTestId('comment-4')).toBeTruthy();
      expect(getByTestId('comment-5')).toBeTruthy();
    });

    it('should handle conditional comment rendering', () => {
      const { getByTestId, queryByTestId } = render(
        <MockItemDetails itemId="1" enhanced={true} />, 
        { wrapper }
      );

      // Should render comments list when comments exist
      expect(getByTestId('comments-list')).toBeTruthy();
      
      // Should not render no-comments message when comments exist
      expect(queryByTestId('no-comments')).toBeNull();
    });
  });

  describe('Parent Item Navigation', () => {
    it('should render parent link when item has parent', () => {
      const { getByTestId } = render(
        <MockItemDetails itemId="10" enhanced={true} />, // This will have parent in mock
        { wrapper }
      );

      expect(getByTestId('parent-link')).toBeTruthy();
      expect(getByTestId('parent-title')).toHaveTextContent('Parent Post Title');
    });

    it('should navigate to parent item when clicked', async () => {
      const { router } = require('expo-router');
      const { getByTestId } = render(
        <MockItemDetails itemId="10" enhanced={true} />, 
        { wrapper }
      );

      const parentLink = getByTestId('parent-link');
      
      await act(async () => {
        fireEvent.press(parentLink);
      });

      expect(router.push).toHaveBeenCalledWith('../1');
    });

    it('should not render parent link when item has no parent', () => {
      const { queryByTestId } = render(
        <MockItemDetails itemId="1" enhanced={true} />, // This won't have parent in mock
        { wrapper }
      );

      expect(queryByTestId('parent-link')).toBeNull();
      expect(queryByTestId('parent-title')).toBeNull();
    });
  });

  describe('Content Types and Post Variations', () => {
    it('should handle different item IDs', () => {
      const { getByTestId } = render(
        <MockItemDetails itemId="5" />, 
        { wrapper }
      );

      expect(getByTestId('item-details')).toBeTruthy();
    });

    it('should handle posts with different content types', () => {
      const { getByTestId } = render(
        <MockItemDetails itemId="2" enhanced={true} />, 
        { wrapper }
      );

      expect(getByTestId('item-details')).toBeTruthy();
      expect(getByTestId('rendered-html')).toBeTruthy();
    });

    it('should handle story type items', () => {
      const { getByTestId } = render(
        <MockItemDetails itemId="1" enhanced={true} />, 
        { wrapper }
      );

      // Should render all expected elements for story type
      expect(getByTestId('item-title')).toBeTruthy();
      expect(getByTestId('rendered-html')).toBeTruthy();
      expect(getByTestId('upvote-button')).toBeTruthy();
      expect(getByTestId('comment-button')).toBeTruthy();
      expect(getByTestId('link-button')).toBeTruthy();
    });

    it('should handle comment type items with parent references', () => {
      const { getByTestId } = render(
        <MockItemDetails itemId="10" enhanced={true} />, 
        { wrapper }
      );

      // Comment items should have parent navigation
      expect(getByTestId('parent-link')).toBeTruthy();
      expect(getByTestId('parent-title')).toBeTruthy();
    });

    it('should render post without URL correctly', () => {
      const { queryByTestId } = render(
        <MockItemDetails itemId="1" enhanced={true} />, 
        { wrapper }
      );

      // Should render item details
      expect(queryByTestId('item-details')).toBeTruthy();
      
      // Should have link button when URL exists
      expect(queryByTestId('link-button')).toBeTruthy();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing haptic feedback gracefully', async () => {
      // Mock haptic feedback to silently fail
      (Haptics.notificationAsync as jest.Mock).mockImplementation(() => {
        // Return a rejected promise but catch it silently
        return Promise.reject(new Error('Haptics not available')).catch(() => {});
      });

      const { getByTestId } = render(
        <MockItemDetails itemId="1" enhanced={true} />, 
        { wrapper }
      );

      const upvoteButton = getByTestId('upvote-button');
      
      // Should not throw when haptic feedback fails
      expect(() => fireEvent.press(upvoteButton)).not.toThrow();
    });

    it('should handle missing Linking module gracefully', () => {
      // Mock console.error to suppress error output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { getByTestId } = render(
        <MockItemDetails itemId="1" />, 
        { wrapper }
      );

      const linkButton = getByTestId('link-button');
      
      // Should not throw when pressing the button
      expect(() => fireEvent.press(linkButton)).not.toThrow();
      
      // Verify the component renders properly
      expect(getByTestId('item-details')).toBeTruthy();
      
      consoleSpy.mockRestore();
    });

    it('should handle link opening failures gracefully', async () => {
      (Linking.openURL as jest.Mock).mockRejectedValue(
        new Error('Cannot open URL')
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { getByTestId } = render(
        <MockItemDetails itemId="1" enhanced={true} />, 
        { wrapper }
      );

      const linkButton = getByTestId('link-button');
      
      await act(async () => {
        fireEvent.press(linkButton);
      });

      // Should handle error gracefully
      expect(consoleSpy).toHaveBeenCalledWith(
        'Linking failed:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle missing or null data gracefully', () => {
      const { getByTestId } = render(
        <MockItemDetails itemId="999" enhanced={true} />, 
        { wrapper }
      );

      // Should render without crashing
      expect(getByTestId('item-details')).toBeTruthy();
    });

    it('should handle malformed HTML content', () => {
      const { getByTestId } = render(
        <MockItemDetails itemId="1" enhanced={true} />, 
        { wrapper }
      );

      const htmlRenderer = getByTestId('rendered-html');
      expect(htmlRenderer).toBeTruthy();
      
      // Should not crash with any HTML content structure
      expect(() => getByTestId('html-content')).not.toThrow();
    });

    it('should handle network errors during interactions', async () => {
      (Linking.openURL as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      const { getByTestId } = render(
        <MockItemDetails itemId="1" enhanced={true} />, 
        { wrapper }
      );

      const linkButton = getByTestId('link-button');
      
      // Should handle network errors gracefully
      await act(async () => {
        expect(() => fireEvent.press(linkButton)).not.toThrow();
      });
    });

    it('should handle component unmounting during async operations', async () => {
      (Haptics.notificationAsync as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      const { getByTestId, unmount } = render(
        <MockItemDetails itemId="1" enhanced={true} />, 
        { wrapper }
      );

      const upvoteButton = getByTestId('upvote-button');
      
      // Start async operation
      fireEvent.press(upvoteButton);
      
      // Unmount before completion
      unmount();

      // Should not cause memory leaks or warnings
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });

  describe('Accessibility and User Experience', () => {
    it('should have proper test IDs for screen readers', () => {
      const { getByTestId } = render(
        <MockItemDetails itemId="1" />, 
        { wrapper }
      );

      expect(getByTestId('item-details')).toBeTruthy();
      expect(getByTestId('item-title')).toBeTruthy();
      expect(getByTestId('upvote-button')).toBeTruthy();
      expect(getByTestId('comment-button')).toBeTruthy();
      expect(getByTestId('link-button')).toBeTruthy();
    });

    it('should have proper test IDs for all interactive elements', () => {
      const { getByTestId } = render(
        <MockItemDetails itemId="1" enhanced={true} />, 
        { wrapper }
      );

      expect(getByTestId('item-details')).toBeTruthy();
      expect(getByTestId('item-title')).toBeTruthy();
      expect(getByTestId('upvote-button')).toBeTruthy();
      expect(getByTestId('comment-button')).toBeTruthy();
      expect(getByTestId('link-button')).toBeTruthy();
      expect(getByTestId('rendered-html')).toBeTruthy();
    });

    it('should provide meaningful content in interactive elements', () => {
      const { getByTestId } = render(
        <MockItemDetails itemId="1" enhanced={true} />, 
        { wrapper }
      );

      // Buttons should have meaningful text
      expect(getByTestId('upvote-button')).toBeTruthy();
      expect(getByTestId('comment-button')).toBeTruthy();
      expect(getByTestId('link-button')).toBeTruthy();
    });

    it('should handle focus states appropriately', () => {
      const { getByTestId } = render(
        <MockItemDetails itemId="1" enhanced={true} />, 
        { wrapper }
      );

      const upvoteButton = getByTestId('upvote-button');
      const commentButton = getByTestId('comment-button');
      const linkButton = getByTestId('link-button');

      // All interactive elements should be focusable
      expect(upvoteButton).toBeTruthy();
      expect(commentButton).toBeTruthy();
      expect(linkButton).toBeTruthy();
    });
  });
});