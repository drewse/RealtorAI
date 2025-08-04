
/**
 * FIRESTORE DATABASE SCHEMA DOCUMENTATION - ENHANCED WITH CLIENT MANAGEMENT & SMART ALERTS
 * 
 * This file documents the complete Firestore database structure for ShowAI.
 * Use this as reference when implementing Firebase operations or GPT-4 integrations.
 */

// =============================================================================
// COLLECTION: /agentNote
// =============================================================================
// Stores notes for agent
export interface AgentNote {
  id: string;                          // Unique identifier for the note
  content: string;                     // Note content (max 1000 chars)
  type: 'insight' | 'action-item' | 'objection' | 'general';
  createdAt: FirebaseFirestore.Timestamp;
  createdBy: string;                   // User ID of the creator
  source?: 'manual' | 'ai-generated';  // Optional note origin

  // Optional links
  linkedRecording?: string;           // Associated recording ID (if any)
  linkedProperty?: string;            // Associated property ID (if any)

  // AI enhancement fields
  aiSummary?: string;
  sentimentScore?: number;            // Range from -1 to 1
  urgencyLevel?: 'low' | 'medium' | 'high';
}

// =============================================================================
// COLLECTION: /users/{uid}
// =============================================================================
// Stores user-specific settings and preferences
export interface UserDocument {
  uid: string;                    // Firebase Auth UID
  email: string;                  // User email from Firebase Auth
  openaiApiKey?: string;          // OpenAI API key (encrypted in production)
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  
  // Optional user preferences
  preferences?: {
    defaultTranscriptionLanguage?: string;
    autoGenerateFollowUp?: boolean;
    emailSignature?: string;
    timezone?: string;
    voiceSynthesisProvider?: 'google' | 'elevenlabs';
    defaultScheduleDelay?: number; // Minutes after recording to schedule follow-up
  };
}

// =============================================================================
// COLLECTION: /clients/{clientId} - NEW: CLIENT MANAGEMENT SYSTEM
// =============================================================================
// Comprehensive client management with preferences, notes, and smart matching
export interface ClientDocument {
  id: string;                     // Auto-generated document ID
  userId: string;                 // Owner's Firebase Auth UID
  
  // Basic client information
  name: string;                   // Client's full name (REQUIRED)
  email?: string;                 // Client's email address
  phone?: string;                 // Client's phone number
  
  // Client status and engagement
  status: 'Active' | 'Cold' | 'Hot Lead'; // Lead status for prioritization
  lastInteraction?: FirebaseFirestore.Timestamp; // Last contact/activity date
  totalInteractions: number;      // Count of all interactions (recordings + notes)
  averageSentiment?: 'positive' | 'neutral' | 'negative'; // Overall interaction sentiment
  
  // Categorization and tagging
  tags: string[];                 // Custom tags for categorization
  
  // Property preferences for smart matching
  preferences: ClientPreferences;
  
  // Notes and timeline
  notes: ClientNote[];            // Agent-added notes and observations
  
  // Relationship tracking
  linkedRecordings: string[];     // Recording IDs associated with this client
  linkedProperties: string[];     // Property IDs they've viewed/inquired about
  
  // Timestamps
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp;
}

// NEW: Client property preferences for smart matching
export interface ClientPreferences {
  // Budget constraints
  priceRange: {
    min: number;                  // Minimum budget
    max: number;                  // Maximum budget
  };
  
  // Location preferences
  preferredAreas: string[];       // Preferred neighborhoods/areas
  avoidAreas?: string[];          // Areas to avoid
  
  // Property specifications
  propertyTypes: string[];        // Preferred property types
  bedrooms: {
    min: number;                  // Minimum bedrooms
    max: number;                  // Maximum bedrooms
  };
  bathrooms: {
    min: number;                  // Minimum bathrooms  
    max: number;                  // Maximum bathrooms
  };
  
  // Desired features and amenities
  features: string[];             // Must-have features
  dealBreakers?: string[];        // Features they absolutely don't want
  
  // Timeline and urgency
  urgency: 'low' | 'medium' | 'high'; // How urgent their search is
  timeframe?: string;             // When they want to buy/rent
  
  // Additional preferences
  parking?: boolean;              // Parking required?
  petFriendly?: boolean;          // Need pet-friendly properties?
  accessibility?: boolean;        // Accessibility requirements?
}

// NEW: Agent notes system for recordings, properties, and clients
export interface ClientNote {
  id: string;                     // Unique note identifier
  content: string;                // Note content (max 1000 chars)
  type: 'insight' | 'action-item' | 'objection' | 'general'; // Note categorization
  createdAt: FirebaseFirestore.Timestamp; // When note was created
  createdBy: string;              // User ID who created the note
  source?: 'manual' | 'ai-generated'; // How the note was created
  
