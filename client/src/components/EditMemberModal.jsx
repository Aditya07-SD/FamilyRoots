import { useState } from "react";
import { api } from "../lib/api";

export function EditMemberModal({ member, onClose, onSaved }) {
  const [form, setForm] = useState({
    fullName: member.fullName || "", gender: member.gender || "unknown",
    dateOfBirth: member.dateOfBirth?.slice(0,10) || "", dateOfDeath: member.dateOfDeath?.slice(0,10) || "",
    occupation: member.occupation || "", location: member.location || "",
    phone: member.phone || "", email: member.email || "",
    biography: member.biography || "", notes: member.notes || ""
  });
  const [busy,setBusy]=useState(false);
  const change=e=>setForm({...form,[e.target.name]:e.target.value});
  async function save(e){e.preventDefault();setBusy(true);try{await api.put(`/members/${member._id}`,form);onSaved();onClose()}finally{setBusy(false)}}
  return <div className="modal-backdrop"><form className="modal" onSubmit={save}>
    <div className="modal-head"><h2>Edit member</h2><button type="button" className="icon-btn" onClick={onClose}>×</button></div>
    <label>Full name<input name="fullName" value={form.fullName} onChange={change} required/></label>
    <div className="two"><label>Gender<select name="gender" value={form.gender} onChange={change}><option value="unknown">Unknown</option><option value="female">Female</option><option value="male">Male</option><option value="nonbinary">Nonbinary</option></select></label><label>Occupation<input name="occupation" value={form.occupation} onChange={change}/></label></div>
    <div className="two"><label>Birth date<input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={change}/></label><label>Death date<input type="date" name="dateOfDeath" value={form.dateOfDeath} onChange={change}/></label></div>
    <div className="two"><label>Email<input name="email" value={form.email} onChange={change}/></label><label>Phone<input name="phone" value={form.phone} onChange={change}/></label></div>
    <label>Location<input name="location" value={form.location} onChange={change}/></label>
    <label>About<textarea name="biography" rows="4" value={form.biography} onChange={change}/></label>
    <label>Notes<textarea name="notes" rows="3" value={form.notes} onChange={change}/></label>
    <button className="primary" disabled={busy}>{busy?"Saving…":"Save changes"}</button>
  </form></div>
}
