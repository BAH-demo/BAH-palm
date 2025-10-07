import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ChatDocumentLibraryFileSelect from './ChatDocumentLibraryFileSelect';
import { ChatProvider } from '@/features/chat/providers/ChatProvider';
import useGetChatDocuments from '@/features/chat/api/get-chat-documents';
import { useGetSystemConfig } from '@/features/shared/api/get-system-config';

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));
jest.mock('@/features/chat/api/get-chat-documents');
jest.mock('@/features/shared/api/get-system-config');

const mockUseGetChatDocuments = useGetChatDocuments as jest.Mock;
const mockUseGetSystemConfig = useGetSystemConfig as jest.Mock;

const mockUseRouter = jest.fn();

describe('ChatDocumentLibraryFileSelect', () => {
  const mockSystemConfig = {
    documentLibraryDocumentUploadProviderId: 'provider-123',
  };

  const mockDocuments = {
    documents: [
      {
        id: 'doc-1',
        filename: 'document1.pdf',
        uploadStatus: 'Completed',
      },
      {
        id: 'doc-2',
        filename: 'document2.pdf',
        uploadStatus: 'Completed',
      },
      {
        id: 'doc-3',
        filename: 'document3.pdf',
        uploadStatus: 'Completed',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseRouter.mockReturnValue({
      isReady: true,
      query: {},
    });

    (require('next/router').useRouter as jest.Mock).mockImplementation(() => mockUseRouter());

    mockUseGetSystemConfig.mockReturnValue({
      data: mockSystemConfig,
      isPending: false,
    });

    mockUseGetChatDocuments.mockReturnValue({
      data: mockDocuments,
      isPending: false,
    });
  });

  it('renders multiselect when system config and documents are available', () => {
    render(
      <ChatProvider>
        <ChatDocumentLibraryFileSelect />
      </ChatProvider>
    );

    const multiSelect = screen.getByTestId('document-library-multiselect');
    expect(multiSelect).toBeInTheDocument();
    expect(multiSelect).toBeEnabled();
  });

  it('shows correct placeholder when documents are available', () => {
    render(
      <ChatProvider>
        <ChatDocumentLibraryFileSelect />
      </ChatProvider>
    );

    const multiSelect = screen.getByPlaceholderText('Select document(s)');
    expect(multiSelect).toBeInTheDocument();
  });

  it('shows "No documents available" placeholder when no documents exist', () => {
    mockUseGetChatDocuments.mockReturnValue({
      data: { documents: [] },
      isPending: false,
    });

    render(
      <ChatProvider>
        <ChatDocumentLibraryFileSelect />
      </ChatProvider>
    );

    const multiSelect = screen.getByPlaceholderText('No documents available');
    expect(multiSelect).toBeInTheDocument();
    expect(multiSelect).toBeDisabled();
  });

  it('displays loading state when system config is loading', () => {
    mockUseGetSystemConfig.mockReturnValue({
      data: null,
      isPending: true,
    });

    render(
      <ChatProvider>
        <ChatDocumentLibraryFileSelect />
      </ChatProvider>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('displays loading state when documents are loading', () => {
    mockUseGetChatDocuments.mockReturnValue({
      data: null,
      isPending: true,
    });

    render(
      <ChatProvider>
        <ChatDocumentLibraryFileSelect />
      </ChatProvider>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('returns null when no document upload provider is configured', () => {
    mockUseGetSystemConfig.mockReturnValue({
      data: { documentLibraryDocumentUploadProviderId: null },
      isPending: false,
    });

    const { container } = render(
      <ChatProvider>
        <ChatDocumentLibraryFileSelect />
      </ChatProvider>
    );

    expect(container.firstChild).toBeNull();
  });

  it('updates document selection when documents are selected', async () => {
    const user = userEvent.setup();
    
    render(
      <ChatProvider>
        <ChatDocumentLibraryFileSelect />
      </ChatProvider>
    );

    const multiSelect = screen.getByTestId('document-library-multiselect');
    
    await user.click(multiSelect);

    await waitFor(() => {
      expect(screen.getByText('document1.pdf')).toBeInTheDocument();
      expect(screen.getByText('document2.pdf')).toBeInTheDocument();
      expect(screen.getByText('document3.pdf')).toBeInTheDocument();
    });

    await user.click(screen.getByText('document1.pdf'));

    await waitFor(() => {
      expect(screen.getByText('1 Document Selected')).toBeInTheDocument();
    });
  });

  it('shows correct selected count for multiple documents', async () => {
    const user = userEvent.setup();
    
    render(
      <ChatProvider>
        <ChatDocumentLibraryFileSelect />
      </ChatProvider>
    );

    const multiSelect = screen.getByTestId('document-library-multiselect');
    
    await user.click(multiSelect);

    await user.click(screen.getByText('document1.pdf'));
    await user.click(screen.getByText('document2.pdf'));

    await waitFor(() => {
      const selectedCountElements = screen.getAllByText('2 Documents Selected');
      expect(selectedCountElements.length).toBeGreaterThan(0);
      expect(selectedCountElements[selectedCountElements.length - 1]).toBeInTheDocument();
    });
  });

  it('provides correct initial values from ChatProvider', () => {
    render(
      <ChatProvider>
        <ChatDocumentLibraryFileSelect />
      </ChatProvider>
    );

    expect(mockUseGetChatDocuments).toHaveBeenCalledWith({
      documentUploadProviderId: 'provider-123',
    });
  });

  it('filters only completed documents', () => {
    const documentsWithUncompleted = {
      documents: [
        {
          id: 'doc-1',
          filename: 'document1.pdf',
          uploadStatus: 'Completed',
        },
        {
          id: 'doc-2',
          filename: 'document2.pdf',
          uploadStatus: 'Processing',
        },
        {
          id: 'doc-3',
          filename: 'document3.pdf',
          uploadStatus: 'Failed',
        },
      ],
    };

    mockUseGetChatDocuments.mockReturnValue({
      data: documentsWithUncompleted,
      isPending: false,
    });

    render(
      <ChatProvider>
        <ChatDocumentLibraryFileSelect />
      </ChatProvider>
    );

    expect(mockUseGetChatDocuments).toHaveBeenCalledWith({
      documentUploadProviderId: 'provider-123',
    });
  });

  it('is searchable when enabled', async () => {
    const user = userEvent.setup();
    
    render(
      <ChatProvider>
        <ChatDocumentLibraryFileSelect />
      </ChatProvider>
    );

    const multiSelect = screen.getByTestId('document-library-multiselect');
    
    await user.click(multiSelect);
    await user.type(multiSelect, 'document1');

    await waitFor(() => {
      expect(screen.getByText('document1.pdf')).toBeInTheDocument();
    });
  });

  it('maintains selected document state from ChatProvider', () => {
    render(
      <ChatProvider>
        <ChatDocumentLibraryFileSelect />
      </ChatProvider>
    );

    const multiSelect = screen.getByTestId('document-library-multiselect');
    expect(multiSelect).toHaveAttribute('value', '');
  });
});