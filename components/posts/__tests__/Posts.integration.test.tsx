import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Posts } from '../Posts';
import * as api from '@/api/endpoints';
import { ITEMS_PER_PAGE } from '@/constants/pagination';

// Mock the API endpoints
jest.mock('@/api/endpoints', () => ({
  getItemDetails: jest.fn(),
}));

jest.mock('@/constants/stories', () => ({
  StoryType: 'topstories',
  MAP_STORY_TYPE_TO_STORY_ENDPOINTS: {
    topstories: jest.fn(),
    newstories: jest.fn(),
    beststories: jest.fn(),
  },
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

describe('Posts Component - Simple Tests', () => {
  const mockStoryIds = Array.from({ length: 30 }, (_, i) => i + 1);
  const mockStoryDetails = (id: number) => ({
    id,
    title: `Test Story ${id}`,
    by: `user${id}`,
    time: Date.now() / 1000,
    score: id * 10,
    url: `https://example.com/story${id}`,
    descendants: id * 2,
    kids: [],
    type: 'story',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the story list endpoint
    const { MAP_STORY_TYPE_TO_STORY_ENDPOINTS } = require('@/constants/stories');
    MAP_STORY_TYPE_TO_STORY_ENDPOINTS.topstories.mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockStoryIds),
    });

    // Mock item details
    (api.getItemDetails as jest.Mock).mockImplementation((id) =>
      Promise.resolve({
        json: jest.fn().mockResolvedValue(mockStoryDetails(id)),
      })
    );
  });

  describe('Basic Rendering', () => {
    it('should render without crashing', async () => {
      const { getByTestId } = render(<Posts storyType="topstories" />, { wrapper });
      
      await waitFor(() => {
        expect(getByTestId('flat-list')).toBeTruthy();
      });
    });

    it('should load and display posts', async () => {
      const { getByText } = render(<Posts storyType="topstories" />, { wrapper });

      await waitFor(() => {
        expect(getByText('Test Story 1')).toBeTruthy();
      });

      // Should load first page of posts
      expect(getByText('Test Story 1')).toBeTruthy();
    });

    it('should filter out dead and deleted posts', async () => {
      // Mock with dead and deleted posts
      (api.getItemDetails as jest.Mock).mockImplementation((id) =>
        Promise.resolve({
          json: jest.fn().mockResolvedValue({
            ...mockStoryDetails(id),
            ...(id === 2 ? { dead: true } : {}),
            ...(id === 3 ? { deleted: true } : {}),
          }),
        })
      );

      const { queryByText, getByText } = render(
        <Posts storyType="topstories" />,
        { wrapper }
      );

      await waitFor(() => {
        expect(getByText('Test Story 1')).toBeTruthy();
      });

      // Dead and deleted posts should not be rendered
      expect(queryByText('Test Story 2')).toBeNull();
      expect(queryByText('Test Story 3')).toBeNull();
      
      // Other posts should be visible
      expect(getByText('Test Story 4')).toBeTruthy();
    });
  });

  describe('API Integration', () => {
    it('should make API calls for initial load', async () => {
      const { getByText } = render(<Posts storyType="topstories" />, { wrapper });

      await waitFor(() => {
        expect(getByText('Test Story 1')).toBeTruthy();
      });

      // Should have made API calls
      expect((api.getItemDetails as jest.Mock).mock.calls.length).toBeGreaterThan(0);
    });

    it('should handle API errors gracefully', async () => {
      // Mock API error
      const { MAP_STORY_TYPE_TO_STORY_ENDPOINTS } = require('@/constants/stories');
      MAP_STORY_TYPE_TO_STORY_ENDPOINTS.topstories.mockRejectedValue(
        new Error('Network error')
      );

      const { queryByText, getByTestId } = render(
        <Posts storyType="topstories" />,
        { wrapper }
      );

      // Should render FlatList without crashing
      expect(getByTestId('flat-list')).toBeTruthy();
      
      // Should not show any posts
      expect(queryByText('Test Story 1')).toBeNull();
    });

    it('should handle story type changes', async () => {
      const { MAP_STORY_TYPE_TO_STORY_ENDPOINTS } = require('@/constants/stories');
      
      MAP_STORY_TYPE_TO_STORY_ENDPOINTS.newstories.mockResolvedValue({
        json: jest.fn().mockResolvedValue([101, 102, 103]),
      });

      const { rerender, getByText, queryByText } = render(
        <Posts storyType="topstories" />,
        { wrapper }
      );

      await waitFor(() => {
        expect(getByText('Test Story 1')).toBeTruthy();
      });

      // Change story type
      (api.getItemDetails as jest.Mock).mockImplementation((id) =>
        Promise.resolve({
          json: jest.fn().mockResolvedValue({
            ...mockStoryDetails(id),
            title: `New Story ${id}`,
          }),
        })
      );

      rerender(<Posts storyType="newstories" />);

      await waitFor(() => {
        expect(getByText('New Story 101')).toBeTruthy();
      });

      // Old stories should be gone
      expect(queryByText('Test Story 1')).toBeNull();
    });
  });

  describe('Performance and Data Handling', () => {
    it('should handle large datasets efficiently', async () => {
      // Mock large dataset
      const largeStoryIds = Array.from({ length: 500 }, (_, i) => i + 1);
      const { MAP_STORY_TYPE_TO_STORY_ENDPOINTS } = require('@/constants/stories');
      MAP_STORY_TYPE_TO_STORY_ENDPOINTS.topstories.mockResolvedValue({
        json: jest.fn().mockResolvedValue(largeStoryIds),
      });

      const { getByText, getByTestId } = render(
        <Posts storyType="topstories" />,
        { wrapper }
      );

      await waitFor(() => {
        expect(getByText('Test Story 1')).toBeTruthy();
      });

      // Should only load first page initially
      expect(getByTestId('flat-list')).toBeTruthy();
      
      // Should not crash with large dataset
      const callCount = (api.getItemDetails as jest.Mock).mock.calls.length;
      expect(callCount).toBeLessThanOrEqual(ITEMS_PER_PAGE);
    });

    it('should handle empty story list', async () => {
      // Mock empty story list
      const { MAP_STORY_TYPE_TO_STORY_ENDPOINTS } = require('@/constants/stories');
      MAP_STORY_TYPE_TO_STORY_ENDPOINTS.topstories.mockResolvedValue({
        json: jest.fn().mockResolvedValue([]),
      });

      const { getByTestId, queryByText } = render(
        <Posts storyType="topstories" />,
        { wrapper }
      );

      await waitFor(() => {
        expect(getByTestId('flat-list')).toBeTruthy();
      });

      // Should not show any stories
      expect(queryByText('Test Story 1')).toBeNull();
    });

    it('should handle malformed data gracefully', async () => {
      // Mock malformed response
      (api.getItemDetails as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          json: jest.fn().mockResolvedValue(null),
        })
      );

      const { getByTestId } = render(
        <Posts storyType="topstories" />,
        { wrapper }
      );

      // Should not crash with malformed data
      await waitFor(() => {
        expect(getByTestId('flat-list')).toBeTruthy();
      });
    });
  });

  describe('Component Configuration', () => {
    it('should use correct FlatList configuration', async () => {
      const { getByTestId } = render(
        <Posts storyType="topstories" />,
        { wrapper }
      );

      await waitFor(() => {
        expect(getByTestId('flat-list')).toBeTruthy();
      });

      const flatList = getByTestId('flat-list');
      
      // Should have proper configuration
      expect(flatList).toHaveProp('onEndReachedThreshold', 0.5);
      expect(flatList).toHaveProp('contentContainerStyle', { flexGrow: 1 });
    });

    it('should render with proper test IDs', async () => {
      const { getByTestId } = render(
        <Posts storyType="topstories" />,
        { wrapper }
      );

      await waitFor(() => {
        expect(getByTestId('flat-list')).toBeTruthy();
      });

      // Should have the correct testID
      expect(getByTestId('flat-list')).toBeTruthy();
    });
  });

  describe('Individual Post Component Integration', () => {
    it('should render post titles correctly', async () => {
      const { getByText } = render(
        <Posts storyType="topstories" />,
        { wrapper }
      );

      await waitFor(() => {
        expect(getByText('Test Story 1')).toBeTruthy();
        expect(getByText('Test Story 2')).toBeTruthy();
      });
    });

    it('should display post scores in each post', async () => {
      const { getByText, getAllByText } = render(
        <Posts storyType="topstories" />,
        { wrapper }
      );

      await waitFor(() => {
        // Scores should be rendered with upvote arrow - use getAllByText since multiple posts
        const tenElements = getAllByText(/10/);
        const twentyElements = getAllByText(/20/);
        expect(tenElements.length).toBeGreaterThan(0);
        expect(twentyElements.length).toBeGreaterThan(0);
        const upvoteElements = getAllByText(/▲/);
        expect(upvoteElements.length).toBeGreaterThan(0);
      });
    });

    it('should display comment counts correctly', async () => {
      const { getAllByText } = render(
        <Posts storyType="topstories" />,
        { wrapper }
      );

      await waitFor(() => {
        // Comment counts should match mock data (kids array is empty in mock)
        const zeroElements = getAllByText('0');
        expect(zeroElements.length).toBeGreaterThan(0); // Multiple posts with 0 comments
      });
    });

    it('should handle posts with zero comments', async () => {
      // Mock story with no comments
      const mockStoryNoComments = {
        id: 99,
        title: 'Story with No Comments',
        url: 'https://example.com/no-comments',
        score: 50,
        by: 'author',
        time: 1640995200,
        kids: [], // No comments
        type: 'story'
      };

      (api.getItemDetails as jest.Mock).mockImplementation((id) => {
        if (id === 99) {
          return Promise.resolve({
            json: jest.fn().mockResolvedValue(mockStoryNoComments),
          });
        }
        return Promise.resolve({
          json: jest.fn().mockResolvedValue(mockStoryDetails(id)),
        });
      });

      // Mock endpoint to return our no-comments story
      const { MAP_STORY_TYPE_TO_STORY_ENDPOINTS } = require('@/constants/stories');
      MAP_STORY_TYPE_TO_STORY_ENDPOINTS.topstories.mockResolvedValue({
        json: jest.fn().mockResolvedValue([99]),
      });

      const { getByText } = render(
        <Posts storyType="topstories" />,
        { wrapper }
      );

      await waitFor(() => {
        expect(getByText('Story with No Comments')).toBeTruthy();
        expect(getByText('0')).toBeTruthy(); // Zero comments
      });
    });

    it('should render external link domains when available', async () => {
      const { getAllByText } = render(
        <Posts storyType="topstories" />,
        { wrapper }
      );

      await waitFor(() => {
        // Should show domain from URL - use getAllByText since multiple posts
        const domainElements = getAllByText('example.com');
        expect(domainElements.length).toBeGreaterThan(0);
      });
    });

    it('should handle posts without URLs gracefully', async () => {
      // Mock story without URL
      const mockStoryNoUrl = {
        id: 98,
        title: 'Story Without URL',
        score: 30,
        by: 'author',
        time: 1640995200,
        kids: [1, 2],
        type: 'story'
        // No URL property
      };

      (api.getItemDetails as jest.Mock).mockImplementation((id) => {
        if (id === 98) {
          return Promise.resolve({
            json: jest.fn().mockResolvedValue(mockStoryNoUrl),
          });
        }
        return Promise.resolve({
          json: jest.fn().mockResolvedValue(mockStoryDetails(id)),
        });
      });

      // Mock endpoint to return our no-URL story
      const { MAP_STORY_TYPE_TO_STORY_ENDPOINTS } = require('@/constants/stories');
      MAP_STORY_TYPE_TO_STORY_ENDPOINTS.topstories.mockResolvedValue({
        json: jest.fn().mockResolvedValue([98]),
      });

      const { getByText, queryByText } = render(
        <Posts storyType="topstories" />,
        { wrapper }
      );

      await waitFor(() => {
        expect(getByText('Story Without URL')).toBeTruthy();
        // Should not render any domain since there's no URL
        expect(queryByText('example.com')).toBeNull();
      });
    });

    it('should handle posts with different scores correctly', async () => {
      const { getByText, getAllByText } = render(
        <Posts storyType="topstories" />,
        { wrapper }
      );

      await waitFor(() => {
        // Should render different scores correctly
        const tenElements = getAllByText(/10/);
        const twentyElements = getAllByText(/20/);
        expect(tenElements.length).toBeGreaterThan(0);
        expect(twentyElements.length).toBeGreaterThan(0);
        
        // All should have upvote arrows
        const upvoteElements = getAllByText(/▲/);
        expect(upvoteElements.length).toBeGreaterThan(0);
      });
    });

    it('should handle zero and negative scores', async () => {
      // Mock stories with edge case scores
      const mockZeroScoreStory = {
        id: 97,
        title: 'Zero Score Story',
        url: 'https://example.com/zero',
        score: 0,
        by: 'author',
        time: 1640995200,
        kids: [],
        type: 'story'
      };

      const mockNegativeScoreStory = {
        id: 96,
        title: 'Negative Score Story',
        url: 'https://example.com/negative',
        score: -5,
        by: 'author',
        time: 1640995200,
        kids: [1],
        type: 'story'
      };

      (api.getItemDetails as jest.Mock).mockImplementation((id) => {
        if (id === 97) return Promise.resolve({
          json: jest.fn().mockResolvedValue(mockZeroScoreStory),
        });
        if (id === 96) return Promise.resolve({
          json: jest.fn().mockResolvedValue(mockNegativeScoreStory),
        });
        return Promise.resolve({
          json: jest.fn().mockResolvedValue(mockStoryDetails(id)),
        });
      });

      // Mock endpoint to return edge case stories
      const { MAP_STORY_TYPE_TO_STORY_ENDPOINTS } = require('@/constants/stories');
      MAP_STORY_TYPE_TO_STORY_ENDPOINTS.topstories.mockResolvedValue({
        json: jest.fn().mockResolvedValue([97, 96]),
      });

      const { getByText } = render(
        <Posts storyType="topstories" />,
        { wrapper }
      );

      await waitFor(() => {
        expect(getByText('Zero Score Story')).toBeTruthy();
        expect(getByText('Negative Score Story')).toBeTruthy();
        expect(getByText(/^0$/)).toBeTruthy(); // Zero score
        expect(getByText(/-5/)).toBeTruthy(); // Negative score
      });
    });

    it('should handle very long post titles', async () => {
      const longTitle = 'This is a very long post title that should be handled gracefully by the component without breaking the layout or causing any rendering issues';
      
      const mockLongTitleStory = {
        id: 95,
        title: longTitle,
        url: 'https://example.com/long',
        score: 42,
        by: 'author',
        time: 1640995200,
        kids: [1, 2, 3],
        type: 'story'
      };

      (api.getItemDetails as jest.Mock).mockImplementation((id) => {
        if (id === 95) return Promise.resolve({
          json: jest.fn().mockResolvedValue(mockLongTitleStory),
        });
        return Promise.resolve({
          json: jest.fn().mockResolvedValue(mockStoryDetails(id)),
        });
      });

      const { MAP_STORY_TYPE_TO_STORY_ENDPOINTS } = require('@/constants/stories');
      MAP_STORY_TYPE_TO_STORY_ENDPOINTS.topstories.mockResolvedValue({
        json: jest.fn().mockResolvedValue([95]),
      });

      const { getByText } = render(
        <Posts storyType="topstories" />,
        { wrapper }
      );

      await waitFor(() => {
        expect(getByText(longTitle)).toBeTruthy();
        expect(getByText(/42/)).toBeTruthy();
        expect(getByText('3')).toBeTruthy(); // Comment count
      });
    });

    it('should handle posts with complex URL domains', async () => {
      const mockComplexUrlStory = {
        id: 94,
        title: 'Story with Complex URL',
        url: 'https://subdomain.complex-site.co.uk/path/to/article?param=value&another=param#section',
        score: 75,
        by: 'author',
        time: 1640995200,
        kids: [1],
        type: 'story'
      };

      (api.getItemDetails as jest.Mock).mockImplementation((id) => {
        if (id === 94) return Promise.resolve({
          json: jest.fn().mockResolvedValue(mockComplexUrlStory),
        });
        return Promise.resolve({
          json: jest.fn().mockResolvedValue(mockStoryDetails(id)),
        });
      });

      const { MAP_STORY_TYPE_TO_STORY_ENDPOINTS } = require('@/constants/stories');
      MAP_STORY_TYPE_TO_STORY_ENDPOINTS.topstories.mockResolvedValue({
        json: jest.fn().mockResolvedValue([94]),
      });

      const { getByText } = render(
        <Posts storyType="topstories" />,
        { wrapper }
      );

      await waitFor(() => {
        expect(getByText('Story with Complex URL')).toBeTruthy();
        expect(getByText('subdomain.complex-site.co.uk')).toBeTruthy();
      });
    });
  });
});