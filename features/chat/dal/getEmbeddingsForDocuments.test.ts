import { ContextType } from '@/features/chat/types/message';

jest.mock('@/server/db', () => ({
  __esModule: true,
  default: {
    $queryRaw: jest.fn(),
  },
}));

jest.mock('@/features/shared/dal/getSystemConfig');

jest.mock('@/server/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import getEmbeddingsForDocuments, { EmbeddingResult, GetEmbeddingsForDocumentsParams } from './getEmbeddingsForDocuments';
import db from '@/server/db';
import logger from '@/server/logger';
import getSystemConfig from '@/features/shared/dal/getSystemConfig';

const mockQueryRaw = (db as any).$queryRaw as jest.Mock;

describe('getEmbeddingsForDocuments DAL', () => {
  const mockUserId = '6435b69e-3757-47a2-bacf-d4efdd85a32e';
  const mockDocumentLibraryProviderId = '8435b69e-3757-47a2-bacf-d4efdd85a32e';
  const mockEmbeddedQuery = [0.1, 0.2, 0.3, 0.4, 0.5];
  const mockDocumentIds = ['7324a58e-3757-47a2-bacf-d4efdd85a32e', '6213f47d-3757-47a2-bacf-d4efdd85a32e'];

  const mockRawResults = [
    {
      id: '1435b69e-3757-47a2-bacf-d4efdd85a32e',
      content: 'This is test content 1',
      score: 0.85,
      documentLabel: 'test-document-1.pdf',
      documentId: '7324a58e-3757-47a2-bacf-d4efdd85a32e',
    },
    {
      id: '2435b69e-3757-47a2-bacf-d4efdd85a32e',
      content: 'This is test content 2',
      score: 0.75,
      documentLabel: 'test-document-2.pdf',
      documentId: '6213f47d-3757-47a2-bacf-d4efdd85a32e',
    },
  ];

  const mockEmbeddingResults: EmbeddingResult[] = [
    {
      id: '1435b69e-3757-47a2-bacf-d4efdd85a32e',
      score: 0.85,
      citation: {
        contextType: ContextType.DOCUMENT_LIBRARY,
        citation: 'This is test content 1',
        sourceLabel: 'test-document-1.pdf',
        documentId: '7324a58e-3757-47a2-bacf-d4efdd85a32e',
      },
    },
    {
      id: '2435b69e-3757-47a2-bacf-d4efdd85a32e',
      score: 0.75,
      citation: {
        contextType: ContextType.DOCUMENT_LIBRARY,
        citation: 'This is test content 2',
        sourceLabel: 'test-document-2.pdf',
        documentId: '6213f47d-3757-47a2-bacf-d4efdd85a32e',
      },
    },
  ];

  const mockSystemConfig = {
    documentLibraryDocumentUploadProviderId: mockDocumentLibraryProviderId,
  };

  const mockGetSystemConfig = getSystemConfig as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSystemConfig.mockResolvedValue(mockSystemConfig);
  });

  describe('No errors', () => {
    it('should successfully retrieve embeddings with default parameters', async () => {
      mockQueryRaw.mockResolvedValue(mockRawResults);

      const params: GetEmbeddingsForDocumentsParams = {
        userId: mockUserId,
        embeddedQuery: mockEmbeddedQuery,
        documentIds: mockDocumentIds,
      };

      const result = await getEmbeddingsForDocuments(params);

      expect(result).toEqual(mockEmbeddingResults);
      expect(mockGetSystemConfig).toHaveBeenCalledTimes(1);
      expect(mockQueryRaw).toHaveBeenCalledTimes(1);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should successfully retrieve embeddings with custom parameters', async () => {
      mockQueryRaw.mockResolvedValue(mockRawResults);

      const params: GetEmbeddingsForDocumentsParams = {
        userId: mockUserId,
        embeddedQuery: mockEmbeddedQuery,
        documentIds: mockDocumentIds,
        minThreshold: 0.7,
        matchCount: 5,
      };

      const result = await getEmbeddingsForDocuments(params);

      expect(result).toEqual(mockEmbeddingResults);
      expect(logger.info).toHaveBeenCalledWith(
        `Querying embeddings for user ${mockUserId} with provider ${mockDocumentLibraryProviderId}, threshold 0.7, document IDs: ${mockDocumentIds.join(', ')}`
      );
    });

    it('should handle empty results successfully', async () => {
      mockQueryRaw.mockResolvedValue([]);

      const params: GetEmbeddingsForDocumentsParams = {
        userId: mockUserId,
        embeddedQuery: mockEmbeddedQuery,
        documentIds: mockDocumentIds,
      };

      const result = await getEmbeddingsForDocuments(params);

      expect(result).toEqual([]);
      expect(logger.info).toHaveBeenCalledWith('Found 0 matching embeddings from specific documents');
    });

    it('should return empty array when no document IDs provided', async () => {
      const params: GetEmbeddingsForDocumentsParams = {
        userId: mockUserId,
        embeddedQuery: mockEmbeddedQuery,
        documentIds: [],
      };

      const result = await getEmbeddingsForDocuments(params);

      expect(result).toEqual([]);
      expect(logger.info).toHaveBeenCalledWith('No document IDs provided, returning empty results');
      expect(mockQueryRaw).not.toHaveBeenCalled();
    });
  });

  describe('System Configuration Edge Cases', () => {
    it('should throw error when no document library provider is configured', async () => {
      const configWithoutProvider = {
        ...mockSystemConfig,
        documentLibraryDocumentUploadProviderId: null,
      };
      mockGetSystemConfig.mockResolvedValue(configWithoutProvider);

      const params: GetEmbeddingsForDocumentsParams = {
        userId: mockUserId,
        embeddedQuery: mockEmbeddedQuery,
        documentIds: mockDocumentIds,
      };

      await expect(getEmbeddingsForDocuments(params)).rejects.toThrow(
        /document library must be configured/i
      );

      expect(logger.warn).toHaveBeenCalledWith('No document library provider configured in system config');
      expect(mockQueryRaw).not.toHaveBeenCalled();
    });

    it('should throw error when document library provider is empty string', async () => {
      const configWithEmptyProvider = {
        ...mockSystemConfig,
        documentLibraryDocumentUploadProviderId: '',
      };
      mockGetSystemConfig.mockResolvedValue(configWithEmptyProvider);

      const params: GetEmbeddingsForDocumentsParams = {
        userId: mockUserId,
        embeddedQuery: mockEmbeddedQuery,
        documentIds: mockDocumentIds,
      };

      await expect(getEmbeddingsForDocuments(params)).rejects.toThrow(
        /document library must be configured/i
      );

      expect(logger.warn).toHaveBeenCalledWith('No document library provider configured in system config');
      expect(mockQueryRaw).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle system config retrieval error', async () => {
      const systemConfigError = new Error('System config fetch failed');
      mockGetSystemConfig.mockRejectedValue(systemConfigError);

      const params: GetEmbeddingsForDocumentsParams = {
        userId: mockUserId,
        embeddedQuery: mockEmbeddedQuery,
        documentIds: mockDocumentIds,
      };

      await expect(getEmbeddingsForDocuments(params)).rejects.toThrow(
        /problem retrieving the document library/i
      );

      expect(logger.error).toHaveBeenCalledWith('There was a problem retrieving the document library', systemConfigError);
    });

    it('should handle database query error', async () => {
      const dbError = new Error('Database connection failed');
      mockQueryRaw.mockRejectedValue(dbError);

      const params: GetEmbeddingsForDocumentsParams = {
        userId: mockUserId,
        embeddedQuery: mockEmbeddedQuery,
        documentIds: mockDocumentIds,
      };

      await expect(getEmbeddingsForDocuments(params)).rejects.toThrow('Error retrieving embeddings from specific documents');

      expect(logger.error).toHaveBeenCalledWith('Error retrieving embeddings from specific documents', {
        userId: mockUserId,
        documentIds: mockDocumentIds,
        minThreshold: 0.3,
        matchCount: 10,
        error: dbError,
      });
    });

    it('should handle vector conversion with complex numbers', async () => {
      mockQueryRaw.mockResolvedValue(mockRawResults);

      const complexEmbedding = [0.123456789, -0.987654321, 1.0, 0.0, -1.0];
      const params: GetEmbeddingsForDocumentsParams = {
        userId: mockUserId,
        embeddedQuery: complexEmbedding,
        documentIds: mockDocumentIds,
      };

      const result = await getEmbeddingsForDocuments(params);

      expect(result).toEqual(mockEmbeddingResults);
      expect(mockQueryRaw).toHaveBeenCalledTimes(1);

      const queryCall = mockQueryRaw.mock.calls[0];
      expect(queryCall.length).toBeGreaterThan(0);
    });
  });

  describe('Security Validation', () => {
    it('should call query with proper parameters for user ownership and provider constraints', async () => {
      mockQueryRaw.mockResolvedValue(mockRawResults);

      const params: GetEmbeddingsForDocumentsParams = {
        userId: mockUserId,
        embeddedQuery: mockEmbeddedQuery,
        documentIds: mockDocumentIds,
      };

      await getEmbeddingsForDocuments(params);

      expect(mockQueryRaw).toHaveBeenCalledTimes(1);
      const queryCall = mockQueryRaw.mock.calls[0];

      expect(Array.isArray(queryCall[0])).toBe(true);
      expect(queryCall[0].length).toBeGreaterThan(1);

      const sqlTemplate = queryCall[0].join('${...}');
      expect(sqlTemplate).toContain('SELECT');
      expect(sqlTemplate).toContain('FROM "Embedding" e');
      expect(sqlTemplate).toContain('INNER JOIN "Document" d');
      expect(sqlTemplate).toContain('INNER JOIN "DocumentUploadProvider" dup');
      expect(sqlTemplate).toContain('WHERE d."userId" =');
      expect(sqlTemplate).toContain('AND dup.id =');
      expect(sqlTemplate).toContain('AND dup."deletedAt" IS NULL');
      expect(sqlTemplate).toContain('AND d.id = ANY(');
      expect(sqlTemplate).toContain('ORDER BY score DESC');
      expect(sqlTemplate).toContain('LIMIT');
    });

    it('should pass correct parameters to the query including document IDs', async () => {
      mockQueryRaw.mockResolvedValue(mockRawResults);

      const customThreshold = 0.8;
      const customLimit = 15;
      const params: GetEmbeddingsForDocumentsParams = {
        userId: mockUserId,
        embeddedQuery: mockEmbeddedQuery,
        documentIds: mockDocumentIds,
        minThreshold: customThreshold,
        matchCount: customLimit,
      };

      await getEmbeddingsForDocuments(params);

      expect(mockQueryRaw).toHaveBeenCalledTimes(1);
      const queryCall = mockQueryRaw.mock.calls[0];

      expect(queryCall.length).toBeGreaterThan(1);
      expect(logger.info).toHaveBeenCalledWith(
        `Querying embeddings for user ${mockUserId} with provider ${mockDocumentLibraryProviderId}, threshold ${customThreshold}, document IDs: ${mockDocumentIds.join(', ')}`
      );
    });

    it('should execute query with vector similarity calculation and document ID filtering', async () => {
      mockQueryRaw.mockResolvedValue(mockRawResults);

      const params: GetEmbeddingsForDocumentsParams = {
        userId: mockUserId,
        embeddedQuery: mockEmbeddedQuery,
        documentIds: mockDocumentIds,
      };

      await getEmbeddingsForDocuments(params);

      const queryCall = mockQueryRaw.mock.calls[0];
      const sqlTemplate = queryCall[0].join('${...}');

      expect(sqlTemplate).toContain('e.embedding <=>');
      expect(sqlTemplate).toContain('::vector');
      expect(sqlTemplate).toContain('score');
      expect(sqlTemplate).toContain('ANY(');
      expect(sqlTemplate).toContain('::uuid[]');
    });
  });

  describe('Document ID Filtering', () => {
    it('should handle single document ID', async () => {
      mockQueryRaw.mockResolvedValue([mockRawResults[0]]);

      const singleDocumentId = ['7324a58e-3757-47a2-bacf-d4efdd85a32e'];
      const params: GetEmbeddingsForDocumentsParams = {
        userId: mockUserId,
        embeddedQuery: mockEmbeddedQuery,
        documentIds: singleDocumentId,
      };

      const result = await getEmbeddingsForDocuments(params);

      expect(result).toEqual([mockEmbeddingResults[0]]);
      expect(logger.info).toHaveBeenCalledWith(
        `Querying embeddings for user ${mockUserId} with provider ${mockDocumentLibraryProviderId}, threshold 0.3, document IDs: ${singleDocumentId.join(', ')}`
      );
    });

    it('should handle multiple document IDs', async () => {
      mockQueryRaw.mockResolvedValue(mockRawResults);

      const multipleDocumentIds = [
        '7324a58e-3757-47a2-bacf-d4efdd85a32e',
        '6213f47d-3757-47a2-bacf-d4efdd85a32e',
        'a123b456-3757-47a2-bacf-d4efdd85a32e',
      ];
      const params: GetEmbeddingsForDocumentsParams = {
        userId: mockUserId,
        embeddedQuery: mockEmbeddedQuery,
        documentIds: multipleDocumentIds,
      };

      const result = await getEmbeddingsForDocuments(params);

      expect(result).toEqual(mockEmbeddingResults);
      expect(logger.info).toHaveBeenCalledWith(
        `Querying embeddings for user ${mockUserId} with provider ${mockDocumentLibraryProviderId}, threshold 0.3, document IDs: ${multipleDocumentIds.join(', ')}`
      );
    });
  });
});