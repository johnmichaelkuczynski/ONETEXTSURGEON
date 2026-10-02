export interface FreshTreeChapterProgress {
  baseComplete: boolean;
  baseDepth: number;
  targetDepth: number;
  completedDepth: number;
  tiers: Record<string, { completedTheses: string[]; complete: boolean }>;
}

export function nextFreshTreeDepth(trees: Array<{
  statements: Array<{ depth: number }>;
  progress?: Pick<FreshTreeChapterProgress, "completedDepth">;
}>): number {
  const completedDepth = trees.reduce((maximum, tree) => {
    const statementDepth = tree.statements.length
      ? Math.max(...tree.statements.map((statement) => statement.depth + 1))
      : 0;
    return Math.max(maximum, tree.progress?.completedDepth || statementDepth);
  }, 4);
  return completedDepth + 1;
}
