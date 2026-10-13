/**
 * Nigerian Curriculum Data Module
 *
 * Static data defining the curriculum hierarchy: Level → Class → Subject → Topic.
 * This is the SINGLE SOURCE OF TRUTH for class levels and subjects. Nothing else
 * in the app should hardcode a subject list — the registration wizard's Step 3
 * filtering, the settings profile form, the mega-menu and the subject browse
 * pages all read from here.
 *
 * Two shapes of subject data live in this file, deliberately:
 *
 * 1. `SUBJECTS_BY_LEVEL` — the curriculum as the teacher actually experiences it,
 *    one pool per class level (Primary / JSS / SSS). Every entry carries a
 *    **level-tagged id** (`primary_mathematics`, `jss_maths`, `sss_physics`), so a
 *    multiselect can be filtered with an exact set membership test instead of
 *    guessing from subject names. Keeping the pools physically separate is what
 *    prevents curriculum-standard conflicts: "Intermediate Science" only exists
 *    at JSS, "Physics" only at SSS, and there is no code path where the two can
 *    bleed into each other.
 *
 * 2. `SubjectInfo` — the flattened view the browse pages consume (slug, label,
 *    colour, icon). Derived from (1) by `getSubjectsForClass()` so the two can
 *    never drift apart.
 *
 * Resources are matched to topics via their `subject` + `gradeLevel` + `tags`
 * fields in the database. A future migration can add proper `topics` and
 * `levels` tables.
 */

// ─── Levels ─────────────────────────────────────────────
export type LevelSlug = "primary" | "junior-secondary" | "senior-secondary";

export interface Level {
  slug: LevelSlug;
  label: string;
  shortLabel: string;
}

export const LEVELS: Level[] = [
  { slug: "primary", label: "Primary", shortLabel: "Primary" },
  { slug: "junior-secondary", label: "Junior Secondary", shortLabel: "Secondary" },
  { slug: "senior-secondary", label: "Senior Secondary", shortLabel: "Secondary" },
];

/**
 * The three buckets a teacher picks between at registration. This is the value
 * set of the wizard's Step 2 multiselect, and the key into `SUBJECTS_BY_LEVEL`.
 */
export type ClassLevel = "Primary" | "JSS" | "SSS";

export const CLASS_LEVELS: ClassLevel[] = ["Primary", "JSS", "SSS"];

/** Maps a registration class level onto the URL/browse level taxonomy. */
export const CLASS_LEVEL_TO_LEVEL_SLUG: Record<ClassLevel, LevelSlug> = {
  Primary: "primary",
  JSS: "junior-secondary",
  SSS: "senior-secondary",
};

// ─── Classes ────────────────────────────────────────────
export interface ClassInfo {
  slug: string;
  label: string;
  shortLabel: string;
  level: LevelSlug;
  /** Which registration class level this class belongs to. */
  classLevel: ClassLevel;
  /** Maps to the `gradeLevel` column on the resources table */
  gradeLevel: string;
}

export const CLASSES: ClassInfo[] = [
  // Primary
  { slug: "p1", label: "Primary 1", shortLabel: "P1", level: "primary", classLevel: "Primary", gradeLevel: "P1" },
  { slug: "p2", label: "Primary 2", shortLabel: "P2", level: "primary", classLevel: "Primary", gradeLevel: "P2" },
  { slug: "p3", label: "Primary 3", shortLabel: "P3", level: "primary", classLevel: "Primary", gradeLevel: "P3" },
  { slug: "p4", label: "Primary 4", shortLabel: "P4", level: "primary", classLevel: "Primary", gradeLevel: "P4" },
  { slug: "p5", label: "Primary 5", shortLabel: "P5", level: "primary", classLevel: "Primary", gradeLevel: "P5" },
  { slug: "p6", label: "Primary 6", shortLabel: "P6", level: "primary", classLevel: "Primary", gradeLevel: "P6" },
  // Junior Secondary
  { slug: "jss1", label: "JSS 1", shortLabel: "JSS1", level: "junior-secondary", classLevel: "JSS", gradeLevel: "JSS1" },
  { slug: "jss2", label: "JSS 2", shortLabel: "JSS2", level: "junior-secondary", classLevel: "JSS", gradeLevel: "JSS2" },
  { slug: "jss3", label: "JSS 3", shortLabel: "JSS3", level: "junior-secondary", classLevel: "JSS", gradeLevel: "JSS3" },
  // Senior Secondary
  { slug: "sss1", label: "SSS 1", shortLabel: "SSS1", level: "senior-secondary", classLevel: "SSS", gradeLevel: "SSS1" },
  { slug: "sss2", label: "SSS 2", shortLabel: "SSS2", level: "senior-secondary", classLevel: "SSS", gradeLevel: "SSS2" },
  { slug: "sss3", label: "SSS 3", shortLabel: "SSS3", level: "senior-secondary", classLevel: "SSS", gradeLevel: "SSS3" },
];

