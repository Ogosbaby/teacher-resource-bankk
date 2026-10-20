"use client";

import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import katex from "katex";

interface FormattedMarkdownProps {
  content: string;
  className?: string;
}

/**
 * Replaces LaTeX math patterns ($...$ and $$...$$) with KaTeX rendered nodes.
 */
function renderMathInString(text: string): React.ReactNode[] {
  if (!text || (!text.includes("$") && !text.includes("\\("))) {
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
      formula = part.slice(2, -2).trim();
      isDisplay = true;
    } else if (part.startsWith("\\[") && part.endsWith("\\]") && part.length > 4) {
      formula = part.slice(2, -2).trim();
      isDisplay = true;
    } else if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
      formula = part.slice(1, -1).trim();
      isDisplay = false;
    } else if (part.startsWith("\\(") && part.endsWith("\\)") && part.length > 4) {
      formula = part.slice(2, -2).trim();
      isDisplay = false;
    } else {
      return part;
    }

    // Clean up chemical formula common escapes
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
