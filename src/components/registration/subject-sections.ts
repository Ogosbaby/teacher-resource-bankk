import type { ClassLevel, CurriculumSubject } from "@/lib/content/curriculum";

export interface SubjectSection {
  heading: string;
  items: CurriculumSubject[];
}

/**
 * Groups the filtered subject pool for display.
 *
 * With more than one class level selected, subjects are sectioned by level so
 * "Mathematics" appearing twice is explained by its heading. With a single level,
 * they're sectioned by curriculum group (Core, Nigerian Language, Practical Trade,
 * and the SSS specialisation tracks), which is how the syllabus itself is laid out.
 */
export function sectionSubjects(
  subjects: CurriculumSubject[],
  levels: ClassLevel[]
): SubjectSection[] {
  const keyOf = (s: CurriculumSubject) => (levels.length > 1 ? s.level : s.group ?? s.track);

  const order: string[] = [];
  const buckets = new Map<string, CurriculumSubject[]>();

  for (const subject of subjects) {
    const key = keyOf(subject);
    if (!buckets.has(key)) {
      buckets.set(key, []);
      order.push(key);
    }
    buckets.get(key)!.push(subject);
  }

  return order.map((heading) => ({ heading, items: buckets.get(heading)! }));
}