  // Optional associations
  linkedRecording?: string;       // Associated recording ID
  linkedProperty?: string;        // Associated property ID
  
  // AI enhancement
  aiSummary?: string;             // AI-generated summary of note
  sentimentScore?: number;        // AI-analyzed sentiment (-1 to 1)
  urgencyLevel?: 'low' | 'medium' | 'high'; // AI-determined urgency
}

// =============================================================================
// COLLECTION: /alerts/{alertId} - NEW: SMART ALERT SYSTEM
// =============================================================================
// Smart property-client matching alerts with scoring
export interface AlertDocument {
  id: string;                     // Auto-generated document ID
  userId: string;                 // Owner's Firebase Auth UID
  
  // Alert type and targeting
  type: 'property-match' | 'price-drop' | 'status-change' | 'follow-up-reminder';
  
  // Property-Client matching (for property-match type)
  clientId?: string;              // Client ID for property matches
  propertyId?: string;            // Property ID that triggered the match
  
  // Smart matching analysis
  matchScore: number;             // Match percentage (0-100)
  matchReasons: string[];         // Why this property matches (e.g., "Budget match", "Preferred area")
  confidenceLevel: 'low' | 'medium' | 'high'; // AI confidence in the match
  
  // Alert metadata
  timestamp: FirebaseFirestore.Timestamp; // When alert was generated
  read: boolean;                  // Whether agent has seen the alert
  dismissed?: boolean;            // Whether agent dismissed the alert
  actionTaken?: string;           // What action was taken (e.g., "Contacted client", "Scheduled showing")
  
  // Alert content
  title: string;                  // Alert title/headline
  description?: string;           // Detailed alert description
  priority: 'low' | 'medium' | 'high' | 'urgent'; // Alert priority level
  
  // Timestamps
  createdAt: FirebaseFirestore.Timestamp;
  expiresAt?: FirebaseFirestore.Timestamp; // When alert becomes irrelevant
}

// =============================================================================
// COLLECTION: /recordings/{recordingId} - ENHANCED WITH SESSION ANALYTICS
// =============================================================================
// Core recording data with advanced AI-generated content, analysis, and engagement metrics
export interface RecordingDocument {
  id: string;                     // Auto-generated document ID
  uid: string;                    // Owner's Firebase Auth UID
  
  // Audio and metadata
  audioPath: string;              // Firebase Storage path to audio file
  createdAt: FirebaseFirestore.Timestamp;
  
  // Client information (from form input)
  clientName: string;             // Required: Client's full name
  clientEmail?: string;           // Optional: Client's email
  clientPhone?: string;           // Optional: Client's phone number
  clientId?: string;              // NEW: Link to client document if exists
  
  // Categorization and linking
  tags: string[];                 // Array of comma-separated tags
  propertyId?: string;            // Reference to linked property document
  propertyAddress?: string;       // Cached property address for quick display
  
  // Processing status tracking
  status: 'uploaded' | 'transcribed' | 'follow-up-ready' | 'error';
  
  // ENHANCED: Advanced transcription and AI analysis
  transcript?: string;            // Speech-to-text result
  transcriptSegments?: TranscriptSegment[]; // NEW: Segmented transcript with speakers
  sentimentMap?: SentimentAnalysis[]; // NEW: Sentence-level sentiment analysis
  keywordAnalysis?: KeywordFrequency[]; // NEW: Top keywords with relevance scoring
  speakers?: string[];            // NEW: Identified speakers ['Agent', 'Client', 'Client2']
  overallSentiment?: 'positive' | 'neutral' | 'negative'; // NEW: Overall conversation sentiment
  
  // ENHANCED: Follow-up generation and customization
  followUpTone?: 'friendly' | 'professional' | 'direct' | 'action-oriented'; // NEW: Selected tone
  aiFollowUpDraft?: FollowUpContent; // NEW: Original AI-generated content
  aiFollowUpFinal?: FollowUpContent; // NEW: Final version after agent edits
  editedByAgent?: boolean;        // NEW: Flag indicating agent modifications
  
  // NEW: Scheduled Follow-up Management
  scheduledFollowUp?: ScheduledFollowUp; // NEW: Follow-up scheduling data
  
  // NEW: Buyer Persona Generation
  buyerPersona?: BuyerPersona;    // NEW: AI-generated buyer profile
  
  // NEW: Voice Summary Audio Files
  voiceSummaries?: VoiceSummaries; // NEW: Generated audio summaries
  
  // NEW: Session Engagement Analytics
  engagementReport?: EngagementReport; // NEW: Comprehensive session analytics
  
  // NEW: Agent notes for this recording
  agentNotes: AgentNote[];        // NEW: Notes added by the agent
  
  // Legacy AI-generated content (for backward compatibility)
  summary?: string;               // GPT-4 generated summary of preferences + objections
  smsText?: string;               // GPT-4 generated SMS follow-up
  emailText?: string;             // GPT-4 generated email follow-up
  
