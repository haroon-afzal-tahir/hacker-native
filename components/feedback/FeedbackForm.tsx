import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Star } from 'lucide-react-native';

import { Colors } from '@/constants/Colors';

interface FeedbackData {
  rating: number;
  comment: string;
  timestamp: number;
}

interface FeedbackFormProps {
  onSubmit?: (data: FeedbackData) => void;
  initialRating?: number;
  initialComment?: string;
  storageKey?: string;
  maxCommentLength?: number;
  showCharacterCount?: boolean;
}

const STORAGE_KEY = 'hacker_native_feedback';
const MAX_COMMENT_LENGTH = 500;

export const FeedbackForm: React.FC<FeedbackFormProps> = ({
  onSubmit,
  initialRating = 0,
  initialComment = '',
  storageKey = STORAGE_KEY,
  maxCommentLength = MAX_COMMENT_LENGTH,
  showCharacterCount = true,
}) => {
  const [rating, setRating] = useState<number>(initialRating);
  const [comment, setComment] = useState<string>(initialComment);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  // Load saved feedback on component mount
  useEffect(() => {
    loadSavedFeedback();
  }, [storageKey]);

  const loadSavedFeedback = useCallback(async () => {
    try {
      setIsLoading(true);
      const savedData = await AsyncStorage.getItem(storageKey);
      if (savedData) {
        const parsed: FeedbackData = JSON.parse(savedData);
        setRating(parsed.rating);
        setComment(parsed.comment || '');
      }
    } catch (error) {
      console.error('Failed to load saved feedback:', error);
    } finally {
      setIsLoading(false);
    }
  }, [storageKey]);

  const saveFeedback = useCallback(
    async (data: FeedbackData) => {
      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify(data));
        return true;
      } catch (error) {
        console.error('Failed to save feedback:', error);
        return false;
      }
    },
    [storageKey]
  );

  const handleRatingPress = useCallback((newRating: number) => {
    setRating(newRating);
    setMessage(null); // Clear any previous messages
  }, []);

  const handleCommentChange = useCallback((text: string) => {
    if (text.length <= maxCommentLength) {
      setComment(text);
      setMessage(null);
    }
  }, [maxCommentLength]);

  const validateForm = useCallback((): string | null => {
    if (rating === 0) {
      return 'Please select a star rating.';
    }
    if (comment.trim().length > maxCommentLength) {
      return `Comment must be less than ${maxCommentLength} characters.`;
    }
    return null;
  }, [rating, comment, maxCommentLength]);

  const handleSubmit = useCallback(async () => {
    const validationError = validateForm();
    if (validationError) {
      setMessage({ text: validationError, type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const feedbackData: FeedbackData = {
        rating,
        comment: comment.trim(),
        timestamp: Date.now(),
      };

      const saveSuccess = await saveFeedback(feedbackData);

      if (!saveSuccess) {
        throw new Error('Failed to save feedback to local storage');
      }

      // Call external onSubmit callback if provided
      if (onSubmit) {
        await onSubmit(feedbackData);
      }

      setMessage({
        text: 'Thank you for your feedback! It has been saved successfully.',
        type: 'success',
      });

      // Optionally clear form after successful submission
      // setRating(0);
      // setComment('');
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      setMessage({
        text: 'Failed to submit feedback. Please try again.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [rating, comment, validateForm, saveFeedback, onSubmit]);

  const handleClear = useCallback(async () => {
    Alert.alert(
      'Clear Feedback',
      'Are you sure you want to clear your feedback? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(storageKey);
              setRating(0);
              setComment('');
              setMessage({
                text: 'Feedback cleared successfully.',
                type: 'success',
              });
            } catch (error) {
              setMessage({
                text: 'Failed to clear feedback.',
                type: 'error',
              });
            }
          },
        },
      ]
    );
  }, [storageKey]);

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Pressable
          key={i}
          testID={`star-${i}`}
          style={styles.starButton}
          onPress={() => handleRatingPress(i)}
        >
          <Star
            size={32}
            color={i <= rating ? Colors.accent : '#d1d5db'}
            fill={i <= rating ? Colors.accent : 'transparent'}
          />
        </Pressable>
      );
    }
    return stars;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text testID="loading-text" style={styles.loadingText}>
          Loading saved feedback...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View testID="feedback-form" style={styles.formContainer}>
          <Text style={styles.title}>Share Your Feedback</Text>
          <Text style={styles.subtitle}>
            Help us improve Hacker Native by sharing your thoughts
          </Text>

          {/* Star Rating */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Rating <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.sectionDescription}>
              How would you rate your experience?
            </Text>
            <View testID="star-rating" style={styles.starsContainer}>
              {renderStars()}
            </View>
            {rating > 0 && (
              <Text testID="rating-text" style={styles.ratingText}>
                {rating} out of 5 stars
              </Text>
            )}
          </View>

          {/* Comment Section */}
          <View style={styles.section}>
            <View style={styles.commentHeader}>
              <Text style={styles.sectionTitle}>Comments</Text>
              <Text style={styles.optional}>(Optional)</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Tell us more about your experience or suggestions for improvement
            </Text>
            <TextInput
              testID="comment-input"
              style={styles.commentInput}
              placeholder="Share your thoughts here..."
              placeholderTextColor="#9ca3af"
              value={comment}
              onChangeText={handleCommentChange}
              multiline
              numberOfLines={4}
              maxLength={maxCommentLength}
              textAlignVertical="top"
            />
            {showCharacterCount && (
              <Text testID="character-count" style={styles.characterCount}>
                {comment.length}/{maxCommentLength} characters
              </Text>
            )}
          </View>

          {/* Message Display */}
          {message && (
            <View
              testID={`message-${message.type}`}
              style={[
                styles.messageContainer,
                message.type === 'error'
                  ? styles.errorMessage
                  : styles.successMessage,
              ]}
            >
              <Text
                testID="message-text"
                style={[
                  styles.messageText,
                  message.type === 'error'
                    ? styles.errorText
                    : styles.successText,
                ]}
              >
                {message.text}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Pressable
              testID="submit-button"
              style={[
                styles.submitButton,
                (isSubmitting || rating === 0) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting || rating === 0}
            >
              <Text
                style={[
                  styles.submitButtonText,
                  (isSubmitting || rating === 0) && styles.submitButtonTextDisabled,
                ]}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </Text>
            </Pressable>

            <Pressable
              testID="clear-button"
              style={styles.clearButton}
              onPress={handleClear}
              disabled={isSubmitting}
            >
              <Text style={styles.clearButtonText}>Clear</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  formContainer: {
    padding: 20,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: '#6b7280',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  required: {
    color: '#ef4444',
  },
  optional: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#ffffff',
    minHeight: 100,
    maxHeight: 150,
  },
  characterCount: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: 4,
  },
  messageContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  successMessage: {
    backgroundColor: '#dcfce7',
    borderColor: '#16a34a',
    borderWidth: 1,
  },
  errorMessage: {
    backgroundColor: '#fef2f2',
    borderColor: '#dc2626',
    borderWidth: 1,
  },
  messageText: {
    fontSize: 14,
    textAlign: 'center',
  },
  successText: {
    color: '#166534',
  },
  errorText: {
    color: '#dc2626',
  },
  buttonContainer: {
    gap: 12,
  },
  submitButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonTextDisabled: {
    color: '#9ca3af',
  },
  clearButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  clearButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '500',
  },
});