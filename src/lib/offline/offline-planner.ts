/**
 * Offline Nigerian Curriculum Lesson Plan Generation Engine.
 *
 * Implements standard NERDC (Nigerian Educational Research and Development Council)
 * and UBEC (Universal Basic Education Commission) lesson note formatting.
 *
 * Runs 100% offline in-browser/on-device with zero server or GPU requirements.
 * Used as the rock-solid fallback whenever on-device LLMs (wllama) are loading,
 * out of RAM, unprovisioned, or when network connectivity is absent.
 */

export interface OfflinePlanParams {
  topic: string;
  subject?: string | null;
  gradeLevel?: string | null;
  roughText?: string | null;
  mode?: "generate" | "refine";
}

export interface GeneratedPlanDraft {
  title: string;
  subject: string;
  gradeLevel: string;
  body: string;
}

interface SubjectArchetype {
  defaultMaterials: string[];
  verbs: string[];
  starterHook: string;
  activityTypes: { teacher: string; pupils: string }[];
}

const SUBJECT_ARCHETYPES: Record<string, SubjectArchetype> = {
  mathematics: {
    defaultMaterials: [
      "Flashcards, counters, abacus, and place value charts",
      "Graph board, rulers, and geometric cut-outs",
      "Real-life market scenario cards and play currency",
    ],
    verbs: ["calculate", "identify", "solve step-by-step", "differentiate", "demonstrate using concrete objects"],
    starterHook: "Teacher conducts a 3-minute mental drill reviewing the previous lesson's key formulas and asks a real-world problem connecting to today's topic.",
    activityTypes: [
      {
        teacher: "Teacher illustrates the core concept on the chalkboard using concrete examples and step-by-step working.",
        pupils: "Pupils observe attentively, copy the sample working into exercise books, and participate in guided calculation.",
      },
      {
        teacher: "Teacher guides pupils through paired practice problems, checking for common calculation errors.",
        pupils: "Pupils solve sample exercises in pairs using instructional manipulatives and cross-check answers.",
      },
      {
        teacher: "Teacher invites selected pupils to solve check problems on the board and reinforces the rule.",
        pupils: "Pupils volunteer solutions, explain their reasoning step-by-step, and receive instant feedback.",
      },
    ],
  },
  "basic science": {
    defaultMaterials: [
      "Specimens, hand lenses, charts showing biological/physical processes",
      "Real-life samples collected from school surroundings",
      "Diagrammatic wall posters and labeled models",
    ],
    verbs: ["define", "observe and classify", "explain the importance of", "draw and label", "state precautionary safety measures"],
    starterHook: "Teacher presents a real specimen or intriguing natural phenomenon to the class and asks probing questions to stimulate scientific curiosity.",
    activityTypes: [
      {
        teacher: "Teacher guides pupils to closely examine the instructional materials and explains the scientific principles involved.",
        pupils: "Pupils observe the specimen/diagram, record key observations, and answer guiding questions.",
      },
      {
        teacher: "Teacher leads an interactive demonstration illustrating the characteristics and functions of the topic.",
        pupils: "Pupils participate actively in the demonstration, asking questions and drawing diagrams in their science journals.",
      },
      {
        teacher: "Teacher relates the scientific concept to daily Nigerian environmental and health practices.",
        pupils: "Pupils discuss practical applications in their homes and communities (e.g. hygiene, farming, conservation).",
      },
    ],
  },
  "english studies": {
    defaultMaterials: [
      "Sentence strip charts, flashcards with phonetic symbols",
      "Passage extracts from approved textbook, dictionary",
      "Real-life dialogue role-play cue cards",
    ],
    verbs: ["pronounce accurately", "define and use in contextual sentences", "identify grammatical rules", "read fluently with comprehension", "construct original examples"],
    starterHook: "Teacher reads a short, engaging riddle or expressive poem related to the topic to activate prior vocabulary.",
    activityTypes: [
      {
        teacher: "Teacher introduces key vocabulary and models correct pronunciation and grammatical usage on the chalkboard.",
        pupils: "Pupils repeat words in unison and individually, paying close attention to stress and intonation.",
      },
      {
        teacher: "Teacher explains grammatical rules and structures with contextual Nigerian examples.",
        pupils: "Pupils construct their own sentences verbally and write them in their exercise books.",
      },
      {
        teacher: "Teacher coordinates a reading/writing drill or communicative pair dialogue.",
        pupils: "Pupils read aloud in turns, identify grammatical elements, and participate in peer feedback.",
      },
    ],
  },
  "social studies": {
    defaultMaterials: [
      "Map of Nigeria showing states and cultural zones",
      "Pictures illustrating community roles, family structures, and civic institutions",
      "Flashcards depicting cultural artifacts and social values",
    ],
    verbs: ["explain the meaning of", "highlight the social advantages of", "identify challenges and solutions related to", "demonstrate good citizenship values in"],
    starterHook: "Teacher asks pupils to recount a familiar community or family event to link their lived experiences to the topic.",
    activityTypes: [
      {
        teacher: "Teacher defines the social concept and discusses its relevance to national development and unity.",
        pupils: "Pupils listen attentively, contribute personal examples from their community, and take notes.",
      },
      {
        teacher: "Teacher divides the class into small groups to brainstorm causes, effects, and solutions regarding the topic.",
        pupils: "Pupils collaborate in groups, summarize their ideas, and appoint a spokesperson to share.",
      },
      {
        teacher: "Teacher summarizes the key civic duties and values that promote peace and progress.",
        pupils: "Pupils reflect on personal responsibility and commit to positive classroom and community behavior.",
      },
    ],
  },
  default: {
    defaultMaterials: [
      "Chalkboard, charts, illustrative diagrams, and approved curriculum textbook",
      "Concrete real-world items and pictorial representations",
      "Worksheets and guided exercise prompts",
    ],
    verbs: ["state the meaning of", "identify the key features of", "explain the importance of", "apply knowledge of", "solve problems involving"],
    starterHook: "Teacher reviews pupils' previous knowledge through rapid question-and-answer cues to bridge to today's topic.",
    activityTypes: [
      {
        teacher: "Teacher introduces the topic clearly, writing behavioral definitions and key notes on the chalkboard.",
        pupils: "Pupils listen attentively, write notes in their exercise books, and ask questions for clarification.",
      },
      {
        teacher: "Teacher models the application of the lesson through guided examples and classroom interaction.",
        pupils: "Pupils participate in guided drills and demonstrate understanding through oral and written responses.",
      },
      {
        teacher: "Teacher evaluates individual understanding through rapid formative assessment exercises.",
        pupils: "Pupils independently complete classwork exercises while teacher moves round to provide individual assistance.",
      },
    ],
  },
};

