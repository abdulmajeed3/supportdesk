import { BadRequestException } from '@nestjs/common';
import { TicketStatus } from '@prisma/client';

/**
 * Defines valid status transitions for the ticket lifecycle.
 *
 * Lifecycle:
 *  OPEN → IN_PROGRESS | WAITING_FOR_CUSTOMER | RESOLVED | CLOSED
 *  IN_PROGRESS → WAITING_FOR_CUSTOMER | RESOLVED | CLOSED | OPEN
 *  WAITING_FOR_CUSTOMER → IN_PROGRESS | RESOLVED | CLOSED | OPEN
 *  RESOLVED → CLOSED | OPEN  (customers can reopen)
 *  CLOSED → (terminal — cannot be reopened via status change)
 *
 * Customers may only transition: RESOLVED → OPEN (reopen)
 * Agents/Admins may use any valid transition above.
 */

const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.OPEN]: [
    TicketStatus.IN_PROGRESS,
    TicketStatus.WAITING_FOR_CUSTOMER,
    TicketStatus.RESOLVED,
    TicketStatus.CLOSED,
  ],
  [TicketStatus.IN_PROGRESS]: [
    TicketStatus.OPEN,
    TicketStatus.WAITING_FOR_CUSTOMER,
    TicketStatus.RESOLVED,
    TicketStatus.CLOSED,
  ],
  [TicketStatus.WAITING_FOR_CUSTOMER]: [
    TicketStatus.OPEN,
    TicketStatus.IN_PROGRESS,
    TicketStatus.RESOLVED,
    TicketStatus.CLOSED,
  ],
  [TicketStatus.RESOLVED]: [TicketStatus.OPEN, TicketStatus.CLOSED],
  [TicketStatus.CLOSED]: [],
};

// Customers may only reopen a resolved ticket
const CUSTOMER_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.OPEN]: [],
  [TicketStatus.IN_PROGRESS]: [],
  [TicketStatus.WAITING_FOR_CUSTOMER]: [TicketStatus.IN_PROGRESS],
  [TicketStatus.RESOLVED]: [TicketStatus.OPEN],
  [TicketStatus.CLOSED]: [],
};

export function assertValidTransition(
  from: TicketStatus,
  to: TicketStatus,
  isAgent: boolean,
): void {
  const allowed = isAgent ? VALID_TRANSITIONS[from] : CUSTOMER_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new BadRequestException(
      `Invalid status transition from ${from} to ${to}. ` +
        `Allowed: ${allowed.join(', ') || 'none'}`,
    );
  }
}