  // Advanced AI analysis
  sentiment?: 'positive' | 'neutral' | 'negative';
  urgencyLevel?: 'low' | 'medium' | 'high';
  keyTopics?: string[];
  
  // Error handling
  errorMessage?: string;          // If status is 'error', store error details
}

// NEW: Session Engagement Report for Analytics
export interface EngagementReport {
  totalDuration: number;          // Session duration in seconds
  distinctSpeakers: number;       // Number of different speakers identified
  sentimentBreakdown: {           // Detailed sentiment distribution
    positive: number;             // Count of positive segments
    neutral: number;              // Count of neutral segments
    negative: number;             // Count of negative segments
  };
  engagementRating: 'low' | 'medium' | 'high'; // Overall engagement assessment
  keywordsDetected: string[];     // Most frequently mentioned keywords
  questionsAsked: string[];       // Questions asked by client
  actionItems: string[];          // Extracted action items and next steps
  analysisScore: number;          // Overall analysis score (0-100)
  generatedAt: FirebaseFirestore.Timestamp; // When report was generated
  
  // Advanced metrics
  speakingTimeRatio?: {           // Speaking time analysis
    agent: number;                // Percentage of time agent spoke
    client: number;               // Percentage of time client spoke
  };
  interactionDensity?: number;    // Number of speaker switches per minute
  topicTransitions?: number;      // Number of topic changes during session
  clientQuestionRate?: number;    // Questions per minute by client
  positiveIndicators?: string[];  // Phrases indicating client interest
  concernIndicators?: string[];   // Phrases indicating client concerns
}

// =============================================================================
// COLLECTION: /agentStats/{userId} - NEW: AGENT PRODUCTIVITY TRACKING
// =============================================================================
// Aggregated statistics for agent productivity dashboard
export interface AgentStatsDocument {
  userId: string;                 // Firebase Auth UID
  
  // Recording and session metrics
  totalRecordings: number;        // Total number of recordings made
  avgEngagementScore: number;     // Average engagement score across all sessions
  totalSessionTime: number;       // Total time spent in recording sessions (minutes)
  avgSessionDuration: number;     // Average session duration (minutes)
  
  // Follow-up and client interaction metrics
  followUpsSent: number;          // Number of follow-ups delivered
  followUpsScheduled: number;     // Number of follow-ups scheduled
  followUpResponseRate?: number;  // Response rate to follow-ups (if tracked)
  
  // Client conversion and relationship metrics
  clientsConverted: number;       // Number of clients marked as converted
  totalClients: number;           // Total number of unique clients
  hotLeads: number;               // Number of hot leads currently active
  activeClients: number;          // Number of currently active clients
  
  // Content and note-taking metrics
  notesWritten: number;           // Total number of agent notes created
  avgNotesPerClient: number;      // Average notes per client
  insightNotes: number;           // Number of insight-type notes
  actionItemNotes: number;        // Number of action-item notes
  
  // Objection handling analysis
  objectionsHandled: { [objection: string]: number }; // Objection types and counts
  topObjectionCategories: string[]; // Most common objection categories
  objectionResolutionRate?: number; // Success rate in handling objections
  
  // Property and market activity
  propertiesByStatus: {
    active: number;               // Number of active property listings
    comingSoon: number;           // Number of coming soon properties
    sold: number;                 // Number of sold properties
  };
  avgPropertiesPerClient: number; // Average properties shown per client
  propertyShowingRate: number;    // Properties shown per week/month
  
  // Time-based performance tracking
  last30Days: {
    recordings: number;           // Recordings in last 30 days
    followUps: number;            // Follow-ups in last 30 days
    clients: number;              // New clients in last 30 days
    avgEngagement: number;        // Average engagement in last 30 days
    totalSessionTime: number;     // Total session time in last 30 days
  };
  last90Days: {
    recordings: number;           // Recordings in last 90 days
    followUps: number;            // Follow-ups in last 90 days
    clients: number;              // New clients in last 90 days
    avgEngagement: number;        // Average engagement in last 90 days
    totalSessionTime: number;     // Total session time in last 90 days
  };
  
  // Performance trends
  performanceTrend: 'improving' | 'stable' | 'declining'; // Overall trend analysis
  engagementTrend: 'up' | 'down' | 'stable'; // Engagement score trend
  clientGrowthRate: number;       // Monthly client growth rate percentage
  
  // Quality metrics
  avgClientSatisfaction?: number; // If client feedback is collected (1-5 scale)
  repeatClientRate?: number;      // Percentage of clients who return
  referralRate?: number;          // Percentage of clients who provide referrals
  
  // Timestamps and metadata
  lastCalculated: FirebaseFirestore.Timestamp; // When stats were last updated
  calculationFrequency: 'daily' | 'weekly' | 'monthly'; // How often stats are recalculated
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp;
}

