/**
 * Pre-generated, Offline-First CPD Courses for Nigerian Teachers.
 *
 * Stored directly in application code to guarantee 100% offline availability
 * without requiring PostgreSQL or external network requests.
 */

export interface CPDModule {
  id: string;
  title: string;
  contentType: "text" | "video";
  body: string;
}

export interface CPDCourse {
  id: string;
  slug: string;
  title: string;
  description: string;
  subject: string;
  classLevels: ("Primary" | "JSS" | "SSS")[];
  targetSubjects?: string[];
  estimatedDurationMinutes: number;
  coverImageUrl?: string;
  aiGenerated?: boolean;
  modules: CPDModule[];
}

export const PRELOADED_CPD_COURSES: CPDCourse[] = [
  {
    id: "cpd-formative-assessment",
    slug: "formative-assessment-everyday-teaching",
    title: "Formative Assessment for Everyday Teaching",
    description:
      "Master low-stakes, real-time assessment strategies that uncover misconceptions immediately, without adding hours of grading.",
    subject: "Professional Development",
    classLevels: ["Primary", "JSS", "SSS"],
    estimatedDurationMinutes: 75,
    modules: [
      {
        id: "fa-mod-1",
        title: "Why Formative Assessment Matters in Real Classrooms",
        contentType: "text",
        body: `## Why Formative Assessment Matters

Formative assessment is the ongoing, low-stakes checking you do **while** you teach — not just the test you administer at the end of the term. Done well, it gives you actionable insight into whether learners have grasped a concept before gaps widen.

### Key Objectives:
- Distinguish clearly between *assessment for learning* (formative) and *assessment of learning* (summative).
- Identify key moments during a standard 40-minute lesson to insert 30-second checks for understanding.
- Learn how to pivot instruction in real-time when the majority of the class struggles.

### The Shift from Summative to Formative
Summative assessments (WAEC, BECE, termly exams) report **what** a student achieved at the end. Formative assessment tells you **what to do next** — which students need immediate intervention, who is ready for extension, and which explanations fell flat.

> **Classroom Rule of Thumb:** Never wait until the end-of-term examination to discover that 60% of your class did not understand Week 3's core concept.`,
      },
      {
        id: "fa-mod-2",
        title: "Fast, Low-Prep Check-In Techniques",
        contentType: "text",
        body: `## Fast, Low-Prep Check-In Techniques

These techniques require zero photocopying, minimal supplies, and thrive in large classes with 40+ learners.

### 1. The 60-Second Exit Ticket
At the lesson's close, ask students to write on a scrap sheet:
- One core principle learned today.
- One question or point of confusion.
Collect them at the door. Sort them into three piles: *Got it*, *Partially got it*, and *Lost*. Use this to plan tomorrow's starter.

### 2. Thumbs Up, Sideways, Down
Prompt the room with a conceptual check question:
- **Thumbs Up:** Fully confident and can explain it to a peer.
- **Thumbs Sideways:** Understand the steps, but unsure why.
- **Thumbs Down:** Lost or need another example.
Scan the room in 5 seconds to decide whether to advance or re-teach.

### 3. Think–Pair–Share
1. **Think (30s):** Pose a high-yield question; learners think silently.
2. **Pair (1 min):** Turn to their desk partner to share reasoning.
3. **Share (2 mins):** Cold-call 2 pairs to articulate their answers.`,
      },
      {
        id: "fa-mod-3",
        title: "Designing High-Yield Diagnostic Questions",
        contentType: "text",
        body: `## Designing High-Yield Diagnostic Questions

A diagnostic question is a multiple-choice question where **every wrong answer reveals a specific misconception**.

### Example Diagnostic Question (Mathematics):
*What is 4 + 3 × 2?*
- A) 14 *(Learner evaluated left-to-right, ignoring order of operations)*
- B) 10 *(Correct: 3 × 2 = 6; 4 + 6 = 10)*
- C) 24 *(Learner multiplied everything: 4 × 3 × 2)*
- D) 9 *(Arithmetic slip)*

When learners answer **A**, you know immediately that they need review on PEMDAS/BODMAS, not basic addition.`,
      },
    ],
  },
  {
    id: "cpd-classroom-management",
    slug: "classroom-management-essentials",
    title: "Classroom Management in Large & Crowded Classrooms",
    description:
      "Practical routines, voice modulation, transitions, and de-escalation strategies tailored for Nigerian primary and secondary classrooms.",
    subject: "Classroom Practice",
    classLevels: ["Primary", "JSS", "SSS"],
    estimatedDurationMinutes: 90,
    modules: [
      {
        id: "cm-mod-1",
        title: "Establishing Predictable Routines from Day One",
        contentType: "text",
        body: `## Establishing Predictable Routines from Day One

Classroom order does not come from strict punishment; it comes from explicit, practiced routines. In classes with 45–70 learners, ambiguity invites chaos.

### Essential Routines to Automate:
1. **Entry Routine:** What do students do the moment they step into the room? (e.g. Do Now task written on the chalkboard).
2. **Attention Signal:** A rhythmic clap or hand raise rather than shouting over the room.
3. **Materials Distribution:** Assigning row monitors to distribute workbooks in under 60 seconds.
4. **Dismissal Routine:** Desks aligned and litter picked before standing for dismissal.`,
      },
      {
        id: "cm-mod-2",
        title: "Voice Conservation & Non-Verbal Cues",
        contentType: "text",
        body: `## Voice Conservation & Non-Verbal Cues

Teaching all day without straining your vocal cords requires relying on non-verbal communication and deliberate pacing.

### Strategies:
- **The Power of the Pause:** When the room gets noisy, stop talking, stand completely still at the center of the board, and make eye contact with key student leaders.
- **Proximity Control:** Walk calmly toward disruptive learners while continuing your explanation seamlessly. Physical closeness resets focus without a single confrontation.
- **Whisper Technique:** In primary and JSS classes, lowering your voice to a focused whisper compels students to quiet down to hear you.`,
      },
      {
        id: "cm-mod-3",
        title: "Responding to Low-Level Disruption Calmly",
        contentType: "text",
        body: `## Responding to Low-Level Disruption Calmly

Public arguments escalate disruption. Address minor infractions discreetly and preserve student dignity.

### The Least Invasive Intervention Ladder:
1. **Non-verbal cue:** Eye contact or pointing to the open book.
2. **Positive narration:** "Thank you to Row 2 for opening their notes immediately."
3. **Private individual whisper:** "Chinedu, pen on the paper in 3 seconds, please."
4. **Choice with clear consequence:** "Emeka, you can complete this exercise now or finish it during break. You decide."`,
      },
    ],
  },
  {
    id: "cpd-maths-understanding",
    slug: "teaching-mathematics-conceptual-understanding",
    title: "Teaching Mathematics for Conceptual Understanding",
    description:
      "Move students beyond rote formula memorization through the Concrete-Pictorial-Abstract (CPA) framework and diagnostic error analysis.",
    subject: "Mathematics",
    classLevels: ["Primary", "JSS"],
    targetSubjects: ["primary_mathematics", "jss_maths"],
    estimatedDurationMinutes: 100,
    modules: [
      {
        id: "math-mod-1",
        title: "The Concrete-Pictorial-Abstract (CPA) Progression",
        contentType: "text",
        body: `## The Concrete-Pictorial-Abstract (CPA) Progression

Many Nigerian students struggle with mathematics because they are introduced directly to abstract algebraic equations without physical or visual grounding.

### The Three Phases:
1. **Concrete:** Using physical counters, bottle caps, sticks, or paper strips to model operations.
2. **Pictorial:** Drawing bar models, number lines, or area grids to represent relationships.
3. **Abstract:** Writing formal equations ($x + 5 = 12$) after understanding the balance model.`,
      },
      {
        id: "math-mod-2",
        title: "Demystifying Fractions with Everyday Materials",
        contentType: "text",
        body: `## Demystifying Fractions with Everyday Materials

Fractions are the single greatest barrier to algebraic thinking in Upper Primary and JSS.

### Visualizing Equivalent Fractions:
- Folding scrap paper into halves, fourths, and eighths.
- Showing that $\\frac{2}{4}$ is physically identical in area to $\\frac{1}{2}$.
- Relating denominators to "name/size of slice" and numerators to "number of slices".`,
      },
      {
        id: "math-mod-3",
        title: "Unpacking Word Problems with Bar Modelling",
        contentType: "text",
        body: `## Unpacking Word Problems with Bar Modelling

Teach learners the Singapore Bar Model approach to translate English word problems into mathematical operations.

*Example:* "Amina has 15 more pencils than Tunde. Together they have 45 pencils."
Drawing two bars where Amina's bar has an extra segment of 15 allows students to see that $(45 - 15) \\div 2$ gives Tunde's quantity immediately.`,
      },
    ],
  },
  {
    id: "cpd-foundational-literacy",
    slug: "phonics-foundational-literacy",
    title: "Foundational Phonics & Reading Comprehension",
    description:
      "Systematic synthetic phonics instruction, vocabulary acquisition, and guided reading frameworks for multilingual classrooms.",
    subject: "English Language",
    classLevels: ["Primary"],
    targetSubjects: ["primary_english", "primary_english_studies"],
    estimatedDurationMinutes: 80,
    modules: [
      {
        id: "lit-mod-1",
        title: "Systematic Synthetic Phonics for Second-Language Learners",
        contentType: "text",
        body: `## Systematic Synthetic Phonics for Second-Language Learners

Teaching English sounds explicitly helps Nigerian learners bridge the gap between their mother tongues and English spelling rules.

### Core Principles:
- Teach letter sounds (/s/, /a/, /t/, /p/) before letter names ("es", "ay", "tee", "pee").
- Practice continuous blending: pronouncing sounds smoothly without pausing (/m/ - /a/ - /t/ -> *mat*).
- Segmenting for spelling: saying a word slowly and tapping fingers for each sound heard.`,
      },
      {
        id: "lit-mod-2",
        title: "Building Active Comprehension & Questioning",
        contentType: "text",
        body: `## Building Active Comprehension & Questioning

Fluency without comprehension is not reading. Move students from literal recall to inferential understanding.

### Tiered Questioning:
- **Literal:** "Who is the main character in the story?" (Found directly on the page).
- **Inferential:** "Why do you think Musa looked sad when he opened the door?" (Clues in the text + student inference).
- **Evaluative:** "Would you make the same choice as Musa? Why or why not?"`,
      },
    ],
  },
  {
    id: "cpd-science-inquiry",
    slug: "practical-science-inquiry-budget",
    title: "Practical Science Inquiry on a Budget",
    description:
      "Conduct safe, hands-on scientific experiments using local everyday materials, aligned with NERDC standards.",
    subject: "Sciences",
    classLevels: ["JSS", "SSS"],
    targetSubjects: ["jss_basic_science", "sss_biology", "sss_chemistry", "sss_physics"],
    estimatedDurationMinutes: 110,
    modules: [
      {
        id: "sci-mod-1",
        title: "The 5E Instructional Model in Science Teaching",
        contentType: "text",
        body: `## The 5E Instructional Model in Science Teaching

Move science classes away from copying chalkboard notes to inquiry-based discovery.

1. **Engage:** Hook students with a puzzling phenomenon or everyday question (e.g. "Why does iron rust faster near the coast?").
2. **Explore:** Provide materials for students to observe and record changes.
3. **Explain:** Introduce scientific terminology and concepts *after* exploration.
4. **Elaborate:** Apply the concept to a new scenario.
5. **Evaluate:** Assess understanding through diagrams and explanations.`,
      },
      {
        id: "sci-mod-2",
        title: "Kitchen Chemistry & Low-Cost Physics Experiments",
        contentType: "text",
        body: `## Kitchen Chemistry & Low-Cost Physics Experiments

No laboratory required to demonstrate foundational science:
- **Acids & Bases:** Using hibiscus petal (zobo) extract as a natural pH indicator.
- **Density & Buoyancy:** Floating eggs in concentrated salt water vs fresh water.
- **Refraction & Optics:** A clear glass filled with water bending a hand-drawn pencil arrow.
- **Electrical Circuits:** Basic flashlight batteries, copper wire, and small LED bulbs.`,
      },
    ],
  },
  {
    id: "cpd-differentiated-instruction",
    slug: "differentiated-instruction-mixed-ability",
    title: "Differentiated Instruction in Mixed-Ability Classrooms",
    description:
      "Design tiered assignments and scaffolding techniques so struggling learners thrive while advanced students stay challenged.",
    subject: "Pedagogy",
    classLevels: ["JSS", "SSS"],
    estimatedDurationMinutes: 85,
    modules: [
      {
        id: "diff-mod-1",
        title: "Scaffolding Tasks for Different Learner Profiles",
        contentType: "text",
        body: `## Scaffolding Tasks for Different Learner Profiles

Differentiation does NOT mean writing three different lesson plans every night. It means providing different entry points to the same core learning goal.

### Practical Scaffolding Techniques:
- **Sentence Starters:** For struggling writers ("The experiment proved that... because...").
- **Tiered Task Sets:**
  - *Must Do:* Core foundation required for all students.
  - *Should Do:* Application and analysis.
  - *Could Do:* Complex extension or synthesis for early finishers.`,
      },
      {
        id: "diff-mod-2",
        title: "Peer Tutoring & Flexible Grouping",
        contentType: "text",
        body: `## Peer Tutoring & Flexible Grouping

Harness student collaboration productively:
- Pair high-achieving students with peers needing clarification for 5-minute consolidation tasks.
- Keep groups fluid so students are not permanently labeled as "slow" or "fast".
- Establish clear roles within groups (Scribe, Speaker, Timekeeper, Materials Manager).`,
      },
    ],
  },
];

