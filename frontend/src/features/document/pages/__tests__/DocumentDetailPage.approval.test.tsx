import { describe, it } from 'vitest';

describe('DocumentDetailPage - Approval Actions', () => {
  // APR-06: Withdrawal
  it.todo('shows withdraw button when drafter and next approver has not acted (D-18, D-19)');
  it.todo('hides withdraw button when condition not met (D-19)');
  it.todo('shows confirmation dialog on withdraw click (D-20)');
  it.todo('calls withdraw mutation on confirm');
  it.todo('stays on page after withdrawal (D-22)');

  // APR-07: Resubmission
  it.todo('shows resubmit button on REJECTED document for drafter (D-23)');
  it.todo('shows resubmit button on WITHDRAWN document for drafter (D-23)');
  it.todo('calls rewrite mutation on resubmit click');
  it.todo('navigates to new draft editor after resubmit (D-26)');
});
