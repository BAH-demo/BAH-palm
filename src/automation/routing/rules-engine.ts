import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import { RoutingRule, RuleCondition, RoutingConfig, SupportTicket, TriageResult } from '../types';

interface RuleMatch {
  rule: RoutingRule;
  matchedConditions: number;
  totalConditions: number;
}

function evaluateCondition(
  condition: RuleCondition,
  ticket: SupportTicket,
  triageResult: TriageResult,
): boolean {
  const fieldValueMap: Record<string, string | number | undefined> = {
    category: triageResult.category,
    severity: triageResult.severity,
    title: ticket.title,
    description: ticket.description,
    customerTier: ticket.customerTier,
    affectedService: ticket.affectedService,
    attachmentCount: ticket.attachments.length,
    hour: new Date(ticket.createdAt).getUTCHours(),
  };

  const fieldValue = fieldValueMap[condition.field];
  if (fieldValue === undefined) {
    return false;
  }

  switch (condition.operator) {
  case 'equals':
    return String(fieldValue) === String(condition.value);
  case 'contains':
    return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
  case 'matches': {
    const regex = new RegExp(String(condition.value), 'i');
    return regex.test(String(fieldValue));
  }
  case 'greaterThan':
    return Number(fieldValue) > Number(condition.value);
  case 'lessThan':
    return Number(fieldValue) < Number(condition.value);
  default:
    return false;
  }
}

export function evaluateRules(
  rules: RoutingRule[],
  ticket: SupportTicket,
  triageResult: TriageResult,
): RuleMatch[] {
  const matches: RuleMatch[] = [];

  const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

  for (const rule of sortedRules) {
    let matchedConditions = 0;
    for (const condition of rule.conditions) {
      if (evaluateCondition(condition, ticket, triageResult)) {
        matchedConditions++;
      }
    }
    if (matchedConditions === rule.conditions.length && rule.conditions.length > 0) {
      matches.push({
        rule,
        matchedConditions,
        totalConditions: rule.conditions.length,
      });
    }
  }

  return matches;
}

export function findBestRule(
  rules: RoutingRule[],
  ticket: SupportTicket,
  triageResult: TriageResult,
): RoutingRule | null {
  const matches = evaluateRules(rules, ticket, triageResult);
  if (matches.length === 0) {
    return null;
  }
  return matches[0].rule;
}

export function loadRoutingConfig(configPath: string): RoutingConfig {
  const absolutePath = path.isAbsolute(configPath)
    ? configPath
    : path.resolve(process.cwd(), configPath);
  const fileContent = fs.readFileSync(absolutePath, 'utf-8');
  const parsed = yaml.load(fileContent) as RoutingConfig;

  if (!parsed.rules || !Array.isArray(parsed.rules)) {
    throw new Error('Invalid routing config: missing rules array');
  }
  if (!parsed.defaultTeam) {
    throw new Error('Invalid routing config: missing defaultTeam');
  }

  return parsed;
}

export function parseRoutingConfigFromString(yamlContent: string): RoutingConfig {
  const parsed = yaml.load(yamlContent) as RoutingConfig;

  if (!parsed.rules || !Array.isArray(parsed.rules)) {
    throw new Error('Invalid routing config: missing rules array');
  }
  if (!parsed.defaultTeam) {
    throw new Error('Invalid routing config: missing defaultTeam');
  }

  return parsed;
}
