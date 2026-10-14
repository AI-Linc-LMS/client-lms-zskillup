/**
 * SHARED CONTRACT — DUPLICATED BYTE-FOR-BYTE ACROSS BOTH REPOS (ADR-011).
 *
 * READING A JOB DESCRIPTION, AND MAPPING ITS ROUNDS TO PRACTICE (PRD §23.1, §23.3).
 *
 * §23 asks the platform to "convert the Job Description and each employer round into
 * tailored practice and assessment activities". This file is the first half: what can be
 * read out of a JD, and which practice each round calls for.
 *
 * Three rules shape it, and all three come from the PRD's own wording:
 *
 *   1. EXTRACTION IS A DRAFT, NEVER AN ACTION. "Allow the TPO/ZSkillup operator to review
 *      and edit the extracted JD details BEFORE using them to generate assessments."
 *      Nothing here is applied to a drive by itself. A JD parse that silently set a
 *      drive's skills and rounds would have the operator reviewing their own screen
 *      rather than the machine's suggestion.
 *
 *   2. WHAT WAS NOT FOUND IS SAID OUT LOUD. "NEVER ASSUME MISSING ROUND DETAILS; let the
 *      user add or configure them." So the result carries `notFound` as a first-class
 *      field. This is the same rule as §4's UNKNOWN verdict and §6's missing dimensions:
 *      an absence reported as an absence, never as a default. A JD that does not mention
 *      rounds must produce an empty round plan and say so — not a plausible-looking
 *      guess that an operator then approves without reading.
 *
 *   3. THE ROUND VOCABULARY IS §4'S. RoundKind was defined in §4 with a comment saying
 *      §10 and §23 would both need it, and they do. A second vocabulary here would mean a
 *      drive's planned rounds and its practice plan could disagree about what a round is.
 */

import { RoundKind } from './drive-rounds';

/**
 * Where an extraction has got to (PRD §23.2).
 *
 * §23.2's default is that "AI-generated content should remain in draft/review status until
 * an authorised person approves it", and this is how that is enforced: only an APPLIED
 * extraction has written anything to a drive, and only a person can apply one.
 */
export enum JdExtractionStatus {
  /** A machine produced it and nobody has looked. */
  DRAFT = 'DRAFT',
  /** A named person has checked it. */
  REVIEWED = 'REVIEWED',
  /** The drive's rounds were actually written from it. */
  APPLIED = 'APPLIED',
  /** Looked at and rejected — kept, because "we tried and it was wrong" is worth knowing. */
  DISCARDED = 'DISCARDED',
}

/** Which extractor produced an extraction, so an AI-produced item stays identifiable. */
export enum JdExtractionSource {
  AI = 'AI',
  RULES = 'RULES',
  MANUAL = 'MANUAL',
}

/** How confident the extractor is about a field it DID find. */
export enum ExtractionConfidence {
  /** Stated explicitly and unambiguously — a labelled section, an exact phrase. */
  EXPLICIT = 'EXPLICIT',
  /** Inferred from context. An operator should check it. */
  INFERRED = 'INFERRED',
}

/** Seniority bands §23.1 asks to identify. */
export enum SeniorityLevel {
  INTERN = 'INTERN',
  FRESHER = 'FRESHER',
  JUNIOR = 'JUNIOR',
  MID = 'MID',
  SENIOR = 'SENIOR',
}

/** One field the extractor found, with how it found it. */
export interface ExtractedField<T> {
  value: T;
  confidence: ExtractionConfidence;
  /** The phrase it came from, so an operator can check rather than trust. */
  evidence?: string | null;
}

/**
 * What was read out of a JD.
 *
 * Every field is OPTIONAL and the absences are listed in `notFound`. That redundancy is
 * deliberate: a caller that forgets to check for undefined still cannot render a
 * confident-looking blank, because the summary says what is missing.
 */
export interface ExtractedJd {
  companyName?: ExtractedField<string>;
  role?: ExtractedField<string>;
  seniority?: ExtractedField<SeniorityLevel>;
  skills?: ExtractedField<string[]>;
  tools?: ExtractedField<string[]>;
  responsibilities?: ExtractedField<string[]>;
  locations?: ExtractedField<string[]>;
  /** Phrases that look like eligibility requirements — NOT parsed into rules. See below. */
  eligibilityHints?: ExtractedField<string[]>;
  /** Rounds the JD actually names, in the order it names them. */
  statedRounds?: ExtractedField<Array<{ kind: RoundKind; name: string }>>;

