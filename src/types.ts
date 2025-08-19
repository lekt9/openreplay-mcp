export interface OpenReplayConfig {
  apiUrl: string;
  apiKey: string;
  projectId: string;
}

export interface Session {
  sessionId: string;
  userId?: string;
  userAnonymousId?: string;
  userEmail?: string;
  userCountry?: string;
  userDevice?: string;
  userBrowser?: string;
  userOs?: string;
  duration: number;
  startedAt: number;
  endedAt?: number;
  pageCount: number;
  errorCount: number;
  issueTypes?: string[];
  metadata?: Record<string, any>;
  events?: SessionEvent[];
  customEvents?: CustomEvent[];
}

export interface SessionEvent {
  timestamp: number;
  type: string;
  url?: string;
  message?: string;
  level?: string;
  payload?: any;
}

export interface CustomEvent {
  timestamp: number;
  name: string;
  payload?: any;
}

export interface PageView {
  url: string;
  timestamp: number;
  duration?: number;
  loadTime?: number;
}

export interface ErrorEvent {
  timestamp: number;
  message: string;
  stack?: string;
  source?: string;
  type: string;
  url?: string;
}

export interface NetworkRequest {
  timestamp: number;
  url: string;
  method: string;
  status?: number;
  duration?: number;
  type?: string;
}

export interface UserJourney {
  sessionId: string;
  userId: string;
  pages: PageView[];
  errors: ErrorEvent[];
  totalDuration: number;
  dropOffPoint?: string;
  completedGoals?: string[];
}

export interface SessionAnalytics {
  totalSessions: number;
  averageDuration: number;
  bounceRate: number;
  errorRate: number;
  topPages: Array<{ url: string; count: number }>;
  topErrors: Array<{ message: string; count: number }>;
  userRetention: number;
  deviceBreakdown: Record<string, number>;
  browserBreakdown: Record<string, number>;
  countryBreakdown: Record<string, number>;
}

export interface DropOffAnalysis {
  url: string;
  dropOffCount: number;
  dropOffRate: number;
  averageTimeOnPage: number;
  nextPages: Array<{ url: string; count: number }>;
  commonErrors: ErrorEvent[];
}

export interface BugReport {
  issueId: string;
  type: string;
  message: string;
  affectedSessions: number;
  firstSeen: number;
  lastSeen: number;
  stack?: string;
  urls: string[];
  userAgents: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}