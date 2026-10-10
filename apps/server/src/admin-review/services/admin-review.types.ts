export interface IBulkActionResult {
  succeeded: number;
  failed: { itemId: string; error: string }[];
}
