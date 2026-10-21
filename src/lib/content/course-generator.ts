/**
 * Client-Side AI Course Generator & Synthesis Engine.
 *
 * Runs during the "Downloading Resources" phase after activation.
 * Generates comprehensive, multi-module, curriculum-aligned courses
 * tailored to the teacher's selected class levels and subjects.
 *
 * Each course contains 5 to 7 fully curated, furnished pedagogical modules.
 * Stored locally in localStorage so they are immediately available 100% offline.
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

export const GENERATION_BLUEPRINTS: CourseTemplate[] = [
  // ──────────────────────────────────────────────────────────────────────────
  // 1. SSS MATHEMATICS (7 MODULES)
  // ──────────────────────────────────────────────────────────────────────────
  {
    subjectKeyword: "math",
    level: "SSS",
    title: "Senior Secondary Mathematics: WAEC Mastery, Quadratic Functions & Trigonometry",
    description:
      "A high-yield pedagogical guide to teaching SSS Mathematics. Covers quadratic equations, Circle Theorems, logarithms, and trigonometry with step-by-step WAEC marking scheme strategies.",
    duration: 180,
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
        title: "Completing the Square: Geometric & Algebraic Modeling",
        subtopics: ["Visualizing Area Models", "The $(\\frac{b}{2})^2$ Constant", "Derivation of the Quadratic Formula"],
        coreGuide: `Completing the square is conceptually challenging if taught solely as a formula.
### The Geometric Square Method:
1. Represent $x^2 + bx$ as a large $x$ by $x$ square plus a rectangle of area $bx$.
2. Cut the $bx$ rectangle into two equal halves of area $\\frac{b}{2}x$ and place them along adjacent sides of the $x^2$ square.
3. The missing corner piece needed to complete the geometric square is $(\\frac{b}{2}) \\times (\\frac{b}{2}) = (\\frac{b}{2})^2$.
This visual anchor cements why $(\\frac{b}{2})^2$ is added to both sides of the equation.`,
        classroomStrategy: "Paper cutting discovery: Students sketch the geometric square on grid paper to discover why $(\\frac{b}{2})^2$ balances the equation.",
        formativeAssessment: "What constant must be added to $x^2 + 8x$ to make it a perfect square trinomial? (Answer: $(\\frac{8}{2})^2 = 16$).",
      },
      {
        title: "Circle Theorems: Visual Proofs on the Chalkboard",
        subtopics: ["Angle at Center is Twice Angle at Circumference", "Angles in the Same Segment", "Opposite Angles in a Cyclic Quadrilateral"],
        coreGuide: `Do not expect students to memorize 7 abstract circle theorems without visual anchors.
Use colored chalk to highlight subtended arcs:
- The arc $AB$ dictates every angle standing upon it.
- Draw concentric circles or use string pinned to the board to physically demonstrate that moving the vertex anywhere along the major arc preserves the exact angle measure: $\\angle APB = \\frac{1}{2}\\angle AOB$.`,
        classroomStrategy: "Theorem Spotting: Project or sketch 4 complex geometric figures and give pairs 60 seconds to identify which specific theorem unlocks the missing angle.",
        formativeAssessment: "If $\\angle AOB = 110^\\circ$ at the center of a circle, what is $\\angle ACB$ on the circumference standing on the same arc? ($55^\\circ$).",
      },
      {
        title: "Trigonometric Ratios, Elevation, Depression & 3-Figure Bearings",
        subtopics: ["SOH CAH TOA Application", "Angle of Elevation vs Depression Alternate Angle Rule", "3-Figure Bearing Diagrams"],
        coreGuide: `In WAEC Paper 2, bearings questions carry 12-15 marks, yet 40% of candidates lose marks on the initial sketch.
### The 3 Cardinal Rules of Bearings:
1. Always draw a 4-point compass cross ($N, S, E, W$) at every navigation station.
2. Measure angles clockwise starting from True North ($000^\\circ$).
3. Use the Z-angle (alternate interior angles) property between parallel North lines to transfer angles between stations.`,
        classroomStrategy: "Floor Compass Navigation: Draw a North line on the classroom floor with masking tape or chalk. Have volunteers walk a bearing of $120^\\circ$ for 3 paces.",
        formativeAssessment: "A ship sails from point A on a bearing of $065^\\circ$ to point B. What is the back bearing from point B to point A? ($065^\\circ + 180^\\circ = 245^\\circ$).",
      },
      {
        title: "Laws of Indices, Logarithms and Change of Base",
        subtopics: ["Index Laws with Fractional & Negative Powers", "Logarithm Rules", "Solving Exponential Equations"],
        coreGuide: `Connect indices directly to logarithms:
$$\\log_b(a) = c \\iff b^c = a$$
### Essential Transformation Rules:
- Multiplication inside the log becomes addition outside: $\\log_b(xy) = \\log_b(x) + \\log_b(y)$
- Division inside becomes subtraction: $\\log_b(\\frac{x}{y}) = \\log_b(x) - \\log_b(y)$
- Power rule: $\\log_b(x^k) = k \\cdot \\log_b(x)$
- Change of base formula: $\\log_b(a) = \\frac{\\log_{10}(a)}{\\log_{10}(b)}$`,
        classroomStrategy: "Log Match Card Sort: Students match exponential equations to their equivalent logarithmic forms in pairs within 3 minutes.",
        formativeAssessment: "Solve for $x$: $3^{2x - 1} = 27$. (Since $27 = 3^3$, $2x - 1 = 3 \\implies x = 2$).",
      },
      {
        title: "Coordinate Geometry: Gradient, Midpoint & Perpendicular Slopes",
        subtopics: ["Slope Formula $m = \\frac{y_2 - y_1}{x_2 - x_1}$", "Equation of a Line $y - y_1 = m(x - x_1)$", "Perpendicular Gradient Rule $m_1 \\cdot m_2 = -1$"],
        coreGuide: `Coordinate geometry bridges algebra and geometry.
### Conceptual Mastery of Gradients:
- A horizontal line has zero steepness ($m = 0$).
- A vertical line has undefined slope (division by zero: $x_2 - x_1 = 0$).
- Two lines are perpendicular if and only if their slopes are negative reciprocals:
$$m_2 = -\\frac{1}{m_1}$$`,
        classroomStrategy: "Coordinate Battle: Graph two points on grid paper. One team calculates the gradient, the second writes the line equation, the third finds the perpendicular slope.",
        formativeAssessment: "If line $L_1$ has a slope of $3$, what is the slope of a line perpendicular to $L_1$? (Answer: $-\\frac{1}{3}$).",
      },
      {
        title: "WAEC Paper 2 Multi-Step Problem Solving & Marking Traps",
        subtopics: ["Method Marks (M) vs Accuracy Marks (A)", "Avoiding Premature Rounding", "Checking Solution Plausibility"],
        coreGuide: `WAEC Chief Examiners frequently report that candidates lose up to 15 marks through arithmetic slips or skipping intermediate working.
### WAEC Marking Scheme Insights:
1. **Method Marks (M):** Awarded for correct mathematical reasoning even if calculation slips occur. Never let students erase intermediate working!
2. **Accuracy Marks (A):** Awarded only if the preceding method mark was earned.
3. **Premature Rounding Penalty:** Keep full fractions or at least 4 decimal places until the final answer line.`,
        classroomStrategy: "Mock Examiner Audit: Distribute authentic anonymized past WAEC answers. Students mark them in pairs using the official grading rubric.",
        formativeAssessment: "Give a 3-step trigonometric calculation and ask students to point out where rounding to 1 decimal place too early skewed the final answer.",
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 2. SSS SCIENCE & BIOLOGY (6 MODULES)
  // ──────────────────────────────────────────────────────────────────────────
  {
    subjectKeyword: "science",
    level: "SSS",
    title: "SSS Science & Biology: Cellular Energetics, Genetics & Low-Cost Practical Improv",
    description:
      "Master high-stakes Senior Secondary Science concepts: photosynthesis, cellular respiration, genetics, and stoichiometry with laboratory improvisation.",
    duration: 170,
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
      {
        title: "Cellular Respiration, Glycolysis & Aerobic vs Anaerobic Pathways",
        subtopics: ["Glycolysis in Cytoplasm", "Krebs Cycle & Electron Transport in Mitochondria", "Fermentation in Yeast"],
        coreGuide: `Demystify cellular energetics:
- **Aerobic Respiration:** Produces up to $36-38$ ATP molecules per glucose molecule:
$$\\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2 \\rightarrow 6\\text{CO}_2 + 6\\text{H}_2\\text{O} + 36\\text{ ATP}$$
- **Anaerobic Respiration in Animals:** Produces Lactic Acid and only $2$ ATP.
- **Anaerobic Fermentation in Yeast:** Produces Ethanol and $\\text{CO}_2$, applied directly in local breadmaking and brewing.`,
        classroomStrategy: "Yeast Balloon Demonstration: Mix baker's yeast with sugar water in a bottle and cap with a balloon. Watch the balloon inflate with carbon dioxide within 15 minutes.",
        formativeAssessment: "Why do athletes experience muscle cramps during a fast 100m sprint? (Accumulation of lactic acid from anaerobic respiration).",
      },
      {
        title: "Mendelian Genetics: Monohybrid Crosses & Punnett Squares",
        subtopics: ["Dominant vs Recessive Alleles", "Genotype vs Phenotype Ratios", "Sex-Linked Inheritance & Sickle Cell"],
        coreGuide: `In Nigerian communities, sickle cell genotype ($AA, AS, SS$) is a vital topic with direct life relevance.
### The 4-Step Punnett Square Framework:
1. Define symbols clearly ($A$ for normal hemoglobin, $S$ for sickle hemoglobin).
2. Write parental genotypes (e.g. Carrier father $AS \\times$ Carrier mother $AS$).
3. Complete the $2 \\times 2$ grid.
4. Calculate genotypic ratio ($1 AA : 2 AS : 1 SS$) and statistical probability ($25\\%$ chance of child with $SS$).`,
        classroomStrategy: "Coin Flip Genetic Simulation: Pairs toss two coins ($Heads = A, Tails = S$) 50 times to prove that statistical probabilities hold over large populations.",
        formativeAssessment: "Two carrier parents ($AS \\times AS$) have 3 children with $AA$. What is the probability their 4th child will have $SS$? (Still $25\\%$; each pregnancy is an independent event).",
      },
      {
        title: "Enzymes: Biological Catalysts, pH & Temperature Specificity",
        subtopics: ["Lock and Key Model", "Factors Affecting Enzyme Action", "Salivary Amylase Practical Demonstration"],
        coreGuide: `Enzymes are protein catalysts that speed up biochemical reactions without being consumed.
- **Optimum Temperature:** In humans, enzymes peak around $37^\\circ\\text{C}$ and denature above $45^\\circ\\text{C}-50^\\circ\\text{C}$.
- **pH Specificity:** Pepsin in the stomach requires acidic pH ($1-2$), while salivary amylase in the mouth thrives near neutral ($6.8-7$).`,
        classroomStrategy: "Amylase Cracker Test: Students chew a plain unsweetened cream cracker for 2 full minutes without swallowing. They note how it turns sweet as amylase breaks starch into maltose.",
        formativeAssessment: "Why does boiling salivary amylase permanently halt its ability to digest starch? (The high temperature irreversibly denatures the protein active site).",
      },
      {
        title: "Ecology: Food Webs, Trophic Energy Pyramids & Quadrat Sampling",
        subtopics: ["Producers, Consumers & Decomposers", "The 10% Trophic Energy Transfer Rule", "Quadrat Population Density Sampling"],
        coreGuide: `Ecology in WAEC practicals tests field estimation techniques:
### The 10% Energy Transfer Law:
At each trophic step (Grass $\\rightarrow$ Grasshopper $\\rightarrow$ Lizard $\\rightarrow$ Hawk), approximately $90\\%$ of energy is lost as heat, locomotion, and metabolic waste. Only $10\\%$ is incorporated into new biomass.
### Quadrat Sampling Formula:
$$\\text{Density} = \\frac{\\text{Total individuals counted in all quadrats}}{\\text{Total area of all quadrats sampled}}$$`,
        classroomStrategy: "Coat Hanger Quadrat: Bend wire coat hangers into $0.5\\text{m} \\times 0.5\\text{m}$ squares. Students sample weed density on the school field.",
        formativeAssessment: "If producers capture $10,000\\text{ J}$ of solar energy, how much energy is available to secondary consumers? ($100\\text{ J}$, applying the $10\\%$ rule twice).",
      },
      {
        title: "Laboratory Improvisation for WAEC Biology Practical",
        subtopics: ["Local Reagents & Substitutes", "Specimen Preservation (Formalin Alternatives)", "Biological Drawing Standards"],
        coreGuide: `WAEC Biology Practical tests microscopy, dissection, food tests, and specimens.
### The 5 Golden Rules of WAEC Biological Drawings:
1. Draw with a sharp, hard (2H) pencil with clean, unbroken lines (no shading or artistic feathering).
2. Title must be fully written in capital letters with magnification (e.g. $\\times 1.5$).
3. Label lines must be strictly horizontal, drawn with a ruler, and must not cross each other.
4. No arrowheads on label lines.
5. Proportionality must be biologically accurate.`,
        classroomStrategy: "Peer Drawing Audit: Students exchange drawings of a hibiscus flower or bean seed and mark each other against the 5 WAEC drawing criteria.",
        formativeAssessment: "Cold-call a student: State 2 errors that instantly cause loss of marks in a WAEC biological drawing test.",
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 3. PRIMARY MATHEMATICS (6 MODULES)
  // ──────────────────────────────────────────────────────────────────────────
  {
    subjectKeyword: "math",
    level: "Primary",
    title: "Mastering Primary Mathematics: Concrete CPA, Number Sense & Problem Solving",
    description:
      "Build deep number sense, place value mastery, and rapid mental math strategies for Primary 1–6 learners using everyday counters and abaci.",
    duration: 150,
    modules: [
      {
        title: "Place Value Mastery with Bundle Sticks & Bottle Caps",
        subtopics: ["Tens and Units Bundles", "Hundreds Flats", "Regrouping in Addition and Subtraction"],
        coreGuide: `Primary pupils who struggle with two-digit subtraction with renaming almost always lack physical place-value representation.
        
### The Bundle Method:
- Bundle 10 sticks together with a rubber band to represent a Ten.
- Loose sticks represent Units.
- 'Borrowing' becomes physically unbundling a packet of 10 sticks into 10 loose units.`,
        classroomStrategy: "Every child has 3 bundles of 10 and 10 loose sticks on their desk. Model physical unbundling before writing numbers on the board.",
        formativeAssessment: "Show 4 bundles and 3 loose sticks: Pupils write the number on mini chalkboards and hold them up (43).",
      },
      {
        title: "Addition & Subtraction with Renaming (Vertical Algorithms)",
        subtopics: ["Carrying in Addition", "Borrowing Across Zero", "Mental Double-Digit Strategies"],
        coreGuide: `When pupils add $28 + 15$, rote instruction causes them to write $313$.
### The Place Value Column Scaffold:
1. Label columns clearly with **T** (Tens) and **U** (Units).
2. Units first: $8 + 5 = 13$ units.
3. Show that $13$ is $1$ Ten and $3$ Units.
4. Write $3$ under Units and physically carry the $1$ bundle over to the Tens column.`,
        classroomStrategy: "Two-Voice Algorithm: Have the class chant together: 'Eight plus five is thirteen, keep three in units, carry one ten to tens column!'",
        formativeAssessment: "Solve $52 - 27$ on scrap paper. Circulate and observe if students properly rename 5 tens to 4 tens and 12 units.",
      },
      {
        title: "Multiplication as Arrays & Skip Counting (Without Rote Fear)",
        subtopics: ["Arrays using Bottle Caps", "Skip Counting on the Number Line", "The Commutative Property $3 \\times 4 = 4 \\times 3$"],
        coreGuide: `Multiplication is repeated addition of equal groups.
### The Array Model:
- Arrange bottle caps in 3 rows of 4.
- Count rows: $4 + 4 + 4 = 12$.
- Rotate the tray: 4 columns of 3 caps: $3 + 3 + 3 + 3 = 12$.
- Pupils immediately see visually that order does not change the product ($a \\times b = b \\times a$).`,
        classroomStrategy: "Human Grid: Have students form 4 lines of 5 students to physically experience an array of 20 before writing $4 \\times 5 = 20$.",
        formativeAssessment: "Draw an array for $3 \\times 6$ on your slate using circles.",
      },
      {
        title: "Fractions Without Fear: Equal Slices, Strips & Number Lines",
        subtopics: ["Halves, Fourths & Eighths", "Equivalent Fractions", "Adding Like Denominators"],
        coreGuide: `Avoid defining fractions with abstract rules. Start with fair food sharing:
- A fraction is equal parts of a whole object.
- Denominator = How many equal pieces the bread or orange was cut into.
- Numerator = How many pieces you received.
- Show physically that $\\frac{2}{4}$ is identical in size to $\\frac{1}{2}$.`,
        classroomStrategy: "Paper Strip Folding: Each student folds an A4 strip into 2 equal parts, then 4 equal parts, then 8, coloring fractions to compare sizes.",
        formativeAssessment: "Which is larger: $\\frac{1}{2}$ or $\\frac{1}{4}$ of the same loaf of bread? Why? (Half, because it is divided into fewer, larger pieces).",
      },
      {
        title: "Measurement & Mensuration: Length, Perimeter, Area & Capacity",
        subtopics: ["Pacing vs Ruler Measurement", "Perimeter as Walking the Fence", "Area with 1cm Grid Squares"],
        coreGuide: `Make measurement physical:
- **Perimeter:** The distance around the boundary. Have a pupil walk around the edge of a desk running their finger along all 4 edges: $P = L + W + L + W$.
- **Area:** The flat surface space covered. Count how many exercise books completely cover the teacher's table.
- **Capacity:** Pouring water from small 250ml sachets into a 1-litre bottle to prove $4$ sachets $= 1\\text{ litre}$.`,
        classroomStrategy: "Classroom Perimeter Walk: Measure classroom length and width using standard meter sticks, calculate total perimeter as a class.",
        formativeAssessment: "Find the perimeter of a rectangle with length $8\\text{cm}$ and width $5\\text{cm}$. ($26\\text{cm}$).",
      },
      {
        title: "Solving Primary Word Problems with the Singapore Bar Model",
        subtopics: ["Underlining Clue Words", "Part-Whole Bar Models", "Comparison Bar Models"],
        coreGuide: `Pupils fail word problems due to English language comprehension, not arithmetic ability.
### 3-Step Word Problem Strategy:
1. **Read & Retell:** Have pupils retell the scenario without using numbers.
2. **Draw the Bar:**
   - Total at the top bracket.
   - Known part in one box, question mark in the unknown box.
3. **Choose the Operation:** If combining parts $\\implies$ Add. If finding the missing part $\\implies$ Subtract.`,
        classroomStrategy: "Word Problem Detective: Circle the question mark and underline the known quantities with colored chalk before writing any arithmetic signs.",
        formativeAssessment: "Musa has 18 marbles. Chioma has 7 fewer marbles than Musa. Draw a comparison bar model showing Chioma's marbles.",
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 4. JSS MATHEMATICS (6 MODULES)
  // ──────────────────────────────────────────────────────────────────────────
  {
    subjectKeyword: "math",
    level: "JSS",
    title: "Mastering JSS Mathematics: Concrete Realia & Step-by-Step Algebraic Thinking",
    description:
      "A comprehensive, practical guide to teaching Junior Secondary Mathematics. Focuses on demystifying variables, fractions, geometry, and word problems in large classrooms.",
    duration: 160,
    modules: [
      {
        title: "From Concrete Realia to Algebraic Variables (The Balance Scale)",
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
        title: "Directed Numbers & The Floor Number Line",
        subtopics: ["Positive and Negative Integers", "Rules of Signs for Multiplication & Division", "Real-Life Elevation & Debt Scenarios"],
        coreGuide: `Explain directed numbers using money debt and elevation:
- Having money = Positive ($+₦500$).
- Owing money = Negative ($-₦300$).
- Subtraction of a negative number: Taking away a debt makes you richer!
$$-(-300) = +300$$`,
        classroomStrategy: "Floor Number Line: Chalk a line from $-5$ to $+5$ across the front aisle. A student steps forward for addition, turns around for subtraction, and walks steps.",
        formativeAssessment: "Evaluate $(-3) + (-7)$ and $(-5) - (-8)$ on mini chalkboards.",
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
        title: "The Fractions, Decimals and Percentages Triad",
        subtopics: ["Converting Between Representations", "Percentage Increase & Decrease", "Simple Interest Formula $I = \\frac{PRT}{100}$"],
        coreGuide: `Show the equivalence triangle:
$$\\frac{1}{4} = 0.25 = 25\\%$$
Teach simple interest with local commercial examples:
$$I = \\frac{P \\cdot R \\cdot T}{100}$$
Where $P = \\text{Principal borrowed}$, $R = \\text{Rate per annum (\\%)}$, $T = \\text{Time in years}$.`,
        classroomStrategy: "Market Loan Drama: One student acts as the bank manager and another as a shopkeeper borrowing $₦10,000$ at $10\\%$ per annum for 2 years.",
        formativeAssessment: "Calculate the simple interest on $₦20,000$ borrowed for 3 years at $5\\%$ per annum. ($₦3,000$).",
      },
      {
        title: "Statistics for Junior Secondary: Frequency Tables & Bar Charts",
        subtopics: ["Tally Marks & Frequency Tables", "Mean, Median and Mode", "Interpreting Bar Charts and Histograms"],
        coreGuide: `Teach statistics using real student data: shoe sizes, favorite subjects, or birth months.
### The Big Three Central Tendencies:
- **Mean:** The fair-share average (sum of all values divided by count).
- **Median:** The middle value when ordered sequentially from smallest to largest.
- **Mode:** The most fashionable/frequent number in the dataset.`,
        classroomStrategy: "Shoe Size Census: Gather shoe sizes of the front row, organize into a tally table, and compute the mode in 5 minutes.",
        formativeAssessment: "Given the data set: $4, 7, 7, 8, 9$: Find the mean, median, and mode.",
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

  // ──────────────────────────────────────────────────────────────────────────
  // 5. JSS ENGLISH LANGUAGE (6 MODULES)
  // ──────────────────────────────────────────────────────────────────────────
  {
    subjectKeyword: "english",
    level: "JSS",
    title: "Junior Secondary English Mastery: Grammar in Context & Active Comprehension",
    description:
      "Transform JSS English classes from rote rules to communicative confidence. Covers parts of speech, continuous writing rubrics, and reading strategies.",
    duration: 155,
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
        title: "Subject-Verb Agreement (Concord) & Nigerian English Pitfalls",
        subtopics: ["Singular Subject with Singular Verb", "Compound Subjects with 'and' vs 'or'", "Interference Errors ('The news are...')"],
        coreGuide: `Concord errors account for heavy mark deductions in BECE and WAEC English:
### The Golden Rule of Concord:
- A singular subject takes a singular verb (ending in **-s** in simple present): *The boy plays*.
- A plural subject takes a plural verb (no **-s**): *The boys play*.
### Common Local Pitfalls:
- Collective nouns: *The committee has (not have) decided*.
- Uncountable nouns: *Information is (not are)*; *Equipment is (not are)*.`,
        classroomStrategy: "Concord Whack: Read 5 rapid sentences aloud. Students give thumbs up for correct concord, thumbs down if subject and verb disagree.",
        formativeAssessment: "Choose the correct verb: 'Neither the teacher nor the students (was / were) in the laboratory.' (were).",
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
      {
        title: "Narrative and Descriptive Composition: Show, Don't Tell",
        subtopics: ["Sensory Details (Sight, Sound, Smell, Touch)", "Vivid Verbs vs Weak Adjectives", "Developing Engaging Plot Arcs"],
        coreGuide: `Move students past boring telling statements:
- **Telling:** *"The market was crowded and hot."*
- **Showing:** *"Sweat dripped down our foreheads as women with towering baskets pushed past the noisy stalls, shouting prices over the roar of motorcycle engines."*`,
        classroomStrategy: "Freeze Frame Narrative: Call 3 students to strike a dramatic pose in front of the room. The class has 3 minutes to describe the scene using 3 sensory adjectives.",
        formativeAssessment: "Rewrite this sentence to 'show' rather than 'tell': 'Emeka was very angry.'",
      },
      {
        title: "Comprehension Strategies: Skimming, Scanning & Inferential Thinking",
        subtopics: ["Skimming for Gist", "Scanning for Specific Names/Dates", "Reading Between the Lines for Author Tone"],
        coreGuide: `Teach active comprehension habits:
1. **Pre-reading:** Read the title, subheadings, and first/last sentences before tackling the text.
2. **First Pass:** Read questions first to prime the brain for keyword targets.
3. **Evidence Citation:** Never allow a student to answer without pointing to the line number where evidence resides.`,
        classroomStrategy: "Speed Scanning Sprint: Give pupils 30 seconds to find the year the principal was born in a paragraph extract.",
        formativeAssessment: "Ask students to state the difference between a direct fact stated in a passage and an inference made by the reader.",
      },
      {
        title: "Summary Writing Foundations for Junior Secondary",
        subtopics: ["Separating Core Message from Fluff", "Paraphrasing Sentences", "Word Count Discipline"],
        coreGuide: `Train students early for BECE/WAEC summary requirements:
- Identify the topic sentence in each paragraph.
- Delete all adverbs, adjectives, dialogue, and illustrative stories.
- Combine the remaining core assertions into one clean sentence per paragraph using their own words.`,
        classroomStrategy: "Summary Chainsaw: Display a 60-word passage on the chalkboard. Cross out words one by one until only 15 indispensable words remain.",
        formativeAssessment: "Summarize a 3-paragraph story in exactly two complete sentences.",
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 6. SSS ENGLISH LANGUAGE (6 MODULES)
  // ──────────────────────────────────────────────────────────────────────────
  {
    subjectKeyword: "english",
    level: "SSS",
    title: "Senior Secondary English: WAEC Continuous Writing Rubrics & Summary Extraction",
    description:
      "Equip senior secondary students with the exact skills required to score Distinction in WAEC/NECO Paper 1 and 2: formal register, thesis formulation, and concise summary writing.",
    duration: 170,
    modules: [
      {
        title: "WAEC Continuous Writing: Essay Types & Marking Criteria",
        subtopics: ["Content (10), Organization (10), Expression (20), Mechanical Accuracy (10)", "Expository, Argumentative & Narrative", "Speech & Article Formats"],
        coreGuide: `In WAEC continuous writing (50 marks total):
- **Content (10 marks):** Thorough coverage of all prompt requirements.
- **Organization (10 marks):** Paragraph coherence, transitional links, balanced introduction and conclusion.
- **Expression (20 marks):** Vocabulary range, idiom, sentence variety (simple, compound, complex).
- **Mechanical Accuracy (10 marks):** Severe penalty: -½ mark deducted for EVERY spelling, punctuation, or capitalization error!`,
        classroomStrategy: "WAEC Error Penalty Demo: Write a student essay on the board and count the mechanical deductions live to show how 5 slips cost 2.5 whole marks.",
        formativeAssessment: "State the 4 official WAEC marking sections and their mark allocations.",
      },
      {
        title: "WAEC Summary Writing: The 5 Golden Rules for Maximum Scores",
        subtopics: ["Stripping Examples & Modifiers", "Formulating Sentences in One's Own Words", "Avoiding Grammatical Shifts"],
        coreGuide: `WAEC summary penalties are severe: lifting verbatim causes loss of marks, and writing more than one sentence per point loses 50%.
Teach students the **Sieve Method**:
1. Cross out all anecdotes, rhetorical questions, and statistics.
2. Circle the main clause containing the author's primary assertion.
3. Rewrite the core proposition in a single, grammatically complete sentence.`,
        classroomStrategy: "Sentence Surgery: Give students a 70-word paragraph. Challenge them in groups to reduce it to a single 15-word grammatical sentence without losing the core message.",
        formativeAssessment: "Have each student write one summary sentence from a short passage extract. Check that no words were directly lifted.",
      },
      {
        title: "Mastering Comprehension: Tone, Mood, Irony & Figures of Speech",
        subtopics: ["Metaphor, Simile & Personification", "Sarcasm vs Irony", "Grammatical Functions of Underlined Expressions"],
        coreGuide: `WAEC comprehension always includes a grammatical function question (e.g. *"What is the grammatical name and function of '...which had arrived late'?"*).
### The 2-Step Grammatical Name Protocol:
1. **Name:** Is it a Noun Phrase/Clause, Adjectival Phrase/Clause, or Adverbial Phrase/Clause?
2. **Function:** State the exact verb, noun, or word it modifies or acts as the subject/object of.`,
        classroomStrategy: "Grammatical Clause Drill: Write 4 sentences on the board with underlined clauses. Pairs classify the clause and state its function in 2 minutes.",
        formativeAssessment: "Identify the grammatical name and function of the underlined clause: *The student [who broke the beaker] paid for it.* (Adjectival clause modifying the noun 'student').",
      },
      {
        title: "Grammar & Mechanical Accuracy: Punctuation, Semicolons & Clauses",
        subtopics: ["Comma Splices & Run-On Sentences", "Semicolons vs Colons", "Dangling Participles"],
        coreGuide: `Eliminate the top 3 errors that destroy Mechanical Accuracy marks:
- **Comma Splice:** Joining two independent sentences with only a comma. Fix with a period, semicolon, or coordinating conjunction (*and, but, so*).
- **Apostrophe Misuse:** Confusing *its* (possessive) and *it's* (it is).
- **Dangling Participles:** *"Walking down the road, the mango fell on my head."* (The mango was not walking!).`,
        classroomStrategy: "Punctuation Repair Shop: Project 5 common sentence errors. Teams correct them on mini whiteboards.",
        formativeAssessment: "Correct the dangling participle: 'Having finished his dinner, the television was turned on.'",
      },
      {
        title: "Formal vs Informal Register & Official Letter Conventions",
        subtopics: ["Two Addresses vs One Address", "Salutations & Subscriptions", "Tone, Vocabulary & Phrasal Verbs"],
        coreGuide: `Letter writing formats in WAEC:
### Formal Letter:
- Two addresses (Sender top right, Recipient left).
- Date beneath sender address.
- Formal salutation: *Dear Sir,* or *Dear Madam,*
- Underlined heading in title case or capitals.
- Subscription: *Yours faithfully,* followed by full signature and name.
- Strictly no slang, colloquialisms, or contractions (*don't*, *can't*).`,
        classroomStrategy: "Letter Format Blueprint: Have students sketch the blank layout of a formal letter showing the exact placement of all 6 formal elements.",
        formativeAssessment: "Why is writing 'Yours affectionately' or 'Yours sincerely' in a letter to the State Commissioner of Education an immediate deduction?",
      },
      {
        title: "Oral English (Test of Orals): Vowels, Consonants & Stress Placement",
        subtopics: ["Monophthongs & Diphthongs", "Silent Letters", "Primary Stress Placement in Polysyllabic Words"],
        coreGuide: `Test of Orals carries 60 marks in WAEC:
### Stress Placement Rules:
- **Two-Syllable Nouns:** Stress on 1st syllable: **RE**-cord, **CON**-tract, **OB**-ject.
- **Two-Syllable Verbs:** Stress on 2nd syllable: re-**CORD**, con-**TRACT**, ob-**JECT**.
- **Words ending in -tion, -sion, -ic:** Stress on penultimate (second to last) syllable: e-du-**CA**-tion, pho-to-**GRA**-phic.`,
        classroomStrategy: "Clap the Stress: Speak a list of words aloud. Students clap loudly on the stressed syllable and whisper the unstressed syllables.",
        formativeAssessment: "Where is the primary stress located in the word 'DEMOCRACY'? (Second syllable: de-MOC-ra-cy).",
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
      // Replace existing versions of these courses so fresh modules are populated
      const filtered = existing.filter((e) => !generatedCourses.some((g) => g.id === e.id || g.slug === e.slug));
      const merged = [...filtered, ...generatedCourses];
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