// =============================================================================
// COLLECTION: /objectionReports/{reportId} - NEW: OBJECTION ANALYSIS TRACKING
// =============================================================================
// Comprehensive objection analysis for organizational insights
export interface ObjectionReportDocument {
  id: string;                     // Auto-generated document ID
  userId: string;                 // Owner's Firebase Auth UID (individual agent)
  organizationId?: string;        // Optional: Organization ID for team-wide analysis
  
  // Report metadata
  reportType: 'individual' | 'team' | 'organization'; // Scope of the report
  timeframe: {
    startDate: FirebaseFirestore.Timestamp; // Report start date
    endDate: FirebaseFirestore.Timestamp;   // Report end date
    period: '30_days' | '90_days' | '6_months' | '1_year' | 'custom'; // Time period
  };
  
  // Objection categorization and analysis
  totalObjections: number;        // Total number of objections identified
  objectionCategories: {
    priceObjections: ObjectionCategoryData;     // Price-related concerns
    locationObjections: ObjectionCategoryData;  // Location and area concerns
    sizeObjections: ObjectionCategoryData;      // Property size concerns
    conditionObjections: ObjectionCategoryData; // Property condition issues
    timingObjections: ObjectionCategoryData;    // Market timing concerns
    featureObjections: ObjectionCategoryData;   // Missing features/amenities
    otherObjections: ObjectionCategoryData;     // Miscellaneous objections
  };
  
  // Trend analysis
  trends: {
    increasingConcerns: string[];  // Objections that are becoming more common
    decreasingConcerns: string[]; // Objections that are becoming less common
    seasonalPatterns?: { [month: string]: ObjectionCategoryData[]; }; // Monthly patterns
    emergingObjections: string[]; // New objection types not seen before
  };
  
  // Source analysis (where objections come from)
  objectionSources: {
    aiFollowUps: number;          // Objections identified from AI follow-ups
    agentNotes: number;           // Objections from manual agent notes
    clientFeedback: number;       // Direct client feedback
    transcriptAnalysis: number;   // Objections extracted from transcripts
  };
  
  // Resolution and handling analysis
  handlingEffectiveness: {
    resolvedObjections: number;   // Successfully addressed objections
    unresolved: number;           // Objections still requiring attention
    conversionRate: number;       // Clients who converted despite objections
    averageHandlingTime?: number; // Time to address objections (in days)
  };
  
  // Recommendations and insights
  recommendations: {
    trainingAreas: string[];      // Suggested training topics for agents
    processImprovements: string[]; // Suggested process changes
    marketingAdjustments: string[]; // Suggested marketing strategy changes
    propertyAdjustments: string[]; // Suggested property positioning changes
  };
  
  // Report generation metadata
  generatedAt: FirebaseFirestore.Timestamp; // When report was generated
  generatedBy: 'automated' | 'manual' | 'scheduled'; // How report was created
  reportVersion: string;          // Version of analysis algorithm used
  dataQuality: {
    completeness: number;         // Percentage of complete data (0-100)
    confidence: number;           // AI confidence in analysis (0-100)
    sampleSize: number;           // Number of sessions analyzed
  };
}

// Supporting interface for objection category data
export interface ObjectionCategoryData {
  count: number;                  // Number of objections in this category
  percentage: number;             // Percentage of total objections
  examples: string[];             // Sample objection texts
  severity: 'low' | 'medium' | 'high'; // Impact severity
  trend: 'increasing' | 'decreasing' | 'stable'; // Trend direction
  averageImpact?: number;         // Impact on conversion (0-100)
  commonPhrases: string[];        // Most common phrases in this category
  relatedKeywords: string[];      // Keywords associated with this objection type
}

// =============================================================================
// COLLECTION: /properties/{propertyId} - ENHANCED WITH NOTES AND SMART MATCHING
// =============================================================================
// Enhanced property listings with comprehensive details, images, history tracking, and notes
export interface PropertyDocument {
  id: string;                     // Auto-generated document ID
  userId: string;                 // Owner's Firebase Auth UID
  
  // Basic property information (REQUIRED)
  address: string;                // Full property address
  price: number;                  // Listing price in dollars
  bedrooms: number;               // Number of bedrooms
  bathrooms: number;              // Number of bathrooms (can be decimal: 2.5)
  sqft: number;                   // Square footage
  propertyType: string;           // "Single Family" | "Condo" | "Townhouse" | "Multi-Family" | "Other"
  status: 'Active' | 'Coming Soon' | 'Sold'; // Property listing status
  
  // Enhanced property details (OPTIONAL)
  description?: string;           // Property description (max 500 chars)
  lotSize?: number;               // Lot size in square feet
  yearBuilt?: number;             // Year the property was built (4-digit year)
  parking?: string;               // Parking description (e.g., "2-car garage", "Street parking")
  propertyFeatures: string[];     // Array of selected features
  mlsNumber?: string;             // MLS listing number
  
