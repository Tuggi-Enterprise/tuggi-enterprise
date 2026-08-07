/**
 * The two backgrounds a block may sit on — `DS-COR-004`.
 *
 * One declaration, because it was on its way to being three: `AudioSampleCard`
 * and `AudioSampleGrid` each had their own copy of this union and `ProofBlock`
 * would have made a third (CLAUDE.md §6, DRY). What is shared is the
 * vocabulary; the colour tables stay in each component, because they are
 * measured against that component's own text sizes and weights.
 *
 * "light" is `--color-tuggi-bg` or white. "dark" is `--color-tuggi-dark` —
 * never a filled brand cyan, which measures 2.37:1 and fails SC 1.4.11.
 */
export type Surface = "light" | "dark";
