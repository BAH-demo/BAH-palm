import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { Artifact } from '@/features/chat/types/message';

export interface Collaborator {
  userId: string;
  role: string;
  email?: string;
}

interface ChatContextData {
  chatId: string | null;
  setChatId: (chatId: string) => void;
  promptId: string | null;
  setPromptId: (promptId: string | null) => void;
  pendingMessage: string | null;
  setPendingMessage: (message: string | null) => void;
  modelId: string | null;
  setModelId: (modelId: string) => void;
  isLastMessageRetry: boolean;
  setIsLastMessageRetry: (isLastMessageRetry: boolean) => void;
  regeneratingResponse: boolean;
  setRegeneratingResponse: (isRegenerating: boolean) => void;
  knowledgeBaseIds: string[];
  setKnowledgeBaseIds: (ids: string[]) => void;
  documentIds: string[];
  setDocumentIds: (ids: string[]) => void;
  deepResearchEnabled: boolean;
  setDeepResearchEnabled: (enabled: boolean) => void;
  selectedArtifact: Artifact | null;
  setSelectedArtifact: (artifact: Artifact | null) => void;
  systemMessage: string | null;
  setSystemMessage: (content: string) => void;
  selectedText: string | null;
  setSelectedText: (text: string | null) => void;
  entryBeingEdited: string | null;
  setEntryBeingEdited: (id: string | null) => void;
  isCollaborative: boolean;
  setIsCollaborative: (isCollaborative: boolean) => void;
  collaborators: Collaborator[];
  setCollaborators: (collaborators: Collaborator[]) => void;
}

const ChatContext = createContext<ChatContextData>({
  chatId: null,
  setChatId: () => { },
  promptId: null,
  setPromptId: () => { },
  pendingMessage: null,
  setPendingMessage: () => { },
  modelId: null,
  setModelId: () => { },
  isLastMessageRetry: false,
  setIsLastMessageRetry: () => { },
  regeneratingResponse: false,
  setRegeneratingResponse: () => { },
  knowledgeBaseIds: [],
  setKnowledgeBaseIds: () => { },
  documentIds: [],
  setDocumentIds: () => {},
  deepResearchEnabled: false,
  setDeepResearchEnabled: () => {},
  selectedArtifact: null,
  setSelectedArtifact: () => {},
  systemMessage: null,
  setSystemMessage: () => { },
  selectedText: null,
  setSelectedText: () => {},
  entryBeingEdited: null,
  setEntryBeingEdited: () => { },
  isCollaborative: false,
  setIsCollaborative: () => { },
  collaborators: [],
  setCollaborators: () => { },
});

type ChatProviderProps = {
  children: React.ReactNode;
  chatId?: string | null;
  promptId?: string | null;
  modelId?: string | null;
  initialKnowledgeBaseIds?: string[];
};

export const ChatProvider = ({
  children,
  chatId: cid,
  promptId: pid,
  modelId: mid,
  initialKnowledgeBaseIds = [],
}: ChatProviderProps) => {
  const [chatId, setChatId] = useState(cid ?? null);
  const [promptId, setPromptId] = useState(pid ?? null);
  const [modelId, setModelId] = useState(mid ?? null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [isLastMessageRetry, setIsLastMessageRetry] = useState(false);
  const [regeneratingResponse, setRegeneratingResponse] = useState(false);
  const [knowledgeBaseIds, setKnowledgeBaseIds] = useState<string[]>(
    initialKnowledgeBaseIds
  );
  const [documentIds, setDocumentIds] = useState<string[]>([]);
  const [deepResearchEnabled, setDeepResearchEnabled] = useState(false);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [systemMessage, setSystemMessage] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [entryBeingEdited, setEntryBeingEdited] = useState<string | null>(null);
  const [isCollaborative, setIsCollaborative] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  useEffect(() => {
    setChatId(cid !== undefined ? cid : null);
    setPromptId(pid !== undefined ? pid : null);
    setModelId(mid !== undefined ? mid : null);
  }, [cid, pid, mid]);

  const values = useMemo(
    () => ({
      chatId,
      setChatId,
      promptId,
      setPromptId,
      pendingMessage,
      setPendingMessage,
      isLastMessageRetry,
      setIsLastMessageRetry,
      regeneratingResponse,
      setRegeneratingResponse,
      modelId,
      setModelId,
      knowledgeBaseIds,
      setKnowledgeBaseIds,
      documentIds,
      setDocumentIds,
      deepResearchEnabled,
      setDeepResearchEnabled,
      selectedArtifact,
      setSelectedArtifact,
      systemMessage,
      setSystemMessage,
      selectedText,
      setSelectedText,
      entryBeingEdited,
      setEntryBeingEdited,
      isCollaborative,
      setIsCollaborative,
      collaborators,
      setCollaborators,
    }),
    [
      chatId,
      setChatId,
      promptId,
      setPromptId,
      pendingMessage,
      setPendingMessage,
      isLastMessageRetry,
      setIsLastMessageRetry,
      regeneratingResponse,
      setRegeneratingResponse,
      modelId,
      setModelId,
      knowledgeBaseIds,
      setKnowledgeBaseIds,
      documentIds,
      setDocumentIds,
      deepResearchEnabled,
      setDeepResearchEnabled,
      selectedArtifact,
      setSelectedArtifact,
      systemMessage,
      setSystemMessage,
      selectedText,
      setSelectedText,
      entryBeingEdited,
      setEntryBeingEdited,
      isCollaborative,
      setIsCollaborative,
      collaborators,
      setCollaborators,
    ]
  );

  return <ChatContext.Provider value={values}>{children}</ChatContext.Provider>;
};

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('An unexpected error occurred. Please try again later.');
  }

  return context;
}