  // Media and images
  images: string[];               // Array of Firebase Storage URLs for property images
  
  // NEW: Property Status History Tracking
  statusHistory: PropertyStatusHistory[]; // NEW: Complete history of changes
  priceHistory: PropertyPriceHistory[];   // NEW: Price change tracking
  
  // NEW: Agent notes for this property
  agentNotes: AgentNote[];        // NEW: Notes added by agents
  
  // Client tracking (legacy - consider moving to separate collection)
  clients: ClientInfo[];          // Array of clients who viewed this property
  
  // NEW: Smart matching data
  interestedClients?: string[];   // Client IDs who match this property
  viewingHistory: PropertyViewing[]; // NEW: Track who viewed when
  
  // Timestamps
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp;
  
  // Calculated fields (computed from recordings collection)
  // Note: These are calculated in real-time, not stored
  recordingCount?: number;        // Number of linked recordings (computed)
  averageClientSentiment?: 'positive' | 'neutral' | 'negative'; // NEW: Computed from recordings
}

// NEW: Property viewing history for better client tracking
export interface PropertyViewing {
  id: string;                     // Unique viewing ID
  clientId?: string;              // Client ID if known
  clientName: string;             // Client name
  viewedAt: FirebaseFirestore.Timestamp; // When property was viewed
  recordingId?: string;           // Associated recording if available
  feedback?: string;              // Client feedback about the property
  followUpScheduled?: boolean;    // Whether follow-up was scheduled
  result?: 'interested' | 'not_interested' | 'offer_made' | 'pending';
}

// NEW: Property status change history
export interface PropertyStatusHistory {
  id: string;                     // Unique change ID
  fromStatus?: 'Active' | 'Coming Soon' | 'Sold'; // Previous status (null for initial)
  toStatus: 'Active' | 'Coming Soon' | 'Sold'; // New status
  changedBy: string;              // User ID who made the change
  changedAt: FirebaseFirestore.Timestamp; // When change was made
  reason?: string;                // Optional reason for change
  notes?: string;                 // Additional notes about the change
  
  // NEW: Smart alert trigger
  triggeredAlerts?: string[];     // Alert IDs that were triggered by this change
}

// NEW: Property price change history
export interface PropertyPriceHistory {
  id: string;                     // Unique change ID
  fromPrice?: number;             // Previous price (null for initial)
  toPrice: number;                // New price
  changedBy: string;              // User ID who made the change
  changedAt: FirebaseFirestore.Timestamp; // When change was made
  reason?: string;                // Optional reason for price change
  notes?: string;                 // Additional notes about the change
  
  // NEW: Smart alert trigger for price drops
  triggeredAlerts?: string[];     // Alert IDs triggered by price changes
  percentageChange?: number;      // Calculated percentage change
}

// =============================================================================
// COLLECTION: /scheduledTasks/{taskId} - ENHANCED WITH CLIENT ALERTS
// =============================================================================
// Manages scheduled tasks for Firebase Cloud Functions
export interface ScheduledTaskDocument {
  id: string;                     // Auto-generated document ID
  type: 'follow-up-email' | 'follow-up-sms' | 'reminder' | 'cleanup' | 'smart-alert-check'; // NEW: Added smart alert checking
  recordingId?: string;           // Associated recording for follow-ups
  userId: string;                 // Owner's Firebase Auth UID
  
  // Scheduling information
  scheduledAt: FirebaseFirestore.Timestamp; // When task was created
  executeAt: FirebaseFirestore.Timestamp;   // When task should run
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  
  // Task-specific data
  taskData: {
    [key: string]: any;           // Flexible data structure for different task types
  };
  
  // NEW: Smart alert specific fields (when type = 'smart-alert-check')
  alertCriteria?: {
    checkNewListings?: boolean;   // Check for new property listings
    checkPriceChanges?: boolean;  // Check for price drops
    checkStatusChanges?: boolean; // Check for status updates
    clientIds?: string[];         // Specific clients to check
    propertyIds?: string[];       // Specific properties to monitor
  };
  
  // Execution tracking
  attempts: number;               // Number of execution attempts
  maxAttempts: number;            // Maximum retry attempts
  lastAttemptAt?: FirebaseFirestore.Timestamp;
  completedAt?: FirebaseFirestore.Timestamp;
  errorMessage?: string;
  
  // Metadata
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp;
}

