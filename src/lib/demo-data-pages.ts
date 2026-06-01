/**
 * Extended demo data for all sidebar pages. Complements demo-data.ts.
 */

// â”€â”€â”€ My Learning â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type CourseStatus = "In progress" | "Completed" | "Due soon" | "Overdue" | "Watchlist";

export interface LearningCourse {
  id: string;
  title: string;
  category: string;
  instructor: string;
  enrolledOn: string;
  progress: number;
  score: number | null;
  due: string | null;
  status: CourseStatus;
  thumbnailAccent: string;
  totalLessons: number;
  completedLessons: number;
}

export const LEARNING_COURSES: LearningCourse[] = [
  {
    id: "c1",
    title: "Quantitative Aptitude â€” TCS NQT Mastery",
    category: "Aptitude",
    instructor: "Rajesh Kumar",
    enrolledOn: "2026-03-10",
    progress: 68,
    score: 74,
    due: "2026-06-20",
    status: "In progress",
    thumbnailAccent: "bg-navy",
    totalLessons: 48,
    completedLessons: 33,
  },
  {
    id: "c2",
    title: "Verbal Ability & Reading Comprehension",
    category: "Verbal",
    instructor: "Priya Menon",
    enrolledOn: "2026-03-15",
    progress: 45,
    score: 61,
    due: "2026-06-18",
    status: "Due soon",
    thumbnailAccent: "bg-orange",
    totalLessons: 36,
    completedLessons: 16,
  },
  {
    id: "c3",
    title: "Data Structures & Algorithms â€” Infosys InfyTQ",
    category: "CS Fundamentals",
    instructor: "Anand Subramanian",
    enrolledOn: "2026-02-20",
    progress: 100,
    score: 89,
    due: null,
    status: "Completed",
    thumbnailAccent: "bg-emerald-600",
    totalLessons: 60,
    completedLessons: 60,
  },
  {
    id: "c4",
    title: "Logical Reasoning â€” Pattern Recognition & Syllogisms",
    category: "Logical",
    instructor: "Deepa Nair",
    enrolledOn: "2026-04-01",
    progress: 22,
    score: null,
    due: "2026-06-05",
    status: "Overdue",
    thumbnailAccent: "bg-rose-500",
    totalLessons: 30,
    completedLessons: 7,
  },
  {
    id: "c5",
    title: "Operating Systems Concepts â€” Wipro NLTH",
    category: "CS Fundamentals",
    instructor: "Suresh Pillai",
    enrolledOn: "2026-04-10",
    progress: 55,
    score: 70,
    due: "2026-07-01",
    status: "In progress",
    thumbnailAccent: "bg-violet-600",
    totalLessons: 40,
    completedLessons: 22,
  },
  {
    id: "c6",
    title: "SQL & DBMS for Campus Placements",
    category: "CS Fundamentals",
    instructor: "Kavitha Reddy",
    enrolledOn: "2026-05-01",
    progress: 0,
    score: null,
    due: "2026-08-01",
    status: "Watchlist",
    thumbnailAccent: "bg-sky-500",
    totalLessons: 28,
    completedLessons: 0,
  },
  {
    id: "c7",
    title: "Programming Fundamentals in C & Java",
    category: "CS Fundamentals",
    instructor: "Mohan Krishnan",
    enrolledOn: "2026-01-15",
    progress: 100,
    score: 92,
    due: null,
    status: "Completed",
    thumbnailAccent: "bg-teal-600",
    totalLessons: 52,
    completedLessons: 52,
  },
];

// â”€â”€â”€ Assignments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type AssignmentStatus = "Pending" | "Submitted" | "Graded" | "Overdue";
export type AssignmentType = "Quiz" | "Practice Set" | "Coding Problem" | "Case Study";

export interface Assignment {
  id: string;
  title: string;
  course: string;
  type: AssignmentType;
  status: AssignmentStatus;
  due: string;
  score: number | null;
  submitted: string | null;
  maxScore: number;
}

export const ASSIGNMENTS: Assignment[] = [
  {
    id: "a1",
    title: "Number Series & Sequences â€” Weekly Quiz 4",
    course: "Quantitative Aptitude â€” TCS NQT Mastery",
    type: "Quiz",
    status: "Graded",
    due: "2026-05-28",
    score: 18,
    submitted: "2026-05-27",
    maxScore: 25,
  },
  {
    id: "a2",
    title: "Reading Comprehension Practice Set 3",
    course: "Verbal Ability & Reading Comprehension",
    type: "Practice Set",
    status: "Pending",
    due: "2026-06-04",
    score: null,
    submitted: null,
    maxScore: 30,
  },
  {
    id: "a3",
    title: "Linked List Reversal â€” Coding Problem",
    course: "Data Structures & Algorithms â€” Infosys InfyTQ",
    type: "Coding Problem",
    status: "Graded",
    due: "2026-04-10",
    score: 10,
    submitted: "2026-04-09",
    maxScore: 10,
  },
  {
    id: "a4",
    title: "Syllogism & Logical Deductions â€” Set 2",
    course: "Logical Reasoning â€” Pattern Recognition & Syllogisms",
    type: "Practice Set",
    status: "Overdue",
    due: "2026-05-30",
    score: null,
    submitted: null,
    maxScore: 20,
  },
  {
    id: "a5",
    title: "Process Scheduling Algorithms â€” Case Study",
    course: "Operating Systems Concepts â€” Wipro NLTH",
    type: "Case Study",
    status: "Submitted",
    due: "2026-06-06",
    score: null,
    submitted: "2026-06-01",
    maxScore: 40,
  },
  {
    id: "a6",
    title: "SQL JOINs & Subqueries â€” Practice Set 1",
    course: "SQL & DBMS for Campus Placements",
    type: "Practice Set",
    status: "Pending",
    due: "2026-06-10",
    score: null,
    submitted: null,
    maxScore: 25,
  },
  {
    id: "a7",
    title: "Time & Work â€” Problem Set 5",
    course: "Quantitative Aptitude â€” TCS NQT Mastery",
    type: "Quiz",
    status: "Graded",
    due: "2026-05-15",
    score: 22,
    submitted: "2026-05-14",
    maxScore: 25,
  },
];

// â”€â”€â”€ Mock Tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type MockTestStatus = "Completed" | "Scheduled" | "Missed";

