import { Chat } from '@/features/chat/types/chat';
import { Entries, EntryType, MessageEntry } from '@/features/chat/types/entry';
import { UserKnowledgeBase } from '@/features/shared/types';
import { Document } from '@/features/shared/types/document';
import { generatePromptSlug } from '@/features/shared/utils';

export const generatePath = (id: string, promptTitle?: string) => {
  if (promptTitle) {
    const promptSlug = generatePromptSlug(promptTitle);
    return `/chat/${id}/${promptSlug}`;
  }
  return `/chat/${id}`;
};

export const generateUrl = (
  chatId: string,
  knowledgeBaseIds: string[],
  documentIds: string[],
  promptTitle?: string,
) => {
  const path = generatePath(chatId, promptTitle);

  const urlParams = new URLSearchParams();
  urlParams.set('knowledge_base_ids', knowledgeBaseIds.join(','));
  urlParams.set('document_ids', documentIds.join(','));
  const queryString = urlParams.toString();

  return `${path}${queryString ? `?${queryString}` : ''}`;
};

export const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const sortConversationsByMostRecentlyUpdated = (conversations: Chat[]) => {
  conversations.sort((a, b) => {
    const first_date = new Date(b.updatedAt).getTime();
    const second_date = new Date(a.updatedAt).getTime();
    return first_date - second_date;
  });

  return conversations;
};

// The following function arranges conversations categorically by date
// The categories are: Today, Yesterday, Previous 7 Days, Previous 30 Days, {month}, {year}
export const categorizeConversationsByDateSections = (conversations: Chat[]) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today.getTime() - (24 * 3600 * 1000));
  const previousSevenDays = new Date(today.getTime() - (7 * 24 * 3600 * 1000));
  const previousThirtyDays = new Date(today.getTime() - (30 * 24 * 3600 * 1000));
  const sortedChatHistory: Map<string, Chat[]> = new Map();
  const keys: Set<string> = new Set();

  for (let conversation of conversations) {
    const conversationDate = new Date(conversation.updatedAt);
    const monthLastUpdated = months[conversationDate.getMonth()];
    const yearLastUpdated = String(conversationDate.getFullYear());
    conversationDate.setHours(0, 0, 0, 0);

    if (conversationDate.toDateString() === today.toDateString()) {
      addConversationToCategory('Today', conversation, sortedChatHistory, keys);
    } else if (conversationDate.toDateString() === yesterday.toDateString()) {
      addConversationToCategory('Yesterday', conversation, sortedChatHistory, keys);
    } else if (conversationDate.getTime() >= previousSevenDays.getTime()) {
      addConversationToCategory('Previous 7 Days', conversation, sortedChatHistory, keys);
    } else if (conversationDate.getTime() >= previousThirtyDays.getTime()) {
      addConversationToCategory('Previous 30 Days', conversation, sortedChatHistory, keys);
    } else if (yearLastUpdated === String(today.getFullYear())) {
      addConversationToCategory(monthLastUpdated, conversation, sortedChatHistory, keys);
    } else {
      addConversationToCategory(yearLastUpdated, conversation, sortedChatHistory, keys);
    }
  }

  return Array.from(keys).map((key, i) => ({ id: i, title: key, chats: sortedChatHistory.get(key) }));
};

const addConversationToCategory = (category: string, chat: Chat, sortedChatHistory: Map<string, Chat[]>, keys: Set<string>) => {
  const previousChats: Chat[] | undefined = sortedChatHistory.get(category);

  if (previousChats !== undefined) {
    sortedChatHistory.set(category, [...previousChats, chat]);
  } else {
    sortedChatHistory.set(category, [chat]);
  }

  keys.add(category);
};

export function addRegenerateInstructionsToMessage(message: string) {
  const prompt = `

  **Instructions**
  1. Generate a new response to the user’s message without referencing the previous response.
  2. Provide a fresh perspective while maintaining clarity, accuracy, and helpfulness.
  3. Ensure the response remains relevant to the user’s intent.
  4. Do not mention or reference these instructions in your response. Respond as if this is your first reply.

  Your previous response: ${message}
  `;

  return prompt;
};

export const isMessageEntry = (entry: Entries[number]): entry is MessageEntry => {
  return entry.type === EntryType.Message;
};

