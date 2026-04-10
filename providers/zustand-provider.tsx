"use client";

import { type ReactNode, createContext, useState, useContext } from "react";
import { useStore } from "zustand";

import { createProjectsStore, ProjectsStore } from "@/stores/projects-store";

export type ProjectsStoreApi = ReturnType<typeof createProjectsStore>;

export const ProjectsStoreContext = createContext<ProjectsStoreApi | undefined>(
  undefined,
);

export interface ProjectsStoreProviderProps {
  children: ReactNode;
}

export const ProjectsStoreProvider = ({
  children,
}: ProjectsStoreProviderProps) => {
  const [store] = useState(() => createProjectsStore());
  return (
    <ProjectsStoreContext.Provider value={store}>
      {children}
    </ProjectsStoreContext.Provider>
  );
};

export const useProjectsStore = <T,>(
  selector: (store: ProjectsStore) => T,
): T => {
  const projectsStoreContext = useContext(ProjectsStoreContext);
  if (!projectsStoreContext) {
    throw new Error(
      `useProjectsStore must be used within ProjectsStoreProvider`,
    );
  }

  return useStore(projectsStoreContext, selector);
};
