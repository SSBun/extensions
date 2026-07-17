import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useRef } from "react";
import { gitlab } from "../common";
import { Group, jsonDataToMergeRequest, MergeRequest, Project } from "../gitlabapi";
import { getErrorMessage } from "../utils";
import { MRScope } from "./mr";
import { MR_LIST_PAGE_SIZE } from "./mr_gql";

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

  const { data, isLoading, error, revalidate, pagination } = useCachedPromise(
    (_cacheKey: string, limit?: number) => async (paginationOptions: { page: number }) => {
      const params = buildParamsRef.current();
      const restParams = { ...params };
      if (restParams.scope === MRScope.reviews_for_me) {
        restParams.scope = MRScope.all;
        restParams.reviewer_username = (await gitlab.getMyself()).username;
      }
      const { data, hasMore } = await gitlab.fetchPaged(
        projectRef.current
          ? `projects/${projectRef.current.id}/merge_requests`
          : groupRef.current
            ? `groups/${groupRef.current.id}/merge_requests`
            : "merge_requests",
        restParams,
        paginationOptions.page + 1,
        limit ?? MR_LIST_PAGE_SIZE,
      );
      return { data: data.map(jsonDataToMergeRequest), hasMore: limit ? false : hasMore };
    },
    [options.cacheKey, options.limit],
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
    pagination: options.limit ? undefined : pagination,
  };
}