// ─── Subjects ───────────────────────────────────────────

/** The view the browse pages, mega-menu and subject strip consume. */
export interface SubjectInfo {
  slug: string;
  label: string;
  /** Maps to the `subject` column on the resources table */
  dbSubject: string;
  /** Tailwind colour class for blob icon bg */
  color: string;
  /** A single emoji or short string for the blob icon fallback */
  icon: string;
}

/**
 * SSS specialisation tracks. Every SSS subject belongs to exactly one, and the
 * five compulsory core subjects are tagged `Core` so the wizard can explain the
 * "5 core + electives" rule without a second data structure.
 */
export type CourseTrack =
  | "Core"
  | "Sciences and Mathematics"
  | "Humanities and Arts"
  | "Business and Commercial"
  | "Practical Trade";

/**
 * A curriculum subject as offered at one specific class level.
 *
 * `id` is the level-tagged key the registration wizard stores and filters on
 * (`primary_mathematics`, `jss_maths`, `sss_physics`). It is the only
 * identifier that is safe to persist: two levels can teach the same subject
 * name, and only the tagged id tells them apart.
 */
export interface CurriculumSubject extends SubjectInfo {
  id: string;
  level: ClassLevel;
  track: CourseTrack;
  /** Optional/elective subjects can be skipped without blocking Step 3. */
  optional?: boolean;
  /** Display grouping for variants (e.g. which Nigerian language, which trade). */
  group?: string;
}