export interface TakenMock {
  id: string;
  title: string;
  company: string;
  takenOn: string;
  score: number;
  maxScore: number;
  percentile: number;
  duration: number;
  sections: { name: string; score: number; max: number }[];
}

export interface UpcomingMock {
  id: string;
  title: string;
  company: string;
  scheduledFor: string;
  duration: number;
  sections: string[];
  registeredOn: string;
}

export const TAKEN_MOCKS: TakenMock[] = [
  {
    id: "m1",
    title: "TCS NQT Full Mock â€” Attempt 3",
    company: "TCS",
    takenOn: "2026-05-25",
    score: 142,
    maxScore: 180,
    percentile: 78.4,
    duration: 180,
    sections: [
      { name: "Numerical Ability", score: 48, max: 60 },
      { name: "Verbal Ability", score: 42, max: 60 },
      { name: "Reasoning Ability", score: 52, max: 60 },
    ],
  },
  {
    id: "m2",
    title: "Infosys InfyTQ Quant + Programming Mock",
    company: "Infosys",
    takenOn: "2026-05-18",
    score: 78,
    maxScore: 100,
    percentile: 83.1,
    duration: 120,
    sections: [
      { name: "Quantitative Aptitude", score: 38, max: 50 },
      { name: "Programming Concepts", score: 40, max: 50 },
    ],
  },
  {
    id: "m3",
    title: "Wipro NLTH Elite Mock â€” Attempt 1",
    company: "Wipro",
    takenOn: "2026-05-10",
    score: 61,
    maxScore: 90,
    percentile: 65.2,
    duration: 90,
    sections: [
      { name: "Aptitude", score: 28, max: 40 },
      { name: "Verbal", score: 18, max: 25 },
      { name: "Logical", score: 15, max: 25 },
    ],
  },
  {
    id: "m4",
    title: "TCS NQT Full Mock â€” Attempt 2",
    company: "TCS",
    takenOn: "2026-04-30",
    score: 128,
    maxScore: 180,
    percentile: 61.7,
    duration: 180,
    sections: [
      { name: "Numerical Ability", score: 41, max: 60 },
      { name: "Verbal Ability", score: 38, max: 60 },
      { name: "Reasoning Ability", score: 49, max: 60 },
    ],
  },
  {
    id: "m5",
    title: "Cognizant GenC Elevate Mock",
    company: "Cognizant",
    takenOn: "2026-04-15",
    score: 93,
    maxScore: 120,
    percentile: 72.0,
    duration: 120,
    sections: [
      { name: "Quantitative", score: 35, max: 45 },
      { name: "Reasoning", score: 30, max: 40 },
      { name: "Verbal", score: 28, max: 35 },
    ],
  },
];

export const UPCOMING_MOCKS: UpcomingMock[] = [
  {
    id: "um1",
    title: "TCS NQT Full Mock â€” Attempt 4",
    company: "TCS",
    scheduledFor: "2026-06-08T10:00:00",
    duration: 180,
    sections: ["Numerical Ability", "Verbal Ability", "Reasoning Ability"],
    registeredOn: "2026-06-01",
  },
  {
    id: "um2",
    title: "HCL TechBee Aptitude Mock",
    company: "HCL",
    scheduledFor: "2026-06-12T14:00:00",
    duration: 90,
    sections: ["Quantitative Aptitude", "Logical Reasoning", "English"],
    registeredOn: "2026-05-30",
  },
  {
    id: "um3",
    title: "Accenture Cognitive & Technical Mock",
    company: "Accenture",
    scheduledFor: "2026-06-18T11:00:00",
    duration: 120,
    sections: ["Cognitive Assessment", "Technical Assessment", "Coding"],
    registeredOn: "2026-06-01",
  },
];

// â”€â”€â”€ Certifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type CertStatus = "Earned" | "In Progress";

export interface Certificate {
  id: string;
  title: string;
  issuedBy: string;
  issuedOn: string | null;
  expiresOn: string | null;
  status: CertStatus;
  credentialId: string | null;
  progress: number;
  badgeAccent: string;
  description: string;
}

export const CERTIFICATIONS: Certificate[] = [
  {
    id: "cert1",
    title: "TCS NQT Aptitude Proficiency â€” Silver",
    issuedBy: "ZSkillup",
    issuedOn: "2026-05-26",
    expiresOn: null,
    status: "Earned",
    credentialId: "ZS-TCS-APT-2026-8841",
    progress: 100,
    badgeAccent: "bg-slate-400",
    description: "Demonstrates consistent performance above 75th percentile across 3 TCS NQT full mocks.",
  },
  {
    id: "cert2",
    title: "Data Structures & Algorithms â€” Foundations",
    issuedBy: "ZSkillup Ã— NASSCOM",
    issuedOn: "2026-04-02",
    expiresOn: "2028-04-02",
    status: "Earned",
    credentialId: "ZS-DSA-FND-2026-3301",
    progress: 100,
    badgeAccent: "bg-emerald-600",
    description: "Covers arrays, linked lists, trees, graphs, sorting, and searching algorithms.",
  },
  {
    id: "cert3",
    title: "Programming Fundamentals in C & Java",
    issuedBy: "ZSkillup",
    issuedOn: "2026-02-14",
    expiresOn: null,
    status: "Earned",
    credentialId: "ZS-PRG-CJ-2026-1102",
    progress: 100,
    badgeAccent: "bg-teal-600",
    description: "Validates foundational programming competency across procedural and OOP paradigms.",
  },
  {
    id: "cert4",
    title: "Verbal Ability â€” Campus Ready",
    issuedBy: "ZSkillup",
    issuedOn: null,
    expiresOn: null,
    status: "In Progress",
    credentialId: null,
    progress: 45,
    badgeAccent: "bg-orange",
    description: "Requires 80% completion of the Verbal Ability course and a qualifying mock score.",
  },
  {
    id: "cert5",
    title: "Infosys InfyTQ Certified â€” Quant & Programming",
    issuedBy: "ZSkillup Ã— Infosys InfyTQ",
    issuedOn: null,
    expiresOn: null,
    status: "In Progress",
    credentialId: null,
    progress: 78,
    badgeAccent: "bg-violet-600",
    description: "Aligned to Infosys InfyTQ exam syllabus. Issued upon 85+ percentile mock performance.",
  },
  {
    id: "cert6",
    title: "Operating Systems â€” Core Concepts",
    issuedBy: "ZSkillup",
    issuedOn: null,
    expiresOn: null,
    status: "In Progress",
    credentialId: null,
    progress: 55,
    badgeAccent: "bg-sky-600",
    description: "Covers processes, memory management, file systems, and concurrency for campus interviews.",
  },
];

