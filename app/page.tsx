'use client'; // This tells Next.js to run this code in the browser

import { useState, useEffect, useMemo } from 'react';

// Type definition for a single brain dump item (6 columns of data)
import Chatbot from './Chatbot'; // <--- ADD THIS LINE

interface BrainDumpItem {
  text: string;
  itemType: string;
  timeBucket: string;
  category: string;
}

// Map of user-friendly tab names to their data filtering logic
const TABS = {
  'All Notes': (item: BrainDumpItem) => true,
  'Events': (item: BrainDumpItem) => item.itemType === 'event',
  'Tasks': (item: BrainDumpItem) => item.itemType === 'task',
  'Ideas / Info': (item: BrainDumpItem) => item.itemType === 'idea' || item.itemType === 'education' || item.itemType === 'important_info',
};

// Map of category tabs (same as your prompt)
const CATEGORY_TABS = [
  "personal", "work", "creative", "social_marketing", "health", "money",
  "food", "home", "travel", "learning", "admin", "wishlist"
];


export default function DashboardPage() {
  const [data, setData] = useState<BrainDumpItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('All Notes');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  // NOTE: You would add useState for calendar connection status here later

  // Function to fetch data from the new API route
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // IMPORTANT: Fetch from the new API route we created
        const response = await fetch('/api/read-sheet', { cache: 'no-store' }); 
        
        if (!response.ok) {
          // If the server returns an error code (400 or 500)
          const errText = await response.text();
          throw new Error(`Server Error: ${response.status} - ${errText}`);
        }
        
        const result = await response.json();
        // The data is now ready to be saved
        setData(result.data || []);
        setError(null);
      } catch (err: any) {
        console.error("Error loading dashboard data:", err);
        setError(`Could not load data. Details: ${err.message}`);
        setData([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);


  // Filter the data based on the active tabs AND apply dynamic sorting
  const filteredData = useMemo(() => {
    let result = data;

    // Filter by Main Tab (Events, Tasks, All)
    const filterFn = TABS[activeTab as keyof typeof TABS];
    if (filterFn) {
      result = result.filter(filterFn);
    }

    // Filter by Category Tab (if one is active)
    if (activeCategory) {
      result = result.filter(item => item.category === activeCategory);
    }
    
    // --- DYNAMIC SORTING LOGIC ---
    
    // Sort logic depends on the tab: Tasks/Events are sorted by urgency (soonest), others by recency (newest).
    if (activeTab === 'Tasks' || activeTab === 'Events') {
      // Sort by Urgency (Soonest TOP to Bottom)
      return result.sort((a, b) => {
        const timeA = a.timeBucket;
        const timeB = b.timeBucket;

        // Simple time bucket sort logic (today, this_week, upcoming, none)
        const urgencyOrder = ["today", "this_week", "upcoming", "none"];

        const isA_ISO = timeA.includes('-');
        const isB_ISO = timeB.includes('-');

        if (isA_ISO && !isB_ISO) return -1; 
        if (!isA_ISO && isB_ISO) return 1;  

        if (isA_ISO && isB_ISO) {
          // Both are ISO dates: compare the date strings directly (soonest is earlier in time)
          return timeA < timeB ? -1 : (timeA > timeB ? 1 : 0);
        } else {
          // Both are time buckets: sort by the defined urgency order
          return urgencyOrder.indexOf(timeA) - urgencyOrder.indexOf(timeB);
        }
      });

    } else {
      // All Notes / Ideas / Info: Sort by Recency (Newest TOP to Bottom)
      // Since new notes are appended to the main data array, reversing the filtered result works.
      return result.slice().reverse();
    }
    
    // --- END DYNAMIC SORTING LOGIC ---

  }, [data, activeTab, activeCategory]);


  // Component to display a single item
  const ItemCard = ({ item }: { item: BrainDumpItem }) => (
    <div style={{ border: '1px solid #ddd', padding: '10px', margin: '5px', borderRadius: '5px', backgroundColor: item.itemType === 'event' ? '#fffbe6' : '#f9f9f9' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{item.text}</div>
      <div style={{ fontSize: '0.8rem', color: '#666' }}>
        **Type:** {item.itemType} | **Time:** {item.timeBucket} | **Category:** <span style={{ fontWeight: 'bold', color: '#0070f3' }}>{item.category}</span>
      </div>
    </div>
  );

  return (
    <main style={{ maxWidth: 800, margin: '2rem auto', padding: '1rem' }}>
      <h1>🧠 Brain Dump Dashboard</h1>

      <p style={{ color: '#666', marginBottom: '20px' }}>
        This page uses your new smart agent data to categorize and display your notes.
      </p>

      {loading && <p>Loading data...</p>}
      {error && <p style={{ color: 'red', fontWeight: 'bold' }}>Error: {error}</p>}
      {!loading && !error && (
        <>
          {/* Main Tabs */}
          <div style={{ marginBottom: '15px', borderBottom: '1px solid #eee' }}>
            {Object.keys(TABS).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setActiveCategory(null); }}
                style={{ 
                  padding: '10px 15px', 
                  margin: '0 5px 10px 0', 
                  backgroundColor: activeTab === tab ? '#0070f3' : '#eee', 
                  color: activeTab === tab ? 'white' : 'black', 
                  border: 'none', 
                  borderRadius: '5px' 
                }}
              >
                {tab}
              </button>
            ))}
          </div>

{/* Category Tabs */}
          <div style={{ marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
            <h4>Filter by Category:</h4>
            {CATEGORY_TABS.map((cat) => (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setActiveTab('All Notes'); }}
                style={{ 
                  padding: '5px 10px', 
                  margin: '0 5px 5px 0', 
                  backgroundColor: activeCategory === cat ? '#00cc66' : '#f0f0f0', 
                  color: activeCategory === cat ? 'white' : 'black', 
                  border: 'none', 
                  borderRadius: '3px',
                  fontSize: '0.8em'
                }}
              >
                {cat.replace('_', ' ')}
              </button>
            ))}
          </div>

          <h2>{activeCategory ? `Category: ${activeCategory}` : activeTab} ({filteredData.length})</h2>
          
          {/* Data Display Area */}
          {filteredData.length > 0 ? (
            filteredData.map((item, index) => <ItemCard key={index} item={item} />)
          ) : (
            <p>No notes found in this view.</p>
          )}

          {/* ⬇️ ⬇️ ⬇️ ADD THE CHATBOT HERE! ⬇️ ⬇️ ⬇️ */}
          <Chatbot />
          {/* ⬆️ ⬆️ ⬆️ END OF CHATBOT ⬆️ ⬆️ ⬆️ */}
        </>
      )}
    </main>
  );
}