/** Colour + icon per subject family, keyed by slug. */
const APPEARANCE: Record<string, { color: string; icon: string }> = {
  // Language & literacy
  english: { color: "bg-subject-english", icon: "📖" },
  literature: { color: "bg-subject-english", icon: "📚" },
  "nigerian-language": { color: "bg-subject-language", icon: "🗣️" },
  hausa: { color: "bg-subject-language", icon: "🗣️" },
  igbo: { color: "bg-subject-language", icon: "🗣️" },
  yoruba: { color: "bg-subject-language", icon: "🗣️" },
  french: { color: "bg-subject-language", icon: "🇫🇷" },
  arabic: { color: "bg-subject-language", icon: "🕌" },
  // Numeracy
  mathematics: { color: "bg-subject-maths", icon: "📐" },
  maths: { color: "bg-subject-maths", icon: "📐" },
  "general-mathematics": { color: "bg-subject-maths", icon: "📐" },
  "further-mathematics": { color: "bg-subject-maths", icon: "∑" },
  // Science & technology
  "basic-science-technology": { color: "bg-subject-science", icon: "🔬" },
  "intermediate-science": { color: "bg-subject-science", icon: "🔬" },
  biology: { color: "bg-subject-science", icon: "🧬" },
  chemistry: { color: "bg-subject-science", icon: "🧪" },
  physics: { color: "bg-subject-science", icon: "⚛️" },
  "environmental-science": { color: "bg-subject-science", icon: "🌍" },
  "agricultural-science": { color: "bg-subject-agric", icon: "🌾" },
  "basic-technology": { color: "bg-subject-tech", icon: "🔧" },
  "digital-literacy": { color: "bg-subject-tech", icon: "💡" },
  "digital-technologies": { color: "bg-subject-tech", icon: "🤖" },
  "computer-science": { color: "bg-subject-tech", icon: "💻" },
  // Society & humanities
  "social-studies": { color: "bg-subject-social", icon: "🌍" },
  "social-citizenship-studies": { color: "bg-subject-social", icon: "🤝" },
  "citizenship-heritage-studies": { color: "bg-subject-social", icon: "🏛️" },
  history: { color: "bg-subject-social", icon: "📜" },
  geography: { color: "bg-subject-social", icon: "🗺️" },
  government: { color: "bg-subject-social", icon: "⚖️" },
  economics: { color: "bg-subject-business", icon: "📊" },
  // Commerce
  "business-studies": { color: "bg-subject-business", icon: "💼" },
  commerce: { color: "bg-subject-business", icon: "🏪" },
  "financial-accounting": { color: "bg-subject-business", icon: "📒" },
  bookkeeping: { color: "bg-subject-business", icon: "📕" },
  insurance: { color: "bg-subject-business", icon: "🛡️" },
  marketing: { color: "bg-subject-business", icon: "📣" },
  "office-practice": { color: "bg-subject-business", icon: "🗂️" },
  "store-management": { color: "bg-subject-business", icon: "📦" },
  // Arts, religion & wellbeing
  "cultural-creative-arts": { color: "bg-subject-art", icon: "🎨" },
  music: { color: "bg-subject-art", icon: "🎵" },
  "visual-arts": { color: "bg-subject-art", icon: "🖼️" },
  crs: { color: "bg-subject-religious", icon: "✝️" },
  "islamic-studies": { color: "bg-subject-religious", icon: "☪️" },
  "religious-studies": { color: "bg-subject-religious", icon: "🙏" },
  phe: { color: "bg-subject-health", icon: "🏃" },
  "home-economics": { color: "bg-subject-home", icon: "🏠" },
  "pre-vocational-studies": { color: "bg-subject-agric", icon: "🌱" },
  // Practical trades
  cosmetology: { color: "bg-subject-home", icon: "💅" },
  "gsm-repairs": { color: "bg-subject-tech", icon: "📱" },
  "fashion-design": { color: "bg-subject-home", icon: "🧵" },
  horticulture: { color: "bg-subject-agric", icon: "🌿" },
  "livestock-farming": { color: "bg-subject-agric", icon: "🐐" },
  "solar-installation": { color: "bg-subject-tech", icon: "☀️" },
};

const FALLBACK_APPEARANCE = { color: "bg-subject-science", icon: "📘" };

/**
 * Builds a level-tagged subject. The id is always `{level}_{slug}` — e.g.
 * `primary_mathematics`, `jss_maths`, `sss_physics` — which is what makes Step 3
 * filtering a plain `levels.includes(subject.level)` check.
 */
function makeSubject(
  level: ClassLevel,
  slug: string,
  label: string,
  extra: Partial<Pick<CurriculumSubject, "track" | "optional" | "group" | "dbSubject">> = {}
): CurriculumSubject {
  const look = APPEARANCE[slug] ?? FALLBACK_APPEARANCE;
  return {
    id: `${level.toLowerCase()}_${slug}`,
    slug,
    label,
    level,
    dbSubject: extra.dbSubject ?? label,
    color: look.color,
    icon: look.icon,
    track: extra.track ?? "Core",
    optional: extra.optional,
    group: extra.group,
  };
}

/**
 * PRIMARY — the reformed basic education subject set. Arabic and French are
 * marked optional; the religious and language rows are presented as variants so
 * a teacher picks the one they actually teach.
 */