// â”€â”€â”€ Performance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface TopicAccuracy {
  topic: string;
  category: string;
  accuracy: number;
  questionsAttempted: number;
  lastPracticed: string;
}

export interface PpsDataPoint {
  date: string;
  pps: number;
}

export interface WeeklyPracticeHours {
  week: string;
  hours: number;
}

export interface WeakTopic {
  topic: string;
  category: string;
  accuracy: number;
  recommendedAction: string;
}

export const TOPIC_ACCURACY: TopicAccuracy[] = [
  { topic: "Number Series", category: "Quantitative", accuracy: 82, questionsAttempted: 145, lastPracticed: "2026-05-31" },
  { topic: "Time & Work", category: "Quantitative", accuracy: 74, questionsAttempted: 120, lastPracticed: "2026-05-29" },
  { topic: "Percentage & Profit/Loss", category: "Quantitative", accuracy: 68, questionsAttempted: 98, lastPracticed: "2026-05-27" },
  { topic: "Reading Comprehension", category: "Verbal", accuracy: 71, questionsAttempted: 88, lastPracticed: "2026-05-30" },
  { topic: "Error Spotting", category: "Verbal", accuracy: 58, questionsAttempted: 75, lastPracticed: "2026-05-25" },
  { topic: "Sentence Correction", category: "Verbal", accuracy: 62, questionsAttempted: 90, lastPracticed: "2026-05-28" },
  { topic: "Syllogisms", category: "Logical", accuracy: 77, questionsAttempted: 110, lastPracticed: "2026-05-31" },
  { topic: "Blood Relations", category: "Logical", accuracy: 85, questionsAttempted: 64, lastPracticed: "2026-05-20" },
  { topic: "Seating Arrangements", category: "Logical", accuracy: 53, questionsAttempted: 72, lastPracticed: "2026-05-22" },
  { topic: "Binary Trees", category: "CS Fundamentals", accuracy: 90, questionsAttempted: 48, lastPracticed: "2026-04-10" },
  { topic: "SQL Joins", category: "CS Fundamentals", accuracy: 65, questionsAttempted: 40, lastPracticed: "2026-05-15" },
  { topic: "Process Scheduling", category: "CS Fundamentals", accuracy: 72, questionsAttempted: 35, lastPracticed: "2026-05-18" },
];

export const PPS_HISTORY: PpsDataPoint[] = [
  { date: "2026-04-06", pps: 51 },
  { date: "2026-04-13", pps: 54 },
  { date: "2026-04-20", pps: 56 },
  { date: "2026-04-27", pps: 58 },
  { date: "2026-05-04", pps: 60 },
  { date: "2026-05-11", pps: 63 },
  { date: "2026-05-18", pps: 65 },
  { date: "2026-05-25", pps: 67 },
  { date: "2026-06-01", pps: 71 },
];

export const WEEKLY_PRACTICE_HOURS: WeeklyPracticeHours[] = [
  { week: "Apr 28 â€“ May 4", hours: 8.5 },
  { week: "May 5 â€“ May 11", hours: 10.0 },
  { week: "May 12 â€“ May 18", hours: 7.0 },
  { week: "May 19 â€“ May 25", hours: 12.5 },
  { week: "May 26 â€“ Jun 1", hours: 9.0 },
];

export const WEAK_TOPICS: WeakTopic[] = [
  {
    topic: "Seating Arrangements",
    category: "Logical",
    accuracy: 53,
    recommendedAction: "Complete Seating Arrangements drill set (20 problems) in Logical Reasoning course.",
  },
  {
    topic: "Error Spotting",
    category: "Verbal",
    accuracy: 58,
    recommendedAction: "Revisit Error Spotting module in Verbal Ability course, then take Practice Set 2.",
  },
  {
    topic: "Sentence Correction",
    category: "Verbal",
    accuracy: 62,
    recommendedAction: "Practice 30 sentence correction questions daily for the next 7 days.",
  },
  {
    topic: "SQL Joins",
    category: "CS Fundamentals",
    accuracy: 65,
    recommendedAction: "Complete SQL JOINs & Subqueries Practice Set 1 in the DBMS course.",
  },
  {
    topic: "Percentage & Profit/Loss",
    category: "Quantitative",
    accuracy: 68,
    recommendedAction: "Attempt Percentage formula sheet review and complete Weekly Quiz 5.",
  },
];

// â”€â”€â”€ Topic Mastery â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type TopicMasteryLevel = "Mastered" | "Proficient" | "Developing" | "Beginner";

export interface TopicMasteryItem {
  id: string;
  name: string;
  category: "Quantitative" | "Verbal" | "Logical" | "CS Fundamentals";
  masteryLevel: TopicMasteryLevel;
  accuracy: number;
  questionsAttempted: number;
  totalQuestions: number;
  lastActivity: string;
  keySubtopics: string[];
}

