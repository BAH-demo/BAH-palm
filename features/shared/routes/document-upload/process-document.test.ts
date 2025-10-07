// Mock crypto module before imports
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomUUID: jest.fn(),
}));

import crypto from 'crypto';

import createDocument from '@/features/shared/dal/document-upload/createDocument';
import getDocuments from '@/features/shared/dal/document-upload/getDocuments';
import sharedRouter from '@/features/shared/routes';
import { ContextType } from '@/server/trpc-context';
import { getDocumentQueue } from '@/features/document-upload-provider/workers/documentQueue';
import { storage } from '@/server/storage/redis';

jest.mock('@/features/shared/dal/document-upload/createDocument');
jest.mock('@/features/shared/dal/document-upload/getDocuments');
jest.mock('@/features/document-upload-provider/workers/documentQueue');
jest.mock('@/server/storage/redis');
jest.mock('@/features/document-upload-provider/workers/documentWorker', () => ({
  startDocumentWorker: jest.fn().mockResolvedValue(undefined),
}));

describe('process-document route', () => {
  const mockDocumentUploadProviderId = 'c54a871d-bc7c-453e-8e39-5c4ac60cc2c0';
  const mockFileKey = 'uploads/user123/file.pdf';
  const mockDocumentId = 'd72f155f-7b9a-4ff5-9f08-7c7f0c02f93e';
  const mockJobId = 'job-123-456';
  
  const mockQueue = {
    add: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  
    (storage.hset as jest.Mock) = jest.fn().mockResolvedValue(undefined);
    
    (getDocumentQueue as jest.Mock).mockReturnValue(mockQueue);

    (crypto.randomUUID as jest.Mock).mockReturnValue(mockJobId);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('processes document successfully with queue', async () => {
    const userId = '97cc1d48-03df-4c18-9456-917c1ac78c77';
    
    (getDocuments as jest.Mock).mockResolvedValue([]);

    (createDocument as jest.Mock).mockResolvedValue({
      id: mockDocumentId,
      userId,
      filename: 'test.pdf',
    });
    
    mockQueue.add.mockResolvedValue(undefined);

    const ctx = { 
      userId,
      logger: {
        debug: jest.fn(),
      },
    } as unknown as ContextType;
    
    const caller = sharedRouter.createCaller(ctx);

    const result = await caller.processDocument({
      fileName: 'test.pdf',
      contentType: 'application/pdf',
      fileSize: 1024,
      fileKey: mockFileKey,
      documentUploadProviderId: mockDocumentUploadProviderId,
    });

    expect(result).toEqual({
      success: true,
      documentId: mockDocumentId,
      documentUploadProviderId: mockDocumentUploadProviderId,
      jobId: mockJobId,
      fileName: 'test.pdf',
      fileKey: mockFileKey,
      message: 'Document uploaded successfully and queued for processing',
    });

    expect(createDocument).toHaveBeenCalledWith({
      userId,
      filename: 'test.pdf',
      documentUploadProviderId: mockDocumentUploadProviderId,
    });

    expect(storage.hset).toHaveBeenCalledWith(
      `document-job:${mockJobId}`,
      expect.objectContaining({
        status: 'queued',
        documentId: mockDocumentId,
        documentUploadProviderId: mockDocumentUploadProviderId,
        fileKey: mockFileKey,
        fileName: 'test.pdf',
        contentType: 'application/pdf',
        fileSize: '1024',
        userId,
      })
    );

    expect(mockQueue.add).toHaveBeenCalledWith(
      'documentProcessingJob',
      {
        documentId: mockDocumentId,
        documentUploadProviderId: mockDocumentUploadProviderId,
        jobId: mockJobId,
        userId,
        fileKey: mockFileKey,
        fileName: 'test.pdf',
        contentType: 'application/pdf',
        fileSize: 1024,
      }
    );
  });

  it('processes document successfully without queue', async () => {
    const userId = '97cc1d48-03df-4c18-9456-917c1ac78c77';
    
    (getDocumentQueue as jest.Mock).mockReturnValue(null);
    
    (getDocuments as jest.Mock).mockResolvedValue([]);
    
    (createDocument as jest.Mock).mockResolvedValue({
      id: mockDocumentId,
      userId,
      filename: 'test.pdf',
    });

    const ctx = { 
      userId,
      logger: {
        debug: jest.fn(),
        warn: jest.fn(),
      },
    } as unknown as ContextType;
    
    const caller = sharedRouter.createCaller(ctx);

    const result = await caller.processDocument({
      fileName: 'test.pdf',
      contentType: 'application/pdf',
      fileSize: 1024,
      fileKey: mockFileKey,
      documentUploadProviderId: mockDocumentUploadProviderId,
    });

    expect(result).toEqual({
      success: true,
      documentId: mockDocumentId,
      documentUploadProviderId: mockDocumentUploadProviderId,
      jobId: null,
      fileName: 'test.pdf',
      fileKey: mockFileKey,
      message: 'Document uploaded successfully and queued for processing',
    });

    expect(ctx.logger.warn).toHaveBeenCalledWith(
      'Document queue not available - file uploaded but processing will not start',
    );
  });

  it('throws error for duplicate file', async () => {
    const userId = '97cc1d48-03df-4c18-9456-917c1ac78c77';
    
    (getDocuments as jest.Mock).mockResolvedValue([
      {
        id: 'existing-id',
        userId,
        filename: 'test.pdf',
      },
    ]);

    const ctx = { 
      userId,
      logger: {
        debug: jest.fn(),
      },
    } as unknown as ContextType;
    
    const caller = sharedRouter.createCaller(ctx);

    await expect(
      caller.processDocument({
        fileName: 'test.pdf',
        contentType: 'application/pdf',
        fileSize: 1024,
        fileKey: mockFileKey,
        documentUploadProviderId: mockDocumentUploadProviderId,
      })
    ).rejects.toThrow('Unable to process "test.pdf" because this file already exists in your library.');
  });

  it('throws error when document creation fails', async () => {
    const userId = '97cc1d48-03df-4c18-9456-917c1ac78c77';
    const mockError = new Error('Database error');
  
    (getDocuments as jest.Mock).mockResolvedValue([]);
    
    (createDocument as jest.Mock).mockRejectedValue(mockError);

    const ctx = { 
      userId,
      logger: {
        debug: jest.fn(),
        error: jest.fn(),
      },
    } as unknown as ContextType;
    
    const caller = sharedRouter.createCaller(ctx);

    await expect(
      caller.processDocument({
        fileName: 'test.pdf',
        contentType: 'application/pdf',
        fileSize: 1024,
        fileKey: mockFileKey,
        documentUploadProviderId: mockDocumentUploadProviderId,
      })
    ).rejects.toThrow('Failed to confirm document upload.');

    expect(ctx.logger.error).toHaveBeenCalledWith('Error confirming upload:', mockError);
  });
});
