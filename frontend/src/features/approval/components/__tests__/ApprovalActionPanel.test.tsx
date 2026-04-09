import { describe, it } from 'vitest';

describe('ApprovalActionPanel', () => {
  // APR-03: Approver can approve or reject
  it.todo('shows approve and reject buttons when canApprove is true');
  it.todo('shows "not your turn" message when canApprove is false (D-14)');
  it.todo('calls approve mutation on approve button click (D-15)');
  it.todo('shows success message after approve');

  // APR-04: Rejection with mandatory comment
  it.todo('requires comment for rejection (D-12)');
  it.todo('shows error when rejecting without comment');
  it.todo('shows confirmation dialog before rejection (D-17)');
  it.todo('calls reject mutation with comment after confirmation');
  it.todo('disables buttons during pending mutation');
});