export const TOPIC_MASTERY_ITEMS: TopicMasteryItem[] = [
  // Quantitative
  {
    id: "tm1",
    name: "Number Systems & Series",
    category: "Quantitative",
    masteryLevel: "Proficient",
    accuracy: 82,
    questionsAttempted: 145,
    totalQuestions: 160,
    lastActivity: "2026-05-31",
    keySubtopics: ["HCF & LCM", "Number series", "Divisibility rules", "Unit digit"],
  },
  {
    id: "tm2",
    name: "Time, Speed & Distance",
    category: "Quantitative",
    masteryLevel: "Proficient",
    accuracy: 78,
    questionsAttempted: 110,
    totalQuestions: 140,
    lastActivity: "2026-05-28",
    keySubtopics: ["Relative speed", "Trains", "Boats & streams", "Circular motion"],
  },
  {
    id: "tm3",
    name: "Percentage & Profit/Loss",
    category: "Quantitative",
    masteryLevel: "Developing",
    accuracy: 68,
    questionsAttempted: 98,
    totalQuestions: 150,
    lastActivity: "2026-05-27",
    keySubtopics: ["Successive percentage", "Marked price", "Discount", "Partnership"],
  },
  {
    id: "tm4",
    name: "Permutation & Combination",
    category: "Quantitative",
    masteryLevel: "Developing",
    accuracy: 61,
    questionsAttempted: 60,
    totalQuestions: 100,
    lastActivity: "2026-05-20",
    keySubtopics: ["nPr", "nCr", "Circular arrangement", "Probability basics"],
  },
  // Verbal
  {
    id: "tm5",
    name: "Reading Comprehension",
    category: "Verbal",
    masteryLevel: "Proficient",
    accuracy: 71,
    questionsAttempted: 88,
    totalQuestions: 120,
    lastActivity: "2026-05-30",
    keySubtopics: ["Inference", "Main idea", "Tone & author's view", "Vocabulary in context"],
  },
  {
    id: "tm6",
    name: "Grammar & Error Spotting",
    category: "Verbal",
    masteryLevel: "Developing",
    accuracy: 60,
    questionsAttempted: 130,
    totalQuestions: 180,
    lastActivity: "2026-05-25",
    keySubtopics: ["Subject-verb agreement", "Tenses", "Articles", "Prepositions"],
  },
  {
    id: "tm7",
    name: "Vocabulary & Antonyms/Synonyms",
    category: "Verbal",
    masteryLevel: "Beginner",
    accuracy: 54,
    questionsAttempted: 45,
    totalQuestions: 120,
    lastActivity: "2026-05-10",
    keySubtopics: ["Word roots", "Contextual usage", "Idioms", "One-word substitution"],
  },
  // Logical
  {
    id: "tm8",
    name: "Syllogisms",
    category: "Logical",
    masteryLevel: "Proficient",
    accuracy: 77,
    questionsAttempted: 110,
    totalQuestions: 120,
    lastActivity: "2026-05-31",
    keySubtopics: ["Venn diagrams", "Possibility cases", "All/Some/No statements"],
  },
  {
    id: "tm9",
    name: "Seating Arrangements & Puzzles",
    category: "Logical",
    masteryLevel: "Developing",
    accuracy: 53,
    questionsAttempted: 72,
    totalQuestions: 130,
    lastActivity: "2026-05-22",
    keySubtopics: ["Linear arrangement", "Circular arrangement", "Floor puzzles", "Box puzzles"],
  },
  {
    id: "tm10",
    name: "Blood Relations & Direction Sense",
    category: "Logical",
    masteryLevel: "Mastered",
    accuracy: 88,
    questionsAttempted: 80,
    totalQuestions: 80,
    lastActivity: "2026-05-20",
    keySubtopics: ["Family tree", "Coded relations", "Direction distance"],
  },
  // CS Fundamentals
  {
    id: "tm11",
    name: "Data Structures",
    category: "CS Fundamentals",
    masteryLevel: "Mastered",
    accuracy: 91,
    questionsAttempted: 95,
    totalQuestions: 100,
    lastActivity: "2026-04-10",
    keySubtopics: ["Arrays", "Linked lists", "Stacks & queues", "Trees", "Graphs"],
  },
  {
    id: "tm12",
    name: "DBMS & SQL",
    category: "CS Fundamentals",
    masteryLevel: "Developing",
    accuracy: 65,
    questionsAttempted: 40,
    totalQuestions: 90,
    lastActivity: "2026-05-15",
    keySubtopics: ["Normalization", "SQL JOINs", "Transactions", "Indexing"],
  },
  {
    id: "tm13",
    name: "Operating Systems",
    category: "CS Fundamentals",
    masteryLevel: "Proficient",
    accuracy: 72,
    questionsAttempted: 60,
    totalQuestions: 80,
    lastActivity: "2026-05-18",
    keySubtopics: ["Process scheduling", "Memory management", "Deadlocks", "File systems"],
  },
  {
    id: "tm14",
    name: "Computer Networks",
    category: "CS Fundamentals",
    masteryLevel: "Beginner",
    accuracy: 48,
    questionsAttempted: 25,
    totalQuestions: 80,
    lastActivity: "2026-04-25",
    keySubtopics: ["OSI model", "TCP/IP", "DNS & HTTP", "Subnetting"],
  },
];

// â”€â”€â”€ Campus Recruitment â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type DriveStatus = "Registration Open" | "Shortlisted" | "Applied" | "Completed" | "Upcoming";

export interface PlacementDrive {
  id: string;
  company: string;
  role: string;
  ctc: string;
  eligibilityCgpa: number;
  branches: string[];
  registrationDeadline: string | null;
  driveDate: string;
  status: DriveStatus;
  logoAccent: string;
  location: string;
  openings: number;
  rounds: string[];
}

export const PLACEMENT_DRIVES: PlacementDrive[] = [
  {
    id: "d1",
    company: "TCS",
    role: "Assistant System Engineer",
    ctc: "3.36 LPA",
    eligibilityCgpa: 6.0,
    branches: ["CSE", "IT", "ECE", "EEE", "Mech"],
    registrationDeadline: "2026-06-10",
    driveDate: "2026-06-25",
    status: "Registration Open",
    logoAccent: "bg-navy",
    location: "Chennai / Hyderabad / Pune",
    openings: 500,
    rounds: ["TCS NQT", "Technical Interview", "HR Interview"],
  },
  {
    id: "d2",
    company: "Infosys",
    role: "Systems Engineer",
    ctc: "3.60 LPA",
    eligibilityCgpa: 6.5,
    branches: ["CSE", "IT", "ECE"],
    registrationDeadline: "2026-06-08",
    driveDate: "2026-06-20",
    status: "Applied",
    logoAccent: "bg-blue-600",
    location: "Bengaluru / Mysuru / Pune",
    openings: 300,
    rounds: ["InfyTQ Certification", "Online Test", "HR Interview"],
  },
  {
    id: "d3",
    company: "Wipro",
    role: "Project Engineer",
    ctc: "3.50 LPA",
    eligibilityCgpa: 6.0,
    branches: ["CSE", "IT", "ECE", "EEE"],
    registrationDeadline: null,
    driveDate: "2026-07-05",
    status: "Upcoming",
    logoAccent: "bg-violet-600",
    location: "Bengaluru / Hyderabad / Chennai",
    openings: 400,
    rounds: ["NLTH Online Test", "Technical Interview", "HR Interview"],
  },
  {
    id: "d4",
    company: "Cognizant",
    role: "Programmer Analyst Trainee",
    ctc: "4.50 LPA",
    eligibilityCgpa: 7.0,
    branches: ["CSE", "IT"],
    registrationDeadline: "2026-05-25",
    driveDate: "2026-05-28",
    status: "Shortlisted",
    logoAccent: "bg-sky-600",
    location: "Chennai / Coimbatore",
    openings: 150,
    rounds: ["GenC Elevate Test", "Coding Round", "Technical Interview", "HR"],
  },
  {
    id: "d5",
    company: "HCL Technologies",
    role: "Graduate Engineer Trainee",
    ctc: "3.50 LPA",
    eligibilityCgpa: 6.0,
    branches: ["CSE", "IT", "ECE", "EEE", "Civil"],
    registrationDeadline: null,
    driveDate: "2026-04-30",
    status: "Completed",
    logoAccent: "bg-emerald-700",
    location: "Noida / Chennai",
    openings: 200,
    rounds: ["TechBee Aptitude", "Technical Interview"],
  },
  {
    id: "d6",
    company: "Accenture",
    role: "Associate Software Engineer",
    ctc: "4.50 LPA",
    eligibilityCgpa: 6.5,
    branches: ["CSE", "IT", "ECE"],
    registrationDeadline: "2026-06-15",
    driveDate: "2026-07-10",
    status: "Registration Open",
    logoAccent: "bg-purple-700",
    location: "Bengaluru / Mumbai / Hyderabad",
    openings: 250,
    rounds: ["Cognitive Assessment", "Technical Assessment", "Coding Test", "HR"],
  },
];

