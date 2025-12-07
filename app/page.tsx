'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';

// Type definition for a single brain dump item
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

// Map of category tabs
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

  // 1. Function to fetch data from the new API
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/read-sheet');
      if (!response.ok) {
        throw new Error('Failed to fetch data from sheet API');
      }
      const result = await response.json();
      setData(result.data || []);
      setError(null);
    } catch (err) {
      setError('Could not load data. Check server logs.');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Set a refresh interval (e.g., every 60 seconds)
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // 2. Filter the data based on the active tabs
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

    // Optional: Sort by time bucket to put 'today' first, then ISO dates
    return result.sort((a, b) => {
      if (a.timeBucket === 'today') return -1;
      if (b.timeBucket === 'today') return 1;
      return 0; // Don't try to sort ISO dates yet, that's complex
    });
  }, [data, activeTab, activeCategory]);

  // 3. Component to display a single item
  const ItemCard = ({ item }: { item: BrainDumpItem }) => (
    <div style={{ border: '1px solid #ccc', padding: '10px', margin: '5px', borderRadius: '5px', backgroundColor: '#f9f9f9' }}>
      <p>**Note:** {item.text}</p>
      <p>**Type:** {item.itemType} | **Time:** {item.timeBucket} | **Category:** <span style={{ fontWeight: 'bold', color: '#0070f3' }}>{item.category}</span></p>
    </div>
  );


  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🧠 Brain Dump Dashboard</h1>
      <p>This page shows all data from your Google Sheet, filtered by type and category.</p>

      {loading && <p>Loading data...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
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
                onClick={() => { setActiveCategory(cat); setActiveTab('All Notes'); }} // Switch to All Notes when filtering category
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
    </div>
  );
}
