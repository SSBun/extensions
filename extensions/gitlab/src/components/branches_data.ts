import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useRef } from "react";
import { Branch, Project } from "../gitlabapi";
import { getErrorMessage } from "../utils";
import { BRANCH_LIST_PAGE_SIZE, fetchBranchesGqlPage, resetBranchRules } from "./branches_gql";
import { hasMoreWithinLimit } from "../limits";

export type ListPagination = List.Props["pagination"];

export function usePaginatedBranches(options: { project: Project; search: string; cacheKey: string }): {
  branches: Branch[];
  isLoading: boolean;
  error: string | undefined;
  performRefetch: () => void;
  pagination: ListPagination;
} {
  const projectRef = useRef(options.project);
  projectRef.current = options.project;
  const searchRef = useRef(options.search);
  searchRef.current = options.search;

  useEffect(() => () => resetBranchRules(options.project.id), [options.project.id]);

  const { data, isLoading, error, revalidate, pagination } = useCachedPromise(
    (cacheKey: string) => async (paginationOptions: { page: number }) => {
      void cacheKey;
      const { branches, hasMore } = await fetchBranchesGqlPage({
        project: projectRef.current,
        search: searchRef.current,
        page: paginationOptions.page,
      });
      return {
        data: branches,
        hasMore: hasMoreWithinLimit(hasMore, paginationOptions.page, BRANCH_LIST_PAGE_SIZE),
      };
    },
    [options.cacheKey],
    { initialData: [], keepPreviousData: true },
  );

  return {
    branches: data,
    isLoading,
    error: error ? getErrorMessage(error) : undefined,
    performRefetch: revalidate,
    pagination,
  };
}