const PRIMARY_SUBJECTS: CurriculumSubject[] = [
  makeSubject("Primary", "english", "English Studies"),
  makeSubject("Primary", "mathematics", "Mathematics"),
  makeSubject("Primary", "basic-science-technology", "Basic Science and Technology"),
  makeSubject("Primary", "digital-literacy", "Basic Digital Literacy"),
  makeSubject("Primary", "social-citizenship-studies", "Social and Citizenship Studies"),
  makeSubject("Primary", "history", "Nigerian History"),
  makeSubject("Primary", "crs", "Christian Religious Studies (CRS)", { group: "Religious Studies" }),
  makeSubject("Primary", "islamic-studies", "Islamic Studies (IS)", { group: "Religious Studies" }),
  makeSubject("Primary", "hausa", "Nigerian Language — Hausa", { group: "Nigerian Language" }),
  makeSubject("Primary", "igbo", "Nigerian Language — Igbo", { group: "Nigerian Language" }),
  makeSubject("Primary", "yoruba", "Nigerian Language — Yoruba", { group: "Nigerian Language" }),
  makeSubject("Primary", "cultural-creative-arts", "Cultural & Creative Arts (CCA)"),
  makeSubject("Primary", "phe", "Physical & Health Education (PHE)", { dbSubject: "PHE" }),
  makeSubject("Primary", "pre-vocational-studies", "Pre-Vocational Studies (Agriculture & Home Economics)"),
  makeSubject("Primary", "french", "French Language", { optional: true }),
  makeSubject("Primary", "arabic", "Arabic Language", { optional: true }),
];

/**
 * JSS — shared core plus electives, and the practical trades a student takes
 * alongside them.
 */
const JSS_SUBJECTS: CurriculumSubject[] = [
  makeSubject("JSS", "english", "English Studies"),
  makeSubject("JSS", "mathematics", "Mathematics"),
  makeSubject("JSS", "intermediate-science", "Intermediate Science"),
  makeSubject("JSS", "history", "Nigerian History"),
  makeSubject("JSS", "hausa", "Nigerian Language — Hausa", { group: "Nigerian Language" }),
  makeSubject("JSS", "igbo", "Nigerian Language — Igbo", { group: "Nigerian Language" }),
  makeSubject("JSS", "yoruba", "Nigerian Language — Yoruba", { group: "Nigerian Language" }),
  makeSubject("JSS", "social-studies", "Social Studies"),
  makeSubject("JSS", "basic-technology", "Basic Technology"),
  makeSubject("JSS", "business-studies", "Business Studies"),
  makeSubject("JSS", "crs", "Christian Religious Studies", { group: "Religious Studies" }),
  makeSubject("JSS", "islamic-studies", "Islamic Studies", { group: "Religious Studies" }),
  makeSubject("JSS", "french", "French Language", { optional: true }),
  makeSubject("JSS", "arabic", "Arabic Language", { optional: true }),
  makeSubject("JSS", "phe", "Physical & Health Education", { dbSubject: "PHE" }),
  // Practical trades
  makeSubject("JSS", "cosmetology", "Cosmetology", { track: "Practical Trade", group: "Practical Trade" }),
  makeSubject("JSS", "gsm-repairs", "GSM Repairs", { track: "Practical Trade", group: "Practical Trade" }),
  makeSubject("JSS", "fashion-design", "Fashion Design", { track: "Practical Trade", group: "Practical Trade" }),
  makeSubject("JSS", "horticulture", "Horticulture", { track: "Practical Trade", group: "Practical Trade" }),
  makeSubject("JSS", "livestock-farming", "Livestock Farming", { track: "Practical Trade", group: "Practical Trade" }),
  makeSubject("JSS", "solar-installation", "Solar Installation", { track: "Practical Trade", group: "Practical Trade" }),
];

/**
 * SSS — 8–9 subjects total: 5 compulsory core (English, General Mathematics,
 * Citizenship & Heritage Studies, Digital Technologies, one Practical Trade)
 * plus electives drawn from three specialisation tracks.
 */
