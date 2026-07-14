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
const CODE_MARKERS =
  /#include|#define|\bint\s+main\b|\bvoid\s+main\b|\bprintf\s*\(|\bscanf\s*\(|System\.out|\bpublic\s+(?:static|class)\b|\bdef\s+\w+\s*\(|\bconsole\.log\b|\bcout\s*<<|\bfun\s+\w+\s*\(|\bSELECT\b[\s\S]*\bFROM\b/;

function splitStem(text: string): { prose: string; code: string | null } {
  const m = text.match(CODE_MARKERS);
  if (!m || m.index === undefined) return { prose: text, code: null };
  const code = text.slice(m.index).trim();
  // Require a real code body so a stray "for"/"class" in prose isn't misread.
  if (code.length < 8 || !/[{;()<]/.test(code)) return { prose: text, code: null };
  return { prose: text.slice(0, m.index).trim(), code };
}

/** Re-break a single-line C/Java-style snippet at statement boundaries. Data that
 *  already carries newlines is trusted as-is (admin may have formatted it). */
function formatCode(code: string): string {
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
