
'use client';

import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useState, useEffect } from 'react';

// 🚩 Feature Flags Configuration Interface
export interface FeatureFlags {
  // Core AI Features
  autoTranscription: boolean;
  sentimentAnalysis: boolean;
  speakerSeparation: boolean;
  buyerPersonaGeneration: boolean;
  aiFollowUps: boolean;
  smartAlerts: boolean;
  scheduledDelivery: boolean;
  voiceSummaries: boolean;

  // Analytics & Reporting
  sessionEngagementReports: boolean;
  productivityDashboard: boolean;
  clientObjectionsReport: boolean;
  advancedAnalytics: boolean;

  // Future Features (Stubs)
  emailIntegration: boolean;
  crmSyncing: boolean;
  agentLeaderboards: boolean;
  clientIntakeForms: boolean;
  aiSmartSummaryPanel: boolean;
  mobileOptimization: boolean;
  abTestingFramework: boolean;

  // Admin & QA Tools
  testRecordingSimulator: boolean;
  adminAuditTools: boolean;
  debugMode: boolean;
  qaUtilities: boolean;

  // Performance & Quality
  enhancedErrorLogging: boolean;
  performanceMonitoring: boolean;
  userFeedbackCollection: boolean;
  automaticQualityChecks: boolean;
}

// 🌟 Default Feature Flags Configuration
export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  // Core AI Features - Production Ready
  autoTranscription: true,
  sentimentAnalysis: true,
  speakerSeparation: true,
  buyerPersonaGeneration: true,
  aiFollowUps: true,
  smartAlerts: true,
  scheduledDelivery: true,
  voiceSummaries: false, // Beta feature

  // Analytics & Reporting - Production Ready
  sessionEngagementReports: true,
  productivityDashboard: true,
  clientObjectionsReport: true,
  advancedAnalytics: true,

  // Future Features - Development/Beta
  emailIntegration: false,
  crmSyncing: false,
  agentLeaderboards: false,
  clientIntakeForms: false,
  aiSmartSummaryPanel: false,
  mobileOptimization: true,
  abTestingFramework: false,

  // Admin & QA Tools - Development Only
  testRecordingSimulator: process.env.NODE_ENV === 'development',
  adminAuditTools: process.env.NODE_ENV === 'development',
  debugMode: process.env.NODE_ENV === 'development',
  qaUtilities: process.env.NODE_ENV === 'development',

  // Performance & Quality - Production Ready
  enhancedErrorLogging: true,
  performanceMonitoring: true,
  userFeedbackCollection: true,
  automaticQualityChecks: true,
};

// 🎛️ Feature Flags Hook for React Components
export function useFeatureFlags(): {
  flags: FeatureFlags;
  loading: boolean;
  updateFlag: (key: keyof FeatureFlags, value: boolean) => Promise<void>;
  isFeatureEnabled: (key: keyof FeatureFlags) => boolean;
  getEnabledFeatures: () => string[];
  getBetaFeatures: () => string[];
} {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FEATURE_FLAGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🚩 Initializing Feature Flags system...');

    const flagsRef = doc(db, 'appConfig', 'featureFlags');

    const unsubscribe = onSnapshot(flagsRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const firestoreFlags = docSnapshot.data() as Partial<FeatureFlags>;
        const mergedFlags = { ...DEFAULT_FEATURE_FLAGS, ...firestoreFlags };

        console.log('🚩 Feature Flags loaded from Firestore:', {
          enabled: Object.entries(mergedFlags).filter(([_, enabled]) => enabled).length,
          total: Object.keys(mergedFlags).length,
          betaFeatures: Object.entries(mergedFlags)
            .filter(([key, enabled]) => enabled && isBetaFeature(key))
            .map(([key]) => key)
        });

        setFlags(mergedFlags);
      } else {
        console.log('🚩 No feature flags found, creating defaults...');
        // Create default flags in Firestore if they don't exist
        setDoc(flagsRef, DEFAULT_FEATURE_FLAGS).catch(console.error);
        setFlags(DEFAULT_FEATURE_FLAGS);
      }
      setLoading(false);
    }, (error) => {
      console.error('❌ Error loading feature flags:', error);
      setFlags(DEFAULT_FEATURE_FLAGS);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const updateFlag = async (key: keyof FeatureFlags, value: boolean) => {
    try {
      console.log(`🚩 Updating feature flag: ${key} = ${value}`);

      const flagsRef = doc(db, 'appConfig', 'featureFlags');
      const currentDoc = await getDoc(flagsRef);
      const currentFlags = currentDoc.exists() ? currentDoc.data() as FeatureFlags : DEFAULT_FEATURE_FLAGS;

      const updatedFlags = { ...currentFlags, [key]: value };
      await setDoc(flagsRef, updatedFlags);

      console.log(`✅ Feature flag updated: ${key} = ${value}`);
    } catch (error) {
      console.error(`❌ Error updating feature flag ${key}:`, error);
      throw error;
    }
  };

  const isFeatureEnabled = (key: keyof FeatureFlags): boolean => {
    return flags[key];
  };

  const getEnabledFeatures = (): string[] => {
    return Object.entries(flags)
      .filter(([_, enabled]) => enabled)
      .map(([key]) => key);
  };

  const getBetaFeatures = (): string[] => {
    return Object.entries(flags)
      .filter(([key, enabled]) => enabled && isBetaFeature(key))
      .map(([key]) => key);
  };

  return {
    flags,
    loading,
    updateFlag,
    isFeatureEnabled,
    getEnabledFeatures,
    getBetaFeatures,
  };
}

