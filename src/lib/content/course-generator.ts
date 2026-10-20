/**
 * Client-Side AI Course Generator & Synthesis Engine.
 *
 * Runs during the "Downloading Resources" phase after activation.
 * Generates comprehensive, multi-module, curriculum-aligned courses
 * tailored to the teacher's selected class levels and subjects.
 *
 * Stored locally in IndexedDB / localStorage so they are immediately available
 * 100% offline alongside preloaded platform courses.
 */

import { CPDCourse, CPDModule } from "@/lib/content/cpd-courses";
import { getTeacherProfile, loadDraft } from "@/lib/offline";
import type { ClassLevel } from "@/lib/content/curriculum";

const LOCAL_STORAGE_COURSES_KEY = "trb.custom_generated_courses";

interface CourseTemplate {
  subjectKeyword: string;
  level: ClassLevel;
  title: string;
  description: string;
  duration: number;
  modules: {
    title: string;
    subtopics: string[];
    coreGuide: string;
    classroomStrategy: string;
    formativeAssessment: string;
  }[];
}

const GENERATION_BLUEPRINTS: CourseTemplate[] = [
  {
    subjectKeyword: "math",
    level: "JSS",
    title: "Mastering JSS Mathematics: Concrete Realia & Step-by-Step Algebraic Thinking",
    description:
      "A comprehensive, practical guide to teaching Junior Secondary Mathematics. Focuses on demystifying variables, fractions, geometry, and word problems in large classrooms.",
    duration: 120,
    modules: [
      {
        title: "From Concrete Realia to Algebraic Variables (JSS 1–3)",
        subtopics: ["Balance Scale Model", "Negative Numbers on a Floor Number Line", "Simplifying Like Terms"],
        coreGuide: `Algebra should never begin as abstract letters on a board. In Nigerian junior secondary classes, learners struggle when introduced to $2x + 5 = 15$ without physical context.

### The Balance Scale Paradigm:
1. Treat the equals sign ($=$) as the pivot point of a physical market balance scale.
2. What is done to the left side must be done to the right side to keep it balanced.
3. Use small matchboxes with unknown beans inside to represent $x$, and single beans to represent constants.`,
        classroomStrategy: "Draw a physical balance beam on the chalkboard. Have two student volunteers represent the left and right sides holding tally cards.",
        formativeAssessment: "Ask learners on scrap paper: 'If $3y + 4 = 19$, what operation must we perform to both sides first?' (Subtract 4). Check answers with a 30-second finger show.",
      },
      {
        title: "Geometry & Mensuration Without Expensive Instruments",
        subtopics: ["Angle Properties of Triangles & Parallel Lines", "Area of Irregular Shapes with Grid Paper", "Volume of Prisms"],
        coreGuide: `Geometry in JSS 2 and JSS 3 often suffers from lack of mathematical sets. Teach geometric constructions using locally sourced materials:
- Folding paper triangles and tearing off the three corners to place them side-by-side along a straight edge physically proves the sum of interior angles is $180^\\circ$.
- Using cardboard strips and thumbtacks to construct rigid versus deformable polygons.`,
        classroomStrategy: "Paper folding discovery lesson: Each learner cuts or tears any triangle from an exercise book sheet and verifies the $180^\\circ$ straight-line rule without a protractor.",
        formativeAssessment: "Cold-call 3 pairs to state why a triangle cannot have two right angles.",
      },
      {
        title: "Dissecting WAEC/BECE Multi-Step Word Problems",
        subtopics: ["Singapore Bar Modelling", "Underlining Key Quantities", "Checking Answer Plausibility"],
        coreGuide: `Word problems cause failure not because students cannot calculate, but because reading comprehension fails them.
        
### 4-Step Word Problem Protocol:
1. **Read & Paraphrase:** Learner explains the story in their own words without numbers.
2. **Identify the Unknown:** What exact quantity are we solving for?
3. **Draw the Diagram:** Bar model showing parts and whole.
4. **Equation & Verification:** Substitute answer back into the original problem statement.`,
        classroomStrategy: "Chalkboard Relay: Group 1 defines the variable, Group 2 writes the equation, Group 3 calculates, Group 4 checks.",
        formativeAssessment: "Give learners a word problem with an intentionally wrong answer and ask them to spot the conceptual flaw in pairs.",
      },
    ],
  },
  {
    subjectKeyword: "english",
    level: "JSS",
    title: "Junior Secondary English Mastery: Grammar in Context & Active Comprehension",
    description:
      "Transform JSS English classes from rote rules to communicative confidence. Covers parts of speech, continuous writing rubrics, and reading strategies.",
    duration: 110,
    modules: [
      {
        title: "Teaching Parts of Speech as Living Language, Not Rigid Definitions",
        subtopics: ["Nouns & Pronouns in Action", "Action Verbs vs Auxiliary Verbs", "Prepositions with Physical Classroom Objects"],
        coreGuide: `Rote memorization ('A noun is the name of a person, animal, place...') does not help learners write coherent paragraphs.
        
### Contextual Teaching Framework:
- Teach parts of speech by function within a sentence: What job is this word doing?
- Replace isolated grammar fill-in-the-blank with short sentence-combining drills.`,
        classroomStrategy: "Flyswatter / Chalkboard Circle game: Write words randomly on the board. Say a part of speech; learner races to circle a matching word.",
        formativeAssessment: "Give a sentence where one word acts as both noun and verb ('I run every day' vs 'I went for a run') and ask students to justify the difference.",
      },
      {
        title: "Structured Essay Writing: The PEEL Paragraph Framework",
        subtopics: ["Point, Evidence, Explanation, Link", "Formal vs Informal Register", "Transition Connectors"],
        coreGuide: `Learners in JSS 2 and 3 often produce unstructured, stream-of-consciousness essays. The PEEL framework provides scaffolding:
- **P (Point):** The topic sentence of the paragraph.
- **E (Evidence/Example):** Concrete fact, story, or detail.
- **E (Explanation):** Why this point matters.
- **L (Link):** Connects back to the main thesis or bridges to the next paragraph.`,
        classroomStrategy: "Color-coded paragraph analysis: Underline Point in blue, Example in green, Explanation in yellow, Link in red.",
        formativeAssessment: "Have pupils write a single 4-sentence PEEL paragraph defending a school rule, peer-evaluated in pairs.",
      },
    ],
  },
  {
    subjectKeyword: "science",
    level: "JSS",
    title: "JSS Basic Science: Hands-On Inquiry & Indigenous Low-Cost Experiments",
    description:
      "Teach Living & Non-Living Things, Energy, Simple Machines, and Environmental Health using easily accessible local materials.",
    duration: 105,
    modules: [
      {
        title: "Simple Machines & Everyday Mechanics Around the School",
        subtopics: ["Levers of Class 1, 2, and 3", "Pulleys & Inclined Planes", "Mechanical Advantage Calculations"],
        coreGuide: `Do not teach simple machines using textbook drawings of European gearboxes. The classroom and school compound are full of machines:
- **Class 1 Lever:** Bottle opener, scissors, claw hammer.
- **Class 2 Lever:** Wheelbarrow, nutcracker.
- **Class 3 Lever:** Broom, forearm holding a load.`,
        classroomStrategy: "Compound Scavenger Hunt: Teams locate and categorize 5 working simple machines in the school compound in 7 minutes.",
        formativeAssessment: "Exit Slip: Draw your arm lifting a heavy textbook and label the Fulcrum, Load, and Effort points.",
      },
      {
        title: "Matter & Changes in State: Kitchen Chemistry",
        subtopics: ["Physical vs Chemical Changes", "Separation of Mixtures (Filtration, Evaporation, Decantation)", "Rusting & Oxidation"],
        coreGuide: `Chemistry principles demonstrated with zero lab budget:
- Separate sand and salt using water, cloth filter, and sunlight/charcoal heat.
- Prove gas has mass by balancing two deflated balloons, then inflating one.`,
        classroomStrategy: "Teacher demonstration followed by paired observation recording using structured observation tables.",
        formativeAssessment: "Flashcards: Students hold up 'P' for Physical Change or 'C' for Chemical Change as 5 rapid everyday scenarios are described.",
      },
    ],
  },
  {
    subjectKeyword: "math",
    level: "Primary",
    title: "Primary Mathematics: Concrete Manipulatives & Mental Numeracy Drills",
    description:
      "Build deep number sense, place value mastery, and rapid mental math strategies for Primary 1–6 learners using everyday counters and abaci.",
    duration: 90,
    modules: [
      {
        title: "Place Value Mastery with Bundle Sticks & Bottle Caps",
        subtopics: ["Tens and Units Bundles", "Hundreds Flats", "Regrouping in Addition and Subtraction"],
        coreGuide: `Primary pupils who struggle with two-digit subtraction with renaming almost always lack physical place-value representation.
        
### The Bundle Method:
- Bundle 10 sticks together with a rubber band to represent a Ten.
- Loose sticks represent Units.
- 'Borrowing' becomes physically unbundling a packet of 10 sticks.`,
        classroomStrategy: "Every child has 3 bundles of 10 and 10 loose sticks on their desk. Model physical unbundling before writing on the board.",
        formativeAssessment: "Show 4 bundles and 3 loose sticks: Pupils write the number on mini chalkboards and hold them up.",
      },
    ],
  },
  {
    subjectKeyword: "math",
    level: "SSS",
    title: "Senior Secondary Mathematics: WAEC Mastery, Quadratic Functions & Trigonometry",
    description:
      "A high-yield pedagogical guide to teaching SSS Mathematics. Covers quadratic equations, Circle Theorems, logarithms, and trigonometry with step-by-step WAEC marking scheme strategies.",
    duration: 135,
    modules: [
      {
        title: "Demystifying Quadratic Equations & The Quadratic Formula",
        subtopics: ["Factoring Trinomials", "Completing the Square", "The Quadratic Formula $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$"],
        coreGuide: `Students often panic at the quadratic formula because of signs and order of operations.
Teach the discriminant $\\Delta = b^2 - 4ac$ as a litmus test:
- If $b^2 - 4ac > 0$: Two distinct real roots.
- If $b^2 - 4ac = 0$: Exactly one real repeated root.
- If $b^2 - 4ac < 0$: No real roots.

### Chalkboard Scaffold:
Always have students identify $a$, $b$, and $c$ explicitly with their signs (+ or -) before substituting into the equation:
$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$`,
        classroomStrategy: "Sign Error Audit: Present 3 solved equations containing the most common WAEC algebraic sign errors. Have students detect and explain each mistake.",
        formativeAssessment: "Find the discriminant of $2x^2 - 4x + 2 = 0$. What does it tell us about the roots? (0, one repeated root).",
      },
      {
        title: "Circle Theorems: Visual Proofs on the Chalkboard",
        subtopics: ["Angle at Center is Twice Angle at Circumference", "Angles in the Same Segment", "Opposite Angles in a Cyclic Quadrilateral"],
        coreGuide: `Do not expect students to memorize 7 abstract circle theorems without visual anchors.
Use colored chalk to highlight subtended arcs:
- The arc $AB$ dictates every angle standing upon it.
- Draw concentric circles or use string pinned to the board to physically demonstrate that moving the vertex anywhere along the major arc preserves the exact angle measure.`,
        classroomStrategy: "Theorem Spotting: Project or sketch 4 complex geometric figures and ask pairs 60 seconds to identify which specific theorem unlocks the missing angle.",
        formativeAssessment: "If $\\angle AOB = 110^\\circ$ at the center, what is $\\angle ACB$ at the circumference? ($55^\\circ$).",
      },
    ],
  },
  {
    subjectKeyword: "science",
    level: "SSS",
    title: "SSS Science & Biology: Cellular Energetics, Genetics & Low-Cost Practical Improv",
    description:
      "Master high-stakes Senior Secondary Science concepts: photosynthesis, cellular respiration, genetics, and stoichiometry with laboratory improvisation.",
    duration: 125,
    modules: [
      {
        title: "Photosynthesis & Biochemical Energetics",
        subtopics: ["Light-Dependent vs Light-Independent Reactions", "The Balanced Chemical Equation", "Starch Testing in Green Leaves"],
        coreGuide: `Photosynthesis is foundational for WAEC/NECO Biology.
Break the chemical formula down step by step:
$$6\\text{CO}_2 + 6\\text{H}_2\\text{O} \\xrightarrow{\\text{light, chlorophyll}} \\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2$$

### Essential Misconception Buster:
Students often believe plants only respire at night. Emphasize that respiration is continuous ($24/7$), while photosynthesis depends on light availability.`,
        classroomStrategy: "Leaf Starch Demonstration using ethanol in a water bath with iodine solution. Explain why dipping the leaf in boiling water stops enzymatic activity.",
        formativeAssessment: "Ask learners: 'Why must the leaf be boiled in ethanol before applying iodine?' (To decolorize/remove chlorophyll so the blue-black color change is visible).",
      },
    ],
  },
  {
    subjectKeyword: "english",
    level: "SSS",
    title: "Senior Secondary English: WAEC Continuous Writing Rubrics & Summary Extraction",
    description:
      "Equip senior secondary students with the exact skills required to score Distinction in WAEC/NECO Paper 1 and 2: formal register, thesis formulation, and concise summary writing.",
    duration: 115,
    modules: [
      {
        title: "WAEC Summary Writing: Identifying Core Assertions vs Illustrations",
        subtopics: ["Stripping Examples & Modifiers", "Formulating Sentences in One's Own Words", "Avoiding Grammatical Shifts"],
        coreGuide: `WAEC summary penalties are severe: lifting verbatim causes loss of marks, and writing more than one sentence per point loses 50%.
Teach students the **Sieve Method**:
1. Cross out all anecdotes, rhetorical questions, and statistics.
2. Circle the main clause containing the author's primary assertion.
3. Rewrite the core proposition in a single, grammatically complete sentence.`,
        classroomStrategy: "Sentence Surgery: Give students a 70-word paragraph. Challenge them in groups to reduce it to a single 15-word grammatical sentence without losing the core message.",
        formativeAssessment: "Have each student write one summary sentence from a short passage extract. Check that no words were directly lifted.",
      },
    ],
  },
];

