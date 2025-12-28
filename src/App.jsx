import React, { useState, useEffect, useRef } from 'react';

// --- CONFIGURATION ---
const WIDGET_VERSION = "v15.0 - Diagnostics & Dual Mode";

// --- LOGGING HELPER ---
const log = (msg, data = null) => {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
  const prefix = `[${WIDGET_VERSION} @ ${timestamp}]`;
  if (data) console.log(prefix, msg, data);
  else console.log(prefix, msg);
};

// --- ERROR BOUNDARY ---
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null, info: null }; }
  static getDerivedStateFromError(error) { return { hasError: true }; }
  componentDidCatch(error, info) { 
    this.setState({ error, info }); 
    log("CRITICAL CRASH IN RENDER", { error, info });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, background: '#ffe6e6', color: '#cc0000', border: '2px solid red', fontFamily: 'monospace' }}>
          <h3>⚠️ WIDGET CRASHED</h3>
          <p>{this.state.error?.toString()}</p>
          <pre>{this.state.info?.componentStack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- MAIN COMPONENT ---
function Dashboard() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("Initializing...");
  const [debugLog, setDebugLog] = useState([]); // Visual log for on-screen debugging
  const mountedRef = useRef(false);

  // Helper to update visual log
  const addDebug = (msg) => {
    setDebugLog(prev => [...prev, msg].slice(-5)); // Keep last 5 lines
  };

  // 1. INITIALIZATION & PARAMS
  const params = new URLSearchParams(window.location.search);
  const isJumpMode = params.get('mode') === 'jump';
  const grist = window.grist;

  // 2. NAVIGATION HANDLER
  const handleNavigate = (url) => {
    log("Attempting navigation to:", url);
    if (!url) return;
    
    // Check Origin
    const isSameOrigin = window.top.location.origin === window.location.origin;
    log(`Origin Check: Widget=${window.location.origin}, Top=${window.top.location.origin}, Match=${isSameOrigin}`);

    if (isSameOrigin) {
      try {
        log("⚡ Triggering History PushState");
        window.top.history.pushState(null, '', url);
        window.top.dispatchEvent(new PopStateEvent('popstate'));
        return;
      } catch (e) { 
        log("History API Failed (Security Block?)", e); 
      }
    } else {
      log("⚠️ Cross-Origin detected. Using standard reload.");
    }
    // Fallback
    window.top.location.href = url;
  };

  // 3. GRIST CONNECTION
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    log("Component Mounted. Checking Grist Object...");
    addDebug("Mounting...");

    if (!grist) {
      const err = "FATAL: 'window.grist' is undefined. Is the script loaded?";
      setStatus(err);
      log(err);
      return;
    }

    try {
      log("Calling grist.ready({ requiredAccess: 'full' })...");
      addDebug("Connecting to Grist...");
      
      grist.ready({
        columns: [
          { name: 'Label', title: 'Label', type: 'Text'},
          { name: 'Link', title: 'Link URL', type: 'Text'},
          { name: 'X', title: 'X Pos', type: 'Numeric', optional: true},
          { name: 'Y', title: 'Y Pos', type: 'Numeric', optional: true},
          { name: 'W', title: 'Width', type: 'Numeric', optional: true},
          { name: 'H', title: 'Height', type: 'Numeric', optional: true},
          { name: 'Color', title: 'Color', type: 'Text', optional: true}
        ],
        requiredAccess: 'full' // <--- MUST BE 'full' or 'read table'
      });

      grist.onRecords((records) => {
        log(`Records Received: ${records?.length || 0}`);
        addDebug(`Rx Records: ${records?.length || 0}`);

        if (!records || records.length === 0) {
          setStatus("Connected, but 0 records received.");
          setItems([]);
          return;
        }

        // --- JUMP MODE LOGIC ---
        if (isJumpMode) {
          log("Mode: JUMP. Processing first record...");
          const targetUrl = records[0].Link;
          
          if (targetUrl) {
            setStatus(`🚀 Jumping to: ${records[0].Label || 'Target'}...`);
            log(`Jumping to URL: ${targetUrl}`);
            setTimeout(() => handleNavigate(targetUrl), 100);
          } else {
            const err = "Error: Jump Mode active, but Record #1 has no Link.";
            setStatus(err);
            log(err);
          }
          return; 
        }

        // --- CANVAS MODE LOGIC ---
        log("Mode: CANVAS. Mapping data...");
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
        setStatus(null); // Clear status to show grid
        log("Data Mapped. Rendering Grid.");
      });

    } catch (err) {
      const msg = `Grist Init Error: ${err.message}`;
      setStatus(msg);
      log(msg);
      addDebug("Init Crash");
    }
  }, [isJumpMode]);

  // --- RENDER HELPERS ---

  // 1. VISUAL LOADING SCREEN (Prevents 'Invisible' White Screen)
  if (status) {
    return (
      <div style={{ padding: 20, fontFamily: 'sans-serif', borderTop: '4px solid orange' }}>
        <h3 style={{margin:0}}>Status: {status}</h3>
        <hr/>
        <div style={{ fontSize: '12px', color: '#666', background: '#f5f5f5', padding: 10, fontFamily: 'monospace' }}>
          <strong>Debug Log:</strong><br/>
          {debugLog.map((l, i) => <div key={i}>{l}</div>)}
          <br/>
          <strong>Version:</strong> {WIDGET_VERSION}<br/>
          <strong>Mode:</strong> {isJumpMode ? "JUMP (Tray)" : "CANVAS (Dashboard)"}
        </div>
      </div>
    );
  }

  // 2. MAIN GRID RENDER
  return (
    <div className="dashboard-container">
      <div className="grid-canvas">
        {items.map(item => (
          <div key={item.id} className="grid-item"
            style={{
              gridColumn: `${item.x} / span ${item.w}`,
              gridRow: `${item.y} / span ${item.h}`,
              backgroundColor: item.color
            }}
            onClick={() => {
                log(`Clicked: ${item.label}`);
                item.linkUrl && handleNavigate(item.linkUrl)
            }}
          >
             <div className="item-content">
                <span style={{fontWeight:600}}>{item.label}</span>
                {item.linkUrl && <span style={{fontSize:'0.8em', opacity:0.5, marginLeft:4}}> ↗</span>}
             </div>
          </div>
        ))}
      </div>
      
      {/* Floating Version Tag for Confidence */}
      <div style={{
        position:'fixed', bottom:5, right:5, 
        color: 'white', background: 'rgba(0,0,0,0.5)', 
        fontSize:10, padding: '2px 5px', pointerEvents:'none'
      }}>
        {WIDGET_VERSION}
      </div>

      <style>{`
        body { margin: 0; padding: 0; }
        .dashboard-container { padding: 10px; min-height: 100vh; background: #f0f2f5; box-sizing: border-box; }
        .grid-canvas { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); grid-auto-rows: 50px; gap: 10px; }
        .grid-item { background: white; border: 1px solid #ddd; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.1s; overflow: hidden; }
        .grid-item:hover { transform: translateY(-2px); box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-color: #999; }
        .item-content { padding: 5px; text-align: center; font-family: -apple-system, sans-serif; color: #333; word-break: break-word; }
      `}</style>
    </div>
  );
}

export default function App() {
  return <ErrorBoundary><Dashboard /></ErrorBoundary>;
}