/**
 * @jest-environment node
 */
import { Prisma } from '@prisma/client';
import { PrismaError, handlePrismaError } from './prismaErrors';

describe('PrismaError', () => {
  it('creates an instance with the correct name and message', () => {
    const original = new Error('original');
    const error = new PrismaError('test message', original);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('PrismaError');
    expect(error.message).toBe('test message');
    expect(error.originalError).toBe(original);
  });

  it('stores non-Error originalError values', () => {
    const error = new PrismaError('msg', 'string-error');
    expect(error.originalError).toBe('string-error');
  });
});

describe('handlePrismaError', () => {
  it('returns mapped message for PrismaClientKnownRequestError with known code', () => {
    const error = new Prisma.PrismaClientKnownRequestError('raw', {
      code: 'P2002',
      clientVersion: '5.0.0',
    });
    expect(handlePrismaError(error)).toBe('Unique constraint violation');
  });

  it('returns mapped message for P2001 (record not found)', () => {
    const error = new Prisma.PrismaClientKnownRequestError('raw', {
      code: 'P2001',
      clientVersion: '5.0.0',
    });
    expect(handlePrismaError(error)).toBe('Required record not found');
  });

  it('returns mapped message for P1000 (connection error)', () => {
    const error = new Prisma.PrismaClientKnownRequestError('raw', {
      code: 'P1000',
      clientVersion: '5.0.0',
    });
    expect(handlePrismaError(error)).toBe('Unable to connect to the database');
  });

  it('returns fallback message for unknown Prisma error code', () => {
    const error = new Prisma.PrismaClientKnownRequestError('raw', {
      code: 'P9999',
      clientVersion: '5.0.0',
    });
    expect(handlePrismaError(error)).toBe('An unexpected database error occurred');
  });

  it('returns validation error message for PrismaClientValidationError', () => {
    const error = new Prisma.PrismaClientValidationError('validation failed', {
      clientVersion: '5.0.0',
    });
    expect(handlePrismaError(error)).toBe('The database query was invalid');
  });

  it('returns initialization error message for PrismaClientInitializationError', () => {
    const error = new Prisma.PrismaClientInitializationError('init failed', '5.0.0');
    expect(handlePrismaError(error)).toBe('The database could not be initialized');
  });

  it('returns critical error message for PrismaClientRustPanicError', () => {
    const error = new Prisma.PrismaClientRustPanicError('panic', '5.0.0');
    expect(handlePrismaError(error)).toBe('A critical database error occurred');
  });

  it('returns error.message for generic Error instances', () => {
    const error = new Error('some generic error');
    expect(handlePrismaError(error)).toBe('some generic error');
  });

  it('returns fallback message for non-Error values', () => {
    expect(handlePrismaError('string error')).toBe('An unexpected error occurred');
    expect(handlePrismaError(42)).toBe('An unexpected error occurred');
    expect(handlePrismaError(null)).toBe('An unexpected error occurred');
    expect(handlePrismaError(undefined)).toBe('An unexpected error occurred');
  });

  it('handles all connection-related error codes', () => {
    const connectionCodes = ['P1000', 'P1001', 'P1008', 'P1010', 'P1017'];
    const expectedMessages = [
      'Unable to connect to the database',
      'Unable to connect to the database',
      'Database operation timed out',
      'Access to the database was denied',
      'Server has closed connection',
    ];
    connectionCodes.forEach((code, idx) => {
      const error = new Prisma.PrismaClientKnownRequestError('raw', {
        code,
        clientVersion: '5.0.0',
      });
      expect(handlePrismaError(error)).toBe(expectedMessages[idx]);
    });
  });
});
