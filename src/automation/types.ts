export enum TicketCategory {
  BUG = 'bug',
  USER_ERROR = 'user-error',
  FEATURE_REQUEST = 'feature-request',
  DOCUMENTATION_GAP = 'documentation-gap',
  INFRASTRUCTURE = 'infrastructure',
}

export enum Severity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export interface AttachmentMetadata {
  filename: string;
  mimeType: string;
  size: number;
}

export interface SupportTicket {
  id: string;
  title: string;
  description: string;
  attachments: AttachmentMetadata[];
  customerTier?: 'enterprise' | 'business' | 'standard';
  affectedService?: string;
  createdAt: Date;
}

export interface TriageResult {
  ticketId: string;
  category: TicketCategory;
  severity: Severity;
  suggestedTeam: string;
  autoResponse: string;
  isDocRelated: boolean;
  docReferences: string[];
  confidence: number;
}

export interface RoutingRule {
  name: string;
  conditions: RuleCondition[];
  action: RuleAction;
  priority: number;
}

export interface RuleCondition {
  field: string;
  operator: 'contains' | 'equals' | 'matches' | 'greaterThan' | 'lessThan';
  value: string | number;
}

export interface RuleAction {
  assignTo: string;
  escalationChain?: string[];
  escalationTimeoutHours?: number;
}

export interface TeamMember {
  id: string;
  name: string;
  team: string;
  currentTicketCount: number;
  maxTickets: number;
  availability: boolean;
}

export interface EscalationConfig {
  chain: string[];
  timeoutHours: number;
  notifyOnEscalation: boolean;
}

export interface RoutingConfig {
  rules: RoutingRule[];
  escalationPolicies: Record<string, EscalationConfig>;
  teamMembers: TeamMember[];
  defaultTeam: string;
}

export interface TicketResolution {
  ticketId: string;
  category: TicketCategory;
  team: string;
  resolvedAt: Date;
  createdAt: Date;
  resolutionTimeHours: number;
  resolutionNotes: string;
}

export interface RecurringIssue {
  pattern: string;
  occurrences: number;
  category: TicketCategory;
  suggestedKBTitle: string;
}

export interface QueueBottleneck {
  team: string;
  avgResolutionTimeHours: number;
  pendingTicketCount: number;
  oldestTicketAgeHours: number;
}

export interface TeamPerformance {
  team: string;
  ticketsResolved: number;
  avgResolutionTimeHours: number;
  ticketsPending: number;
}

export interface WeeklySummary {
  weekStarting: Date;
  weekEnding: Date;
  totalTickets: number;
  avgResolutionTimeHours: number;
  categoryDistribution: Record<string, number>;
  teamPerformance: TeamPerformance[];
  recurringIssues: RecurringIssue[];
  bottlenecks: QueueBottleneck[];
}

export interface TicketAssignment {
  ticketId: string;
  assignedTo: string;
  team: string;
  assignedAt: Date;
  escalationChain: string[];
  escalationTimeoutHours: number;
  currentEscalationLevel: number;
}

export interface DocumentationReference {
  title: string;
  url: string;
  keywords: string[];
  service: string;
}
