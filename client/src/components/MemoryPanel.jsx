import React, { useState } from 'react';

export function MemoryPanel({ memories, onCreate, onDelete }) {
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [priority, setPriority] = useState(5);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!key.trim() || !value.trim()) {
      return;
    }

    await onCreate({ key: key.trim(), value: value.trim(), priority: Number(priority) });
    setKey('');
    setValue('');
    setPriority(5);
  }

  return (
    <section className="panel memory">
      <h2>Memory</h2>
      <form className="memory-form" onSubmit={handleSubmit}>
        <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="key" />
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="value"
          rows={2}
        />
        <input
          type="number"
          min={1}
          max={10}
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        />
        <button type="submit">Save Memory</button>
      </form>

      <div className="list">
        {memories.map((m) => (
          <div key={m.id} className="memory-item">
            <div>
              <strong>{m.key}</strong>
              <p>{m.value}</p>
              <small>Priority: {m.priority}</small>
            </div>
            <button onClick={() => onDelete(m.id)}>Delete</button>
          </div>
        ))}
      </div>
    </section>
  );
}