// NEW: Scheduled follow-up delivery system
export interface ScheduledFollowUp {
  method: 'email' | 'sms' | 'both'; // Delivery method
  sendAt: FirebaseFirestore.Timestamp; // When to send
  status: 'pending' | 'sent' | 'failed' | 'cancelled'; // Delivery status
  emailScheduled?: boolean;       // Email component scheduled
  smsScheduled?: boolean;         // SMS component scheduled
  scheduledBy: string;            // User ID who scheduled
  scheduledAt: FirebaseFirestore.Timestamp; // When it was scheduled
  sentAt?: FirebaseFirestore.Timestamp; // When it was actually sent
  errorMessage?: string;          // Error if delivery failed
  retryCount?: number;            // Number of retry attempts
  lastRetryAt?: FirebaseFirestore.Timestamp; // Last retry timestamp
}

// NEW: AI-generated buyer persona
export interface BuyerPersona {
  clientName?: string;            // Client name if provided
  buyerType: 'Investor' | 'First-Time Buyer' | 'Upsizer' | 'Downsizer' | 'Relocator' | 'Second Home' | 'Other';
  keyMotivations: string[];       // Primary motivations (budget, location, amenities)
  decisionTimeline: 'Immediate' | 'Within 30 Days' | '2-3 Months' | '6+ Months' | 'Exploring';
  budgetRange?: {
    min: number;
    max: number;
    flexibility: 'Strict' | 'Flexible' | 'Very Flexible';
  };
  locationPreferences: string[];  // Preferred neighborhoods/areas
  propertyFeaturePriorities: string[]; // Most important features
  emotionalProfile: 'Analytical' | 'Enthusiastic' | 'Cautious' | 'Decisive' | 'Social';
  communicationPreference: 'Email' | 'Phone' | 'Text' | 'In-Person' | 'Mixed';
  concerns: string[];             // Primary concerns or objections
  positiveSignals: string[];      // Positive reactions or interests
  recommendedStrategy: string;    // AI-recommended follow-up strategy
  confidenceScore: number;        // AI confidence in persona accuracy (0-1)
  generatedAt: FirebaseFirestore.Timestamp;
  generatedBy: 'openai' | 'manual'; // How persona was created
}

// NEW: Voice summary audio files
export interface VoiceSummaries {
  followUpSummary?: {
    audioUrl: string;             // Firebase Storage URL
    duration: number;             // Duration in seconds
    text: string;                 // Summary text that was synthesized
    provider: 'google' | 'elevenlabs'; // TTS provider used
    generatedAt: FirebaseFirestore.Timestamp;
  };
  personaSummary?: {
    audioUrl: string;             // Firebase Storage URL
    duration: number;             // Duration in seconds
    text: string;                 // Summary text that was synthesized
    provider: 'google' | 'elevenlabs'; // TTS provider used
    generatedAt: FirebaseFirestore.Timestamp;
  };
}

// NEW: Enhanced transcript segment with speaker identification and sentiment
export interface TranscriptSegment {
  id: string;                     // Unique segment identifier
  speaker: 'Agent' | 'Client' | 'Client2' | 'Unknown'; // Speaker identification
  text: string;                   // Transcript text for this segment
  startTime?: number;             // Start time in seconds (optional)
  endTime?: number;               // End time in seconds (optional)
  sentiment: 'positive' | 'neutral' | 'negative'; // Segment-level sentiment
  confidence?: number;            // Confidence score (0-1)
}

// NEW: Sentence-level sentiment analysis
export interface SentimentAnalysis {
  sentence: string;               // Original sentence text
  sentiment: 'positive' | 'neutral' | 'negative'; // Sentiment classification
  confidence: number;             // Confidence score (0-1)
  keywords?: string[];            // Key words that influenced sentiment
}

// NEW: Keyword frequency and relevance analysis
export interface KeywordFrequency {
  word: string;                   // The keyword/phrase
  frequency: number;              // Number of times mentioned
  relevance: number;              // Relevance score (0-1)
  category?: 'property' | 'price' | 'concern' | 'positive' | 'negative'; // Keyword category
  context?: string[];             // Sample contexts where keyword appeared
}

// NEW: Enhanced follow-up content structure
export interface FollowUpContent {
  preferences: string;            // Client preferences summary
  objections: string;             // Client concerns and objections
  sms: string;                    // SMS follow-up message
  email: string;                  // Email follow-up content
  urgencyLevel: 'low' | 'medium' | 'high'; // Follow-up urgency
  keyTopics: string[];            // Key discussion topics
  recommendedActions: string[];   // Suggested next steps
  tone: 'friendly' | 'professional' | 'direct' | 'action-oriented'; // Applied tone
  generatedAt: FirebaseFirestore.Timestamp; // Generation timestamp
}

// =============================================================================
// SMART MATCHING ALGORITHM CONSTANTS
// =============================================================================
// Constants for smart property-client matching

export const MATCH_CRITERIA_WEIGHTS = {
  priceRange: 0.25,               // 25% weight for price matching
  location: 0.20,                 // 20% weight for location preferences
  propertyType: 0.15,             // 15% weight for property type match
  bedrooms: 0.15,                 // 15% weight for bedroom count match
  bathrooms: 0.10,                // 10% weight for bathroom count match
  features: 0.10,                 // 10% weight for feature matching
  urgency: 0.05                   // 5% weight for client urgency
} as const;