const SSS_SUBJECTS: CurriculumSubject[] = [
  // Compulsory core
  makeSubject("SSS", "english", "English Language", { track: "Core" }),
  makeSubject("SSS", "general-mathematics", "General Mathematics", { track: "Core" }),
  makeSubject("SSS", "citizenship-heritage-studies", "Citizenship and Heritage Studies", { track: "Core" }),
  makeSubject("SSS", "digital-technologies", "Digital Technologies", { track: "Core" }),
  makeSubject("SSS", "cosmetology", "Practical Trade — Cosmetology", { track: "Practical Trade", group: "Mandatory Practical Trade" }),
  makeSubject("SSS", "gsm-repairs", "Practical Trade — GSM Repairs", { track: "Practical Trade", group: "Mandatory Practical Trade" }),
  makeSubject("SSS", "fashion-design", "Practical Trade — Fashion Design", { track: "Practical Trade", group: "Mandatory Practical Trade" }),
  makeSubject("SSS", "horticulture", "Practical Trade — Horticulture", { track: "Practical Trade", group: "Mandatory Practical Trade" }),
  makeSubject("SSS", "livestock-farming", "Practical Trade — Livestock Farming", { track: "Practical Trade", group: "Mandatory Practical Trade" }),
  makeSubject("SSS", "solar-installation", "Practical Trade — Solar Installation", { track: "Practical Trade", group: "Mandatory Practical Trade" }),
  // Sciences and Mathematics
  makeSubject("SSS", "agricultural-science", "Agricultural Science", { track: "Sciences and Mathematics" }),
  makeSubject("SSS", "biology", "Biology", { track: "Sciences and Mathematics" }),
  makeSubject("SSS", "chemistry", "Chemistry", { track: "Sciences and Mathematics" }),
  makeSubject("SSS", "computer-science", "Computer Science / ICT", { track: "Sciences and Mathematics" }),
  makeSubject("SSS", "environmental-science", "Environmental Science", { track: "Sciences and Mathematics" }),
  makeSubject("SSS", "further-mathematics", "Further Mathematics", { track: "Sciences and Mathematics" }),
  makeSubject("SSS", "physics", "Physics", { track: "Sciences and Mathematics" }),
  // Humanities and Arts
  makeSubject("SSS", "literature", "Literature", { track: "Humanities and Arts", dbSubject: "Literature in English" }),
  makeSubject("SSS", "government", "Government / Law", { track: "Humanities and Arts", dbSubject: "Government" }),
  makeSubject("SSS", "geography", "Geography", { track: "Humanities and Arts" }),
  makeSubject("SSS", "economics", "Economics", { track: "Humanities and Arts" }),
  makeSubject("SSS", "history", "History", { track: "Humanities and Arts" }),
  makeSubject("SSS", "music", "Music", { track: "Humanities and Arts" }),
  makeSubject("SSS", "visual-arts", "Visual Arts", { track: "Humanities and Arts" }),
  makeSubject("SSS", "religious-studies", "Religious Studies", { track: "Humanities and Arts" }),
  makeSubject("SSS", "hausa", "Nigerian Language — Hausa", { track: "Humanities and Arts", group: "Nigerian Language" }),
  makeSubject("SSS", "igbo", "Nigerian Language — Igbo", { track: "Humanities and Arts", group: "Nigerian Language" }),
  makeSubject("SSS", "yoruba", "Nigerian Language — Yoruba", { track: "Humanities and Arts", group: "Nigerian Language" }),
  // Business and Commercial
  makeSubject("SSS", "financial-accounting", "Financial Accounting", { track: "Business and Commercial" }),
  makeSubject("SSS", "commerce", "Commerce", { track: "Business and Commercial" }),
  makeSubject("SSS", "bookkeeping", "Bookkeeping", { track: "Business and Commercial" }),
  makeSubject("SSS", "insurance", "Insurance", { track: "Business and Commercial" }),
  makeSubject("SSS", "marketing", "Marketing", { track: "Business and Commercial" }),
  makeSubject("SSS", "office-practice", "Office Practice", { track: "Business and Commercial" }),
  makeSubject("SSS", "store-management", "Store Management", { track: "Business and Commercial" }),
];

/** The curriculum, one pool per class level. Never merge these. */
export const SUBJECTS_BY_LEVEL: Record<ClassLevel, CurriculumSubject[]> = {
  Primary: PRIMARY_SUBJECTS,
  JSS: JSS_SUBJECTS,
  SSS: SSS_SUBJECTS,
};

/** Every subject across all levels, in level order. */
export const ALL_SUBJECTS: CurriculumSubject[] = CLASS_LEVELS.flatMap((l) => SUBJECTS_BY_LEVEL[l]);