/**
 * Find a tailored course blueprint by slug (synchronous and universal).
 */
export function getTailoredCourseBySlug(slug: string): CPDCourse | undefined {
  // Check localStorage if running in browser
  if (typeof window !== "undefined") {
    try {
      const stored = getCustomGeneratedCourses();
      const found = stored.find((c) => c.slug === slug || c.id === slug);
      if (found) return found;
    } catch {}
  }

  // Look up matching blueprint
  for (let idx = 0; idx < GENERATION_BLUEPRINTS.length; idx++) {
    const t = GENERATION_BLUEPRINTS[idx];
    const candidateSlug = `tailored-${t.level.toLowerCase()}-${t.subjectKeyword}-${idx + 1}`;
    if (
      slug === candidateSlug ||
      slug === `tailored-${t.level.toLowerCase()}-${t.subjectKeyword}` ||
      slug.includes(`${t.level.toLowerCase()}-${t.subjectKeyword}`)
    ) {
      return {
        id: `gen-${candidateSlug}`,
        slug: candidateSlug,
        title: t.title,
        description: t.description,
        subject: t.subjectKeyword.toUpperCase(),
        classLevels: [t.level],
        estimatedDurationMinutes: t.duration,
        aiGenerated: true,
        modules: t.modules.map((m, mIdx) => ({
          id: `mod-${candidateSlug}-${mIdx + 1}`,
          title: m.title,
          contentType: "text",
          body: `## ${m.title}

### Core Curriculum Subtopics:
${m.subtopics.map((s) => `- **${s}**`).join("\n")}

---

### Instructional Guide & Pedagogy:
${m.coreGuide}

---

### Recommended Classroom Strategy:
💡 *${m.classroomStrategy}*

---

### Formative Check for Understanding (Exit Slip):
📝 ${m.formativeAssessment}
`,
        })),
      };
    }
  }

  return undefined;
}