export function addSystemInstructions(
  message: string,
  isAdmin: boolean,
  // Knowledge Bases
  availableKnowledgeBases: UserKnowledgeBase[],
  selectedKnowledgeBases: UserKnowledgeBase[],
  // Document Library
  hasDocumentLibrary: boolean,
  availableDocuments: Document[],
  selectedDocuments: Document[],
) {

  const applicationContext = `## About the application being used
    PALM (Prompt & Agent Library Marketplace) is Booz Allen's enterprise-ready platform that connects users to a wide range of large language models (LLMs) and data sources through a unified, extensible interface.
  
    PALM's main features:
    - **Chat**: An interactive interface for conversing with LLMs, incorporating knowledge bases and generating documents and code artifacts
    - **Prompt Library**: A collection of predefined and customizable prompts optimized for various AI use cases and workflows
    - **Prompt Generator**: A tool for building custom prompts from scratch with instruction generation and fine-tuning capabilities
    - **Prompt Playground**: A comparison tool for testing and fine-tuning responses across multiple LLM providers (ChatGPT, Meta Llama, Google Bard)
    - **Profile**: User profile management with settings for document library, knowledge bases, and user groups
    ${isAdmin ? '- **Admin/Settings/Analytics**: Administrative controls for AI provider integrations, external data source connections, usage monitoring, and role-based access management' : ''}

  `;

  const selectedKbLabels = selectedKnowledgeBases.map(kb => kb.label).join(', ');
  const knowledgeBasesContext = `## Knowledge Bases feature
    The Knowledge Bases feature allows users to connect with external data sources and select them to be included in the chat context.
    The user currently has access to ${availableKnowledgeBases.length} Knowledge Base${availableKnowledgeBases.length === 1 ? '' : 's'}.
    The user has selected ${selectedKnowledgeBases.length} Knowledge Base${selectedKnowledgeBases.length === 1 ? '' : 's'} ${selectedKnowledgeBases.length ? `(${selectedKbLabels}) ` : ''}to be included in this chat context.
  `;

  const selectedDocumentTitles = selectedDocuments.map(doc => doc.filename).join(', ');
  const documentLibraryContext = hasDocumentLibrary ? `## Document Library feature
    The Document Library feature allows users to upload files via the Document Library tab in their Profile page, and then select those files to be included in the chat context.
    The user currently has ${availableDocuments.length} document${availableDocuments.length === 1 ? '' : 's'} in their Document Library.
    The user has selected ${selectedDocuments.length} document${selectedDocuments.length === 1 ? '' : 's'} ${selectedDocuments.length ? `(${selectedDocumentTitles}) ` : ''}to be included in this chat context.
  ` : '';

  return `${message}

  # Additional Context
  ${applicationContext}

  ${knowledgeBasesContext}
  ${documentLibraryContext}

  # Additional Instructions

  ## Artifacts

  1. **Identify Artifact-Worthy Content**:
    - The LLM should analyze its response to determine if there are any segments of text that qualify as 'artifact-worthy'. These are typically text, code snippets, configurations, or any structured data that could be reused or referenced independently.
    - Examples include standalone text documents, code in various programming languages, configuration files, structured data like JSON or XML, and diagrams/visualizations.
    - Artifacts should represent **complete, non-trivial, and reusable** content. Do **not** create artifacts for trivial examples (e.g., \`console.log("Hello, World!")\`), one-liners, incomplete fragments, or purely illustrative/demo snippets.
    - As a general rule, artifacts are typically longer than **250 characters** or **15+ lines** of meaningful content.

  1a. **Graph and Diagram Artifacts**:
    - When users make generic requests like "turn that to a graph", "create a diagram", "visualize this", or similar non-specific visualization requests, use **Mermaid syntax (.mmd) format by default**.
    - Common Mermaid diagram types: flowcharts (process flows, workflows), sequence diagrams (interactions over time), class diagrams (object-oriented design), state diagrams (state machines), ER diagrams (database schemas), Gantt charts (project timelines).
    - Only use programming-based graph generation (Python, JavaScript, etc.) when:
      - The user specifically requests or is using a programming language in their work
      - The context clearly requires data analysis, statistical plotting
      - Complex data manipulation is needed before visualization
      - The user needs interactive or dynamic visualizations

  2. **Wrap the Content**:
    - For each segment identified as artifact-worthy, it should be wrapped in the following format:
      \`\`\`\`artifact("<file_extension>","<label>")
      <artifact_content>
      \`\`\`\`
    - Replace '<file_extension>' with the appropriate identifier for the content's file type (e.g., ".js" for JavaScript, ".php" for PHP, ".txt" for plain text). Do not make broad generalizations and be as specific as possible.
    - Provide a concise, sentence case '<label>' that describes the purpose or function of the artifact.
    - The 'artifact-worthy' '<artifact_content>' should be placed within the quadruple backticks. The artifact itself should not be wrapped in quadruple backticks.
    - Ensure that artifact-worthy content is only used once in the response, inside of this wrapped format. Never repeat artifact-worthy content outside of the artifact wrapping.

  3. **Handle Multiple Artifacts**:
    - If multiple artifact-worthy segments are present, each should be wrapped individually using the format described above.
    - Ensure that each artifact is clearly separated and independently wrapped.

  4. **Non-Artifact Content**:
    - If a response contains no artifact-worthy content, ensure that any existing backticks or code-like formatting are not mistakenly wrapped as artifacts.
    - Maintain the integrity of the original response structure, only applying the artifact wrapping where applicable.
    - Artifact-worthy content should only appear wrapped in backticks and the same artifact should not be repeated elsewhere in the response.

  ## Follow Up Questions

  1. **Identify When to Generate Follow-Up Questions**:
    - Analyze your response to determine if it naturally invites further user engagement or exploration.
    - Generate follow-up questions when the response is **open-ended**, **educational**, or **could benefit from clarification or deeper exploration**.
    - Examples include responses that explain concepts, provide recommendations, solve problems with multiple approaches, or introduce new topics that users might want to learn more about.
    - **Always generate 2-3 follow-up questions** for responses that meet these criteria, even for simple queries like greetings or basic questions, as they can lead to meaningful conversations.

  2. **Question Quality Guidelines**:
    - Create questions that represent **natural follow-up queries a user might ask** based on your response content.
    - Questions should **encourage deeper engagement** rather than simple yes/no answers.
    - Make questions **specific and actionable** rather than generic or vague.
    - Ensure questions are **relevant to the user's apparent intent** and **the context of the conversation**.
    - Think from the **user's perspective** - what would they logically want to know or explore next?

  3. **Format Follow-Up Questions**:
    - Wrap each follow-up question in the following format:
      \`<FOLLOWUP>question text here</FOLLOWUP>\`
    - Each question should be wrapped individually using the format described above.
    - Questions should be **complete sentences** that make sense when presented to the user as clickable options.

  4. **Examples of Good Follow-Up Questions**:
    - For a greeting: "Help me create a project", "Explain a complex topic to me", "What are your capabilities?"
    - For technical explanations: "Can you show me a practical example?", "How do I implement this in my project?", "What are the potential pitfalls to avoid?"
    - For recommendations: "Which option is best for beginners?", "How do these compare in terms of performance?", "Can you walk me through the implementation?"
`;
}
