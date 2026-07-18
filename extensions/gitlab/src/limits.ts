export const MAX_COLLECTION_ITEMS = 100;
export const MAX_LIST_ITEMS = 200;
export const MAX_MERGE_REQUEST_ITEMS = 30;
export const MAX_STATUS_PRESETS = 50;
export const MAX_JOB_LOG_CHARS = 100_000;
export const MAX_README_CHARS = 512 * 1024;
export const MAX_DISCUSSION_CONTEXT_CHARS = 256 * 1024;
export const MAX_DISCUSSION_NOTE_CHARS = 64 * 1024;
export const MAX_LIST_DESCRIPTION_CHARS = 64 * 1024;

export function hasMoreWithinLimit(hasMore: boolean, page: number, pageSize: number, limit = MAX_LIST_ITEMS): boolean {
  return hasMore && (page + 1) * pageSize < limit;
}