// â”€â”€â”€ Skill Tracks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type SkillTrackStatus = "In Progress" | "Enrolled" | "Completed" | "Not Started";

export interface SkillTrack {
  id: string;
  title: string;
  description: string;
  weeks: number;
  hoursPerWeek: number;
  currentWeek: number;
  progress: number;
  status: SkillTrackStatus;
  skills: string[];
  enrolledStudents: number;
  completionRate: number;
  instructor: string;
  accentColor: string;
}

export const SKILL_TRACKS: SkillTrack[] = [
  {
    id: "st1",
    title: "TCS NQT Complete Preparation Track",
    description: "A structured 8-week track covering all three sections of TCS NQT â€” Numerical, Verbal, and Reasoning â€” with weekly mocks and performance reviews.",
    weeks: 8,
    hoursPerWeek: 10,
    currentWeek: 5,
    progress: 62,
    status: "In Progress",
    skills: ["Quantitative Aptitude", "Verbal Ability", "Logical Reasoning", "TCS NQT Exam Strategy"],
    enrolledStudents: 1842,
    completionRate: 71,
    instructor: "Rajesh Kumar",
    accentColor: "bg-navy",
  },
  {
    id: "st2",
    title: "Full-Stack Data Structures Track",
    description: "6-week intensive covering arrays, linked lists, trees, graphs, DP, and interview-style problem solving in Java and Python.",
    weeks: 6,
    hoursPerWeek: 12,
    currentWeek: 0,
    progress: 0,
    status: "Enrolled",
    skills: ["Data Structures", "Algorithms", "Problem Solving", "Java", "Python"],
    enrolledStudents: 1203,
    completionRate: 64,
    instructor: "Anand Subramanian",
    accentColor: "bg-emerald-600",
  },
  {
    id: "st3",
    title: "Campus Verbal Accelerator",
    description: "Intensive 4-week track targeting the verbal section of Infosys, Wipro, and TCS exams â€” grammar, comprehension, and vocabulary.",
    weeks: 4,
    hoursPerWeek: 8,
    currentWeek: 2,
    progress: 48,
    status: "In Progress",
    skills: ["Reading Comprehension", "Grammar", "Vocabulary", "Sentence Correction"],
    enrolledStudents: 978,
    completionRate: 69,
    instructor: "Priya Menon",
    accentColor: "bg-orange",
  },
  {
    id: "st4",
    title: "Core CS Fundamentals for Placements",
    description: "5-week track covering OS, DBMS, CN, and OOP â€” the core CS subjects tested in Infosys, Capgemini, and L&T technology drives.",
    weeks: 5,
    hoursPerWeek: 10,
    currentWeek: 0,
    progress: 0,
    status: "Not Started",
    skills: ["Operating Systems", "DBMS", "Computer Networks", "OOP Concepts"],
    enrolledStudents: 760,
    completionRate: 58,
    instructor: "Suresh Pillai",
    accentColor: "bg-violet-600",
  },
  {
    id: "st5",
    title: "Infosys InfyTQ Certification Track",
    description: "3-week focused track aligned to InfyTQ exam syllabus. Includes programming tests, quant drills, and InfyTQ-style mock exams.",
    weeks: 3,
    hoursPerWeek: 8,
    currentWeek: 3,
    progress: 100,
    status: "Completed",
    skills: ["Quantitative Aptitude", "Programming in Java/Python", "InfyTQ Exam Pattern"],
    enrolledStudents: 1120,
    completionRate: 83,
    instructor: "Kavitha Reddy",
    accentColor: "bg-blue-600",
  },
];

// â”€â”€â”€ Cohort Programs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type CohortStatus = "Active" | "Upcoming" | "Completed";

export interface CohortProgram {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: CohortStatus;
  coach: string;
  batchSize: number;
  enrolledCount: number;
  college: string;
  targetCompanies: string[];
  weeklySchedule: string;
  accentColor: string;
}

