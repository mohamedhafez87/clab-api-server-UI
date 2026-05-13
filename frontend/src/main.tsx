import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  Boxes,
  FileCode2,
  HardDrive,
  KeyRound,
  Loader2,
  LogOut,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  Server,
  ShieldAlert,
  Square,
  TerminalSquare,
  Trash2
} from 'lucide-react';
import { ApiClient, ApiError, HealthResponse, LabMap, LabNode, MetricsResponse, RuntimeImagesResponse, TopologyEntry } from './api';
import { clearAuth, loadAuth, saveAuth } from './auth';
import './styles.css';

const defaultTopology = `{
  "name": "demo-lab",
  "topology": {
    "nodes": {
      "linux1": {
        "kind": "linux",
        "image": "ghcr.io/srl-labs/network-multitool"
      }
    }
  }
}`;

function App() {
  const initialAuth = loadAuth();
  const [token, setToken] = useState(initialAuth.token);
  const [username, setUsername] = useState(initialAuth.username);
  const api = useMemo(() => new ApiClient(token), [token]);

  const handleLogin = useCallback((nextUsername: string, nextToken: string) => {
    saveAuth(nextUsername, nextToken);
    setUsername(nextUsername);
    setToken(nextToken);
  }, []);

  const handleLogout = useCallback(() => {
    clearAuth();
    setUsername(null);
    setToken(null);
  }, []);

  if (!token || !username) {
    return <LoginView api={api} onLogin={handleLogin} />;
  }

  return <Workspace api={api} username={username} onLogout={handleLogout} />;
}

