import { createStore } from "zustand";

export interface IProject {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
}

export interface IProjectsState {
  projects: IProject[];
}

export interface IProjectsActions {
  appendProject: (project: IProject) => void;
  deleteProject: (id: string) => void;
}

export type ProjectsStore = IProjectsState & IProjectsActions;

export const defaultInitState: IProject[] = [];

export const createProjectsStore = (
  initState: IProject[] = defaultInitState,
) => {
  return createStore<ProjectsStore>((set) => ({
    projects: initState,
    appendProject: (project: IProject) =>
      set((state) => ({
        projects: [...state.projects, project],
      })),
    deleteProject: (id: string) =>
      set((state) => ({
        projects: state.projects.filter((project) => project.id !== id),
      })),
  }));
};