// ─── Topics ─────────────────────────────────────────────
export interface TopicInfo {
  slug: string;
  label: string;
  /** Term grouping: 1, 2, or 3 */
  term: 1 | 2 | 3;
  /** Optional "thread" for filtering — e.g. "Fractions", "Comprehension" */
  thread?: string;
  /** Brief rationale: "Why this, why now" */
  rationale?: string;
  /** Prior knowledge needed */
  priorKnowledge?: string[];
  /** Tags to match resources against */
  matchTags: string[];
}

/**
 * Sample topics for Mathematics Primary 4.
 * In production, this would be a much larger dataset — or pulled from a database table.
 */
const SAMPLE_MATHS_P4_TOPICS: TopicInfo[] = [
  { slug: "place-value", label: "Place Value", term: 1, thread: "Number", rationale: "Understanding place value is the foundation of all number work. Students need this to read, write and compare numbers up to 100,000.", priorKnowledge: ["Counting to 1,000", "Hundreds, tens and ones"], matchTags: ["place-value", "number"] },
  { slug: "addition-subtraction", label: "Addition & Subtraction", term: 1, thread: "Number", rationale: "Building on place value, students tackle multi-digit addition and subtraction with regrouping.", priorKnowledge: ["Place value to 10,000", "Basic addition facts"], matchTags: ["addition", "subtraction", "number"] },
  { slug: "multiplication", label: "Multiplication", term: 1, thread: "Number", rationale: "Extending multiplication to 2-digit by 1-digit, laying groundwork for long multiplication.", priorKnowledge: ["Times tables to 10", "Repeated addition"], matchTags: ["multiplication", "number"] },
  { slug: "fractions-intro", label: "Introduction to Fractions", term: 1, thread: "Fractions", rationale: "First formal encounter with fractions as parts of a whole and parts of a set.", priorKnowledge: ["Equal sharing", "Halves and quarters"], matchTags: ["fractions"] },
  { slug: "measurement-length", label: "Measurement — Length", term: 2, thread: "Measurement", rationale: "Practical measurement using standard units (cm, m, km) and converting between them.", priorKnowledge: ["Non-standard measurement", "Comparing lengths"], matchTags: ["measurement", "length"] },
  { slug: "measurement-weight", label: "Measurement — Weight", term: 2, thread: "Measurement", rationale: "Understanding mass and weight using grams and kilograms.", priorKnowledge: ["Comparing heavy and light", "Using a balance"], matchTags: ["measurement", "weight", "mass"] },
  { slug: "geometry-shapes", label: "2D & 3D Shapes", term: 2, thread: "Geometry", rationale: "Classifying shapes by properties — sides, vertices, edges and faces.", priorKnowledge: ["Naming basic shapes", "Sorting objects"], matchTags: ["geometry", "shapes", "2d", "3d"] },
  { slug: "fractions-equivalence", label: "Equivalent Fractions", term: 2, thread: "Fractions", rationale: "Discovering that different fractions can represent the same amount.", priorKnowledge: ["Introduction to Fractions"], matchTags: ["fractions", "equivalence"] },
  { slug: "division", label: "Division", term: 3, thread: "Number", rationale: "Relating division to multiplication and solving problems with remainders.", priorKnowledge: ["Multiplication facts", "Equal sharing"], matchTags: ["division", "number"] },
  { slug: "money", label: "Money", term: 3, thread: "Number", rationale: "Applying addition and subtraction skills to real-life money problems in Naira and Kobo.", priorKnowledge: ["Addition & Subtraction", "Place value"], matchTags: ["money", "naira"] },
  { slug: "data-handling", label: "Data Handling", term: 3, thread: "Statistics", rationale: "Collecting, organising and interpreting data using tables, bar charts and pictograms.", priorKnowledge: ["Counting", "Sorting and classifying"], matchTags: ["data", "statistics", "charts"] },
  { slug: "time", label: "Time", term: 3, thread: "Measurement", rationale: "Reading clocks, calculating elapsed time, and using calendars.", priorKnowledge: ["Counting in 5s", "Hours and minutes"], matchTags: ["time", "measurement"] },
];

// ─── Topic registry (expandable) ────────────────────────
/**
 * Key format: `{classSlug}:{subjectSlug}`
 * Start with a rich sample for Maths P4, sparse stubs for others.
 */
