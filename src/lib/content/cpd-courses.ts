/**
 * Pre-generated, Offline-First CPD Courses for Nigerian Teachers.
 *
 * Stored directly in application code to guarantee 100% offline availability
 * without requiring PostgreSQL or external network requests.
 * Each course contains 5 to 6 fully curated, pedagogical modules.
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
  // ──────────────────────────────────────────────────────────────────────────
  // COURSE 1: FORMATIVE ASSESSMENT (5 MODULES)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "cpd-formative-assessment",
    slug: "formative-assessment-everyday-teaching",
    title: "Formative Assessment for Everyday Teaching",
    description:
      "Master low-stakes, real-time assessment strategies that uncover misconceptions immediately, without adding hours of grading.",
    subject: "Professional Development",
    classLevels: ["Primary", "JSS", "SSS"],
    estimatedDurationMinutes: 120,
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
        title: "Fast, Low-Prep Check-In Techniques (Zero Cost)",
        contentType: "text",
        body: `## Fast, Low-Prep Check-In Techniques (Zero Cost)

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
*What is $4 + 3 \\times 2$?*
- **A) 14** *(Learner evaluated left-to-right, ignoring order of operations)*
- **B) 10** *(Correct: $3 \\times 2 = 6$; $4 + 6 = 10$)*
- **C) 24** *(Learner multiplied everything: $4 \\times 3 \\times 2$)*
- **D) 9** *(Arithmetic slip)*

When learners answer **A**, you know immediately that they need review on PEMDAS/BODMAS, not basic addition.`,
      },
      {
        id: "fa-mod-4",
        title: "Live Chalkboard Polling & ABCD Response Cards",
        contentType: "text",
        body: `## Live Chalkboard Polling & ABCD Response Cards

How do you check 60 learners simultaneously without digital clickers or devices?

### Low-Tech ABCD Letter Cards
1. Every pupil receives or makes four palm-sized cards: **A**, **B**, **C**, and **D** using cut exercise book cardboard.
2. Pose a multiple-choice question on the chalkboard.
3. Count: *"3, 2, 1, Flash!"*
4. All pupils raise their card against their chest facing the teacher.

### Benefits of Chest-Level Flashing:
- Prevents pupils from looking around and copying the top students.
- Gives the teacher an instantaneous 360-degree scan of understanding across all rows.
- If more than 30% show the wrong letter, pause immediately and address the specific distractor.`,
      },
      {
        id: "fa-mod-5",
        title: "Closing the Feedback Loop: Actionable Next Steps",
        contentType: "text",
        body: `## Closing the Feedback Loop: Actionable Next Steps

Assessment without timely adjustment is merely record-keeping. The true power of formative assessment lies in what happens immediately after a gap is detected.

### The 4-Tier Pivot Protocol:
1. **Under 20% incorrect:** Pair struggling students with peers during independent work; keep the majority moving forward.
2. **20% to 50% incorrect:** Stop independent work. Model a second, alternative explanation using a concrete counter-example or visual diagram.
3. **Over 50% incorrect:** Abort the current task. Backtrack to the prerequisite concept and rebuild the foundation.

### Closing Routine:
Spend the last 3 minutes of every period having learners write a one-sentence summary: *"The most important rule I learned today is..."*`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // COURSE 2: CLASSROOM MANAGEMENT (5 MODULES)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "cpd-classroom-management",
    slug: "classroom-management-essentials",
    title: "Classroom Management in Large & Crowded Classrooms",
    description:
      "Practical routines, voice modulation, transitions, and de-escalation strategies tailored for Nigerian primary and secondary classrooms.",
    subject: "Classroom Practice",
    classLevels: ["Primary", "JSS", "SSS"],
    estimatedDurationMinutes: 120,
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
      {
        id: "cm-mod-4",
        title: "Seating Arrangements & Classroom Traffic Flow",
        contentType: "text",
        body: `## Seating Arrangements & Classroom Traffic Flow

In long benches with 3–4 students per wooden desk, movement and visibility require thoughtful organization.

### Strategic Bench Allocations:
- **High-Attention Zone:** Place pupils who struggle with vision, hearing, or attention in the central first two rows.
- **Behavior Balancing:** Separate social instigators across diagonal corners of the room.
- **Clear Walkways:** Maintain at least one wide central aisle so you can circulate to the very back of the room continuously during lessons.

### Circulation Habit:
Never remain anchored behind the teacher's desk. Teach from the sides and rear of the room to ensure 100% engagement.`,
      },
      {
        id: "cm-mod-5",
        title: "Building Relational Trust with High Expectations",
        contentType: "text",
        body: `## Building Relational Trust with High Expectations

The strongest discipline is grounded in mutual respect and predictable fairness.

### Daily Micro-Habits:
- Greet students at the doorway with warm eye contact.
- Learn and pronounce every student's full name correctly.
- Praise effort, perseverance, and clarity rather than generic "smartness".
- Never hold whole-class collective punishments when a few individuals are responsible.`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // COURSE 3: TEACHING MATHEMATICS (5 MODULES)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "cpd-maths-understanding",
    slug: "teaching-mathematics-conceptual-understanding",
    title: "Teaching Mathematics for Conceptual Understanding",
    description:
      "Move students beyond rote formula memorization through the Concrete-Pictorial-Abstract (CPA) framework and diagnostic error analysis.",
    subject: "Mathematics",
    classLevels: ["Primary", "JSS"],
    targetSubjects: ["primary_mathematics", "jss_maths"],
    estimatedDurationMinutes: 130,
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
- Relating denominators to "name/size of slice" and numerators to "number of slices".
- Connecting fractions to division: $\\frac{a}{b} = a \\div b$.`,
      },
      {
        id: "math-mod-3",
        title: "Unpacking Word Problems with Bar Modelling",
        contentType: "text",
        body: `## Unpacking Word Problems with Bar Modelling

Teach learners the Singapore Bar Model approach to translate English word problems into mathematical operations.

### Worked Example:
*"Amina has 15 more pencils than Tunde. Together they have 45 pencils. How many does Tunde have?"*

1. Draw a rectangular bar for Tunde.
2. Draw Amina's bar identical in length plus an extra segment of 15.
3. Students see visually: Total $45 - 15 = 30$, split equally across the 2 equal bars.
4. $30 \\div 2 = 15$ pencils for Tunde.`,
      },
      {
        id: "math-mod-4",
        title: "Mastering Decimals, Percentages & Ratio Connections",
        contentType: "text",
        body: `## Mastering Decimals, Percentages & Ratio Connections

Students frequently treat fractions, decimals, and percentages as three disconnected subjects.

### The Universal Equivalence Anchor:
- Show that $0.75$, $\\frac{3}{4}$, and $75\\%$ are identical values wearing different mathematical clothes.
- Teach percentage as "per hundred" ($/100$) using a 10x10 square grid.
- Connect ratios ($2:3$) to part-whole fractions: the total parts is $2 + 3 = 5$, so the shares are $\\frac{2}{5}$ and $\\frac{3}{5}$.`,
      },
      {
        id: "math-mod-5",
        title: "Diagnostic Error Analysis: Why Students Get It Wrong",
        contentType: "text",
        body: `## Diagnostic Error Analysis: Why Students Get It Wrong

Looking beyond the red checkmark: analyzing student thought processes.

### The 3 Common Mathematical Error Types:
1. **Executive Errors:** Calculation slips ($7 \\times 8 = 54$).
2. **Conceptual Errors:** Misapplying principles (e.g. adding denominators: $\\frac{1}{2} + \\frac{1}{3} = \\frac{2}{5}$).
3. **Translation Errors:** Misinterpreting word problem vocabulary ("less than" inverted).

### Classroom Routine:
Dedicate the first 5 minutes of each period to an "Error Hunt" where students explain why a fictional peer made a specific mistake on the board.`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // COURSE 4: FOUNDATIONAL LITERACY & PHONICS (5 MODULES)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "cpd-foundational-literacy",
    slug: "phonics-foundational-literacy",
    title: "Foundational Phonics & Reading Comprehension",
    description:
      "Systematic synthetic phonics instruction, vocabulary acquisition, and guided reading frameworks for multilingual classrooms.",
    subject: "English Language",
    classLevels: ["Primary"],
    targetSubjects: ["primary_english", "primary_english_studies"],
    estimatedDurationMinutes: 110,
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
      {
        id: "lit-mod-3",
        title: "Teaching High-Frequency 'Tricky' Words",
        contentType: "text",
        body: `## Teaching High-Frequency 'Tricky' Words

Irregular sight words (*the, was, said, were, come*) cannot be decoded using basic phonics rules.

### The Heart Word Technique:
1. Identify the decodable part of the word (e.g. in *said*, /s/ and /d/ are regular).
2. Highlight the unexpected letters (*ai*) with a heart symbol above them: this is the part students must memorize by heart.
3. Multi-sensory practice: write the word in the air, tap it on the arm, and write it in a sentence.`,
      },
      {
        id: "lit-mod-4",
        title: "Guided Reading Groups in Large Classrooms",
        contentType: "text",
        body: `## Guided Reading Groups in Large Classrooms

How to manage reading groups when you have 50 pupils:

### The Station Rotation Model:
- **Station 1 (With Teacher):** 10 pupils reading an instructional-level text aloud with immediate feedback.
- **Station 2 (Independent):** Silent reading or phonics worksheet completion.
- **Station 3 (Pairs):** Peer reading of familiar stories or flashcard speed drills.
Rotate every 12 minutes.`,
      },
      {
        id: "lit-mod-5",
        title: "Scaffolded Writing: From Sentences to Paragraphs",
        contentType: "text",
        body: `## Scaffolded Writing: From Sentences to Paragraphs

Guiding young writers past incomplete thoughts and missing capitalization.

### The Sentence Doctor Routine:
Write a flawed sentence on the chalkboard: *"musa went to market buy fish"*
Ask pupils to diagnose the 3 illnesses:
1. Capital letter missing at start (*Musa*).
2. Missing preposition (*to the market*).
3. Missing infinitive marker (*to buy fish*) and period at the end (*.*).`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // COURSE 5: SCIENCE INQUIRY ON A BUDGET (5 MODULES)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "cpd-science-inquiry",
    slug: "practical-science-inquiry-budget",
    title: "Practical Science Inquiry on a Budget",
    description:
      "Conduct safe, hands-on scientific experiments using local everyday materials, aligned with NERDC standards.",
    subject: "Sciences",
    classLevels: ["JSS", "SSS"],
    targetSubjects: ["jss_basic_science", "sss_biology", "sss_chemistry", "sss_physics"],
    estimatedDurationMinutes: 120,
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
      {
        id: "sci-mod-3",
        title: "Biology Demonstrations: Respiration, Osmosis & Germination",
        contentType: "text",
        body: `## Biology Demonstrations: Respiration, Osmosis & Germination

Tangible biological processes using market produce:

### 1. Osmosis in Yam/Potato Cups
- Scoop out a hollow in half a peeled yam.
- Place concentrated sugar solution inside the hollow; place the yam in a shallow bowl of plain water.
- Mark the liquid level with a pin. Observe after 2 hours: liquid rises due to endosmosis.

### 2. Gaseous Exchange in Plants
- Submerge freshly picked green leaves in warm water in a clear container.
- Within minutes, tiny oxygen bubbles form on the underside of leaves around stomata.`,
      },
      {
        id: "sci-mod-4",
        title: "Teaching the Scientific Method Through Data Collection",
        contentType: "text",
        body: `## Teaching the Scientific Method Through Data Collection

Science is not fact memorization; it is evidence-based reasoning.

### The Scientific Inquiry Loop:
1. **Hypothesis Formulation:** "If I increase the angle of the ramp, then the toy car will travel further because..."
2. **Variable Control:** Explain why only ONE variable (ramp height) changes while car and surface stay identical.
3. **T-Chart Data Recording:** Each pair records 3 repeated trials to eliminate outlier errors.
4. **Conclusion Writing:** Answering directly whether the data supports the original hypothesis.`,
      },
      {
        id: "sci-mod-5",
        title: "Safety, Waste Disposal & Laboratory Improvisation",
        contentType: "text",
        body: `## Safety, Waste Disposal & Laboratory Improvisation

Safe hands-on experiments even without specialized hoods or chemical showers.

### Essential Rules:
- Never taste or smell unknown chemical reactions directly; demonstrate proper gentle wafting.
- Neutralize all acidic or basic waste with baking soda or vinegar before disposal.
- Replace broken glass beakers with durable heat-resistant metal tins or clear plastic containers when heating is not required.`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // COURSE 6: DIFFERENTIATED INSTRUCTION (5 MODULES)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "cpd-differentiated-instruction",
    slug: "differentiated-instruction-mixed-ability",
    title: "Differentiated Instruction in Mixed-Ability Classrooms",
    description:
      "Design tiered assignments and scaffolding techniques so struggling learners thrive while advanced students stay challenged.",
    subject: "Pedagogy",
    classLevels: ["JSS", "SSS"],
    estimatedDurationMinutes: 110,
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
      {
        id: "diff-mod-3",
        title: "Multi-Modal Information Delivery",
        contentType: "text",
        body: `## Multi-Modal Information Delivery

Delivering concepts through multiple sensory channels ensures every learner connects:

### The 3-Channel Explanation:
1. **Verbal:** Clear, concise spoken explanation with deliberate pauses.
2. **Visual:** Chalkboard diagram, table, or flowchart highlighting key relationships.
3. **Kinesthetic:** Physical hand gesture, mime, or student roleplay embodying the concept.`,
      },
      {
        id: "diff-mod-4",
        title: "Differentiating Homework & Practice Exercises",
        contentType: "text",
        body: `## Differentiating Homework & Practice Exercises

Avoid assigning 20 identical drill questions where struggling learners give up after Question 2.

### Menu-Style Assignments (Tic-Tac-Toe):
Offer a 3x3 grid of practice activities varying in complexity and presentation format. Students select 3 tasks forming a row or column to complete their assignment.`,
      },
      {
        id: "diff-mod-5",
        title: "Continuous Progress Monitoring & Student Agency",
        contentType: "text",
        body: `## Continuous Progress Monitoring & Student Agency

Empowering learners to self-assess and track their own academic growth.

### Self-Assessment Exit Slips:
Before turning in work, students write one of three stamps on top of their paper:
- **[!]** "I need help with this concept."
- **[~]** "I understand, but need more practice."
- **[*]** "I have mastered this and can explain it to someone."
This gives the teacher instant insight for grouping during the next session.`,
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
