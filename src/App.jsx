import React, { useState, useEffect } from 'react';

// --- CONFIGURATION ---
const WIDGET_VERSION = "v2.1-restored";

// --- INITIALIZATION ---
console.log(`Grist Canvas Widget ${WIDGET_VERSION} loaded.`);

// --- ERROR BOUNDARY ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    this.setState({ error, info });
  }
  render() {
    if (this.state.hasError) {
      return <div style={{ color: 'red', padding: 20 }}>CRASH: {this.state.error?.toString()}</div>;
    }
    return this.props.children;
  }
}

// --- MAIN COMPONENT ---
function Dashboard() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("Initializing...");
  const grist = window.grist;

  useEffect(() => {
    if (!grist) {
      setStatus("Error: Grist API not found.");
      return;
    }

    grist.ready();

    grist.onRecords((records) => {
      console.log("Received records from Grist:", records);

      if (!records || records.length === 0) {
        setStatus("No configuration found. Please link to the SysDashboard_Config table.");
        setItems([]);
        return;
      }

      // Restore the original data mapping logic.
      // This converts Grist columns into properties used for rendering.
      const mappedData = records.map(rec => ({
        id: rec.id,
        x: (Math.round(Number(rec.X)) || 0) + 1,
        y: (Math.round(Number(rec.Y)) || 0) + 1,
        w: Math.round(Number(rec.W)) || 2,
        h: Math.round(Number(rec.H)) || 1,
        label: rec.Label || '',
        link: rec.Link || '',
        color: rec.Color || 'var(--color-cell-fg, #3d3d3d)',
        bgColor: rec.Color ? 'rgba(255,255,255,0.05)' : 'var(--color-cell-bg, white)'
      }));

      setItems(mappedData);
      setStatus(null);
    });
  }, [grist]);

  if (status) {
    return <div className="status-message">{status}</div>;
  }

  // Restore the original rendering logic with <a> tags and grid-based positioning.
  return (
    <div className="dashboard-canvas">
      {items.map(item => (
        <a
          key={item.id}
          href={item.link || '#'}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            position: 'absolute',
            left: `${item.x * 20}px`,
            top: `${item.y * 20}px`,
            width: `${item.w * 20}px`,
            height: `${item.h * 20}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #ddd',
            textDecoration: 'none',
            color: item.color,
            background: item.bgColor,
            boxSizing: 'border-box',
            padding: '5px',
            fontSize: '12px',
            overflow: 'hidden',
        }}>
          {item.label}
        </a>
      ))}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  );
}

export default App;