/**
 * Synthesizes specialized full courses for the current teacher's profile.
 * Called automatically during post-activation resource downloading.
 */
export async function generateTailoredCoursesForTeacher(): Promise<CPDCourse[]> {
  const profile = getTeacherProfile() || loadDraft();
  const classLevels: ClassLevel[] = profile?.classLevels || ["JSS"];
  const subjects: string[] = profile?.subjects || ["jss_maths", "jss_english"];

  const normSubjects = subjects.map((s) =>
    s.toLowerCase().replace(/_/g, " ").replace(/primary|jss|sss/g, "").trim()
  );

  const matchedBlueprints = GENERATION_BLUEPRINTS.filter((bp) => {
    const levelMatch = classLevels.includes(bp.level);
    const subjectMatch = normSubjects.some((ns) => ns.includes(bp.subjectKeyword));
    return levelMatch && subjectMatch;
  });

  // If no specific match, use general high-yield templates for the teacher's level
  const selectedTemplates = matchedBlueprints.length > 0
    ? matchedBlueprints
    : GENERATION_BLUEPRINTS.filter((bp) => classLevels.includes(bp.level));

  const generatedCourses: CPDCourse[] = selectedTemplates.map((t, idx) => {
    const slug = `tailored-${t.level.toLowerCase()}-${t.subjectKeyword}-${idx + 1}`;
    return {
      id: `gen-${slug}`,
      slug,
      title: t.title,
      description: t.description,
      subject: t.subjectKeyword.toUpperCase(),
      classLevels: [t.level],
      estimatedDurationMinutes: t.duration,
      aiGenerated: true,
      modules: t.modules.map((m, mIdx) => ({
        id: `mod-${slug}-${mIdx + 1}`,
        title: m.title,
        contentType: "text",
        body: `## ${m.title}

### Core Curriculum Subtopics:
${m.subtopics.map((s) => `- **${s}**`).join("\n")}

---

### Instructional Guide & Pedagogy:
${m.coreGuide}

---

### Recommended Classroom Strategy:
💡 *${m.classroomStrategy}*

---

### Formative Check for Understanding (Exit Slip):
📝 ${m.formativeAssessment}
`,
      })),
    };
  });

  // Persist into localStorage so they appear immediately in Course Catalog
  if (typeof window !== "undefined") {
    try {
      const existingRaw = window.localStorage.getItem(LOCAL_STORAGE_COURSES_KEY);
      const existing: CPDCourse[] = existingRaw ? JSON.parse(existingRaw) : [];
      const merged = [...existing.filter((e) => !generatedCourses.some((g) => g.id === e.id)), ...generatedCourses];
      window.localStorage.setItem(LOCAL_STORAGE_COURSES_KEY, JSON.stringify(merged));
    } catch (e) {
      console.warn("Could not save tailored courses to local storage:", e);
    }
  }

  return generatedCourses;
}

export function getCustomGeneratedCourses(): CPDCourse[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_COURSES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
