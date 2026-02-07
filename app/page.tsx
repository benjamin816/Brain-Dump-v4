'use client';

import { useState } from 'react';
import NoteCard, { Note } from '@/components/NoteCard';

const initialNotes: Note[] = [
  { id: 1, content: 'Remember to buy milk and eggs.\nAlso, that new type of cheese.', tags: ['shopping'], timestamp: '2023-10-27T10:00:00Z' },
  { id: 2, content: 'Idea for a new app: A social network for pets. "Petwork".', tags: ['ideas', 'app'], timestamp: '2023-10-26T15:30:00Z' },
  { id: 3, content: 'The quick brown fox jumps over the lazy dog.', tags: [], timestamp: '2023-10-25T09:12:00Z' },
];


export default function Home() {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [newNoteContent, setNewNoteContent] = useState('');

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (newNoteContent.trim() === '') return;

    const newNote: Note = {
      id: Date.now(),
      content: newNoteContent,
      tags: [],
      timestamp: new Date().toISOString(),
    };

    setNotes([newNote, ...notes]);
    setNewNoteContent('');
  };

  const handleDeleteNote = (id: number) => {
    setNotes(notes.filter(note => note.id !== id));
  };

  return (
    <div className="space-y-12 pb-12">
      <section>
        <form onSubmit={handleAddNote} className="relative">
          <textarea
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full h-32 p-4 bg-gray-800 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all"
          />
          <button
            type="submit"
            className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!newNoteContent.trim()}
          >
            Capture
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-6">Your Thoughts</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notes.map(note => (
            <NoteCard key={note.id} note={note} onDelete={handleDeleteNote} />
          ))}
        </div>
        {notes.length === 0 && (
          <div className="text-center py-12 text-gray-500 bg-gray-800 rounded-lg">
            <p className="text-lg">No thoughts captured yet.</p>
            <p>Use the box above to get started!</p>
          </div>
        )}
      </section>
    </div>
  );
}
