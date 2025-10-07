import { render, screen } from '@testing-library/react';

import ChatHeader from './ChatHeader';
import { useGetSystemConfig } from '@/features/shared/api/get-system-config';
import { useGetBedrockModelAccess } from '@/features/shared/api/get-bedrock-model-access';

jest.mock('@/features/shared/api/get-system-config');
jest.mock('@/features/shared/api/get-bedrock-model-access');

jest.mock('./ChatModelSelect', () => {
  return function ChatModelSelect() {
    return <div data-testid='chat-model-select'></div>;
  };
});

jest.mock('./ChatKnowledgeBasesSelect', () => {
  return function ChatKnowledgeBasesSelect() {
    return <div data-testid='chat-knowledge-bases-select'></div>;
  };
});

jest.mock('./ChatDocumentLibraryFileSelect', () => {
  return function ChatDocumentLibraryFileSelect() {
    return <div data-testid='chat-document-library-file-select'></div>;
  };
});

const mockUseGetSystemConfig = useGetSystemConfig as jest.Mock;
const mockUseGetBedrockModelAccess = useGetBedrockModelAccess as jest.Mock;

describe('ChatHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all child components correctly', async () => {
    mockUseGetSystemConfig.mockReturnValue({
      data: {
        documentLibraryDocumentUploadProviderId: 'some-test-id',
      },
      isPending: false,
    });

    mockUseGetBedrockModelAccess.mockReturnValue({
      data: {
        hasAccess: true,
      },
      isPending: false,
    });

    render(<ChatHeader />);

    const chatModelSelect = screen.getByTestId('chat-model-select');
    const chatKnowledgeBasesSelect = screen.getByTestId('chat-knowledge-bases-select');
    const chatDocumentLibraryFileSelect = screen.getByTestId('chat-document-library-file-select');

    expect(chatModelSelect).toBeInTheDocument();
    expect(chatKnowledgeBasesSelect).toBeInTheDocument();
    expect(chatDocumentLibraryFileSelect).toBeInTheDocument();
  });

  it('hides ChatDocumentLibraryFileSelect when documentLibraryDocumentUploadProviderId is not set', async () => {
    mockUseGetSystemConfig.mockReturnValue({
      data: {
        documentLibraryDocumentUploadProviderId: null,
      },
      isPending: false,
    });

    mockUseGetBedrockModelAccess.mockReturnValue({
      data: {
        hasAccess: true,
      },
      isPending: false,
    });

    render(<ChatHeader />);

    const chatModelSelect = screen.getByTestId('chat-model-select');
    const chatKnowledgeBasesSelect = screen.getByTestId('chat-knowledge-bases-select');
    const chatDocumentLibraryFileSelect = screen.queryByTestId('chat-document-library-file-select');

    expect(chatModelSelect).toBeInTheDocument();
    expect(chatKnowledgeBasesSelect).toBeInTheDocument();
    expect(chatDocumentLibraryFileSelect).not.toBeInTheDocument();
  });

  it('hides ChatDocumentLibraryFileSelect when user has no bedrock access', async () => {
    mockUseGetSystemConfig.mockReturnValue({
      data: {
        documentLibraryDocumentUploadProviderId: 'some-test-id',
      },
      isPending: false,
    });

    mockUseGetBedrockModelAccess.mockReturnValue({
      data: {
        hasAccess: false,
      },
      isPending: false,
    });

    render(<ChatHeader />);

    const chatModelSelect = screen.getByTestId('chat-model-select');
    const chatKnowledgeBasesSelect = screen.getByTestId('chat-knowledge-bases-select');
    const chatDocumentLibraryFileSelect = screen.queryByTestId('chat-document-library-file-select');

    expect(chatModelSelect).toBeInTheDocument();
    expect(chatKnowledgeBasesSelect).toBeInTheDocument();
    expect(chatDocumentLibraryFileSelect).not.toBeInTheDocument();
  });

  it('displays loading component if system config is loading', () => {
    mockUseGetSystemConfig.mockReturnValue({
      data: null,
      isPending: true,
    });

    mockUseGetBedrockModelAccess.mockReturnValue({
      data: null,
      isPending: false,
    });

    render(<ChatHeader />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays loading component if bedrock model access is loading', () => {
    mockUseGetSystemConfig.mockReturnValue({
      data: {
        documentLibraryDocumentUploadProviderId: 'some-test-id',
      },
      isPending: false,
    });

    mockUseGetBedrockModelAccess.mockReturnValue({
      data: null,
      isPending: true,
    });

    render(<ChatHeader />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
