import { isFeatureOn, features, featurePrefix } from './featureFlags';

jest.mock('@/server/config', () => {
  const featureState: Record<string, boolean> = {};

  return {
    getConfig: () => ({
      featureFlags: {
        prefix: 'Feature_',
        getValue: (featureName: string): boolean => {
          return featureState[featureName] ?? false;
        },
      },
    }),
    __setFeatureValue: (name: string, value: boolean) => {
      featureState[name] = value;
    },
    __resetFeatureValues: () => {
      Object.keys(featureState).forEach((key) => delete featureState[key]);
    },
  };
});

const { __setFeatureValue, __resetFeatureValues } = jest.requireMock('@/server/config') as {
  __setFeatureValue: (name: string, value: boolean) => void;
  __resetFeatureValues: () => void;
};

describe('featureFlags', () => {
  afterEach(() => {
    __resetFeatureValues();
  });

  describe('features object', () => {
    it('contains the example feature', () => {
      expect(features.example).toBe('example');
    });

    it('contains the Profile feature', () => {
      expect(features.Profile).toBe('Profile');
    });

    it('contains the PALM_KB feature', () => {
      expect(features.PALM_KB).toBe('PALM_KB');
    });

    it('contains the DEEP_RESEARCH feature', () => {
      expect(features.DEEP_RESEARCH).toBe('DEEP_RESEARCH');
    });
  });

  describe('featurePrefix', () => {
    it('returns the configured prefix', () => {
      expect(featurePrefix).toBe('Feature_');
    });
  });

  describe('isFeatureOn', () => {
    it('returns true when a known feature is enabled', () => {
      __setFeatureValue('example', true);
      expect(isFeatureOn('example')).toBe(true);
    });

    it('returns false when a known feature is disabled', () => {
      __setFeatureValue('example', false);
      expect(isFeatureOn('example')).toBe(false);
    });

    it('returns false for an unknown feature key', () => {
      expect(isFeatureOn('nonExistentFeature')).toBe(false);
    });

    it('returns false for an empty string feature key', () => {
      expect(isFeatureOn('')).toBe(false);
    });

    it('returns true for Profile feature when enabled', () => {
      __setFeatureValue('Profile', true);
      expect(isFeatureOn('Profile')).toBe(true);
    });

    it('returns true for PALM_KB feature when enabled', () => {
      __setFeatureValue('PALM_KB', true);
      expect(isFeatureOn('PALM_KB')).toBe(true);
    });

    it('returns true for DEEP_RESEARCH feature when enabled', () => {
      __setFeatureValue('DEEP_RESEARCH', true);
      expect(isFeatureOn('DEEP_RESEARCH')).toBe(true);
    });

    it('returns false for features not in the features object even if config returns true', () => {
      __setFeatureValue('notInFeaturesObject', true);
      expect(isFeatureOn('notInFeaturesObject')).toBe(false);
    });
  });
});