function getArchetype(subject: string): SubjectArchetype {
  const norm = subject.toLowerCase();
  for (const [key, val] of Object.entries(SUBJECT_ARCHETYPES)) {
    if (key !== "default" && norm.includes(key)) {
      return val;
    }
  }
  return SUBJECT_ARCHETYPES.default;
}

export function generateOfflineLessonPlan(params: OfflinePlanParams): GeneratedPlanDraft {
  const rawTopic = (params.topic || "Core Curriculum Study").trim();
  const subject = (params.subject || "General Studies").trim();
  const gradeLevel = (params.gradeLevel || "Basic Education").trim();
  const archetype = getArchetype(subject);

  // Capitalize Topic nicely
  const formattedTopic = rawTopic
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  const title = `${subject}: ${formattedTopic} (${gradeLevel})`;

  // Generate NERDC-standard structured lesson note
  const body = `
# LESSON PLAN: ${formattedTopic.toUpperCase()}

**Subject:** ${subject}  
**Class Level:** ${gradeLevel}  
**Topic:** ${formattedTopic}  
**Duration:** 40 Minutes  
**Curriculum Standard:** NERDC / UBEC Aligned  

---

### I. BEHAVIORAL OBJECTIVES
By the end of this 40-minute lesson, the pupils should be able to:
1. **Cognitive:** ${archetype.verbs[0]} the concept of ${formattedTopic} accurately in their own words.
2. **Affective / Analytical:** ${archetype.verbs[1] || "analyze"} the key characteristics and significance of ${formattedTopic} in everyday life.
3. **Psychomotor / Practical:** ${archetype.verbs[2] || "apply"} principles of ${formattedTopic} by correctly completing the classwork exercises.

---

### II. INSTRUCTIONAL MATERIALS & TEACHING AIDS
The teacher will facilitate learning using the following resources:
- ${archetype.defaultMaterials[0]}
- ${archetype.defaultMaterials[1]}
- Approved national curriculum textbook and chalkboard illustrations.

---

### III. ENTRY BEHAVIOR (PREVIOUS KNOWLEDGE)
- Pupils are familiar with foundational background concepts from their daily environment and previous term lessons.
- **Set Induction:** ${archetype.starterHook}

---

### IV. INSTRUCTIONAL PROCEDURES (STEP-BY-STEP)

#### Step 1: Identification & Definition (7 Minutes)
* **Teacher Activity:** ${archetype.activityTypes[0].teacher} Defines **${formattedTopic}** clearly and writes foundational definitions on the board.
* **Pupil Activity:** ${archetype.activityTypes[0].pupils}

#### Step 2: In-Depth Exploration & Guided Practice (15 Minutes)
* **Teacher Activity:** ${archetype.activityTypes[1].teacher} Breaks down the components of **${formattedTopic}** with practical Nigerian examples.
* **Pupil Activity:** ${archetype.activityTypes[1].pupils}

#### Step 3: Discussion & Application (10 Minutes)
* **Teacher Activity:** ${archetype.activityTypes[2].teacher} Relates **${formattedTopic}** to real-life situations and monitors classroom engagement.
* **Pupil Activity:** ${archetype.activityTypes[2].pupils}

---

### V. EVALUATION / FORMATIVE ASSESSMENT (5 Minutes)
Teacher asks the following oral and written check questions to gauge comprehension:
1. What is the meaning of **${formattedTopic}**?
2. Mention two key features or rules associated with **${formattedTopic}**.
3. Give one practical example where **${formattedTopic}** is applied in our community or home.

---

### VI. SUMMARY & CONCLUSION (3 Minutes)
- Teacher summarizes the core learning points of **${formattedTopic}** on the board.
- Teacher corrects any lingering misconceptions and commends active pupil participation.
- Pupils copy the chalkboard summary into their study notes.

---

### VII. ASSIGNMENT / HOMEWORK
1. In your homework notebook, write a short 3-sentence summary of what you learned about **${formattedTopic}**.
2. Answer Exercise Questions 1 to 4 on page of the approved ${subject} textbook.
3. Identify one real-life example of **${formattedTopic}** in your home or neighborhood to share tomorrow.
`.trim();

  return {
    title,
    subject,
    gradeLevel,
    body,
  };
}

/**
 * Refines a teacher's rough draft notes into an authoritative NERDC lesson note.
 */
export function refineOfflineLessonPlan(params: OfflinePlanParams): GeneratedPlanDraft {
  const rough = params.roughText || "";
  const base = generateOfflineLessonPlan(params);

  // Extract any existing bullet points or text from rough notes
  const lines = rough
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 5);

  let customNotes = "";
  if (lines.length > 0) {
    customNotes = `\n\n### TEACHER'S SPECIAL CLASS NOTES & ADAPTATIONS\n` +
      lines.map((line) => `- ${line}`).join("\n");
  }

  return {
    ...base,
    title: `Refined: ${base.title}`,
    body: `${base.body}${customNotes}`,
  };
}
