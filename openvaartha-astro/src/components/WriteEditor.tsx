import { useState, useEffect, useRef } from 'react';

interface WriteEditorProps {
  articleId?: string;
}

export default function WriteEditor({ articleId }: WriteEditorProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch('/api/v1/categories/')
      .then(r => r.ok ? r.json() : [])
      .then(d => setCategories(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const getToken = () => localStorage.getItem('token');

  const save = async (status: 'draft' | 'pending') => {
    const token = getToken();
    if (!token) { setError('You must be logged in'); return; }
    setSaving(true);
    setError('');
    try {
      const url = articleId ? '/api/v1/articles/' + articleId : '/api/v1/articles/';
      const method = articleId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          title: title.trim(),
          body,
          category,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          status,
        }),
      });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
      else { const d = await res.json().catch(() => ({})); setError(d.detail || 'Save failed'); }
    } catch { setError('Network error'); }
    setSaving(false);
  };

  const insertMarkdown = (prefix: string, suffix: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = body.substring(start, end);
    const before = body.substring(0, start);
    const after = body.substring(end);
    setBody(before + prefix + selected + suffix + after);
    setTimeout(() => { ta.focus(); ta.selectionStart = start + prefix.length; ta.selectionEnd = start + prefix.length + selected.length; }, 0);
  };

  return (
    <div className="space-y-4">
      <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Article title" className="w-full h-12 px-0 text-2xl font-serif font-bold bg-transparent border-0 outline-none placeholder:text-muted-foreground/50" />

      <div className="flex gap-2">
        <select value={category} onChange={e => setCategory(e.target.value)} className="h-9 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-primary">
          <option value="">Select category</option>
          {categories.map((c: any) => <option key={c._id || c.id} value={c.name}>{c.name}</option>)}
        </select>
        <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="Tags (comma separated)" className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-primary" />
      </div>

      <div className="flex items-center gap-1 border border-border rounded-lg p-1 bg-muted/30">
        <button type="button" onClick={() => insertMarkdown('**', '**')} className="h-7 px-2 rounded text-xs font-bold hover:bg-muted transition-colors" title="Bold">B</button>
        <button type="button" onClick={() => insertMarkdown('*', '*')} className="h-7 px-2 rounded text-xs italic font-serif hover:bg-muted transition-colors" title="Italic">I</button>
        <button type="button" onClick={() => insertMarkdown('## ', '')} className="h-7 px-2 rounded text-xs font-bold hover:bg-muted transition-colors" title="Heading">H</button>
        <button type="button" onClick={() => insertMarkdown('[', '](url)')} className="h-7 px-2 rounded text-xs hover:bg-muted transition-colors" title="Link">Link</button>
        <button type="button" onClick={() => insertMarkdown('> ', '')} className="h-7 px-2 rounded text-xs hover:bg-muted transition-colors" title="Quote">Quote</button>
        <button type="button" onClick={() => insertMarkdown('![alt](', ')')} className="h-7 px-2 rounded text-xs hover:bg-muted transition-colors" title="Image">Image</button>
      </div>

      <textarea
        ref={textareaRef}
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="Write your story... (Markdown supported)"
        rows={20}
        className="w-full px-0 py-2 bg-transparent border-0 outline-none text-sm leading-relaxed resize-none font-mono placeholder:text-muted-foreground/50"
      />

      <div className="flex items-center gap-3 pt-4 border-t border-border">
        <button onClick={() => save('draft')} disabled={saving || !title.trim()} className="h-9 px-5 rounded-full border border-border text-xs font-bold hover:bg-muted transition-colors disabled:opacity-50">
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save draft'}
        </button>
        <button onClick={() => save('pending')} disabled={saving || !title.trim() || !body.trim()} className="h-9 px-5 rounded-full bg-primary text-primary-foreground text-xs font-bold hover:bg-primary-hover transition-colors disabled:opacity-50">
          Submit for review
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
