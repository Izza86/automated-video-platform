/**
 * Editor module barrel export.
 *
 * Uses explicit named exports to avoid tree-shaking overhead
 * from re-exporting the entire module graph.
 */

export { transferEdit, type TransferOptions } from "./edit-transfer";
export { analyzeEditingPattern } from "./pattern-analyzer";
export { transferBlueprint } from "./blueprint-transfer";
