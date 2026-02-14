import { TRPCError } from '@trpc/server';
import {
  NotFound,
  Forbidden,
  Unauthorized,
  BadRequest,
  InternalServerError,
} from './routeErrors';

describe('routeErrors', () => {
  describe('NotFound', () => {
    it('creates a TRPCError with NOT_FOUND code', () => {
      const error = NotFound('resource missing');
      expect(error).toBeInstanceOf(TRPCError);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('resource missing');
    });
  });

  describe('Forbidden', () => {
    it('creates a TRPCError with FORBIDDEN code', () => {
      const error = Forbidden('access denied');
      expect(error).toBeInstanceOf(TRPCError);
      expect(error.code).toBe('FORBIDDEN');
      expect(error.message).toBe('access denied');
    });
  });

  describe('Unauthorized', () => {
    it('creates a TRPCError with UNAUTHORIZED code', () => {
      const error = Unauthorized('not authenticated');
      expect(error).toBeInstanceOf(TRPCError);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.message).toBe('not authenticated');
    });
  });

  describe('BadRequest', () => {
    it('creates a TRPCError with BAD_REQUEST code', () => {
      const error = BadRequest('invalid input');
      expect(error).toBeInstanceOf(TRPCError);
      expect(error.code).toBe('BAD_REQUEST');
      expect(error.message).toBe('invalid input');
    });
  });

  describe('InternalServerError', () => {
    it('creates a TRPCError with INTERNAL_SERVER_ERROR code', () => {
      const error = InternalServerError('something broke');
      expect(error).toBeInstanceOf(TRPCError);
      expect(error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(error.message).toBe('something broke');
    });
  });

  it('all error factories accept empty string messages', () => {
    expect(NotFound('').message).toBe('');
    expect(Forbidden('').message).toBe('');
    expect(Unauthorized('').message).toBe('');
    expect(BadRequest('').message).toBe('');
    expect(InternalServerError('').message).toBe('');
  });

  it('all error factories accept long messages', () => {
    const longMsg = 'x'.repeat(10000);
    expect(NotFound(longMsg).message).toBe(longMsg);
  });
});
