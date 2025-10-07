import { z } from 'zod';
import crypto from 'crypto';

import { procedure } from '@/server/trpc';
import { storage } from '@/server/storage/redis';
import { getDocumentQueue } from '@/features/document-upload-provider/workers/documentQueue';
import createDocument from '@/features/shared/dal/document-upload/createDocument';
import { BadRequest } from '@/features/shared/errors/routeErrors';
import getDocuments from '@/features/shared/dal/document-upload/getDocuments';

const processDocumentSchema = z.object({
  fileName: z.string(),
  contentType: z.string(),
  fileSize: z.number(),
  fileKey: z.string(),
  documentUploadProviderId: z.string(),
});

export default procedure
  .input(processDocumentSchema)
  .mutation(async ({ ctx, input }) => {
    // Ensure document worker is running (lazy-loaded to avoid Jest issues)
    try {
      const { startDocumentWorker } = await import('@/features/document-upload-provider/workers/documentWorker');
      startDocumentWorker().catch((err) => {
        if (!err.message.includes('Worker is already running')) {
          ctx.logger.debug('Failed to start document worker:', err);
        }
      });
    } catch (error) {
      ctx.logger.debug('Could not start document worker:', error);
    }

    const { fileName, contentType, fileSize, fileKey, documentUploadProviderId } = input;

    // Check for duplicates
    const existingDocuments = await getDocuments({
      userId: ctx.userId,
      documentUploadProviderId,
    });

    const duplicateRecordExists = existingDocuments.some((document) => fileName === document.filename);
    if (duplicateRecordExists) {
      throw BadRequest(`Unable to process "${fileName}" because this file already exists in your library.`);
    }

    try {
      ctx.logger.debug(`File uploaded to S3: ${fileName}`);

      // Create database record
      const document = await createDocument({
        userId: ctx.userId,
        filename: fileName,
        documentUploadProviderId,
      });

      ctx.logger.debug(`Document created in database: ${document.id}`);

      // Start processing job
      const jobId = crypto.randomUUID();
      const queue = getDocumentQueue();

      if (queue) {
        // Store job metadata in Redis
        await storage.hset(`document-job:${jobId}`, {
          status: 'queued',
          created: Date.now(),
          progress: 'File uploaded, queued for processing...',
          documentId: document.id,
          documentUploadProviderId,
          fileKey,
          fileName,
          contentType,
          fileSize: fileSize.toString(),
          userId: ctx.userId,
        });

        // Add job to queue - this will notify the worker
        await queue.add('documentProcessingJob', {
          documentId: document.id,
          documentUploadProviderId,
          jobId,
          userId: ctx.userId,
          fileKey,
          fileName,
          contentType,
          fileSize,
        });

        ctx.logger.debug(`Document processing job queued: ${jobId} for document: ${document.id}`);
      } else {
        ctx.logger.warn(
          'Document queue not available - file uploaded but processing will not start'
        );
      }

      return {
        success: true,
        documentId: document.id,
        documentUploadProviderId,
        jobId: queue ? jobId : null,
        fileName,
        fileKey,
        message: 'Document uploaded successfully and queued for processing',
      };
    } catch (error) {
      ctx.logger.error('Error confirming upload:', error);
      throw new Error('Failed to confirm document upload.');
    }
  });