function LoginView({ api, onLogin }: { api: ApiClient; onLogin: (username: string, token: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [sessionDuration, setSessionDuration] = useState('24h');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await api.login(username, password, sessionDuration);
      onLogin(username, response.token);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-visual" aria-label="Containerlab API Server">
        <div className="network-plane">
          <span className="node node-a" />
          <span className="node node-b" />
          <span className="node node-c" />
          <span className="node node-d" />
          <span className="link link-ab" />
          <span className="link link-ac" />
          <span className="link link-bd" />
        </div>
        <div className="login-copy">
          <p className="eyebrow">Containerlab API Server</p>
          <h1>Operate network labs from one controlled surface.</h1>
          <p>Use your Linux account to manage lab lifecycle, topology files, runtime images, logs, and node actions.</p>
        </div>
      </section>
      <form className="login-panel" onSubmit={submit}>
        <KeyRound aria-hidden="true" />
        <h2>Sign in</h2>
        <label>
          Username
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
        </label>
        <label>
          Password
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required />
        </label>
        <label>
          Session
          <select value={sessionDuration} onChange={(event) => setSessionDuration(event.target.value)}>
            <option value="12h">12 hours</option>
            <option value="24h">24 hours</option>
            <option value="36h">36 hours</option>
            <option value="7d">7 days</option>
          </select>
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="primary" disabled={loading}>
          {loading ? <Loader2 className="spin" aria-hidden="true" /> : <KeyRound aria-hidden="true" />}
          Sign in
        </button>
      </form>
    </main>
  );
}

function Workspace({ api, username, onLogout }: { api: ApiClient; username: string; onLogout: () => void }) {
  const [labs, setLabs] = useState<LabMap>({});
  const [selectedLab, setSelectedLab] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [images, setImages] = useState<RuntimeImagesResponse | null>(null);
  const [topologyFiles, setTopologyFiles] = useState<TopologyEntry[]>([]);
  const [deployDraft, setDeployDraft] = useState(defaultTopology);
  const [topologyDraft, setTopologyDraft] = useState('');
  const [selectedTopology, setSelectedTopology] = useState<TopologyEntry | null>(null);
  const [logs, setLogs] = useState('');
  const [status, setStatus] = useState('Ready');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const labNames = Object.keys(labs).sort();
  const activeLab = selectedLab && labs[selectedLab] ? labs[selectedLab] : labNames[0] ? labs[labNames[0]] : [];
  const activeLabName = selectedLab && labs[selectedLab] ? selectedLab : labNames[0] || null;
  const activeNode = activeLab.find((node) => nodeName(node) === selectedNode) || activeLab[0] || null;

  const refresh = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [healthResult, labsResult, versionResult] = await Promise.allSettled([api.health(), api.labs(), api.version()]);
      if (healthResult.status === 'fulfilled') setHealth(healthResult.value);
      if (labsResult.status === 'fulfilled') {
        setLabs(labsResult.value);
        const names = Object.keys(labsResult.value);
        if (!activeLabName && names.length > 0) setSelectedLab(names[0]);
      }
      if (versionResult.status === 'fulfilled') {
        setStatus(firstLine(versionResult.value.versionInfo));
      }
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  }, [api, activeLabName]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function runAction(label: string, action: () => Promise<unknown>) {
    setError(null);
    setStatus(`${label}...`);
    try {
      await action();
      setStatus(`${label} complete`);
      await refresh();
    } catch (err) {
      setError(formatError(err));
      setStatus('Action failed');
    }
  }

  async function loadDetails() {
    setError(null);
    try {
      const [metricResult, imageResult, topologyResult] = await Promise.allSettled([api.metrics(), api.images(), api.topologyFiles()]);
      if (metricResult.status === 'fulfilled') setMetrics(metricResult.value);
      if (imageResult.status === 'fulfilled') setImages(imageResult.value);
      if (topologyResult.status === 'fulfilled') setTopologyFiles(topologyResult.value);
    } catch (err) {
      setError(formatError(err));
    }
  }

  async function loadTopology(entry: TopologyEntry) {
    setError(null);
    setSelectedTopology(entry);
    try {
      const content = await api.topologyFile(entry.labName, entry.yamlFileName);
      setTopologyDraft(content);
    } catch (err) {
      setError(formatError(err));
    }
  }

  async function saveTopology() {
    if (!selectedTopology) return;
    await runAction('Save topology', () => api.saveTopologyFile(selectedTopology.labName, selectedTopology.yamlFileName, topologyDraft));
  }

  async function loadLogs() {
    if (!activeLabName || !activeNode) return;
    setError(null);
    try {
      const result = await api.nodeLogs(activeLabName, nodeName(activeNode));
      setLogs(formatPayload(result));
    } catch (err) {
      setError(formatError(err));
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Boxes aria-hidden="true" />
          <span>clab-api</span>
        </div>
        <nav aria-label="Primary">
          <a href="#labs"><Server aria-hidden="true" /> Labs</a>
          <a href="#topology"><FileCode2 aria-hidden="true" /> Topology</a>
          <a href="#logs"><TerminalSquare aria-hidden="true" /> Logs</a>
          <a href="#runtime"><HardDrive aria-hidden="true" /> Runtime</a>
          <a href="#admin"><ShieldAlert aria-hidden="true" /> Protected</a>
        </nav>
        <button className="ghost logout" onClick={onLogout}><LogOut aria-hidden="true" /> Sign out</button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Signed in as {username}</p>
            <h1>Lab operations</h1>
          </div>
          <div className="topbar-actions">
            <StatusBadge label={health?.status || 'unknown'} />
            <button className="ghost" onClick={() => void loadDetails()}><Activity aria-hidden="true" /> Inspect</button>
            <button className="primary" onClick={() => void refresh()} disabled={loading}>
              {loading ? <Loader2 className="spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
              Refresh
            </button>
          </div>
        </header>

        {error ? <div className="notice error">{error}</div> : null}
        <div className="status-line">{status}</div>

        <section className="layout-grid" id="labs">
          <div className="lab-list" aria-label="Labs">
            <div className="section-heading">
              <h2>Labs</h2>
              <span>{labNames.length}</span>
            </div>
            {labNames.length === 0 ? <p className="muted">No labs returned for this account.</p> : null}
            {labNames.map((labName) => (
              <button
                key={labName}
                className={labName === activeLabName ? 'lab-row active' : 'lab-row'}
                onClick={() => {
                  setSelectedLab(labName);
                  setSelectedNode(null);
                }}
              >
                <span>{labName}</span>
                <small>{labs[labName]?.length || 0} nodes</small>
              </button>
            ))}
          </div>

          <div className="lab-detail">
            <div className="section-heading">
              <h2>{activeLabName || 'No lab selected'}</h2>
              <div className="button-row">
                <button disabled={!activeLabName} onClick={() => activeLabName && void runAction('Redeploy', () => api.redeployLab(activeLabName))}>
                  <RotateCcw aria-hidden="true" /> Redeploy
                </button>
                <button disabled={!activeLabName} onClick={() => activeLabName && void runAction('Save config', () => api.saveLabConfig(activeLabName))}>
                  <Save aria-hidden="true" /> Save
                </button>
                <button className="danger" disabled={!activeLabName} onClick={() => activeLabName && void runAction('Destroy', () => api.destroyLab(activeLabName))}>
                  <Trash2 aria-hidden="true" /> Destroy
                </button>
              </div>
            </div>
            <div className="node-table">
              <div className="node-table-head">
                <span>Node</span>
                <span>Kind</span>
                <span>State</span>
                <span>Address</span>
                <span>Actions</span>
              </div>
              {activeLab.map((node) => (
                <button key={nodeName(node)} className="node-row" onClick={() => setSelectedNode(nodeName(node))}>
                  <span>{nodeName(node)}</span>
                  <span>{node.kind || '-'}</span>
                  <span><StatusBadge label={node.state || node.status || 'unknown'} /></span>
                  <span>{node.ipv4_address || node.ipv6_address || '-'}</span>
                  <span className="button-row compact">
                    <IconAction label="Start" onClick={(event) => {
                      event.stopPropagation();
                      activeLabName && void runAction('Start node', () => api.nodeAction(activeLabName, nodeName(node), 'start'));
                    }} icon={<Play aria-hidden="true" />} />
                    <IconAction label="Stop" onClick={(event) => {
                      event.stopPropagation();
                      activeLabName && void runAction('Stop node', () => api.nodeAction(activeLabName, nodeName(node), 'stop'));
                    }} icon={<Square aria-hidden="true" />} />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="editor-region" id="topology">
          <div className="section-heading">
            <div>
              <h2>Topology files</h2>
              <p>Read and update editable YAML files exposed by the API.</p>
            </div>
            <div className="button-row">
              <select
                value={selectedTopology ? `${selectedTopology.labName}/${selectedTopology.yamlFileName}` : ''}
                onChange={(event) => {
                  const entry = topologyFiles.find((item) => `${item.labName}/${item.yamlFileName}` === event.target.value);
                  if (entry) void loadTopology(entry);
                }}
                aria-label="Topology file"
              >
                <option value="">Select topology</option>
                {topologyFiles.map((entry) => (
                  <option key={`${entry.labName}/${entry.yamlFileName}`} value={`${entry.labName}/${entry.yamlFileName}`}>
                    {entry.labName}/{entry.yamlFileName}
                  </option>
                ))}
              </select>
              <button disabled={!selectedTopology} onClick={() => void saveTopology()}><Save aria-hidden="true" /> Save YAML</button>
            </div>
          </div>
          <textarea value={topologyDraft} onChange={(event) => setTopologyDraft(event.target.value)} spellCheck={false} />
        </section>

        <section className="editor-region">
          <div className="section-heading">
            <div>
              <h2>Direct deploy</h2>
              <p>Use the existing JSON deploy endpoint for a new topology payload.</p>
            </div>
            <button className="primary" onClick={() => void runAction('Deploy', () => api.deploy(deployDraft))}>
              <Play aria-hidden="true" /> Deploy
            </button>
          </div>
          <textarea value={deployDraft} onChange={(event) => setDeployDraft(event.target.value)} spellCheck={false} />
        </section>

        <section className="split-region" id="logs">
          <div>
            <div className="section-heading">
              <h2>Node logs</h2>
              <button disabled={!activeNode} onClick={() => void loadLogs()}><TerminalSquare aria-hidden="true" /> Load</button>
            </div>
            <pre className="log-output">{logs || 'Select a node and load logs.'}</pre>
          </div>
          <div id="runtime">
            <div className="section-heading">
              <h2>Runtime</h2>
              <span>{images?.runtime || 'not loaded'}</span>
            </div>
            <dl className="metrics">
              <div><dt>Uptime</dt><dd>{health?.uptime || '-'}</dd></div>
              <div><dt>CPU</dt><dd>{metricPct(metrics?.metrics?.cpu?.usagePercent)}</dd></div>
              <div><dt>Memory</dt><dd>{metricPct(metrics?.metrics?.mem?.usagePercent)}</dd></div>
              <div><dt>Images</dt><dd>{images?.images.length ?? '-'}</dd></div>
              <div><dt>Topology files</dt><dd>{topologyFiles.length || '-'}</dd></div>
            </dl>
          </div>
        </section>

        <section className="protected-region" id="admin">
          <ShieldAlert aria-hidden="true" />
          <div>
            <h2>Protected operations</h2>
            <p>Exec, fcli, gotty, sshx, image deletion, cert tools, veth, vxlan, and netem controls stay out of the base shell until their panels can enforce deliberate confirmation and clear access boundaries.</p>
          </div>
        </section>
      </section>
    </main>
  );
}

function IconAction({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: React.MouseEventHandler<HTMLButtonElement> }) {
  return (
    <button className="icon" type="button" title={label} aria-label={label} onClick={onClick}>
      {icon}
    </button>
  );
}

function StatusBadge({ label }: { label: string }) {
  const normalized = label.toLowerCase();
  const tone = normalized.includes('running') || normalized.includes('healthy') ? 'good' : normalized.includes('fail') || normalized.includes('exited') ? 'bad' : 'idle';
  return <span className={`badge ${tone}`}>{label}</span>;
}

function nodeName(node: LabNode) {
  return node.nodeName || node.name || node.container_id || 'node';
}

function formatError(err: unknown) {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Unexpected error';
}

function formatPayload(payload: unknown) {
  if (typeof payload === 'string') return payload;
  return JSON.stringify(payload, null, 2);
}

function firstLine(value: string) {
  return value.split('\n').find(Boolean) || 'Ready';
}

function metricPct(value?: number) {
  return typeof value === 'number' ? `${value.toFixed(1)}%` : '-';
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
