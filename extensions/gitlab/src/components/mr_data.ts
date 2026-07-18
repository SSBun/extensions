import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useRef } from "react";
import { gitlab } from "../common";
import { Group, jsonDataToMergeRequest, MergeRequest, Project } from "../gitlabapi";
import { getErrorMessage } from "../utils";
import { MRScope } from "./mr";
import { MAX_MERGE_REQUEST_ITEMS } from "../limits";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type ListPagination = List.Props["pagination"];

/**
 * Bounded Merge Request data provider backed by `useCachedPromise`.
 * Raycast invokes the pagination-shaped callback for the initial page, but this hook
 * deliberately returns no pagination so a list can never retain more than 30 MRs.
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
  const limit = Math.min(options.limit ?? MAX_MERGE_REQUEST_ITEMS, MAX_MERGE_REQUEST_ITEMS);

  const { data, isLoading, error, revalidate } = useCachedPromise(
    (_cacheKey: string, resultLimit: number) => async (paginationOptions: { page: number }) => {
      const params = buildParamsRef.current();
      const restParams = { ...params };
      if (restParams.scope === MRScope.reviews_for_me) {
        restParams.scope = MRScope.all;
        restParams.reviewer_username = (await gitlab.getMyself()).username;
      }
      const { data } = await gitlab.fetchPaged(
        projectRef.current
          ? `projects/${projectRef.current.id}/merge_requests`
          : groupRef.current
            ? `groups/${groupRef.current.id}/merge_requests`
            : "merge_requests",
        restParams,
        paginationOptions.page + 1,
        resultLimit,
      );
      return { data: data.map(jsonDataToMergeRequest), hasMore: false };
    },
    [options.cacheKey, limit],
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
    pagination: undefined,
  };
}
