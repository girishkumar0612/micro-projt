import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import type { AssistantAction } from '@/types';
import { executeAction } from './ActionEngine';

// Shared hook so any component can run an action with the right context.
export function useActionRunner(
  onOpenDocument: (id: string) => void,
  onOpenModal?: (name: string, payload?: unknown) => void,
) {
  const navigate = useNavigate();

  const run = useCallback(
    async (action: AssistantAction) => {
      await executeAction(action, {
        navigate,
        openDocument: onOpenDocument,
        openModal: onOpenModal,
      });
    },
    [navigate, onOpenDocument, onOpenModal],
  );

  return { run };
}
