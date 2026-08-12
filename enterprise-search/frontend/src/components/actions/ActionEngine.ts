import type { AssistantAction, WorkflowId } from '@/types';
import { apiService } from '@/services';
import { useUIStore } from '@/store/uiStore';

// Central action dispatcher. Called by any component that renders an AssistantAction.
// Each action type maps to a concrete behavior so buttons are never non-functional.

interface ActionContext {
  navigate: (path: string) => void;
  openDocument: (id: string) => void;
  openModal?: (modal: string, payload?: unknown) => void;
}

export async function executeAction(action: AssistantAction, ctx: ActionContext) {
  const { pushToast, updateToast, dismissToast } = useUIStore.getState();

  switch (action.type) {
    case 'navigate':
    case 'link':
      ctx.navigate(action.target);
      break;

    case 'open_document':
      ctx.openDocument(action.target);
      break;

    case 'open_modal':
      ctx.openModal?.(action.target);
      break;

    case 'workflow': {
      const workflowId = action.target as WorkflowId;
      const toastId = pushToast({
        title: 'Processing…',
        description: action.label,
        variant: 'loading',
      });
      try {
        const res = await apiService.runWorkflow({ workflowId });
        updateToast(toastId, {
          title: 'Done',
          description: res.result.message,
          variant: 'success',
        });
        // Side-effects for known workflows
        if (workflowId === 'apply_leave') {
          setTimeout(() => ctx.openModal?.('leave_form'), 600);
        }
      } catch {
        updateToast(toastId, {
          title: 'Action failed',
          description: 'The workflow could not complete. You are in demo mode.',
          variant: 'error',
        });
        setTimeout(() => dismissToast(toastId), 5000);
      }
      break;
    }
  }
}