  /**
   * Fields the JD did not state, named so the operator knows what to supply.
   *
   * §23.1's "never assume missing round details" is the reason this exists as data rather
   * than as the absence of data.
   */
  notFound: string[];

  /** Which extractor produced this, so a bad run is traceable. */
  source: JdExtractionSource;
  /** The JD text this came from, hashed — §23.8 asks to "store the JD snapshot". */
  jdLength: number;
}

/* ------------------------------------------------------------------------- */
/* §23.3 — which practice each round calls for                                */
/* ------------------------------------------------------------------------- */

/**
 * What a round tests, and what practice fits it.
 *
 * This is §23.3's table expressed as data. It is a FIXED MAPPING rather than anything
 * generated, for the same reason §14's intervention text is: a table somebody can read
 * and disagree with beats a sentence that merely sounds like analysis. An operator who
 * thinks a managerial round should include a case study can see that this disagrees, and
 * override it on the round.
 *
 * `autoScored` is the field that decides what the platform can actually promise. §23.10
 * asks "which assessment formats support automatic scoring versus rubric-based human
 * review", and the honest answer differs by round: an MCQ paper grades itself, a case
 * study does not. A round whose practice cannot be auto-scored must not report a pass
 * mark as though it had been.
 */
export interface RoundPracticePlan {
  kind: RoundKind;
  /** What the round is testing, in the words a student would recognise. */
  competencies: string[];
  /** The practice format this round calls for. */
  practice:
    | 'MCQ'
    | 'CODING'
    | 'MOCK_INTERVIEW'
    | 'COMMUNICATION_TASK'
    | 'CASE_SUBMISSION'
    | 'NONE';
  /** Can the platform score it without a human? */
  autoScored: boolean;
  /** Minutes, as a starting point the operator changes. */
  suggestedDurationMinutes: number | null;
  /** Why this round has no practice, when it has none. */
  noPracticeReason?: string;
}

export const ROUND_PRACTICE: Readonly<Record<RoundKind, RoundPracticePlan>> = {
  [RoundKind.APTITUDE]: {
    kind: RoundKind.APTITUDE,
    competencies: ['Quantitative aptitude', 'Logical reasoning', 'Verbal ability', 'Data interpretation'],
    practice: 'MCQ',
    autoScored: true,
    suggestedDurationMinutes: 60,
  },
  [RoundKind.TECHNICAL_MCQ]: {
    kind: RoundKind.TECHNICAL_MCQ,
    competencies: ['Role-specific technical knowledge', 'Technology concepts', 'SQL', 'Debugging'],
    practice: 'MCQ',
    autoScored: true,
    suggestedDurationMinutes: 45,
  },
  [RoundKind.CODING]: {
    kind: RoundKind.CODING,
    competencies: ['Problem solving', 'Data structures', 'Algorithms', 'Code correctness'],
    practice: 'CODING',
    autoScored: true,
    suggestedDurationMinutes: 90,
  },
  [RoundKind.CASE_STUDY]: {
    kind: RoundKind.CASE_STUDY,
    competencies: ['Structured analysis', 'Business judgement', 'Written communication'],
    practice: 'CASE_SUBMISSION',
    // A case study is read by a person. Reporting a score for it without one would be
    // inventing a judgement nobody made.
    autoScored: false,
    suggestedDurationMinutes: null,
  },
  [RoundKind.COMMUNICATION]: {
    kind: RoundKind.COMMUNICATION,
    competencies: ['Spoken clarity', 'Listening', 'Professional articulation'],
    practice: 'COMMUNICATION_TASK',
    autoScored: false,
    suggestedDurationMinutes: 20,
  },
  [RoundKind.GROUP_DISCUSSION]: {
    kind: RoundKind.GROUP_DISCUSSION,
    competencies: ['Argument', 'Listening', 'Turn-taking', 'Summarising'],
    // A group discussion needs a group. One student practising alone is a different
    // exercise, so the honest plan is a prompt and a rubric rather than a simulation.
    practice: 'COMMUNICATION_TASK',
    autoScored: false,
    suggestedDurationMinutes: 20,
  },
  [RoundKind.TECHNICAL_INTERVIEW]: {
    kind: RoundKind.TECHNICAL_INTERVIEW,
    competencies: ['Depth of knowledge', 'Reasoning aloud', 'Trade-off discussion', 'Project ownership'],
    practice: 'MOCK_INTERVIEW',
    autoScored: false,
    suggestedDurationMinutes: 30,
  },
  [RoundKind.MANAGERIAL_INTERVIEW]: {
    kind: RoundKind.MANAGERIAL_INTERVIEW,
    competencies: ['Ownership', 'Prioritisation', 'Conflict handling', 'Teamwork'],
    practice: 'MOCK_INTERVIEW',
    autoScored: false,
    suggestedDurationMinutes: 30,
  },
  [RoundKind.HR_INTERVIEW]: {
    kind: RoundKind.HR_INTERVIEW,
    competencies: ['Motivation', 'Relocation and availability', 'Expectations', 'Fit'],
    practice: 'MOCK_INTERVIEW',
    autoScored: false,
    suggestedDurationMinutes: 20,
  },
  [RoundKind.DOCUMENT_VERIFICATION]: {
    kind: RoundKind.DOCUMENT_VERIFICATION,
    competencies: [],
    practice: 'NONE',
    autoScored: false,
    suggestedDurationMinutes: null,
    // Offering practice here would be absurd, and saying so is better than an empty
    // "no content yet" panel that looks like a gap in the platform.
    noPracticeReason: 'Nothing to practise — this round checks paperwork.',
  },
  [RoundKind.MEDICAL]: {
    kind: RoundKind.MEDICAL,
    competencies: [],
    practice: 'NONE',
    autoScored: false,
    suggestedDurationMinutes: null,
    noPracticeReason: 'Nothing to practise — this round is a health check.',
  },
  [RoundKind.OTHER]: {
    kind: RoundKind.OTHER,
    competencies: [],
    // An employer-defined round cannot have its format guessed. §23.3 asks for a custom
    // round to take "a custom round name, assessment type, question bank, rubric,
    // instructions and pass criteria" — all chosen, none inferred.
    practice: 'NONE',
    autoScored: false,
    suggestedDurationMinutes: null,
    noPracticeReason:
      'This round is defined by the employer, so its practice has to be chosen rather than inferred.',
  },
};