export const COHORT_PROGRAMS: CohortProgram[] = [
  {
    id: "cp1",
    title: "Placement Readiness Cohort â€” Batch 14",
    description: "A 12-week guided cohort for final-year students targeting service companies. Includes live sessions, doubt clearance, and weekly mock assessments.",
    startDate: "2026-03-10",
    endDate: "2026-06-02",
    status: "Active",
    coach: "Meena Rajagopalan",
    batchSize: 60,
    enrolledCount: 57,
    college: "Sri Venkateswara College of Engineering",
    targetCompanies: ["TCS", "Infosys", "Wipro", "HCL", "Cognizant"],
    weeklySchedule: "Mon & Thu 6:00 PM â€“ 7:30 PM IST",
    accentColor: "bg-navy",
  },
  {
    id: "cp2",
    title: "DSA Interview Prep Cohort â€” Batch 7",
    description: "8-week intensive cohort for students targeting product-based companies. Focus on DSA, system design fundamentals, and live coding practice.",
    startDate: "2026-04-01",
    endDate: "2026-05-26",
    status: "Completed",
    coach: "Anand Subramanian",
    batchSize: 40,
    enrolledCount: 40,
    college: "PSG College of Technology",
    targetCompanies: ["Amazon", "Flipkart", "Zoho", "Freshworks"],
    weeklySchedule: "Tue & Fri 7:00 PM â€“ 9:00 PM IST",
    accentColor: "bg-emerald-600",
  },
  {
    id: "cp3",
    title: "Placement Readiness Cohort â€” Batch 15",
    description: "Next batch of the flagship 12-week guided cohort. Registration open for final-year students from partner colleges.",
    startDate: "2026-07-01",
    endDate: "2026-09-23",
    status: "Upcoming",
    coach: "Deepa Nair",
    batchSize: 60,
    enrolledCount: 22,
    college: "Open to Partner Colleges",
    targetCompanies: ["TCS", "Infosys", "Wipro", "Accenture", "Capgemini"],
    weeklySchedule: "Mon & Wed 6:30 PM â€“ 8:00 PM IST",
    accentColor: "bg-orange",
  },
  {
    id: "cp4",
    title: "Verbal & Communication Excellence Cohort",
    description: "4-week focused cohort improving verbal aptitude, email communication, and group discussion skills for campus interviews.",
    startDate: "2026-06-16",
    endDate: "2026-07-14",
    status: "Upcoming",
    coach: "Priya Menon",
    batchSize: 50,
    enrolledCount: 18,
    college: "Open to Partner Colleges",
    targetCompanies: ["TCS", "Infosys", "IBM", "Deloitte"],
    weeklySchedule: "Sat 10:00 AM â€“ 12:00 PM IST",
    accentColor: "bg-sky-600",
  },
];

// â”€â”€â”€ Knowledge Base â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type KbCategory =
  | "Exam Guides"
  | "Interview Prep"
  | "Company Profiles"
  | "Study Tips"
  | "Platform Help"
  | "Career Resources";

export interface KbArticle {
  id: string;
  title: string;
  category: KbCategory;
  summary: string;
  readTimeMinutes: number;
  publishedOn: string;
  views: number;
  tags: string[];
}

export const KB_ARTICLES: KbArticle[] = [
  {
    id: "kb1",
    title: "TCS NQT 2026 â€” Complete Exam Pattern & Syllabus Guide",
    category: "Exam Guides",
    summary: "Detailed breakdown of TCS NQT sections, question distribution, marking scheme, and time management strategies for 2026 batch.",
    readTimeMinutes: 12,
    publishedOn: "2026-01-15",
    views: 24801,
    tags: ["TCS NQT", "Exam Pattern", "Syllabus", "2026 Batch"],
  },
  {
    id: "kb2",
    title: "Infosys InfyTQ Certification â€” How It Works & Why It Matters",
    category: "Exam Guides",
    summary: "Step-by-step guide to earning InfyTQ certification, its role in Infosys shortlisting, and how to prepare for the quant and programming modules.",
    readTimeMinutes: 8,
    publishedOn: "2026-02-01",
    views: 18340,
    tags: ["Infosys", "InfyTQ", "Certification"],
  },
  {
    id: "kb3",
    title: "Top 10 HR Interview Questions at TCS and How to Answer Them",
    category: "Interview Prep",
    summary: "Real HR questions from TCS campus interviews compiled from student feedback, with structured answer frameworks and sample responses.",
    readTimeMinutes: 10,
    publishedOn: "2026-02-20",
    views: 15920,
    tags: ["TCS", "HR Interview", "Campus Interview"],
  },
  {
    id: "kb4",
    title: "Wipro NLTH Elite â€” Eligibility, Process & Preparation Plan",
    category: "Company Profiles",
    summary: "Overview of Wipro's National Level Technology Hiring process, pay structure, training program, and how to stand out in the technical round.",
    readTimeMinutes: 9,
    publishedOn: "2026-03-05",
    views: 11205,
    tags: ["Wipro", "NLTH", "Company Profile"],
  },
  {
    id: "kb5",
    title: "How to Build a 30-Day Aptitude Revision Plan Before Your Drive",
    category: "Study Tips",
    summary: "A proven framework for structuring your final month of aptitude preparation with weekly milestones, daily targets, and mock test integration.",
    readTimeMinutes: 7,
    publishedOn: "2026-03-18",
    views: 9870,
    tags: ["Study Plan", "Aptitude", "Time Management"],
  },
  {
    id: "kb6",
    title: "Understanding Your Placement Preparedness Score (PPS)",
    category: "Platform Help",
    summary: "How ZSkillup computes your PPS, what each band means, how it affects your visibility to companies, and which activities boost it fastest.",
    readTimeMinutes: 5,
    publishedOn: "2026-01-10",
    views: 32100,
    tags: ["PPS", "Platform", "Score Explained"],
  },
  {
    id: "kb7",
    title: "Cognizant GenC Elevate vs GenC Pro â€” Which Track Is Right for You?",
    category: "Company Profiles",
    summary: "Comparison of Cognizant's two campus hiring tracks â€” roles, pay, eligibility, and the differences in selection rounds.",
    readTimeMinutes: 6,
    publishedOn: "2026-04-02",
    views: 8410,
    tags: ["Cognizant", "GenC Elevate", "GenC Pro"],
  },
  {
    id: "kb8",
    title: "Resume Checklist for Service Company Drives â€” 15 Points to Verify",
    category: "Career Resources",
    summary: "A practical checklist covering formatting, content, common mistakes, and ATS considerations for resumes submitted to TCS, Infosys, and Wipro.",
    readTimeMinutes: 6,
    publishedOn: "2026-04-20",
    views: 7320,
    tags: ["Resume", "Career", "Job Application"],
  },
];

