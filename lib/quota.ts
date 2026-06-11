/**
 * Counts unique students across one or more proposal lists.
 *
 * A "Mengulang" (retake) student can have both a historical (COMPLETED)
 * proposal and a new active proposal under the same dosen. Without dedup,
 * such a student would be counted twice towards the dosen's quota.
 */
export function countUniqueStudents(
  ...lists: { enrollment: { studentId: string } }[][]
): number {
  const ids = new Set<string>();
  for (const list of lists) {
    for (const p of list) ids.add(p.enrollment.studentId);
  }
  return ids.size;
}
