"use client";

import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import katex from "katex";

interface FormattedMarkdownProps {
  content: string;
  className?: string;
}

function normalizeFormula(raw: string): string {
  return raw
    .replace(/\\\\/g, "\\")
    .replace(/±/g, "\\pm ")
    .replace(/×/g, "\\times ")
    .replace(/÷/g, "\\div ")
    .replace(/°/g, "^\\circ ")
    .replace(/√\(([^)]+)\)/g, "\\sqrt{$1}")
    .replace(/√([a-zA-Z0-9]+)/g, "\\sqrt{$1}");
}

/**
 * Replaces LaTeX math patterns ($...$ and $$...$$) with KaTeX rendered nodes.
 */
export function renderMathInString(text: string): React.ReactNode[] {
  if (!text) return [text];

  const hasDelimiters = text.includes("$") || text.includes("\\(") || text.includes("\\[");

  if (!hasDelimiters) {
    if (
      text.includes("\\frac") ||
      text.includes("\\sqrt") ||
      text.includes("\\pm") ||
      text.includes("\\Delta") ||
      text.includes("\\xrightarrow")
    ) {
      try {
        const html = katex.renderToString(normalizeFormula(text), {
          displayMode: false,
          throwOnError: false,
        });
        return [
          <span
            key="raw-math"
            className="inline-block px-1 align-baseline font-serif text-ink"
            dangerouslySetInnerHTML={{ __html: html }}
          />,
        ];
      } catch {
        return [text];
      }
    }
    return [text];
  }

  // Regex matching $$display math$$ or $inline math$ or \(inline math\) or \[display math\]
  const regex = /(\$\$[\s\S]+?\$\$|\$[^\$\n]+?\$|\\\[[\s\S]+?\\\]|\\\([^\n]+?\\\))/g;
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    if (!part) return null;

    let formula = "";
    let isDisplay = false;

    if (part.startsWith("$$") && part.endsWith("$$") && part.length > 4) {
      formula = normalizeFormula(part.slice(2, -2).trim());
      isDisplay = true;
    } else if (part.startsWith("\\[") && part.endsWith("\\]") && part.length > 4) {
      formula = normalizeFormula(part.slice(2, -2).trim());
      isDisplay = true;
    } else if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
      formula = normalizeFormula(part.slice(1, -1).trim());
      isDisplay = false;
    } else if (part.startsWith("\\(") && part.endsWith("\\)") && part.length > 4) {
      formula = normalizeFormula(part.slice(2, -2).trim());
      isDisplay = false;
    } else {
      return part;
    }

    try {
      const html = katex.renderToString(formula, {
        displayMode: isDisplay,
        throwOnError: false,
      });

      if (isDisplay) {
        return (
          <span
            key={idx}
            className="my-3 block overflow-x-auto py-1 text-center font-serif text-ink"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }

      return (
        <span
          key={idx}
          className="inline-block px-1 align-baseline font-serif text-ink"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    } catch {
      return (
        <code key={idx} className="rounded bg-warm-100 px-1 py-0.5 font-mono text-xs text-ink">
          {formula}
        </code>
      );
    }
  });
}

/**
 * Recursively maps React children to apply math formula typesetting to all string nodes.
 */
function processChildrenWithMath(children: React.ReactNode): React.ReactNode {
  if (typeof children === "string") {
    const processed = renderMathInString(children);
    return processed.length === 1 ? processed[0] : <React.Fragment>{processed}</React.Fragment>;
  }

  if (Array.isArray(children)) {
    return React.Children.map(children, (child) => processChildrenWithMath(child));
  }

  if (React.isValidElement(children) && children.props && children.props.children) {
    return React.cloneElement(children, {
      ...children.props,
      children: processChildrenWithMath(children.props.children),
    });
  }

  return children;
}

/**
 * Standalone component to format math inside headings, badges, and card titles.
 */
export function MathText({ text, className = "" }: { text: string; className?: string }) {
  if (!text) return null;
  const nodes = renderMathInString(text);
  return <span className={className}>{nodes}</span>;
}

export function FormattedMarkdown({ content, className = "" }: FormattedMarkdownProps) {
  const customComponents = useMemo(
    () => ({
      p: ({ children, ...props }: any) => <p {...props}>{processChildrenWithMath(children)}</p>,
      li: ({ children, ...props }: any) => <li {...props}>{processChildrenWithMath(children)}</li>,
      h1: ({ children, ...props }: any) => <h1 {...props}>{processChildrenWithMath(children)}</h1>,
      h2: ({ children, ...props }: any) => <h2 {...props}>{processChildrenWithMath(children)}</h2>,
      h3: ({ children, ...props }: any) => <h3 {...props}>{processChildrenWithMath(children)}</h3>,
      h4: ({ children, ...props }: any) => <h4 {...props}>{processChildrenWithMath(children)}</h4>,
      strong: ({ children, ...props }: any) => (
        <strong {...props}>{processChildrenWithMath(children)}</strong>
      ),
      em: ({ children, ...props }: any) => <em {...props}>{processChildrenWithMath(children)}</em>,
      blockquote: ({ children, ...props }: any) => (
        <blockquote {...props}>{processChildrenWithMath(children)}</blockquote>
      ),
    }),
    []
  );

  return (
    <div className={`prose prose-sm max-w-none text-ink prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1 prose-li:my-0.5 ${className}`}>
      <ReactMarkdown components={customComponents}>{content}</ReactMarkdown>
    </div>
  );
}
