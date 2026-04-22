import { useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000";

function App() {
  const [notes, setNotes] = useState([]);
  const [form, setForm] = useState({ title: "", content: "" });

  const fetchNotes = async () => {
    const res = await axios.get(`${API}/notes`);
    setNotes(res.data);
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await axios.post(`${API}/notes`, form);
    setForm({ title: "", content: "" });
    fetchNotes();
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Notes App (Postgres)</h2>

      <form onSubmit={handleSubmit}>
        <input
          placeholder="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <br />
        <textarea
          placeholder="Content"
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
        />
        <br />
        <button>Add Note</button>
      </form>

      <hr />

      {notes.map((n) => (
        <div key={n.id}>
          <h4>{n.title}</h4>
          <p>{n.content}</p>
        </div>
      ))}
    </div>
  );
}

export default App;