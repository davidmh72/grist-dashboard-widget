import React, { useState, useEffect } from 'react';

// --- CONFIGURATION ---
const WIDGET_VERSION = "v2.7-menu-fix-2";

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

// --- NAVIGATION HANDLER ---
const handleNavigate = (url) => {
  if (!url) return;
  const isSameOrigin = window.top.location.origin === window.location.origin;

  if (isSameOrigin) {
    try {
      window.top.history.pushState(null, '', url);
      window.top.dispatchEvent(new PopStateEvent('popstate'));
      return;
    } catch (e) {
      console.warn("Instant navigation failed, falling back to full reload.", e);
    }
  }
  window.top.location.href = url;
};

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

    grist.ready({
      columns: ['X', 'Y', 'W', 'H', 'Label', 'Link', 'Color', 'Type', 'Pages'],
      requiredAccess: 'full'
    });

    grist.onRecords((records) => {
      console.log("Received records from Grist:", records);
      if (!records || records.length === 0) {
        setStatus("No configuration found. Please link to the SysDashboard_Config table.");
        setItems([]);
        return;
      }
      const mappedData = records.map(rec => ({
        id: rec.id,
        x: (Math.round(Number(rec.X)) || 0) + 1,
        y: (Math.round(Number(rec.Y)) || 0) + 1,
        w: Math.round(Number(rec.W)) || 2,
        h: Math.round(Number(rec.H)) || 1,
        label: rec.Label || '',
        link: rec.Link || '',
        color: rec.Color || 'var(--color-cell-fg, #3d3d3d)',
        bgColor: rec.Color ? 'rgba(255,255,255,0.05)' : 'var(--color-cell-bg, white)',
        type: rec.Type,
        pages: rec.Pages,
      }));
      setItems(mappedData);
      setStatus(null);
    });
  }, [grist]);

  if (status) {
    return <div className="status-message">{status}</div>;
  }

  return (
    <div className="dashboard-canvas">
      {items.map(item => (
        <Element key={item.id} item={item} />
      ))}
    </div>
  );
}

// --- ELEMENT DISPATCHER ---
function Element({ item }) {
  if (item.type === 'Menu') {
    return <MenuElement item={item} />;
  }
  return <DefaultElement item={item} />;
}

// --- MENU ELEMENT ---
function MenuElement({ item }) {
  // A list of records from a formula arrives as ["L", record1, record2, ...].
  // This code correctly extracts just the records.
  let pageRecords = [];
  if (Array.isArray(item.pages) && item.pages[0] === 'L') {
    pageRecords = item.pages.slice(1);
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: `${item.x * 20}px`,
        top: `${item.y * 20}px`,
        width: `${item.w * 20}px`,
        height: `${item.h * 20}px`,
        border: '1px solid #ddd',
        background: item.bgColor,
        boxSizing: 'border-box',
        padding: '5px',
        overflowY: 'auto',
      }}
    >
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {pageRecords.map(page => {
          // The page name is stored in the 'page_name' field.
          const pageName = page.fields.page_name || 'Untitled Page';
          return (
            <li key={page.id} style={{ marginBottom: '5px' }}>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  const internalLink = `#p=${page.id}`;
                  handleNavigate(internalLink);
                }}
                style={{ textDecoration: 'none', color: item.color, fontSize: '12px', cursor: 'pointer' }}
              >
                {pageName}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// --- DEFAULT ELEMENT ---
function DefaultElement({ item }) {
  return (
    <a
      href={item.link || '#'}
      onClick={(e) => {
        e.preventDefault();
        handleNavigate(item.link);
      }}
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
        cursor: 'pointer',
      }}>
      {item.label}
    </a>
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