export const ALERT_THRESHOLDS = {
  highPriority: 85,               // 85%+ match score = high priority alert
  mediumPriority: 70,             // 70-84% match score = medium priority
  lowPriority: 55                 // 55-69% match score = low priority
} as const;

// =============================================================================
// CLIENT STATUS CONSTANTS
// =============================================================================
export const CLIENT_STATUSES = [
  'Active',
  'Cold', 
  'Hot Lead'
] as const;

export const CLIENT_URGENCY_LEVELS = [
  'low',
  'medium',
  'high'
] as const;

export const NOTE_TYPES = [
  'insight',
  'action-item',
  'objection',
  'general'
] as const;

// Enhanced property features available for selection
export const AVAILABLE_PROPERTY_FEATURES = [
  'Ensuite',
  'Large Backyard',
  'Fireplace',
  'In-unit Laundry',
  'Walk-in Closet',
  'Balcony/Patio',
  'Hardwood Floors',
  'Stainless Steel Appliances',
  'Central Air',
  'Swimming Pool',
  'Home Office',
  'Updated Kitchen',
  'Master Suite',
  'Fenced Yard'
] as const;

// Property types available for selection
export const PROPERTY_TYPES = [
  'Single Family',
  'Condo',
  'Townhouse',
  'Multi-Family',
  'Other'
] as const;

// Property statuses for filtering and organization
export const PROPERTY_STATUSES = [
  'Active',
  'Coming Soon',
  'Sold'
] as const;

// NEW: Buyer types for persona generation
export const BUYER_TYPES = [
  'Investor',
  'First-Time Buyer',
  'Upsizer',
  'Downsizer',
  'Relocator',
  'Second Home',
  'Other'
] as const;

// NEW: Decision timelines for buyer personas
export const DECISION_TIMELINES = [
  'Immediate',
  'Within 30 Days',
  '2-3 Months',
  '6+ Months',
  'Exploring'
] as const;

// NEW: Emotional profiles for buyer personas
export const EMOTIONAL_PROFILES = [
  'Analytical',
  'Enthusiastic',
  'Cautious',
  'Decisive',
  'Social'
] as const;

// NEW: Communication preferences for buyer personas
export const COMMUNICATION_PREFERENCES = [
  'Email',
  'Phone',
  'Text',
  'In-Person',
  'Mixed'
] as const;

// Sub-interface for client information in properties
export interface ClientInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  showingDate?: string;
  status: 'interested' | 'not_interested' | 'pending';
}

// =============================================================================
// SMART MATCHING FUNCTIONS (TypeScript Interfaces)
// =============================================================================
// Interfaces for smart matching algorithm functions

export interface MatchingContext {
  client: ClientDocument;
  property: PropertyDocument;
  userPreferences?: {
    matchingStrength: 'strict' | 'moderate' | 'flexible';
    includePartialMatches: boolean;
    locationRadius?: number;        // Miles for location matching
  };
}

export interface MatchResult {
  matchScore: number;              // 0-100 match percentage
  matchReasons: string[];          // Human-readable reasons for the match
  confidenceLevel: 'low' | 'medium' | 'high';
  dealBreakers: string[];          // Reasons why it might not work
  recommendedActions: string[];    // Suggested next steps
}

