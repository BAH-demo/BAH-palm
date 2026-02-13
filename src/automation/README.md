# Ticket Automation System

An event-driven automation system for managing tier 2 technical support ticket workflows. This system simulates how AI-assisted tools can automate JIRA service desk operations, reducing bottlenecks in ticket assignment and ensuring users get pointed to documentation before consuming engineer time.

## Architecture

```
src/automation/
├── types.ts                          # Shared type definitions
├── triage/                           # Ticket Triage Engine
│   ├── index.ts                      # Main triage orchestrator
│   ├── classifier.ts                 # Category classification (keyword analysis)
│   ├── severity-analyzer.ts          # Severity determination (impact assessment)
│   ├── team-router.ts                # Team assignment suggestions (service mapping)
│   ├── auto-responder.ts             # Auto-response generation with doc links
│   └── doc-checker.ts                # "User didn't read docs" detection
├── routing/                          # Routing Rules Engine
│   ├── index.ts                      # Main routing orchestrator
│   ├── rules-engine.ts               # YAML-based configurable rules engine
│   ├── escalation.ts                 # Escalation chain management
│   ├── load-balancer.ts              # Load balancing across team members
│   └── rules.yaml                    # Sample routing rules configuration
└── feedback/                         # Feedback Loop Analyzer
    ├── index.ts                      # Feedback module exports
    ├── pattern-analyzer.ts           # Recurring issue detection
    ├── bottleneck-detector.ts        # Queue bottleneck detection
    └── report-generator.ts           # Weekly summary report generation
```

## Modules

### Triage Engine (`triage/`)

Analyzes incoming support tickets and produces a complete triage result:

- **Classifier**: Uses keyword analysis to categorize tickets into: `bug`, `user-error`, `feature-request`, `documentation-gap`, or `infrastructure`. Title keywords receive a scoring boost for higher accuracy.
- **Severity Analyzer**: Determines severity (`critical`, `high`, `medium`, `low`) based on keyword matching, customer tier (enterprise customers get priority boost), and attachment count as a complexity signal.
- **Team Router**: Maps tickets to the appropriate support team using a service-component mapping (authentication -> identity-team, api -> platform-team, etc.). Supports explicit `affectedService` field or keyword-based inference.
- **Auto-Responder**: Generates a formatted response including relevant troubleshooting steps and documentation links, tailored to the ticket category.
- **Doc Checker**: Flags tickets where the user likely hasn't read existing documentation. Matches against well-documented topics (password reset, API key generation, SSO setup, etc.) and common "how do I" question patterns.

**Usage:**
```typescript
import { triageTicket } from '@/src/automation/triage';

const result = triageTicket({
  id: 'TICKET-123',
  title: 'How do I reset my password?',
  description: 'I forgot my password and cannot login.',
  attachments: [],
  customerTier: 'enterprise',
  createdAt: new Date(),
});

// result.category -> 'user-error'
// result.severity -> 'medium' (boosted for enterprise)
// result.isDocRelated -> true
// result.docReferences -> ['https://docs.example.com/auth/password-reset', ...]
// result.autoResponse -> formatted response with troubleshooting steps
```

### Routing Rules Engine (`routing/`)

A configurable, YAML-based rules engine for ticket assignment:

- **Rules Engine**: Evaluates tickets against a prioritized set of routing rules. Each rule has conditions (field/operator/value) and an action (team assignment + escalation chain). Rules are evaluated in priority order; the highest-priority matching rule wins.
- **Escalation Manager**: Monitors ticket assignments against SLA timeouts. If a ticket hasn't been addressed within the escalation timeout, it automatically suggests escalation to the next person in the chain.
- **Load Balancer**: Distributes tickets across team members based on current utilization (ticket count / max capacity). Selects the least-loaded available member.

#### Configuring Routing Rules

Rules are defined in YAML format (`routing/rules.yaml`). Each rule has:

```yaml
rules:
  - name: rule-identifier
    priority: 100          # Higher = evaluated first
    conditions:
      - field: category    # Fields: category, severity, title, description, customerTier, affectedService, attachmentCount, hour
        operator: equals   # Operators: equals, contains, matches (regex), greaterThan, lessThan
        value: bug
    action:
      assignTo: engineering-team
      escalationChain:
        - engineer-oncall
        - engineering-lead
      escalationTimeoutHours: 4
```

**Supported condition fields:**
| Field | Description | Example Operators |
|-------|-------------|-------------------|
| `category` | Triage-determined category | `equals` |
| `severity` | Triage-determined severity | `equals` |
| `title` | Ticket title text | `contains`, `matches` |
| `description` | Ticket description text | `contains`, `matches` |
| `customerTier` | Customer tier level | `equals` |
| `affectedService` | Reported affected service | `equals` |
| `attachmentCount` | Number of attachments | `greaterThan`, `lessThan` |
| `hour` | UTC hour of ticket creation | `greaterThan`, `lessThan` |

**Loading configuration:**
```typescript
import { parseRoutingConfigFromString } from '@/src/automation/routing';

const config = parseRoutingConfigFromString(yamlContent);
```

### Feedback Loop Analyzer (`feedback/`)

Analyzes ticket resolution patterns to drive continuous improvement:

- **Pattern Analyzer**: Extracts key phrases from resolution notes and identifies recurring patterns. Generates suggested knowledge base article titles for frequently-occurring issues.
- **Bottleneck Detector**: Identifies teams with high average resolution times, excessive pending ticket counts, or stale tickets. Flags teams that exceed configurable thresholds.
- **Report Generator**: Produces weekly summary reports including ticket volume, average resolution time, category distribution, team performance metrics, recurring issues, and detected bottlenecks.

**Usage:**
```typescript
import { generateWeeklySummary, formatSummaryAsText } from '@/src/automation/feedback';

const summary = generateWeeklySummary(resolutions, pendingTickets, weekStart, weekEnd);
const report = formatSummaryAsText(summary);
```

## JIRA Webhook Integration (Production)

In a production environment, this system would integrate with JIRA via webhooks:

1. **Incoming Webhook**: JIRA fires a webhook on ticket creation (`jira:issue_created`).
2. **Triage**: The webhook payload is parsed into a `SupportTicket` and passed through `triageTicket()`.
3. **Routing**: The triage result feeds into `routeTicket()` with the YAML-based routing config.
4. **Assignment**: The routing result is used to update the JIRA ticket (assignee, priority, labels) via the JIRA REST API.
5. **Auto-Response**: The generated auto-response is posted as a comment on the JIRA ticket.
6. **Escalation**: A scheduled job periodically calls `getEscalationStatus()` to check for SLA breaches and trigger escalations.
7. **Feedback**: Weekly, `generateWeeklySummary()` produces reports for team leads.

```
JIRA Webhook → Parse Ticket → Triage → Route → Assign → Auto-Respond
                                                            ↓
                                              Escalation Monitor (cron)
                                                            ↓
                                              Weekly Feedback Reports
```

## Running Tests

```bash
yarn test -- --testPathPattern='test/automation'
```

For coverage:

```bash
yarn test -- --coverage --testPathPattern='test/automation'
```
