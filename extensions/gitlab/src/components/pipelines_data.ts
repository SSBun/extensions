import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useRef } from "react";
import { Pipeline } from "../gitlabapi";
import {
  fetchMRPipelinesGqlPage,
  fetchProjectPipelinesGqlPage,
  PIPELINE_LIST_PAGE_SIZE,
  resetPipelineListGqlCursors,
} from "./pipelines_gql";
import { hasMoreWithinLimit } from "../limits";

export type ListPagination = List.Props["pagination"];

export function usePaginatedProjectPipelines(options: {
  cacheKey: string;
  projectFullPath: string;
  execute?: boolean;
  keepPreviousData?: boolean;
}): {
  pipelines: Pipeline[];
  isLoading: boolean;
  performRefetch: () => void;
  pagination: ListPagination;
} {
  const projectFullPathRef = useRef(options.projectFullPath);
  projectFullPathRef.current = options.projectFullPath;

  useEffect(() => () => resetPipelineListGqlCursors(options.cacheKey), [options.cacheKey]);

  const { data, isLoading, revalidate, pagination } = useCachedPromise(
    (cacheKey: string) => async (paginationOptions: { page: number }) => {
      const { pipelines, hasMore } = await fetchProjectPipelinesGqlPage({
        cacheKey,
        page: paginationOptions.page,
        projectFullPath: projectFullPathRef.current,
      });
      return {
        data: pipelines,
        hasMore: hasMoreWithinLimit(hasMore, paginationOptions.page, PIPELINE_LIST_PAGE_SIZE),
      };
    },
    [options.cacheKey],
    {
      execute: options.execute,
      keepPreviousData: options.keepPreviousData,
      initialData: [],
    },
  );

  return {
    pipelines: data,
    isLoading,
    performRefetch: revalidate,
    pagination,
  };
}

export function usePaginatedMRPipelines(options: {
  cacheKey: string;
  projectFullPath: string;
  mrIID: number;
  execute?: boolean;
  keepPreviousData?: boolean;
}): {
  pipelines: Pipeline[];
  isLoading: boolean;
  performRefetch: () => void;
  pagination: ListPagination;
} {
  const projectFullPathRef = useRef(options.projectFullPath);
  projectFullPathRef.current = options.projectFullPath;
  const mrIIDRef = useRef(options.mrIID);
  mrIIDRef.current = options.mrIID;

  useEffect(() => () => resetPipelineListGqlCursors(options.cacheKey), [options.cacheKey]);

  const { data, isLoading, revalidate, pagination } = useCachedPromise(
    (cacheKey: string) => async (paginationOptions: { page: number }) => {
      const { pipelines, hasMore } = await fetchMRPipelinesGqlPage({
        cacheKey,
        page: paginationOptions.page,
        projectFullPath: projectFullPathRef.current,
        mrIID: mrIIDRef.current,
      });
      return {
        data: pipelines,
        hasMore: hasMoreWithinLimit(hasMore, paginationOptions.page, PIPELINE_LIST_PAGE_SIZE),
      };
    },
    [options.cacheKey],
    {
      execute: options.execute,
      keepPreviousData: options.keepPreviousData,
      initialData: [],
    },
  );

  return {
    pipelines: data,
    isLoading,
    performRefetch: revalidate,
    pagination,
  };
}
