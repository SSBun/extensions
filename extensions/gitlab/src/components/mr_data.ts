import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useRef } from "react";
import { gitlab } from "../common";
import { Group, jsonDataToMergeRequest, MergeRequest, Project } from "../gitlabapi";
import { getErrorMessage } from "../utils";
import { MRScope } from "./mr";
import { fetchMergeRequestsGqlPage, MR_LIST_PAGE_SIZE, resetMRListGqlCursors } from "./mr_gql";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type ListPagination = List.Props["pagination"];

/**
 * Paginated Merge Request data provider backed by `useCachedPromise`.
 * The fetch function is kept constant (per `useCachedPromise` contract): `cacheKey`
 * drives revalidation, while `buildParams`/`project`/`group` are read through refs so the
 * latest values are used without recreating the function.
 */
export function usePaginatedMergeRequests(options: {
  cacheKey: string;
  buildParams: () => Record<string, any>;
  project?: Project;
  group?: Group;
  execute?: boolean;
  keepPreviousData?: boolean;
  limit?: number;
}): {
  mrs: MergeRequest[];
  isLoading: boolean;
  error: string | undefined;
  performRefetch: () => void;
  pagination: ListPagination;
} {
  const buildParamsRef = useRef(options.buildParams);
  buildParamsRef.current = options.buildParams;
  const projectRef = useRef(options.project);
  projectRef.current = options.project;
  const groupRef = useRef(options.group);
  groupRef.current = options.group;
  const limitRef = useRef(options.limit);
  limitRef.current = options.limit;
  const cacheKeyRef = useRef(options.cacheKey);
  if (cacheKeyRef.current !== options.cacheKey) {
    resetMRListGqlCursors(cacheKeyRef.current);
    cacheKeyRef.current = options.cacheKey;
  }

  const { data, isLoading, error, revalidate, pagination } = useCachedPromise(
    (cacheKey: string) => async (paginationOptions: { page: number }) => {
      const params = buildParamsRef.current();
      if (projectRef.current || groupRef.current || params.scope !== MRScope.all) {
        try {
          const { mergeRequests, hasMore } = await fetchMergeRequestsGqlPage({
            cacheKey,
            page: paginationOptions.page,
            params,
            project: projectRef.current,
            group: groupRef.current,
            pageSize: limitRef.current,
          });
          return { data: mergeRequests, hasMore: limitRef.current ? false : hasMore };
        } catch {
          // Fall back to REST for older GitLab schemas.
        }
      }
      const fallbackParams = { ...params };
      if (fallbackParams.scope === MRScope.reviews_for_me) {
        fallbackParams.scope = MRScope.all;
        fallbackParams.reviewer_username = (await gitlab.getMyself()).username;
      }
      const { data, hasMore } = await gitlab.fetchPaged(
        projectRef.current
          ? `projects/${projectRef.current.id}/merge_requests`
          : groupRef.current
            ? `groups/${groupRef.current.id}/merge_requests`
            : "merge_requests",
        fallbackParams,
        paginationOptions.page + 1,
        limitRef.current ?? MR_LIST_PAGE_SIZE,
      );
      return { data: data.map(jsonDataToMergeRequest), hasMore: limitRef.current ? false : hasMore };
    },
    [options.cacheKey],
    {
      execute: options.execute,
      keepPreviousData: options.keepPreviousData,
      initialData: [],
    },
  );

  return {
    mrs: data,
    isLoading,
    error: error ? getErrorMessage(error) : undefined,
    performRefetch: revalidate,
    pagination,
  };
}