// â”€â”€â”€ Help Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface SupportChannel {
  id: string;
  name: string;
  description: string;
  availability: string;
  action: string;
  iconName: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "faq1",
    question: "How is my Placement Preparedness Score (PPS) calculated?",
    answer: "Your PPS is computed server-side based on your mock test performance, course completion rates, practice accuracy, and consistency (streak). It updates daily. The exact formula is proprietary, but focusing on mock performance and daily practice yields the fastest gains.",
    category: "PPS & Scores",
  },
  {
    id: "faq2",
    question: "Can I attempt a Full Mock Assessment more than once?",
    answer: "Yes. Each company hub's Full Mock Assessment can be re-attempted up to 5 times. Only your best score is reflected in your PPS. A 24-hour cooldown applies between attempts to ensure meaningful improvement.",
    category: "Mock Tests",
  },
  {
    id: "faq3",
    question: "What happens after I complete a Cohort Program?",
    answer: "Upon cohort completion, you receive a ZSkillup Cohort Certificate, and your performance summary is visible to your college TPO. High-scoring cohort graduates are also highlighted in company placement reports shared with recruiting partners.",
    category: "Cohort Programs",
  },
  {
    id: "faq4",
    question: "Why is some content shown as locked?",
    answer: "ZSkillup uses a freemium model. Each company hub offers one free full mock assessment and preview access to materials. Full material access, additional mocks, formula sheets, and detailed analytics require purchasing the individual module or the full company course.",
    category: "Access & Pricing",
  },
  {
    id: "faq5",
    question: "How do I report an error in a question or explanation?",
    answer: "Use the 'Report an Issue' button available on every question screen (flag icon, bottom-right). Your report goes directly to our content team and is typically reviewed within 48 hours. You'll receive an in-app notification when it's resolved.",
    category: "Content Quality",
  },
  {
    id: "faq6",
    question: "Is my progress saved if I close the browser during a practice session?",
    answer: "Yes. Practice Set progress is auto-saved every 30 seconds and when you navigate away. Mock Assessment progress is also auto-saved, but timing continues in the background â€” make sure you complete it in one sitting.",
    category: "Platform",
  },
  {
    id: "faq7",
    question: "Can my TPO view my individual performance data?",
    answer: "Your TPO can see aggregated cohort data and your PPS band. Detailed question-level data is private unless you explicitly share your performance report via the 'Share with TPO' option on your Profile page.",
    category: "Privacy",
  },
  {
    id: "faq8",
    question: "How do I redeem or use ZSkillup Coins?",
    answer: "Coins can be redeemed for premium mock unlocks, formula sheet access, and merchandise in the ZSkillup Coins Store (accessible from your profile menu). Coin balances are managed server-side; the platform will show your current balance at all times.",
    category: "Rewards",
  },
];

export const SUPPORT_CHANNELS: SupportChannel[] = [
  {
    id: "sc1",
    name: "Live Chat",
    description: "Chat with a support agent for account, billing, or technical issues.",
    availability: "Monâ€“Sat, 9 AM â€“ 8 PM IST",
    action: "Start Chat",
    iconName: "MessageCircle",
  },
  {
    id: "sc2",
    name: "Email Support",
    description: "Send a detailed query. Responses within 24 business hours.",
    availability: "24/7 submissions; responses Monâ€“Sat",
    action: "Send Email",
    iconName: "Mail",
  },
  {
    id: "sc3",
    name: "WhatsApp Support",
    description: "Quick help for placement-related queries via WhatsApp.",
    availability: "Monâ€“Fri, 10 AM â€“ 6 PM IST",
    action: "Open WhatsApp",
    iconName: "Phone",
  },
  {
    id: "sc4",
    name: "Knowledge Base",
    description: "Browse 100+ articles covering exams, platform usage, and career tips.",
    availability: "Always available",
    action: "Browse Articles",
    iconName: "BookOpen",
  },
];

// â”€â”€â”€ TPO Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface CohortStat {
  cohortName: string;
  batch: string;
  totalStudents: number;
  activeLast7Days: number;
  avgPps: number;
  avgMockScore: number;
  placedCount: number;
  offersPending: number;
}

export interface AtRiskStudent {
  id: string;
  name: string;
  rollNo: string;
  branch: string;
  pps: number;
  lastActive: string;
  riskReason: string;
  mockAttempts: number;
}

export interface TpoRecentActivity {
  id: string;
  type: "drive_registered" | "mock_completed" | "offer_received" | "cohort_enrolled" | "certification_earned";
  studentName: string;
  detail: string;
  timestamp: string;
}

export const COHORT_STATS: CohortStat[] = [
  {
    cohortName: "2026 Final Year â€” CSE + IT",
    batch: "2022â€“2026",
    totalStudents: 238,
    activeLast7Days: 182,
    avgPps: 64,
    avgMockScore: 71,
    placedCount: 88,
    offersPending: 24,
  },
  {
    cohortName: "2026 Final Year â€” ECE + EEE",
    batch: "2022â€“2026",
    totalStudents: 180,
    activeLast7Days: 121,
    avgPps: 58,
    avgMockScore: 65,
    placedCount: 52,
    offersPending: 18,
  },
  {
    cohortName: "2027 Pre-Final Year â€” CSE",
    batch: "2023â€“2027",
    totalStudents: 200,
    activeLast7Days: 140,
    avgPps: 47,
    avgMockScore: 60,
    placedCount: 0,
    offersPending: 0,
  },
  {
    cohortName: "2026 Final Year â€” Mech + Civil",
    batch: "2022â€“2026",
    totalStudents: 95,
    activeLast7Days: 48,
    avgPps: 51,
    avgMockScore: 59,
    placedCount: 20,
    offersPending: 8,
  },
];

export const AT_RISK_STUDENTS: AtRiskStudent[] = [
  {
    id: "ars1",
    name: "Karthik Selvam",
    rollNo: "20CS081",
    branch: "CSE",
    pps: 28,
    lastActive: "2026-05-14",
    riskReason: "No activity in 18 days; 0 mock attempts this month",
    mockAttempts: 1,
  },
  {
    id: "ars2",
    name: "Sowmiya Arunachalam",
    rollNo: "20ECE044",
    branch: "ECE",
    pps: 34,
    lastActive: "2026-05-20",
    riskReason: "Mock scores consistently below 50th percentile",
    mockAttempts: 3,
  },
  {
    id: "ars3",
    name: "Praveen Raj",
    rollNo: "20CS112",
    branch: "CSE",
    pps: 31,
    lastActive: "2026-05-18",
    riskReason: "Course completion below 20%; no active drives applied",
    mockAttempts: 2,
  },
  {
    id: "ars4",
    name: "Nithya Subramaniam",
    rollNo: "20IT033",
    branch: "IT",
    pps: 39,
    lastActive: "2026-05-25",
    riskReason: "Strong quant but verbal accuracy below 50% â€” interview risk",
    mockAttempts: 4,
  },
  {
    id: "ars5",
    name: "Rajan Moorthy",
    rollNo: "20EEE061",
    branch: "EEE",
    pps: 26,
    lastActive: "2026-05-08",
    riskReason: "No login in 24 days; missed TCS registration deadline",
    mockAttempts: 0,
  },
];

