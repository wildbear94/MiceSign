import { describe, it } from 'vitest';

describe('ApprovalLineEditor', () => {
  // APR-01: User can build an approval line selecting approvers
  it.todo('renders empty state when no approvers added');
  it.todo('calls onAdd when user is selected from org picker');
  it.todo('prevents adding drafter (self) to approval line (D-05)');
  it.todo('prevents adding duplicate user to approval line (D-08)');
  it.todo('enforces maximum 10 approvers limit (D-09)');
  it.todo('allows drag-and-drop reorder of sequential approvers (D-03)');
  it.todo('separates REFERENCE items into distinct section (D-10)');
  it.todo('defaults new approver type to APPROVE (D-06)');

  // APR-02: Sequential processing types
  it.todo('assigns sequential stepOrder to APPROVE and AGREE types');
  it.todo('assigns stepOrder 0 to REFERENCE type');
});

describe('toApprovalLineRequests', () => {
  it.todo('converts ApprovalLineItem[] to ApprovalLineRequest[] with correct stepOrder');
  it.todo('assigns stepOrder 0 to REFERENCE items');
});

describe('toApprovalLineItems', () => {
  it.todo('converts ApprovalLineResponse[] back to ApprovalLineItem[]');
});
