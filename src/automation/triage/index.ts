import { SupportTicket, TriageResult } from '../types';
import { classifyTicket } from './classifier';
import { analyzeSeverity } from './severity-analyzer';
import { suggestTeam } from './team-router';
import { generateAutoResponse } from './auto-responder';
import { checkIfDocRelated } from './doc-checker';

export function triageTicket(ticket: SupportTicket): TriageResult {
  const classification = classifyTicket(ticket);
  const severityResult = analyzeSeverity(ticket, classification.category);
  const teamSuggestion = suggestTeam(ticket, classification.category);
  const docCheck = checkIfDocRelated(ticket);

  const { response, docReferences: autoResponseDocs } = generateAutoResponse(
    ticket.id,
    classification.category,
    severityResult.severity,
    ticket.title,
    ticket.description,
    teamSuggestion.service,
  );

  const allDocRefs = [
    ...docCheck.docReferences.map(d => d.url),
    ...autoResponseDocs.map(d => d.url),
  ];
  const uniqueDocRefs = [...new Set(allDocRefs)];

  return {
    ticketId: ticket.id,
    category: classification.category,
    severity: severityResult.severity,
    suggestedTeam: teamSuggestion.team,
    autoResponse: response,
    isDocRelated: docCheck.isDocRelated,
    docReferences: uniqueDocRefs,
    confidence: Math.round(
      ((classification.confidence + teamSuggestion.confidence) / 2) * 100,
    ) / 100,
  };
}

export { classifyTicket } from './classifier';
export { analyzeSeverity } from './severity-analyzer';
export { suggestTeam } from './team-router';
export { generateAutoResponse, findRelevantDocs } from './auto-responder';
export { checkIfDocRelated } from './doc-checker';