// =============================================================================
// ENHANCED SECURITY RULES REQUIREMENTS - WITH CLIENT MANAGEMENT
// =============================================================================
/**
 * Enhanced Firestore Security Rules with client management and smart alerts:
 * 
 * // Users can only access their own documents
 * match /users/{userId} {
 *   allow read, write: if request.auth != null && request.auth.uid == userId;
 * }
 * 
 * // NEW: Clients are private to each user
 * match /clients/{clientId} {
 *   allow read, write: if request.auth != null && 
 *     request.auth.uid == resource.data.userId;
 *   
 *   allow create: if request.auth != null && 
 *     request.auth.uid == request.resource.data.userId &&
 *     request.resource.data.name is string &&
 *     request.resource.data.status in ['Active', 'Cold', 'Hot Lead'] &&
 *     request.resource.data.preferences is map &&
 *     request.resource.data.tags is list &&
 *     request.resource.data.notes is list;
 * }
 * 
 * // NEW: Smart alerts are private to each user
 * match /alerts/{alertId} {
 *   allow read, write: if request.auth != null && 
 *     request.auth.uid == resource.data.userId;
 *   
 *   allow create: if request.auth != null && 
 *     request.auth.uid == request.resource.data.userId &&
 *     request.resource.data.type in ['property-match', 'price-drop', 'status-change', 'follow-up-reminder'] &&
 *     request.resource.data.matchScore >= 0 && request.resource.data.matchScore <= 100;
 * }
 * 
 * // Recordings are private to each user with enhanced validation
 * match /recordings/{recordingId} {
 *   allow read, write: if request.auth != null && 
 *     request.auth.uid == resource.data.uid;
 *   
 *   // Enhanced validation for client linking
 *   allow update: if request.auth != null && 
 *     request.auth.uid == resource.data.uid &&
 *     (!exists(request.resource.data.clientId) || 
 *      exists(/databases/$(database)/documents/clients/$(request.resource.data.clientId)) &&
 *      get(/databases/$(database)/documents/clients/$(request.resource.data.clientId)).data.userId == request.auth.uid);
 * }
 * 
 * // Properties are private to each user - ENHANCED WITH NOTES
 * match /properties/{propertyId} {
 *   allow read, write: if request.auth != null && 
 *     request.auth.uid == resource.data.userId;
 *   
 *   // Validate agent notes if present
 *   allow update: if request.auth != null && 
 *     request.auth.uid == resource.data.userId &&
 *     (!exists(request.resource.data.agentNotes) || 
 *      request.resource.data.agentNotes is list);
 * }
 * 
 * // Enhanced scheduled tasks with smart alerts
 * match /scheduledTasks/{taskId} {
 *   allow read, write: if request.auth != null && 
 *     request.auth.uid == resource.data.userId;
 *     
 *   allow create: if request.auth != null && 
 *     request.auth.uid == request.resource.data.userId &&
 *     request.resource.data.type in ['follow-up-email', 'follow-up-sms', 'reminder', 'cleanup', 'smart-alert-check'];
 * }
 */

// =============================================================================
// ENHANCED QUERY PATTERNS - WITH ANALYTICS AND REPORTING
// =============================================================================
/**
 * Enhanced Firestore queries with analytics and objection reporting:
 * 
 * 1. Load agent productivity stats:
 *    doc('agentStats', user.uid)
 * 
 * 2. Generate session engagement reports:
 *    collection('recordings')
 *      .where('uid', '==', user.uid)
 *      .where('engagementReport.analysisScore', '>=', minScore)
 *      .orderBy('engagementReport.analysisScore', 'desc')
 * 
 * 3. Query objection patterns:
 *    collection('objectionReports')
 *      .where('userId', '==', user.uid)
 *      .where('timeframe.period', '==', '90_days')
 *      .orderBy('generatedAt', 'desc')
 *      .limit(1)
 * 
 * 4. Load high-engagement sessions:
 *    collection('recordings')
 *      .where('uid', '==', user.uid)
 *      .where('engagementReport.engagementRating', '==', 'high')
 *      .orderBy('createdAt', 'desc')
 * 
 * 5. Aggregate objections by category:
 *    // Complex aggregation query - typically done in Cloud Functions
 *    collection('recordings')
 *      .where('uid', '==', user.uid)
 *      .where('createdAt', '>=', thirtyDaysAgo)
 *      // Process objections from aiFollowUpFinal.objections
 */

// =============================================================================
// ENHANCED INDEXES REQUIRED - WITH ANALYTICS SUPPORT
// =============================================================================
/**
 * Enhanced composite indexes needed for Firestore with analytics:
 * 
 * // Existing indexes...
 * 1. recordings: uid (Ascending), createdAt (Descending)
 * 2. recordings: uid (Ascending), clientId (Ascending), createdAt (Descending)
 * 3. properties: userId (Ascending), status (Ascending), price (Ascending)
 * 4. clients: userId (Ascending), status (Ascending), lastInteraction (Descending)
 * 5. clients: userId (Ascending), preferences.urgency (Ascending), createdAt (Descending)
 * 6. alerts: userId (Ascending), type (Ascending), read (Ascending)
 * 7. alerts: userId (Ascending), matchScore (Descending), timestamp (Descending)
 * 
 * // NEW: Analytics and engagement indexes
 * 8. recordings: uid (Ascending), engagementReport.engagementRating (Ascending), createdAt (Descending)
 * 9. recordings: uid (Ascending), engagementReport.analysisScore (Descending), createdAt (Descending)
 * 10. recordings: uid (Ascending), status (Ascending), engagementReport.generatedAt (Descending)
 * 
 * // NEW: Objection analysis indexes
 * 11. objectionReports: userId (Ascending), timeframe.period (Ascending), generatedAt (Descending)
 * 12. objectionReports: userId (Ascending), reportType (Ascending), timeframe.endDate (Descending)
 * 13. objectionReports: organizationId (Ascending), reportType (Ascending), generatedAt (Descending)
 * 
 * // NEW: Agent stats and productivity indexes
 * 14. agentStats: userId (Ascending), lastCalculated (Descending)
 * 15. agentStats: userId (Ascending), performanceTrend (Ascending), avgEngagementScore (Descending)
 */

export default {};
