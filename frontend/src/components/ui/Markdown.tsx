import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** Renders assistant Markdown (GFM tables, lists). Raw HTML is not rendered. */
export default function Markdown({ children }: { children: string }) {
  return (
    <div className="ui-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{ a: ({ href, children: c }) => <a href={href} target="_blank" rel="noopener noreferrer">{c}</a> }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
