'use client';

import Editor, { type Monaco, type OnMount } from '@monaco-editor/react';
import { Loader2 } from 'lucide-react';

/**
 * Thin Monaco wrapper with an Aurora-navy theme so the editor sits natively in
 * the coding workspace (deep navy #0b1220 surface, orange caret/keywords). The
 * heavy editor loads client-side only; @monaco-editor/react streams it in.
 */

const THEME = 'aurora-dark';

function defineTheme(monaco: Monaco) {
  monaco.editor.defineTheme(THEME, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'f7a14e' },
      { token: 'number', foreground: '7dd3fc' },
      { token: 'string', foreground: 'a7f3d0' },
      { token: 'type', foreground: 'c4b5fd' },
      { token: 'function', foreground: '93c5fd' },
    ],
    colors: {
      'editor.background': '#0b1220',
      'editor.foreground': '#e2e8f0',
      'editorLineNumber.foreground': '#334155',
      'editorLineNumber.activeForeground': '#94a3b8',
      'editor.selectionBackground': '#1e3a8a66',
      'editor.lineHighlightBackground': '#11192b',
      'editorCursor.foreground': '#f37021',
      'editorIndentGuide.background': '#1e293b',
      'editorWidget.background': '#0f172a',
      'editorGutter.background': '#0b1220',
      'scrollbarSlider.background': '#1e293b88',
    },
  });
}

export function CodeEditor({
  language,
  value,
  onChange,
  height = '100%',
  readOnly = false,
}: {
  language: string;
  value: string;
  onChange?: (value: string) => void;
  height?: string | number;
  readOnly?: boolean;
}) {
  const handleMount: OnMount = (_editor, monaco) => {
    defineTheme(monaco);
    monaco.editor.setTheme(THEME);
  };

  return (
    <Editor
      height={height}
      language={language}
      value={value}
      theme={THEME}
      beforeMount={defineTheme}
      onMount={handleMount}
      onChange={(v) => onChange?.(v ?? '')}
      loading={
        <div className="flex h-full items-center justify-center text-slate-500">
          <Loader2 className="size-5 animate-spin" />
        </div>
      }
      options={{
        readOnly,
        fontSize: 14,
        fontLigatures: true,
        fontFamily:
          'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        padding: { top: 14, bottom: 14 },
        lineNumbersMinChars: 3,
        renderLineHighlight: 'line',
        roundedSelection: true,
        tabSize: 4,
        automaticLayout: true,
        scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
      }}
    />
  );
}
