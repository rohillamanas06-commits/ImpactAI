import { useOutletContext } from 'react-router-dom';
import type { ProjectDetail } from '../api/types';

export interface ProjectOutletContext {
  project: ProjectDetail;
  refetchProject: () => void;
}

export function useProjectContext() {
  return useOutletContext<ProjectOutletContext>();
}
