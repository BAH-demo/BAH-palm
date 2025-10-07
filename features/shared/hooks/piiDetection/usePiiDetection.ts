import { useState, useCallback } from 'react';

import { DetectedPii } from '@/features/shared/types/pii';
import { detectPii } from '@/features/shared/utils/piiDetectionHelpers';

export interface UsePiiDetectionResult {
  submitWithPiiCheck: (text: string, onSubmit: () => void | Promise<void>) => Promise<void>;
  isModalOpen: boolean;
  detectedPii: DetectedPii[];
  onContinue: () => void;
  onClose: () => void;
  isProcessing: boolean;
}

const suppressPiiDetectionCookie = 'ui:suppress-pii-warning';

export function usePiiDetection(): UsePiiDetectionResult {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detectedPii, setDetectedPii] = useState<DetectedPii[]>([]);
  const [pendingSubmit, setPendingSubmit] = useState<(() => void | Promise<void>) | null>(null);

  const submitWithPiiCheck = useCallback(async (
    text: string,
    onSubmit: () => void | Promise<void>
  ): Promise<void> => {
    setIsProcessing(true);
    
    try {
      const detectedPii = detectPii(text);
      const suppressWarning = localStorage.getItem(suppressPiiDetectionCookie) === 'true';
      
      if (detectedPii.length > 0 && !suppressWarning) {
        setDetectedPii(detectedPii);
        setIsModalOpen(true);
        setPendingSubmit(() => onSubmit);
      } else {
        await onSubmit();
      }
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const onContinue = useCallback(async () => {
    if (pendingSubmit) {
      await pendingSubmit();
      setPendingSubmit(null);
    }
    setIsModalOpen(false);
    setDetectedPii([]);
  }, [pendingSubmit]);

  const onClose = useCallback(() => {
    setIsModalOpen(false);
    setPendingSubmit(null);
    setDetectedPii([]);
  }, []);

  return {
    submitWithPiiCheck,
    isModalOpen,
    detectedPii,
    onContinue,
    onClose,
    isProcessing,
  };
}