/** Rounds whose practice the platform can score on its own. */
export function isAutoScorable(kind: RoundKind): boolean {
  return ROUND_PRACTICE[kind]?.autoScored === true;
}

/* ------------------------------------------------------------------------- */
/* Rule-based extraction (the fallback §23.10 requires)                       */
/* ------------------------------------------------------------------------- */

/**
 * Phrases that name each round kind in a real JD.
 *
 * Ordered longest-first within each kind so "technical interview" is not matched as
 * "interview", and checked against a normalised copy of the text.
 */
const ROUND_PHRASES: ReadonlyArray<[RoundKind, readonly string[]]> = [
  [RoundKind.APTITUDE, ['aptitude test', 'aptitude round', 'aptitude', 'quantitative', 'logical reasoning', 'psychometric']],
  [RoundKind.TECHNICAL_MCQ, ['technical mcq', 'technical test', 'technical written', 'online technical', 'technical assessment']],
  [RoundKind.CODING, ['coding round', 'coding test', 'coding challenge', 'programming test', 'hackerrank', 'live coding', 'machine coding', 'coding']],
  [RoundKind.CASE_STUDY, ['case study', 'case interview', 'take-home', 'take home', 'work sample', 'assignment round']],
  [RoundKind.GROUP_DISCUSSION, ['group discussion', 'gd round', ' gd ']],
  [RoundKind.COMMUNICATION, ['communication round', 'communication assessment', 'versant', 'spoken english']],
  [RoundKind.TECHNICAL_INTERVIEW, ['technical interview', 'tech interview', 'technical round', 'system design interview', 'system design round']],
  [RoundKind.MANAGERIAL_INTERVIEW, ['managerial round', 'managerial interview', 'manager round', 'hiring manager']],
  [RoundKind.HR_INTERVIEW, ['hr interview', 'hr round', 'hr discussion']],
  [RoundKind.DOCUMENT_VERIFICATION, ['document verification', 'documentation round', 'bgv', 'background verification']],
  [RoundKind.MEDICAL, ['medical test', 'medical round', 'health check']],
];

const SENIORITY_PHRASES: ReadonlyArray<[SeniorityLevel, readonly string[]]> = [
  [SeniorityLevel.INTERN, ['intern', 'internship', 'trainee']],
  [SeniorityLevel.FRESHER, ['fresher', 'fresh graduate', 'entry level', 'entry-level', '0-1 year', '0-2 year', 'no prior experience']],
  [SeniorityLevel.JUNIOR, ['junior', '1-3 year', '1-2 year']],
  [SeniorityLevel.SENIOR, ['senior', 'lead', 'principal', '5+ year', '6+ year', '7+ year', '8+ year']],
  [SeniorityLevel.MID, ['mid level', 'mid-level', '3-5 year', '2-4 year', '3+ year']],
];

