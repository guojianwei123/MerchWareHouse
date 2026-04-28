export type DraftFormValues = Record<string, string>;
export type DraftFormCache = Record<string, DraftFormValues>;

export const updateDraftFormCache = (
  cache: DraftFormCache,
  draftId: string,
  values: DraftFormValues,
): DraftFormCache => ({
  ...cache,
  [draftId]: values,
});

export const removeDraftFormCacheEntry = (cache: DraftFormCache, draftId: string): DraftFormCache => {
  const next = { ...cache };
  delete next[draftId];
  return next;
};
