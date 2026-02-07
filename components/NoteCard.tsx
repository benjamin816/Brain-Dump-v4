'use client';

import React from 'react';

export interface Note {
  id: number;
  content: string;
  tags: string[];
  timestamp: string;
}

interface NoteCardProps {
  note: Note;
  onDelete: (id: number) => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, onDelete }) => {
  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-6 flex flex-col justify-between h-full hover:shadow-blue-500/20 transition-shadow duration-300">
      <div>
        <p className="text-gray-300 whitespace-pre-wrap">{note.content}</p>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between items-center">
        <span className="text-xs text-gray-500">{new Date(note.timestamp).toLocaleString()}</span>
        <button 
          onClick={() => onDelete(note.id)}
          className="text-gray-500 hover:text-red-500 transition-colors"
          aria-label="Delete note"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default NoteCard;