const TOPIC_REGISTRY: Record<string, TopicInfo[]> = {
  "p4:mathematics": SAMPLE_MATHS_P4_TOPICS,
};

// ─── Helper functions ───────────────────────────────────

export function getLevelBySlug(slug: string): Level | undefined {
  return LEVELS.find((l) => l.slug === slug);
}

export function getClassesForLevel(levelSlug: LevelSlug): ClassInfo[] {
  return CLASSES.filter((c) => c.level === levelSlug);
}

/**
 * For the mega-menu "Secondary" tab, we combine junior + senior secondary.
 */
export function getSecondaryClasses(): ClassInfo[] {
  return CLASSES.filter((c) => c.level === "junior-secondary" || c.level === "senior-secondary");
}

export function getClassesForClassLevel(classLevel: ClassLevel): ClassInfo[] {
  return CLASSES.filter((c) => c.classLevel === classLevel);
}

export function getClassBySlug(slug: string): ClassInfo | undefined {
  return CLASSES.find((c) => c.slug === slug);
}

/**
 * THE registration filter. Step 3 calls this with the class levels chosen in
 * Step 2 and renders exactly the matching pool — nothing from another level can
 * appear, and an empty selection returns `[]` so the form can show its empty
 * state rather than silently offering the wrong subjects.
 */
export function getSubjectsForLevels(levels: ClassLevel[]): CurriculumSubject[] {
  return CLASS_LEVELS.filter((l) => levels.includes(l)).flatMap((l) => SUBJECTS_BY_LEVEL[l]);
}

export function getCurriculumSubjectById(id: string): CurriculumSubject | undefined {
  return ALL_SUBJECTS.find((s) => s.id === id);
}

/**
 * The flattened, browse-facing view for a class. Derived from the level pools so
 * the catalogue and the registration form can never disagree.
 */
export function getSubjectsForClass(classSlug: string): SubjectInfo[] {
  const cls = getClassBySlug(classSlug);
  if (!cls) return [];
  return SUBJECTS_BY_LEVEL[cls.classLevel];
}

export function getSubjectBySlug(classSlug: string, subjectSlug: string): SubjectInfo | undefined {
  return getSubjectsForClass(classSlug).find((s) => s.slug === subjectSlug);
}

export function getTopicsForSubject(classSlug: string, subjectSlug: string): TopicInfo[] {
  const key = `${classSlug}:${subjectSlug}`;
  return TOPIC_REGISTRY[key] ?? [];
}

export function getTopicBySlug(classSlug: string, subjectSlug: string, topicSlug: string): TopicInfo | undefined {
  return getTopicsForSubject(classSlug, subjectSlug).find((t) => t.slug === topicSlug);
}

/**
 * Get all unique threads across topics for a subject (for the "highlight a thread" filter).
 */
export function getThreadsForSubject(classSlug: string, subjectSlug: string): string[] {
  const topics = getTopicsForSubject(classSlug, subjectSlug);
  const threads = new Set<string>();
  topics.forEach((t) => {
    if (t.thread) threads.add(t.thread);
  });
  return Array.from(threads).sort();
}

/**
 * Match a resource to a topic based on its tags.
 * Returns true if the resource's tags overlap with the topic's matchTags.
 */
export function matchResourceToTopic(
  resourceTags: string[],
  topic: TopicInfo
): boolean {
  const lower = resourceTags.map((t) => t.toLowerCase());
  return topic.matchTags.some((mt) => lower.includes(mt.toLowerCase()));
}

/**
 * Get the Level that a class belongs to — needed for URL construction.
 */
export function getLevelForClass(classSlug: string): Level | undefined {
  const cls = getClassBySlug(classSlug);
  if (!cls) return undefined;
  return LEVELS.find((l) => l.slug === cls.level);
}

/**
 * For the mega-menu: determine which nav category a class belongs to.
 */
export function getNavCategoryForClass(classSlug: string): "primary" | "secondary" | undefined {
  const cls = getClassBySlug(classSlug);
  if (!cls) return undefined;
  return cls.level === "primary" ? "primary" : "secondary";
}
