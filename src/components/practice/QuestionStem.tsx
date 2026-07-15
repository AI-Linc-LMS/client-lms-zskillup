/**
 * Renders a question stem, formatting any embedded code (Pseudocode / C / Java /
 * Python / SQL snippets) as a monospace block with preserved line breaks — so
 * questions like "What is the output of: #include<stdio.h> int main(){…}" stop
 * rendering as one flattened, unreadable run-on line.
 *
 * Detection is conservative (strong language markers + real code punctuation) to
 * avoid false-positives on prose. When the stored code already has newlines we
 * trust them; a single-line snippet is gently re-broken at statement boundaries.
 */
// Language entry points (case-sensitive: "SELECT…FROM" is SQL, not prose "select from").
const CODE_MARKERS =
  /#include|#define|\bint\s+main\b|\bvoid\s+main\b|\bprintf\s*\(|\bscanf\s*\(|System\.out|\bpublic\s+(?:static|class)\b|\bdef\s+\w+\s*\(|\bconsole\.log\b|\bcout\s*<<|\bfun\s+\w+\s*\(|\bSELECT\b[\s\S]*\bFROM\b/;

// Pseudocode / structural markers (case-insensitive). Aptitude "pseudocode"
// questions rarely use printf/#include — they read "Integer n", "Set a = 3",
// "for (i = 1; …)", "for each ch in s", "count <- 0", numbered steps, or fenced
// code. These were previously undetected and rendered as flat prose. Each pattern
// is deliberately code-specific (requires a paren, assignment, arrow, declaration
// keyword or fence) so prose like "for each of the following" never trips it.
const PSEUDO_MARKERS =
  /```|\bfor\s*\(|\bwhile\s*\(|\bif\s*\([^)]*[<>=!]|\bprint\s*\(|\bfor\b\s+[A-Za-z]\w*\s*=\s*\w.*?\bto\b|\bfor\s+each\s+\w+\s+in\b|\bInteger\s+[A-Za-z]|\bSet\s+[A-Za-z]\w*\s*=|\bInput\s+[A-Za-z]\w*\s*=|\bset\s+[a-z]\w*\s*=\s*\d|\b(?:int|char|float|double|long|bool|string)\s+[A-Za-z]\w*\s*=|\bEnd(?:for|if|while)\b|\busing\s+System\b|\bstruct\s+[A-Za-z]|\bclass\s+[A-Z]\w*|\n\s*\/\/|\s(?:<-|:=|←)\s|^\s*\d+\.\s+(?:Integer|Set|for|if|while|print|Input|End|Read|Declare|Function|Procedure)/im;

/** Index of the earliest code/pseudocode marker in the text, or -1. */
function codeStart(text: string): number {
  const a = text.match(CODE_MARKERS)?.index ?? Infinity;
  const b = text.match(PSEUDO_MARKERS)?.index ?? Infinity;
  const i = Math.min(a, b);
  return Number.isFinite(i) ? i : -1;
}

function splitStem(text: string): { prose: string; code: string | null } {
  const idx = codeStart(text);
  if (idx < 0) return { prose: text, code: null };
  const code = text.slice(idx).trim();
  // Require a real code body: structural punctuation OR a multi-line block (the
  // marker already signalled code intent, so a stray keyword in prose won't split).
  if (code.length < 8 || !(/[{};()<>=]/.test(code) || code.includes('\n'))) return { prose: text, code: null };
  return { prose: text.slice(0, idx).trim(), code };
}

/** Re-break a single-line C/Java-style snippet at statement boundaries. Data that
 *  already carries newlines is trusted as-is (admin may have formatted it). */
function formatCode(code: string): string {
  // Drop markdown code fences (```csharp … ```) — some stems wrap code in them.
  code = code.replace(/```[a-zA-Z]*/g, '').trim();
  if (code.includes('\n')) return code;
  return code
    .replace(/\s*\{\s*/g, ' {\n')
    .replace(/;\s*/g, ';\n')
    .replace(/\s*\}\s*/g, '\n}\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

export function QuestionStem({
  text,
  imageUrl,
  className,
}: {
  text: string;
  /** Optional diagram/figure (URL or data-URL) for DI charts / Venn diagrams. */
  imageUrl?: string | null;
  className?: string;
}) {
  const { prose, code } = splitStem(text);
  const diagram = imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt="Question diagram"
      className="mb-3 max-h-80 w-auto max-w-full rounded-lg border border-slate-200 bg-white object-contain"
      loading="lazy"
    />
  ) : null;

  if (!code) {
    // Preserve any intentional line breaks/indentation even for non-code stems.
    return (
      <div className={className}>
        {diagram}
        <div className="whitespace-pre-wrap">{text}</div>
      </div>
    );
  }
  return (
    <div className={className}>
      {diagram}
      {prose ? <p className="whitespace-pre-wrap">{prose}</p> : null}
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-[13px] font-normal leading-relaxed text-navy">
        {formatCode(code)}
      </pre>
    </div>
  );
}
