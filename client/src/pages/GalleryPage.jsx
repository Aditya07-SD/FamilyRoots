import { useEffect, useRef, useState } from "react";
import { ImagePlus, Upload, Trash2, X, LoaderCircle } from "lucide-react";
import { api } from "../lib/api";

export function GalleryPage({ role }) {
  const [memories, setMemories] = useState([]);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const load = async () => {
    try {
      setError("");
      const r = await api.get("/memories");
      setMemories(r.data.data || []);
    } catch (e) {
      setError(e.response?.data?.message || "Unable to load memories.");
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async e => {
    e.preventDefault();
    if (!file) return setError("Choose an image first.");
    setBusy(true); setError("");
    try {
      const form = new FormData();
      form.append("image", file);
      form.append("title", title);
      form.append("caption", caption);
      await api.post("/memories", form);
      setFile(null); setTitle(""); setCaption("");
      if (inputRef.current) inputRef.current.value = "";
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Upload failed. Please try again.");
    } finally { setBusy(false); }
  };

  const remove = async id => {
    if (!confirm("Delete this memory?")) return;
    try { await api.delete(`/memories/${id}`); setMemories(x => x.filter(m => m._id !== id)); }
    catch (e) { setError(e.response?.data?.message || "Unable to delete memory."); }
  };

  return <div className="feature-page">
    <div className="page-heading">
      <div><p className="eyebrow">FAMILY ARCHIVE</p><h1>Memories & Gallery</h1><p className="muted">Keep your family's favorite moments together in one private space.</p></div>
    </div>

    {error && <div className="error">{error}</div>}

    {role !== "VIEWER" && <section className="panel memory-upload">
      <div className="setting-title"><ImagePlus/><div><h3>Add a family memory</h3><p>Upload JPG, PNG, WebP or GIF images up to 10 MB.</p></div></div>
      <form onSubmit={submit}>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e => setFile(e.target.files?.[0] || null)} />
        <div className="two">
          <label>Title : <input value={title} onChange={e => setTitle(e.target.value)} maxLength={160} placeholder="Grandma's 80th birthday"/></label>
          <label>Caption : <input value={caption} onChange={e => setCaption(e.target.value)} maxLength={1000} placeholder="Happiest day of my life…"/></label>
        </div>
        <button className="primary" disabled={busy || !file}>{busy ? <><LoaderCircle className="spin" size={16}/> Uploading…</> : <><Upload size={16}/> Upload memory</>}</button>
      </form>
    </section>}

    {memories.length ? <div className="memory-grid">{memories.map(m => <article className="memory-card" key={m._id}>
      <button className="memory-image" onClick={() => window.open(m.imageUrl, "_blank")} title="Open full image"><img src={m.imageUrl} alt={m.title || "Family memory"} loading="lazy"/></button>
      <div className="memory-copy"><div><h3>{m.title || "Untitled memory"}</h3>{m.caption && <p>{m.caption}</p>}<small className="muted">Added by {m.uploadedBy?.name || "Family member"} · {new Date(m.createdAt).toLocaleDateString()}</small></div>{role !== "VIEWER" && <button className="icon-btn danger-icon" onClick={() => remove(m._id)} title="Delete"><Trash2 size={16}/></button>}</div>
    </article>)}</div> : <div className="empty-state"><ImagePlus size={30}/><h3>No memories yet.</h3><p>Upload your first family photo and start building the archive.</p></div>}
  </div>;
}