export const TPO_RECENT_ACTIVITY: TpoRecentActivity[] = [
  {
    id: "ta1",
    type: "offer_received",
    studentName: "Meghana Krishnan",
    detail: "Received TCS ASE offer â€” 3.36 LPA",
    timestamp: "2026-06-01T09:30:00",
  },
  {
    id: "ta2",
    type: "mock_completed",
    studentName: "Aarav Nataraj",
    detail: "Completed TCS NQT Full Mock Attempt 3 â€” 82nd percentile",
    timestamp: "2026-06-01T08:15:00",
  },
  {
    id: "ta3",
    type: "drive_registered",
    studentName: "Sruthi Prabhu",
    detail: "Registered for Accenture ASE drive (deadline June 15)",
    timestamp: "2026-05-31T17:45:00",
  },
  {
    id: "ta4",
    type: "certification_earned",
    studentName: "Harish Venkataraman",
    detail: "Earned 'DSA Foundations' certificate from ZSkillup Ã— NASSCOM",
    timestamp: "2026-05-31T14:00:00",
  },
  {
    id: "ta5",
    type: "cohort_enrolled",
    studentName: "Divya Lakshmi",
    detail: "Enrolled in Placement Readiness Cohort Batch 15 (starts July 1)",
    timestamp: "2026-05-31T11:20:00",
  },
  {
    id: "ta6",
    type: "offer_received",
    studentName: "Sudarsan Balaji",
    detail: "Received Infosys SE offer â€” 3.60 LPA",
    timestamp: "2026-05-30T16:00:00",
  },
];

// â”€â”€â”€ Super Admin Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface PlatformKpi {
  label: string;
  value: string;
  delta: string;
  deltaPositive: boolean;
  subLabel: string;
}

export interface RecentCollege {
  id: string;
  name: string;
  location: string;
  tpoName: string;
  activatedOn: string;
  studentCount: number;
  avgPps: number;
  subscriptionTier: "Starter" | "Growth" | "Enterprise";
}

export interface SystemMetric {
  name: string;
  value: string;
  status: "Healthy" | "Warning" | "Critical";
  lastChecked: string;
}

export const PLATFORM_KPIS: PlatformKpi[] = [
  {
    label: "Total Registered Students",
    value: "1,84,320",
    delta: "+4,210 (last 30d)",
    deltaPositive: true,
    subLabel: "Across 68 partner colleges",
  },
  {
    label: "Active Students (7-day)",
    value: "62,410",
    delta: "+8.2% WoW",
    deltaPositive: true,
    subLabel: "33.9% of total base",
  },
  {
    label: "Mock Tests Completed (30d)",
    value: "2,18,900",
    delta: "+12.4% MoM",
    deltaPositive: true,
    subLabel: "Avg 3.5 per active student",
  },
  {
    label: "Platform Avg PPS",
    value: "58.4",
    delta: "+2.1 pts MoM",
    deltaPositive: true,
    subLabel: "National benchmark target: 65",
  },
  {
    label: "Offers Facilitated (AY 2025â€“26)",
    value: "12,840",
    delta: "+18% YoY",
    deltaPositive: true,
    subLabel: "Top companies: TCS, Infosys, Wipro",
  },
  {
    label: "Monthly Recurring Revenue",
    value: "â‚¹38.2 L",
    delta: "+6.8% MoM",
    deltaPositive: true,
    subLabel: "Institute subscriptions + student purchases",
  },
];

export const RECENT_COLLEGES: RecentCollege[] = [
  {
    id: "col1",
    name: "Sri Venkateswara College of Engineering",
    location: "Sriperumbudur, Tamil Nadu",
    tpoName: "Dr. S. Rajalakshmi",
    activatedOn: "2026-01-15",
    studentCount: 1420,
    avgPps: 61,
    subscriptionTier: "Enterprise",
  },
  {
    id: "col2",
    name: "PSG College of Technology",
    location: "Coimbatore, Tamil Nadu",
    tpoName: "Dr. R. Senthilkumar",
    activatedOn: "2026-02-01",
    studentCount: 2100,
    avgPps: 66,
    subscriptionTier: "Enterprise",
  },
  {
    id: "col3",
    name: "Sathyabama Institute of Science and Technology",
    location: "Chennai, Tamil Nadu",
    tpoName: "Mr. A. Bharathiraja",
    activatedOn: "2026-03-10",
    studentCount: 1860,
    avgPps: 57,
    subscriptionTier: "Growth",
  },
  {
    id: "col4",
    name: "Amrita School of Engineering",
    location: "Bengaluru, Karnataka",
    tpoName: "Dr. Priya Krishnamurthy",
    activatedOn: "2026-04-05",
    studentCount: 980,
    avgPps: 63,
    subscriptionTier: "Growth",
  },
  {
    id: "col5",
    name: "K.L. University",
    location: "Vijayawada, Andhra Pradesh",
    tpoName: "Mr. V. Nagendra Babu",
    activatedOn: "2026-05-01",
    studentCount: 720,
    avgPps: 55,
    subscriptionTier: "Starter",
  },
  {
    id: "col6",
    name: "SRM Institute of Science and Technology",
    location: "Kattankulathur, Tamil Nadu",
    tpoName: "Dr. T. Manikandan",
    activatedOn: "2026-05-20",
    studentCount: 3200,
    avgPps: 60,
    subscriptionTier: "Enterprise",
  },
];

export const SYSTEM_METRICS: SystemMetric[] = [
  {
    name: "API Response Time (p95)",
    value: "142 ms",
    status: "Healthy",
    lastChecked: "2026-06-01T12:00:00",
  },
  {
    name: "Database CPU Utilization",
    value: "38%",
    status: "Healthy",
    lastChecked: "2026-06-01T12:00:00",
  },
  {
    name: "Redis Cache Hit Rate",
    value: "91.4%",
    status: "Healthy",
    lastChecked: "2026-06-01T12:00:00",
  },
  {
    name: "CDN Edge Availability",
    value: "99.97%",
    status: "Healthy",
    lastChecked: "2026-06-01T12:00:00",
  },
  {
    name: "Job Queue Backlog",
    value: "214 jobs",
    status: "Warning",
    lastChecked: "2026-06-01T12:00:00",
  },
  {
    name: "Error Rate (5xx, 1h)",
    value: "0.08%",
    status: "Healthy",
    lastChecked: "2026-06-01T12:00:00",
  },
];