// 🧪 Beta Feature Identification
const isBetaFeature = (key: string): boolean => {
  const betaFeatures = [
    'voiceSummaries',
    'emailIntegration',
    'crmSyncing',
    'agentLeaderboards',
    'clientIntakeForms',
    'aiSmartSummaryPanel',
    'abTestingFramework',
  ];
  return betaFeatures.includes(key);
};

// 🔧 Feature Flag Utilities for Backend
export class FeatureFlagManager {
  private static instance: FeatureFlagManager;
  private flags: FeatureFlags = DEFAULT_FEATURE_FLAGS;

  public static getInstance(): FeatureFlagManager {
    if (!FeatureFlagManager.instance) {
      FeatureFlagManager.instance = new FeatureFlagManager();
    }
    return FeatureFlagManager.instance;
  }

  public async loadFlags(): Promise<void> {
    try {
      const flagsRef = doc(db, 'appConfig', 'featureFlags');
      const docSnapshot = await getDoc(flagsRef);

      if (docSnapshot.exists()) {
        this.flags = { ...DEFAULT_FEATURE_FLAGS, ...docSnapshot.data() as Partial<FeatureFlags> };
      } else {
        await setDoc(flagsRef, DEFAULT_FEATURE_FLAGS);
        this.flags = DEFAULT_FEATURE_FLAGS;
      }
    } catch (error) {
      console.error('❌ Error loading feature flags:', error);
      this.flags = DEFAULT_FEATURE_FLAGS;
    }
  }

  public isEnabled(key: keyof FeatureFlags): boolean {
    return this.flags[key];
  }

  public getFlags(): FeatureFlags {
    return { ...this.flags };
  }

  public async enableFeature(key: keyof FeatureFlags): Promise<void> {
    await this.updateFlag(key, true);
  }

  public async disableFeature(key: keyof FeatureFlags): Promise<void> {
    await this.updateFlag(key, false);
  }

  private async updateFlag(key: keyof FeatureFlags, value: boolean): Promise<void> {
    try {
      const flagsRef = doc(db, 'appConfig', 'featureFlags');
      const updatedFlags = { ...this.flags, [key]: value };

      await setDoc(flagsRef, updatedFlags);
      this.flags = updatedFlags;
    } catch (error) {
      console.error(`❌ Error updating feature flag ${key}:`, error);
      throw error;
    }
  }
}

// 🎯 Feature-specific conditional rendering hook
export function useFeatureGate(featureKey: keyof FeatureFlags) {
  const { isFeatureEnabled, loading } = useFeatureFlags();

  return {
    isEnabled: isFeatureEnabled(featureKey),
    loading,
    FeatureGate: ({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) => {
      if (loading) return fallback;
      return isFeatureEnabled(featureKey) ? children : fallback;
    }
  };
}

// 📊 Feature Analytics & Usage Tracking
export const trackFeatureUsage = async (featureKey: keyof FeatureFlags, userId: string, metadata?: any) => {
  try {
    const usageRef = doc(db, 'featureUsage', `${featureKey}_${userId}_${Date.now()}`);
    await setDoc(usageRef, {
      feature: featureKey,
      userId: userId,
      timestamp: new Date(),
      metadata: metadata || {},
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      environment: process.env.NODE_ENV || 'unknown'
    });
  } catch (error) {
    console.error('❌ Error tracking feature usage:', error);
  }
};

// 🚨 Feature Flag Validation
export const validateFeatureFlags = (flags: Partial<FeatureFlags>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const flagKeys = Object.keys(DEFAULT_FEATURE_FLAGS) as Array<keyof FeatureFlags>;

  // Check for unknown flags
  Object.keys(flags).forEach(key => {
    if (!flagKeys.includes(key as keyof FeatureFlags)) {
      errors.push(`Unknown feature flag: ${key}`);
    }
  });

  // Check for type validation
  Object.entries(flags).forEach(([key, value]) => {
    if (typeof value !== 'boolean') {
      errors.push(`Invalid type for feature flag ${key}: expected boolean, got ${typeof value}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
};

// 🔄 Feature Flag Migration Utilities
export const migrateFeatureFlags = async (version: string): Promise<void> => {
  console.log(`🔄 Migrating feature flags to version ${version}...`);

  try {
    const flagsRef = doc(db, 'appConfig', 'featureFlags');
    const currentFlags = await getDoc(flagsRef);

    if (!currentFlags.exists()) {
      await setDoc(flagsRef, { ...DEFAULT_FEATURE_FLAGS, version });
      console.log('✅ Feature flags initialized with default configuration');
      return;
    }

    const existing = currentFlags.data() as FeatureFlags & { version?: string };
    const merged = { ...DEFAULT_FEATURE_FLAGS, ...existing, version };

    await setDoc(flagsRef, merged);
    console.log('✅ Feature flags migration completed');
  } catch (error) {
    console.error('❌ Error migrating feature flags:', error);
    throw error;
  }
};