/**
 * Returns all preloaded CPD courses, formatted for catalog and list views.
 */
export function getPreloadedCourses() {
  return PRELOADED_CPD_COURSES;
}

import { getTailoredCourseBySlug } from "./course-generator";

/**
 * Find a single preloaded or tailored course by its slug.
 */
export function getPreloadedCourseBySlug(slug: string): CPDCourse | undefined {
  const found = PRELOADED_CPD_COURSES.find((c) => c.slug === slug);
  if (found) return found;
  return getTailoredCourseBySlug(slug);
}

export function getPreloadedCourseById(id: string): CPDCourse | undefined {
  const found = PRELOADED_CPD_COURSES.find((c) => c.id === id || c.slug === id);
  if (found) return found;
  return getTailoredCourseBySlug(id);
}

/**
 * Prioritize courses matching the teacher's registered class levels and subjects.
 */
export function getRecommendedCourses(
  teacherLevels: string[] = [],
  teacherSubjects: string[] = []
): { recommended: CPDCourse[]; others: CPDCourse[] } {
  if (teacherLevels.length === 0 && teacherSubjects.length === 0) {
    return {
      recommended: PRELOADED_CPD_COURSES.slice(0, 3),
      others: PRELOADED_CPD_COURSES.slice(3),
    };
  }

  const normalizedSubjects = teacherSubjects.map((s) => s.toLowerCase().replace(/_/g, " "));

  const recommended: CPDCourse[] = [];
  const others: CPDCourse[] = [];

  for (const course of PRELOADED_CPD_COURSES) {
    const levelMatch = course.classLevels.some((lvl) => teacherLevels.includes(lvl));

    const subjectMatch =
      course.targetSubjects?.some((ts) => teacherSubjects.includes(ts)) ||
      normalizedSubjects.some(
        (ns) =>
          course.subject.toLowerCase().includes(ns) ||
          course.title.toLowerCase().includes(ns) ||
          course.description.toLowerCase().includes(ns)
      );

    if (levelMatch || subjectMatch) {
      recommended.push(course);
    } else {
      others.push(course);
    }
  }

  return { recommended, others };
}
