import type { Control } from 'react-hook-form';
import type { FieldDefinition } from '../../types/dynamicForm';

interface DynamicTableFieldProps {
  field: FieldDefinition;
  control: Control<Record<string, unknown>>;
  disabled?: boolean;
}

// Stub: 실제 구현은 Plan 24.1-02 Task 2에서 완성한다.
export default function DynamicTableField(_props: DynamicTableFieldProps) {
  return null;
}
