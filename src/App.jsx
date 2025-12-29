import React, { useState, useEffect, useRef } from 'react';

// --- CONFIGURATION ---
const WIDGET_VERSION = "v18.0 - Instant Auto-Jump";
const MAGIC_STOP_WORD = "EDIT"; // Set the Label to this to prevent jumping

// --- ERROR BOUNDARY ---
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true }; }
  componentDidCatch(error, info) { this.setState({ error, info }); }
  render() {
    if (this.state.hasError) return <div style={{color:'red', padding:20}}>CRASH: {this.state.error?.toString()}</div>;
    return this.props.children;
  }
}

// --- MAIN COMPONENT ---
function Dashboard() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("Initializing...");
  const [editMode, setEditMode] = useState(false);
  const mountedRef = useRef(false);
  const grist = window.grist;

  // 1. INITIALIZATION
  const params = new URLSearchParams(window.location.search);
  const isJumpMode = params.get('mode') === 'jump';

  // 2. NAVIGATION HANDLER (Instant)
  const handleNavigate = (url) => {
    if (!url) return;
    const isSameOrigin = window.top.location.origin === window.location.origin;
    
    if (isSameOrigin) {
      try {
        // ⚡ INSTANT JUMP
        window.top.history.pushState(null, '', url);
        window.top.dispatchEvent(new PopStateEvent('popstate'));
        return;
      } catch (e) { console.warn("History API failed", e); }
    }
    window.top.location.href = url;
  };

  // 3. GRIST CONNECTION
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    if (!grist) { setStatus("Error: Grist API not found"); return; }

    // Announce that the widget is ready
    grist.ready();

    // Listen for records from the linked table
    grist.onRecords((records) => {
      if (!records || records.length === 0) {
        setStatus("No configuration found. Please link to the SysDashboard_Config table.");
        setItems([]);
        return;
      }
      setItems(records);
      setStatus(null); // Clear status once we have data

      // --- JUMP MODE LOGIC ---
      if (isJumpMode) {
        const targetUrl = records[0].Link;
        const targetLabel = records[0].Label || "Dashboard";

        // SAFETY CHECK: Is the label "EDIT"?
        if (targetLabel.toUpperCase() === MAGIC_STOP_WORD) {
            setEditMode(true);
            setStatus(null);
            return; // STOP HERE. Do not jump.
        }
        
        if (targetUrl) {
          setStatus(`🚀 Jumping to ${targetLabel}...`);
          // Execute immediately
          handleNavigate(targetUrl);
        } else {
          setStatus("Error: Record #1 has no Link.");
        }
        return; 
      }

      // --- CANVAS MODE LOGIC ---
      const mappedData = records.map(rec => ({
        id: rec.id,
        x: (Math.round(Number(rec.X)) || 0) + 1,
        y: (Math.round(Number(rec.Y)) || 0) + 1,
        w: Math.round(Number(rec.W)) || 2,
        h: Math.round(Number(rec.H)) || 1,
        label: rec.Label || "Untitled",
        linkUrl: rec.Link,
        color: rec.Color || '#ffffff'
      }));
      setItems(mappedData);
      setStatus(null);
    });
  }, [isJumpMode]);


  // --- RENDER JUMP MODE ---
  if (isJumpMode) {
    if (editMode) {
        return (
            <div style={{...containerStyle, background: '#fff3cd', color: '#856404'}}>
                <h3>⚠️ Edit Mode Active</h3>
                <p>The label is set to <strong>"{MAGIC_STOP_WORD}"</strong>.</p>
                <p>Change the label in the table back to "Dashboard" to re-enable auto-jump.</p>
                <div style={versionStyle}>{WIDGET_VERSION}</div>
            </div>
        );
    }
    // Show a clean loading screen while the jump triggers
    return (
        <div style={{...containerStyle, background: '#e6fffa', color: '#00695c'}}>
            <h3>🚀 Loading...</h3>
        </div>
    );
  }

  // --- RENDER CANVAS MODE ---
  if (status) {
    return <div className="status-message">{status}</div>;
  }

  return (
    <div className="dashboard-canvas">
      {items.map(item => (
        <div
          key={item.id}
          className="dashboard-item"
          style={{
            position: 'absolute',
            left: `${item.X}px`,
            top: `${item.Y}px`,
            width: `${item.W}px`,
            height: `${item.H}px`,
          }}
        >
          {item.Label}
        </div>
      ))}
    </div>
  );
}

function App() {
  return <ErrorBoundary><Dashboard /></ErrorBoundary>;
}

// STYLES
const containerStyle = { display: 'flex', flexDirection:'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif', textAlign:'center', padding:20, boxSizing: 'border-box' };
const versionStyle = { position:'fixed', bottom:5, right:5, color: '#aaa', fontSize:10 };

export default function App() {
  return <ErrorBoundary><Dashboard /></ErrorBoundary>;
}