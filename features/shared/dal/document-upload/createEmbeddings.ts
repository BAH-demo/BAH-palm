import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

import db from '@/server/db';
import { TextChunk, EmbeddingResponse } from '@/features/document-upload-provider/sources/types';
import logger from '@/server/logger';

type CreateEmbeddingsInput = {
  embeddings: EmbeddingResponse[],
  chunks: TextChunk[],
  documentId: string,
}

export default async function createEmbeddings({
  embeddings,
  chunks,
  documentId,
}: CreateEmbeddingsInput) {

  return await db.$transaction(async (tx) => {
    try {
      for (let i=0; i < embeddings.length; i++) {
        const id = randomUUID();
        const embedding = embeddings[i].embedding;
        const { content, index: contentNum } = chunks[i];

        if (!embedding.every(val => typeof val === 'number' && !isNaN(val))) {
          throw new Error('Invalid embedding values detected');
        }
        
        // Format the embedding array as a PostgreSQL vector string
        const vectorString = `[${embedding.join(',')}]`;

        await tx.$executeRaw(Prisma.sql`INSERT INTO "Embedding"
          ("id", "embedding", "content", "contentNum", "documentId")
          VALUES (${Prisma.sql`${id}::uuid`}, ${Prisma.sql`${vectorString}::vector`}, ${content}, ${contentNum}, ${Prisma.sql`${documentId}::uuid`})
        `);
      }

      return {
        count: embeddings.length,
      };
    } catch (error) {
      logger.error(`There was a problem creating embeddings for document ${documentId}`, error);
      throw new Error('There was a problem creating the embeddings');
    }
  });
}