/**
 * Read what can be read from a JD without a model.
 *
 * §23.10 asks whether "AI can reliably parse JDs and identify round details; IF NOT,
 * PROVIDE A STRUCTURED MANUAL ROUND EDITOR AS FALLBACK." This is the middle ground: it
 * finds the things that are reliably findable by phrase — the named rounds, the seniority
 * band, a plain skills list — and reports everything else as not found, so the manual
 * editor starts from something rather than from nothing.
 *
 * It deliberately DOES NOT attempt eligibility rules. "Minimum 60% in graduation" looks
 * easy to parse and is not: 60% of what, aggregate or final year, and does a backlog
 * count. §4's rules decide who may apply to a drive, and a mis-parsed rule would exclude
 * real students silently. Phrases that look like requirements are surfaced as HINTS for a
 * human to turn into rules.
 */
export function extractJdByRules(jdText: string): ExtractedJd {
  const text = (jdText ?? '').toLowerCase().replace(/\s+/g, ' ');
  const notFound: string[] = [];

  // Rounds, in the order the JD mentions them — a JD that lists "aptitude, then coding,
  // then HR" is describing a sequence, and the order is information.
  const hits: Array<{ kind: RoundKind; name: string; at: number }> = [];
  for (const [kind, phrases] of ROUND_PHRASES) {
    for (const phrase of phrases) {
      const at = text.indexOf(phrase);
      if (at >= 0 && !hits.some((h) => h.kind === kind)) {
        hits.push({ kind, name: phrase.trim(), at });
        break;
      }
    }
  }
  hits.sort((a, b) => a.at - b.at);

  let seniority: SeniorityLevel | null = null;
  let seniorityEvidence: string | null = null;
  for (const [level, phrases] of SENIORITY_PHRASES) {
    const found = phrases.find((p) => text.includes(p));
    if (found) {
      seniority = level;
      seniorityEvidence = found;
      break;
    }
  }

  // Requirement-looking sentences, surfaced rather than parsed — see the note above.
  const hints = (jdText ?? '')
    .split(/[\n•·]|\.\s/)
    .map((l) => l.trim())
    .filter(
      (l) =>
        l.length > 8 &&
        l.length < 240 &&
        /\b(minimum|min\.|at least|no backlog|backlogs?|cgpa|percentage|%|aggregate|passout|pass-out|batch of|graduat)/i.test(l),
    )
    .slice(0, 20);

  const out: ExtractedJd = {
    notFound,
    source: JdExtractionSource.RULES,
    jdLength: (jdText ?? '').length,
  };

  if (hits.length > 0) {
    out.statedRounds = {
      value: hits.map((h) => ({ kind: h.kind, name: h.name })),
      confidence: ExtractionConfidence.EXPLICIT,
      evidence: hits.map((h) => h.name).join(', '),
    };
  } else {
    // THE IMPORTANT BRANCH. A JD that does not name its rounds gets an EMPTY plan and a
    // note, never a default sequence. A plausible-looking guess is the thing an operator
    // approves without reading.
    notFound.push('selection rounds');
  }

  if (seniority) {
    out.seniority = {
      value: seniority,
      confidence: ExtractionConfidence.INFERRED,
      evidence: seniorityEvidence,
    };
  } else {
    notFound.push('seniority / experience level');
  }

  if (hints.length > 0) {
    out.eligibilityHints = {
      value: hints,
      confidence: ExtractionConfidence.INFERRED,
      evidence: null,
    };
  } else {
    notFound.push('eligibility requirements');
  }

  // Everything a phrase match cannot honestly claim. Named individually so the review
  // screen can ask for each one rather than showing a single "incomplete" badge.
  for (const field of ['company name', 'role title', 'skills', 'tools and technologies', 'responsibilities', 'locations']) {
    notFound.push(field);
  }

  return out;
}

/**
 * Turn an extraction into a round plan the operator can edit (PRD §23.1).
 *
 * `sequence` starts at 1 and follows the order the JD mentioned the rounds. Every round
 * arrives with its §23.3 practice plan attached, so the operator is choosing from a
 * populated starting point rather than an empty form — but nothing is scheduled, assigned
 * or generated by this: it returns a plan, and §23.2 is what acts on one.
 */
export function roundPlanFromExtraction(
  jd: ExtractedJd,
): Array<{ sequence: number; kind: RoundKind; name: string; practice: RoundPracticePlan }> {
  const rounds = jd.statedRounds?.value ?? [];
  return rounds.map((r, i) => ({
    sequence: i + 1,
    kind: r.kind,
    name: r.name,
    practice: ROUND_PRACTICE[r.kind],
  }));
}
