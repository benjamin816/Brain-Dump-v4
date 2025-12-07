'use client'; // This tells Next.js to run this code in the browser

import { useState, useEffect, useMemo } from 'react';

// Type definition for a single brain dump item (6 columns of data)
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


  // Filter the data based on the active tabs
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

    // Final sort (puts TODAY items first)
    return result.sort((a, b) => {
      if (a.timeBucket === 'today') return -1;
      if (b.timeBucket === 'today') return 1;
      if (a.timeBucket === 'this_week') return -1;
      if (b.timeBucket === 'this_week') return 1;
      return 0;
    });
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
      // Inside app/page.tsx, after the <h1>...</h1> tag
const GOOGLE_AUTH_URL = '/api/auth/google';

const CalendarConnect = () => (
  <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ffcc00', backgroundColor: '#fff9e6', borderRadius: '5px' }}>
    <h4>Calendar Status: **Not Connected**</h4>
    <p>To start adding events, you must securely connect your Google Calendar.</p>
    <a href={GOOGLE_AUTH_URL} style={{ 
      padding: '10px 15px', 
      backgroundColor: '#4285F4', 
      color: 'white', 
      textDecoration: 'none', 
      borderRadius: '5px',
      fontWeight: 'bold'
    }}>
      Sign in with Google
    </a>
  </div>
);

// Call this component inside your return:
return (
  <main style={{ maxWidth: 800, margin: '2rem auto', padding: '1rem' }}>
    <h1>🧠 Brain Dump Dashboard</h1>
    <CalendarConnect /> {/* <--- NEW LINE HERE! */}
    <p style={{ color: '#666', marginBottom: '20px' }}>
// ... rest of the page continues
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
        </>
      )}
    </main>
  );
}
