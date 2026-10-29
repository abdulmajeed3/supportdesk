import { describe, it, expect } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { TicketStatus } from '@prisma/client';
import { assertValidTransition } from './ticket-lifecycle';

describe('assertValidTransition', () => {
  describe('agent transitions', () => {
    it('allows OPEN → IN_PROGRESS', () => {
      expect(() => assertValidTransition(TicketStatus.OPEN, TicketStatus.IN_PROGRESS, true)).not.toThrow();
    });

    it('allows OPEN → RESOLVED', () => {
      expect(() => assertValidTransition(TicketStatus.OPEN, TicketStatus.RESOLVED, true)).not.toThrow();
    });

    it('allows IN_PROGRESS → WAITING_FOR_CUSTOMER', () => {
      expect(() =>
        assertValidTransition(TicketStatus.IN_PROGRESS, TicketStatus.WAITING_FOR_CUSTOMER, true),
      ).not.toThrow();
    });

    it('allows RESOLVED → CLOSED', () => {
      expect(() => assertValidTransition(TicketStatus.RESOLVED, TicketStatus.CLOSED, true)).not.toThrow();
    });

    it('rejects CLOSED → any status', () => {
      expect(() => assertValidTransition(TicketStatus.CLOSED, TicketStatus.OPEN, true)).toThrow(
        BadRequestException,
      );
    });

    it('rejects OPEN → OPEN (same state)', () => {
      expect(() => assertValidTransition(TicketStatus.OPEN, TicketStatus.OPEN, true)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('customer transitions', () => {
    it('allows RESOLVED → OPEN (reopen)', () => {
      expect(() => assertValidTransition(TicketStatus.RESOLVED, TicketStatus.OPEN, false)).not.toThrow();
    });

    it('rejects customer trying to OPEN → IN_PROGRESS', () => {
      expect(() => assertValidTransition(TicketStatus.OPEN, TicketStatus.IN_PROGRESS, false)).toThrow(
        BadRequestException,
      );
    });

    it('rejects customer trying to set RESOLVED → CLOSED', () => {
      expect(() => assertValidTransition(TicketStatus.RESOLVED, TicketStatus.CLOSED, false)).toThrow(
        BadRequestException,
      );
    });

    it('rejects customer reopening a CLOSED ticket', () => {
      expect(() => assertValidTransition(TicketStatus.CLOSED, TicketStatus.OPEN, false)).toThrow(
        BadRequestException,
      );
    });

    it('allows WAITING_FOR_CUSTOMER → IN_PROGRESS for customer', () => {
      expect(() =>
        assertValidTransition(TicketStatus.WAITING_FOR_CUSTOMER, TicketStatus.IN_PROGRESS, false),
      ).not.toThrow();
    });
  });
});
