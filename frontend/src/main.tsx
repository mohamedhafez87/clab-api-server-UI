import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  Boxes,
  Cable,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Code2,
  Database,
  FileCode2,
  Globe2,
  HardDrive,
  Image,
  KeyRound,
  Loader2,
  LogOut,
  Monitor,
  Network,
  Play,
  Plus,
  Radio,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Server,
  ShieldAlert,
  Square,
  TerminalSquare,
  Trash2,
  Upload,
  Users,
  Wrench,
  X
} from 'lucide-react';
import {
  ApiClient,
  ApiError,
  BrowserPortsResponse,
  CaptureTarget,
  HealthResponse,
  IconsResponse,
  InterfaceInfo,
  JsonValue,
  LabMap,
  LabNode,
  MetricsResponse,
  NodeInterfaces,
  RuntimeImagesResponse,
  SSHAccessResponse,
  SSHSession,
  TerminalSession,
  TopologyEntry,
  UserInfo,
  VersionResponse,
  WiresharkSession,
  routeCatalog
} from './api';
import { clearAuth, loadAuth, saveAuth } from './auth';
import './styles.css';

type ViewKey = 'dashboard' | 'labs' | 'topology' | 'access' | 'runtime' | 'capture' | 'tools' | 'users' | 'console';

type TopologyNodeDraft = {
  id: string;
  name: string;
  kind: string;
  image: string;
  type: string;
  group: string;
  startupConfig: string;
};

type TopologyLinkDraft = {
  id: string;
  aNode: string;
  aInterface: string;
  bNode: string;
  bInterface: string;
};

type TopologyDraft = {
  labName: string;
  fileName: string;
  managementNetwork: string;
  ipv4Subnet: string;
  nodes: TopologyNodeDraft[];
  links: TopologyLinkDraft[];
};

const defaultTopologyDraft: TopologyDraft = {
  labName: 'demo-lab',
  fileName: 'demo-lab.clab.yml',
  managementNetwork: 'clab',
  ipv4Subnet: '',
  nodes: [
    { id: 'node-1', name: 'linux1', kind: 'linux', image: 'ghcr.io/srl-labs/network-multitool:latest', type: '', group: '', startupConfig: '' }
  ],
  links: []
};

const viewItems: Array<{ key: ViewKey; label: string; icon: React.ReactNode }> = [
  { key: 'dashboard', label: 'Dashboard', icon: <Activity aria-hidden="true" /> },
  { key: 'labs', label: 'Labs', icon: <Server aria-hidden="true" /> },
  { key: 'topology', label: 'Topology', icon: <FileCode2 aria-hidden="true" /> },
  { key: 'access', label: 'Node Access', icon: <TerminalSquare aria-hidden="true" /> },
  { key: 'runtime', label: 'Runtime', icon: <HardDrive aria-hidden="true" /> },
  { key: 'capture', label: 'Capture', icon: <Monitor aria-hidden="true" /> },
  { key: 'tools', label: 'Tools', icon: <Wrench aria-hidden="true" /> },
  { key: 'users', label: 'Users', icon: <Users aria-hidden="true" /> }
];

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

  if (!token || !username) return <LoginView api={api} onLogin={handleLogin} />;
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
        <div className="network-plane" aria-hidden="true">
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
          <p>Use your Linux account to manage lab lifecycle, topology files, runtime images, logs, captures, and host tools.</p>
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
  const [view, setView] = useState<ViewKey>('dashboard');
  const [labs, setLabs] = useState<LabMap>({});
  const [selectedLab, setSelectedLab] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [version, setVersion] = useState<VersionResponse | null>(null);
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [images, setImages] = useState<RuntimeImagesResponse | null>(null);
  const [topologyFiles, setTopologyFiles] = useState<TopologyEntry[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [sshSessions, setSshSessions] = useState<SSHSession[]>([]);
  const [customNodesSummary, setCustomNodesSummary] = useState('not loaded');
  const [iconsSummary, setIconsSummary] = useState('not loaded');
  const [events, setEvents] = useState<string[]>([]);
  const [status, setStatus] = useState('Ready');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const labNames = Object.keys(labs).sort();
  const activeLabName = selectedLab && labs[selectedLab] ? selectedLab : labNames[0] || null;
  const activeLab = activeLabName ? labs[activeLabName] || [] : [];
  const activeNode = activeLab.find((node) => nodeName(node) === selectedNode) || activeLab[0] || null;

  const guarded = useCallback((next: ConfirmState) => setConfirm(next), []);

  const refreshCore = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [healthResult, labsResult, versionResult] = await Promise.allSettled([api.health(), api.labs(), api.version()]);
      if (healthResult.status === 'fulfilled') setHealth(healthResult.value);
      if (labsResult.status === 'fulfilled') {
        setLabs(labsResult.value);
        const names = Object.keys(labsResult.value).sort();
        if (!activeLabName && names[0]) setSelectedLab(names[0]);
      } else {
        setError(formatError(labsResult.reason));
      }
      if (versionResult.status === 'fulfilled') {
        setVersion(versionResult.value);
        setStatus(firstLine(versionResult.value.versionInfo));
      }
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  }, [api, activeLabName]);

  const refreshDetails = useCallback(async () => {
    setError(null);
    const [metricsResult, imagesResult, topologyResult, usersResult, sshResult] = await Promise.allSettled([
      api.metrics(),
      api.images(),
      api.topologyFiles(),
      api.users(),
      api.sshSessions()
    ]);
    if (metricsResult.status === 'fulfilled') setMetrics(metricsResult.value);
    if (imagesResult.status === 'fulfilled') setImages(imagesResult.value);
    if (topologyResult.status === 'fulfilled') setTopologyFiles(topologyResult.value);
    if (usersResult.status === 'fulfilled') setUsers(asArray<UserInfo>(usersResult.value));
    if (sshResult.status === 'fulfilled') setSshSessions(asArray<SSHSession>(sshResult.value));
    const failures = [metricsResult, imagesResult, topologyResult, usersResult, sshResult].filter((result) => result.status === 'rejected');
    if (failures.length > 0) setStatus(`${failures.length} detail request(s) need higher privileges or failed`);
  }, [api]);

  useEffect(() => {
    void refreshCore();
  }, [refreshCore]);

  useEffect(() => {
    const controller = new AbortController();
    async function stream() {
      try {
        const response = await fetch(api.eventsUrl({ initialState: 'true', interfaceStats: 'false' }), {
          headers: authHeader(),
          credentials: 'same-origin',
          signal: controller.signal
        });
        if (!response.body) return;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (!controller.signal.aborted) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          const nextLines = lines.map((line) => line.trim()).filter(Boolean);
          if (nextLines.length > 0) {
            setEvents((current) => [...nextLines, ...current].slice(0, 80));
          }
        }
      } catch {
        if (!controller.signal.aborted) setEvents((current) => ['Events stream unavailable', ...current].slice(0, 80));
      }
    }
    void stream();
    return () => controller.abort();
  }, [api]);

  async function runAction(label: string, action: () => Promise<unknown>, refresh = true) {
    setError(null);
    setStatus(`${label}...`);
    try {
      const result = await action();
      setStatus(`${label} complete`);
      if (result !== undefined) setEvents((current) => [formatPayload(result).slice(0, 800), ...current].slice(0, 80));
      if (refresh) {
        await refreshCore();
        await refreshDetails();
      }
    } catch (err) {
      setError(formatError(err));
      setStatus(`${label} failed`);
    }
  }

  function authHeader(): Record<string, string> {
    const loaded = loadAuth();
    return loaded.token ? { Authorization: `Bearer ${loaded.token}` } : {};
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Boxes aria-hidden="true" />
          <span>clab-api</span>
        </div>
        <nav aria-label="Primary">
          {viewItems.map((item) => (
            <button key={item.key} className={view === item.key ? 'nav-item active' : 'nav-item'} onClick={() => setView(item.key)}>
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
        <button className="ghost logout" onClick={onLogout}>
          <LogOut aria-hidden="true" />
          Sign out
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Signed in as {username}</p>
            <h1>{viewItems.find((item) => item.key === view)?.label}</h1>
          </div>
          <div className="topbar-actions">
            <StatusBadge label={health?.status || 'unknown'} />
            <button className="ghost" onClick={() => void refreshDetails()}>
              <Activity aria-hidden="true" />
              Inspect
            </button>
            <button className="primary" onClick={() => void refreshCore()} disabled={loading}>
              {loading ? <Loader2 className="spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
              Refresh
            </button>
          </div>
        </header>

        {error ? <Notice tone="error" text={error} onDismiss={() => setError(null)} /> : null}
        <div className="status-line">{status}</div>

        {view === 'dashboard' ? (
          <DashboardView
            api={api}
            health={health}
            metrics={metrics}
            images={images}
            version={version}
            labs={labs}
            topologyFiles={topologyFiles}
            users={users}
            sshSessions={sshSessions}
            events={events}
            onRefreshDetails={refreshDetails}
            runAction={runAction}
          />
        ) : null}
        {view === 'labs' ? (
          <LabsView api={api} labs={labs} activeLabName={activeLabName} activeNode={activeNode} selectedNode={selectedNode} setSelectedLab={setSelectedLab} setSelectedNode={setSelectedNode} runAction={runAction} guarded={guarded} />
        ) : null}
        {view === 'topology' ? <TopologyView api={api} activeLabName={activeLabName} topologyFiles={topologyFiles} runAction={runAction} guarded={guarded} /> : null}
        {view === 'access' ? <AccessView api={api} activeLabName={activeLabName} activeNode={activeNode} runAction={runAction} guarded={guarded} /> : null}
        {view === 'runtime' ? <RuntimeView api={api} images={images} runAction={runAction} guarded={guarded} /> : null}
        {view === 'capture' ? <CaptureView api={api} activeLabName={activeLabName} activeNode={activeNode} runAction={runAction} guarded={guarded} /> : null}
        {view === 'tools' ? (
          <ToolsView api={api} activeNode={activeNode} runAction={runAction} guarded={guarded} customNodesSummary={customNodesSummary} setCustomNodesSummary={setCustomNodesSummary} iconsSummary={iconsSummary} setIconsSummary={setIconsSummary} />
        ) : null}
        {view === 'users' ? <UsersView api={api} users={users} runAction={runAction} guarded={guarded} currentUsername={username} /> : null}
        {view === 'console' ? <ApiConsole api={api} activeLabName={activeLabName} activeNodeName={activeNode ? nodeName(activeNode) : ''} guarded={guarded} /> : null}
      </section>

      <ConfirmDialog confirm={confirm} setConfirm={setConfirm} />
    </main>
  );
}

function DashboardView({
  api,
  health,
  metrics,
  images,
  version,
  labs,
  topologyFiles,
  users,
  sshSessions,
  events,
  onRefreshDetails,
  runAction
}: {
  api: ApiClient;
  health: HealthResponse | null;
  metrics: MetricsResponse | null;
  images: RuntimeImagesResponse | null;
  version: VersionResponse | null;
  labs: LabMap;
  topologyFiles: TopologyEntry[];
  users: UserInfo[];
  sshSessions: SSHSession[];
  events: string[];
  onRefreshDetails: () => Promise<void>;
  runAction: (label: string, action: () => Promise<unknown>, refresh?: boolean) => Promise<void>;
}) {
  return (
    <div className="view-stack">
      <section className="metric-grid">
        <MetricTile label="Health" value={health?.status || 'unknown'} detail={health?.uptime || '-'} />
        <MetricTile label="Labs" value={String(Object.keys(labs).length)} detail={`${Object.values(labs).flat().length} nodes`} />
        <MetricTile label="Images" value={String(images?.images.length ?? '-')} detail={images?.runtime || 'runtime'} />
        <MetricTile label="Topology files" value={String(topologyFiles.length || '-')} detail="editable sources" />
        <MetricTile label="Users" value={String(users.length || '-')} detail="visible accounts" />
        <MetricTile label="SSH sessions" value={String(sshSessions.length || '-')} detail="active grants" />
      </section>

      <section className="split-region">
        <Panel title="System" icon={<Activity aria-hidden="true" />} actions={<button onClick={() => void onRefreshDetails()}><RefreshCw aria-hidden="true" />Load details</button>}>
          <dl className="metrics">
            <div><dt>API version</dt><dd>{health?.version || metrics?.serverInfo.version || '-'}</dd></div>
            <div><dt>Containerlab</dt><dd>{version ? firstLine(version.versionInfo) : '-'}</dd></div>
            <div><dt>CPU</dt><dd>{metricPct(metrics?.metrics?.cpu?.usagePercent)}</dd></div>
            <div><dt>Memory</dt><dd>{metricPct(metrics?.metrics?.mem?.usagePercent)}</dd></div>
            <div><dt>Disk</dt><dd>{metricPct(metrics?.metrics?.disk?.usagePercent)}</dd></div>
          </dl>
          <div className="button-row">
            <button onClick={() => void runAction('Version check', () => api.versionCheck(), false)}><Search aria-hidden="true" />Check updates</button>
            <a className="button-like" href="/swagger/index.html" target="_blank" rel="noreferrer"><Globe2 aria-hidden="true" />Swagger</a>
            <a className="button-like" href="/redoc" target="_blank" rel="noreferrer"><Globe2 aria-hidden="true" />ReDoc</a>
          </div>
        </Panel>
        <Panel title="Recent events" icon={<Radio aria-hidden="true" />}>
          <EventList events={events} />
        </Panel>
      </section>
    </div>
  );
}

function LabsView({
  api,
  labs,
  activeLabName,
  activeNode,
  selectedNode,
  setSelectedLab,
  setSelectedNode,
  runAction,
  guarded
}: {
  api: ApiClient;
  labs: LabMap;
  activeLabName: string | null;
  activeNode: LabNode | null;
  selectedNode: string | null;
  setSelectedLab: (name: string) => void;
  setSelectedNode: (name: string | null) => void;
  runAction: (label: string, action: () => Promise<unknown>, refresh?: boolean) => Promise<void>;
  guarded: (confirm: ConfirmState) => void;
}) {
  const [url, setUrl] = useState('');
  const [interfaces, setInterfaces] = useState<NodeInterfaces[]>([]);
  const labNames = Object.keys(labs).sort();
  const nodes = activeLabName ? labs[activeLabName] || [] : [];

  return (
    <div className="view-stack">
      <section className="layout-grid">
        <Panel title="Labs" icon={<Server aria-hidden="true" />}>
          <div className="lab-list" aria-label="Labs">
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
        </Panel>

        <Panel
          title={activeLabName || 'No lab selected'}
          icon={<Network aria-hidden="true" />}
          actions={
            <div className="button-row">
              <button disabled={!activeLabName} onClick={() => activeLabName && void runAction('Start lab', () => api.labAction(activeLabName, 'start'))}><Play aria-hidden="true" />Start</button>
              <button disabled={!activeLabName} onClick={() => activeLabName && void runAction('Stop lab', () => api.labAction(activeLabName, 'stop'))}><Square aria-hidden="true" />Stop</button>
              <button disabled={!activeLabName} onClick={() => activeLabName && void runAction('Restart lab', () => api.labAction(activeLabName, 'restart'))}><RotateCcw aria-hidden="true" />Restart</button>
              <button disabled={!activeLabName} onClick={() => activeLabName && void runAction('Save config', () => api.saveLabConfig(activeLabName))}><Save aria-hidden="true" />Save</button>
              <button
                className="danger"
                disabled={!activeLabName}
                onClick={() => activeLabName && guarded({
                  title: `Destroy ${activeLabName}`,
                  detail: 'This removes the lab and can clean up lab artifacts.',
                  payload: { cleanup: true, purge: false },
                  action: () => runAction('Destroy lab', () => api.destroyLab(activeLabName, true, false))
                })}
              >
                <Trash2 aria-hidden="true" />Destroy
              </button>
            </div>
          }
        >
          <div className="node-table">
            <div className="node-table-head">
              <span>Node</span>
              <span>Kind</span>
              <span>State</span>
              <span>Address</span>
              <span>Actions</span>
            </div>
            {nodes.map((node) => (
              <button key={nodeName(node)} className={nodeName(node) === selectedNode ? 'node-row active' : 'node-row'} onClick={() => setSelectedNode(nodeName(node))}>
                <span>{nodeName(node)}</span>
                <span>{node.kind || '-'}</span>
                <span><StatusBadge label={node.state || node.status || 'unknown'} /></span>
                <span>{node.ipv4_address || node.ipv6_address || '-'}</span>
                <span className="button-row compact">
                  {(['start', 'stop', 'restart', 'pause', 'unpause'] as const).map((action) => (
                    <IconAction key={action} label={action} onClick={(event) => {
                      event.stopPropagation();
                      activeLabName && void runAction(`${action} node`, () => api.nodeAction(activeLabName, nodeName(node), action));
                    }} icon={action === 'start' ? <Play aria-hidden="true" /> : action === 'restart' ? <RotateCcw aria-hidden="true" /> : <Square aria-hidden="true" />} />
                  ))}
                </span>
              </button>
            ))}
          </div>
        </Panel>
      </section>

      <section className="split-region">
        <Panel title="Create from source" icon={<Upload aria-hidden="true" />}>
          <p className="muted">Use Topology to design a lab visually, or import an existing topology source here.</p>
          <div className="inline-form">
            <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Topology source URL" />
            <button disabled={!url} onClick={() => void runAction('Deploy from URL', () => api.deployFromUrl(url))}><Globe2 aria-hidden="true" />Deploy URL</button>
          </div>
        </Panel>

        <Panel
          title="Interfaces"
          icon={<Cable aria-hidden="true" />}
          actions={<button disabled={!activeLabName} onClick={() => activeLabName && void runPanelAction(() => api.labInterfaces(activeLabName), setInterfaces)}><Search aria-hidden="true" />Inspect</button>}
        >
          <pre className="log-output compact">{interfaces.length ? formatPayload(interfaces) : activeNode ? `Selected node: ${nodeName(activeNode)}` : 'Select a lab and inspect interfaces.'}</pre>
        </Panel>
      </section>
    </div>
  );
}

function TopologyView({ api, activeLabName, topologyFiles, runAction, guarded }: { api: ApiClient; activeLabName: string | null; topologyFiles: TopologyEntry[]; runAction: (label: string, action: () => Promise<unknown>, refresh?: boolean) => Promise<void>; guarded: (confirm: ConfirmState) => void }) {
  const [selectedTopology, setSelectedTopology] = useState<TopologyEntry | null>(null);
  const [draft, setDraft] = useState<TopologyDraft>(() => activeLabName ? { ...defaultTopologyDraft, labName: activeLabName, fileName: `${activeLabName}.clab.yml` } : defaultTopologyDraft);
  const [importUrl, setImportUrl] = useState('');
  const [renameTo, setRenameTo] = useState('');
  const [notice, setNotice] = useState('Topology designer is ready.');
  const [clos, setClos] = useState({ name: 'clos-demo', spines: 2, leaves: 4, kind: 'nokia_srlinux', type: 'ixrd3', image: 'ghcr.io/nokia/srlinux:latest', deploy: false });

  async function loadTopology(entry: TopologyEntry) {
    setSelectedTopology(entry);
    await api.topologyFile(entry.labName, entry.yamlFileName);
    setDraft((current) => ({ ...current, labName: entry.labName, fileName: entry.yamlFileName }));
    setNotice(`${entry.labName}/${entry.yamlFileName} loaded for file actions. Visual editing starts from the designer state.`);
  }

  function updateDraft(next: Partial<TopologyDraft>) {
    setDraft((current) => {
      const merged = { ...current, ...next };
      if (next.labName && (!next.fileName || current.fileName === `${current.labName}.clab.yml`)) {
        merged.fileName = `${next.labName}.clab.yml`;
      }
      return merged;
    });
  }

  function updateNode(id: string, next: Partial<TopologyNodeDraft>) {
    setDraft((current) => ({ ...current, nodes: current.nodes.map((node) => node.id === id ? { ...node, ...next } : node) }));
  }

  function updateLink(id: string, next: Partial<TopologyLinkDraft>) {
    setDraft((current) => ({ ...current, links: current.links.map((link) => link.id === id ? { ...link, ...next } : link) }));
  }

  function addNode() {
    setDraft((current) => {
      const nextIndex = current.nodes.length + 1;
      return {
        ...current,
        nodes: [...current.nodes, { id: newId('node'), name: `node${nextIndex}`, kind: 'linux', image: 'ghcr.io/srl-labs/network-multitool:latest', type: '', group: '', startupConfig: '' }]
      };
    });
  }

  function removeNode(id: string) {
    setDraft((current) => {
      const removed = current.nodes.find((node) => node.id === id);
      return {
        ...current,
        nodes: current.nodes.filter((node) => node.id !== id),
        links: removed ? current.links.filter((link) => link.aNode !== removed.name && link.bNode !== removed.name) : current.links
      };
    });
  }

  function addLink() {
    setDraft((current) => {
      const first = current.nodes[0]?.name || '';
      const second = current.nodes[1]?.name || first;
      return { ...current, links: [...current.links, { id: newId('link'), aNode: first, aInterface: `eth${current.links.length + 1}`, bNode: second, bInterface: `eth${current.links.length + 1}` }] };
    });
  }

  const yaml = buildTopologyYaml(draft);
  const canSave = draft.labName.trim() !== '' && draft.fileName.trim() !== '' && draft.nodes.some((node) => node.name.trim() && node.kind.trim());
  const selectedLab = selectedTopology?.labName || draft.labName || activeLabName;
  const selectedPath = selectedTopology?.yamlFileName || draft.fileName;

  return (
    <div className="view-stack">
      <section className="split-region wide-left">
        <Panel title="Topology library" icon={<FileCode2 aria-hidden="true" />}>
          <div className="topology-list">
            {topologyFiles.map((entry) => (
              <button key={`${entry.labName}/${entry.yamlFileName}`} className={selectedTopology === entry ? 'file-row active' : 'file-row'} onClick={() => void loadTopology(entry)}>
                <span>{entry.labName}/{entry.yamlFileName}</span>
                <StatusBadge label={entry.deploymentState || 'unknown'} />
              </button>
            ))}
          </div>
          <div className="inline-form">
            <input value={importUrl} onChange={(event) => setImportUrl(event.target.value)} placeholder="Import topology URL" />
            <button disabled={!importUrl} onClick={() => void runAction('Import topology', () => api.importTopologyFromUrl(importUrl))}><Globe2 aria-hidden="true" />Import</button>
          </div>
          <div className="inline-form">
            <input value={renameTo} onChange={(event) => setRenameTo(event.target.value)} placeholder="Rename selected file to" />
            <button disabled={!selectedLab || !selectedPath || !renameTo} onClick={() => selectedLab && selectedPath && void runAction('Rename topology file', () => api.renameTopologyFile(selectedLab, selectedPath, renameTo))}>Rename</button>
            <button
              className="danger"
              disabled={!selectedLab || !selectedPath}
              onClick={() => selectedLab && selectedPath && guarded({
                title: `Delete ${selectedPath}`,
                detail: 'This removes the topology file from the lab workspace.',
                payload: { labName: selectedLab, path: selectedPath },
                action: () => runAction('Delete topology file', () => api.deleteTopologyFile(selectedLab, selectedPath))
              })}
            >
              <Trash2 aria-hidden="true" />Delete
            </button>
          </div>
        </Panel>

        <Panel
          title="Topology designer"
          icon={<Network aria-hidden="true" />}
          actions={
            <div className="button-row">
              <button disabled={!canSave} onClick={() => void runAction('Save topology YAML', () => api.saveTopologyFile(draft.labName, draft.fileName, yaml))}><Save aria-hidden="true" />Save</button>
              <button disabled={!canSave} onClick={() => void runAction('Save running YAML', () => api.saveRunningYaml(draft.labName, yaml))}><Save aria-hidden="true" />Save running</button>
              <button disabled={!canSave} className="primary" onClick={() => void runAction('Save and deploy topology', async () => {
                await api.saveTopologyFile(draft.labName, draft.fileName, yaml);
                return api.deployTopologyFile(draft.labName, draft.fileName, { includeLogs: 'true' });
              })}><Play aria-hidden="true" />Save and deploy</button>
            </div>
          }
        >
          <div className="designer-grid">
            <label>Lab name<input value={draft.labName} onChange={(event) => updateDraft({ labName: sanitizeName(event.target.value) })} /></label>
            <label>Topology file<input value={draft.fileName} onChange={(event) => updateDraft({ fileName: event.target.value })} /></label>
            <label>Management network<input value={draft.managementNetwork} onChange={(event) => updateDraft({ managementNetwork: event.target.value })} /></label>
            <label>IPv4 subnet<input value={draft.ipv4Subnet} onChange={(event) => updateDraft({ ipv4Subnet: event.target.value })} placeholder="optional" /></label>
          </div>

          <div className="topology-canvas" aria-label="Topology preview">
            {draft.nodes.map((node, index) => (
              <div className="topology-node" key={node.id}>
                <Server aria-hidden="true" />
                <strong>{node.name || `node-${index + 1}`}</strong>
                <span>{node.kind}</span>
              </div>
            ))}
            {draft.links.map((link) => (
              <div className="topology-link-chip" key={link.id}>{link.aNode}:{link.aInterface} - {link.bNode}:{link.bInterface}</div>
            ))}
          </div>

          <div className="section-heading compact-heading">
            <h2><Server aria-hidden="true" />Nodes</h2>
            <button onClick={addNode}><Plus aria-hidden="true" />Add node</button>
          </div>
          <div className="data-table topology-node-table">
            <div className="data-head"><span>Name</span><span>Kind</span><span>Image</span><span>Type</span><span>Group</span><span></span></div>
            {draft.nodes.map((node) => (
              <div className="data-row" key={node.id}>
                <input value={node.name} onChange={(event) => updateNode(node.id, { name: sanitizeName(event.target.value) })} />
                <select value={node.kind} onChange={(event) => updateNode(node.id, { kind: event.target.value })}>
                  <option value="linux">linux</option>
                  <option value="nokia_srlinux">nokia_srlinux</option>
                  <option value="arista_ceos">arista_ceos</option>
                  <option value="cisco_xrd">cisco_xrd</option>
                </select>
                <input value={node.image} onChange={(event) => updateNode(node.id, { image: event.target.value })} />
                <input value={node.type} onChange={(event) => updateNode(node.id, { type: event.target.value })} placeholder="optional" />
                <input value={node.group} onChange={(event) => updateNode(node.id, { group: event.target.value })} placeholder="optional" />
                <button className="danger icon" onClick={() => removeNode(node.id)}><Trash2 aria-hidden="true" /></button>
              </div>
            ))}
          </div>

          <div className="section-heading compact-heading">
            <h2><Cable aria-hidden="true" />Links</h2>
            <button disabled={draft.nodes.length < 2} onClick={addLink}><Plus aria-hidden="true" />Add link</button>
          </div>
          <div className="data-table topology-link-table">
            <div className="data-head"><span>Endpoint A</span><span>Interface</span><span>Endpoint B</span><span>Interface</span><span></span></div>
            {draft.links.map((link) => (
              <div className="data-row" key={link.id}>
                <select value={link.aNode} onChange={(event) => updateLink(link.id, { aNode: event.target.value })}>
                  {draft.nodes.map((node) => <option key={node.id} value={node.name}>{node.name}</option>)}
                </select>
                <input value={link.aInterface} onChange={(event) => updateLink(link.id, { aInterface: event.target.value })} />
                <select value={link.bNode} onChange={(event) => updateLink(link.id, { bNode: event.target.value })}>
                  {draft.nodes.map((node) => <option key={node.id} value={node.name}>{node.name}</option>)}
                </select>
                <input value={link.bInterface} onChange={(event) => updateLink(link.id, { bInterface: event.target.value })} />
                <button className="danger icon" onClick={() => setDraft((current) => ({ ...current, links: current.links.filter((item) => item.id !== link.id) }))}><Trash2 aria-hidden="true" /></button>
              </div>
            ))}
          </div>
          <p className="muted">{notice}</p>
        </Panel>
      </section>

      <Panel
        title="CLOS quick builder"
        icon={<Network aria-hidden="true" />}
        actions={<button className="primary" onClick={() => void runPanelAction(() => api.generateTopology(buildClosRequest(clos)), () => setNotice('CLOS request sent. If deploy is off, use the designer to save a topology file.'))}><Play aria-hidden="true" />Generate</button>}
      >
        <div className="designer-grid clos-grid">
          <label>Name<input value={clos.name} onChange={(event) => setClos({ ...clos, name: sanitizeName(event.target.value) })} /></label>
          <label>Spines<input type="number" min={1} value={clos.spines} onChange={(event) => setClos({ ...clos, spines: Number(event.target.value) })} /></label>
          <label>Leaves<input type="number" min={1} value={clos.leaves} onChange={(event) => setClos({ ...clos, leaves: Number(event.target.value) })} /></label>
          <label>Kind<input value={clos.kind} onChange={(event) => setClos({ ...clos, kind: event.target.value })} /></label>
          <label>Type<input value={clos.type} onChange={(event) => setClos({ ...clos, type: event.target.value })} /></label>
          <label>Image<input value={clos.image} onChange={(event) => setClos({ ...clos, image: event.target.value })} /></label>
          <label className="check-label"><input type="checkbox" checked={clos.deploy} onChange={(event) => setClos({ ...clos, deploy: event.target.checked })} />Deploy generated topology</label>
        </div>
      </Panel>
    </div>
  );
}

function AccessView({ api, activeLabName, activeNode, runAction, guarded }: { api: ApiClient; activeLabName: string | null; activeNode: LabNode | null; runAction: (label: string, action: () => Promise<unknown>, refresh?: boolean) => Promise<void>; guarded: (confirm: ConfirmState) => void }) {
  const [logs, setLogs] = useState('');
  const [tail, setTail] = useState(200);
  const [ssh, setSsh] = useState<SSHAccessResponse | null>(null);
  const [terminal, setTerminal] = useState<TerminalSession | null>(null);
  const [ports, setPorts] = useState<BrowserPortsResponse | null>(null);
  const node = activeNode ? nodeName(activeNode) : '';

  return (
    <div className="view-stack">
      <section className="split-region">
        <Panel
          title="Node logs"
          icon={<TerminalSquare aria-hidden="true" />}
          actions={<button disabled={!activeLabName || !node} onClick={() => activeLabName && node && void runPanelAction(() => api.nodeLogs(activeLabName, node, tail), (value) => setLogs(formatPayload(value)))}><Search aria-hidden="true" />Load logs</button>}
        >
          <div className="inline-form short">
            <label>Tail lines</label>
            <input type="number" value={tail} onChange={(event) => setTail(Number(event.target.value))} min={1} />
          </div>
          <pre className="log-output">{logs || 'Select a node and load logs.'}</pre>
        </Panel>

        <Panel title="Remote access" icon={<KeyRound aria-hidden="true" />}>
          <div className="button-row">
            <button disabled={!activeLabName || !node} onClick={() => activeLabName && node && void runPanelAction(() => api.requestSsh(activeLabName, node, { duration: '1h' }), setSsh)}><KeyRound aria-hidden="true" />Request SSH</button>
            <button disabled={!activeLabName || !node} onClick={() => activeLabName && node && void runPanelAction(() => api.createTerminal(activeLabName, node, { protocol: 'shell', cols: 120, rows: 32 }), setTerminal)}><TerminalSquare aria-hidden="true" />Create session</button>
            <button disabled={!activeLabName || !node} onClick={() => activeLabName && node && void runPanelAction(() => api.browserPorts(activeLabName, node), setPorts)}><Globe2 aria-hidden="true" />Browser ports</button>
          </div>
          {ssh ? (
            <dl className="metrics">
              <div><dt>Host</dt><dd>{ssh.host}</dd></div>
              <div><dt>Port</dt><dd>{ssh.port}</dd></div>
              <div><dt>User</dt><dd>{ssh.username}</dd></div>
              <div><dt>Expires</dt><dd>{ssh.expiration}</dd></div>
            </dl>
          ) : null}
          {terminal ? (
            <div className="session-line">
              <StatusBadge label={terminal.state} />
              <code>{terminal.sessionId}</code>
              <button className="danger" onClick={() => guarded({
                title: 'Terminate terminal session',
                detail: terminal.sessionId,
                payload: terminal,
                action: () => runAction('Terminate terminal', () => api.terminateTerminalSession(terminal.sessionId), false)
              })}><Trash2 aria-hidden="true" />Terminate</button>
            </div>
          ) : null}
          <pre className="log-output compact">{ports ? formatPayload(ports) : 'Browser-accessible ports appear here.'}</pre>
        </Panel>
      </section>
    </div>
  );
}

function RuntimeView({ api, images, runAction, guarded }: { api: ApiClient; images: RuntimeImagesResponse | null; runAction: (label: string, action: () => Promise<unknown>, refresh?: boolean) => Promise<void>; guarded: (confirm: ConfirmState) => void }) {
  const [imageRef, setImageRef] = useState('ghcr.io/srl-labs/network-multitool:latest');
  const [force, setForce] = useState(false);

  return (
    <div className="view-stack">
      <Panel
        title="Runtime images"
        icon={<Image aria-hidden="true" />}
        actions={
          <div className="inline-form">
            <input value={imageRef} onChange={(event) => setImageRef(event.target.value)} placeholder="image reference" />
            <button onClick={() => void runAction('Pull image', () => api.pullImage(imageRef))}><Upload aria-hidden="true" />Pull</button>
            <label className="check-label"><input type="checkbox" checked={force} onChange={(event) => setForce(event.target.checked)} />Force delete</label>
          </div>
        }
      >
        <div className="data-table images-table">
          <div className="data-head"><span>Tag</span><span>ID</span><span>Size</span><span>Created</span><span>Action</span></div>
          {(images?.images || []).map((item) => {
            const ref = item.repoTags?.[0] || item.repoDigests?.[0] || item.id;
            return (
              <div className="data-row" key={item.id}>
                <span>{ref}</span>
                <code>{item.shortId || item.id.slice(0, 18)}</code>
                <span>{item.size || '-'}</span>
                <span>{item.createdAt || '-'}</span>
                <button className="danger" onClick={() => guarded({
                  title: `Delete image`,
                  detail: ref,
                  payload: { reference: ref, force },
                  action: () => runAction('Delete image', () => api.deleteImage(ref, force))
                })}><Trash2 aria-hidden="true" />Delete</button>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function CaptureView({ api, activeLabName, activeNode, runAction, guarded }: { api: ApiClient; activeLabName: string | null; activeNode: LabNode | null; runAction: (label: string, action: () => Promise<unknown>, refresh?: boolean) => Promise<void>; guarded: (confirm: ConfirmState) => void }) {
  const [iface, setIface] = useState('eth1');
  const [remoteHost, setRemoteHost] = useState('');
  const [packetflix, setPacketflix] = useState('');
  const [sessions, setSessions] = useState<WiresharkSession[]>([]);
  const target = activeNode ? [{ containerName: activeNode.name || nodeName(activeNode), interfaceName: iface }] : [];

  return (
    <section className="split-region">
      <Panel title="Packetflix" icon={<Radio aria-hidden="true" />}>
        <div className="inline-form">
          <input value={iface} onChange={(event) => setIface(event.target.value)} placeholder="Interface" />
          <input value={remoteHost} onChange={(event) => setRemoteHost(event.target.value)} placeholder="Remote hostname" />
          <button disabled={!activeLabName || !activeNode} onClick={() => activeLabName && void runPanelAction(() => api.packetflix(activeLabName, target, remoteHost || undefined), (value) => setPacketflix(formatPayload(value)))}><Play aria-hidden="true" />Build</button>
        </div>
        <pre className="log-output">{packetflix || 'Packetflix capture links appear here.'}</pre>
      </Panel>

      <Panel title="Wireshark VNC" icon={<Monitor aria-hidden="true" />} actions={<button className="danger" onClick={() => guarded({ title: 'Delete all Wireshark sessions', detail: 'This closes every active capture VNC session.', action: () => runAction('Delete all VNC sessions', () => api.deleteAllWiresharkSessions(), false) })}><Trash2 aria-hidden="true" />Delete all</button>}>
        <div className="button-row">
          <button disabled={!activeLabName || !activeNode} onClick={() => activeLabName && void runPanelAction(() => api.wiresharkSessions(activeLabName, target), (value) => setSessions(value.sessions || []))}><Plus aria-hidden="true" />Create session</button>
        </div>
        <div className="data-table">
          <div className="data-head"><span>Session</span><span>Target</span><span>Expires</span><span>Action</span></div>
          {sessions.map((session) => (
            <div className="data-row" key={session.sessionId}>
              <code>{session.sessionId}</code>
              <span>{session.containerName}:{session.interfaceNames.join(',')}</span>
              <span>{session.expiresAt}</span>
              <span className="button-row compact">
                <button onClick={() => void runAction('Check VNC ready', () => api.wiresharkReady(session.sessionId), false)}>Ready</button>
                <a className="button-like" href={session.vncPath} target="_blank" rel="noreferrer">Open</a>
                <button className="danger" onClick={() => guarded({ title: 'Delete VNC session', detail: session.sessionId, payload: session, action: () => runAction('Delete VNC session', () => api.deleteWiresharkSession(session.sessionId), false) })}><Trash2 aria-hidden="true" /></button>
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </section>
  );
}

function ToolsView({
  api,
  activeNode,
  runAction,
  guarded,
  customNodesSummary,
  setCustomNodesSummary,
  iconsSummary,
  setIconsSummary
}: {
  api: ApiClient;
  activeNode: LabNode | null;
  runAction: (label: string, action: () => Promise<unknown>, refresh?: boolean) => Promise<void>;
  guarded: (confirm: ConfirmState) => void;
  customNodesSummary: string;
  setCustomNodesSummary: (value: string) => void;
  iconsSummary: string;
  setIconsSummary: (value: string) => void;
}) {
  const container = activeNode?.name || (activeNode ? nodeName(activeNode) : '');
  const [caName, setCaName] = useState('ca');
  const [caCommonName, setCaCommonName] = useState('containerlab.dev');
  const [certName, setCertName] = useState('node1');
  const [certHosts, setCertHosts] = useState('node1.local');
  const [certCa, setCertCa] = useState('ca');
  const [vethA, setVethA] = useState('clab-demo-a:eth1');
  const [vethB, setVethB] = useState('clab-demo-b:eth1');
  const [vethMtu, setVethMtu] = useState(1500);
  const [vxlanRemote, setVxlanRemote] = useState('10.0.0.20');
  const [vxlanLink, setVxlanLink] = useState('eth0');
  const [vxlanId, setVxlanId] = useState(100);
  const [netemContainer, setNetemContainer] = useState(container || 'clab-demo-node');
  const [netemInterface, setNetemInterface] = useState('eth1');
  const [netemDelay, setNetemDelay] = useState('50ms');
  const [netemLoss, setNetemLoss] = useState(0);
  const [toolOutput, setToolOutput] = useState('');

  const caRequest = { name: caName, commonName: caCommonName };
  const certRequest = { name: certName, hosts: certHosts.split(',').map((host) => host.trim()).filter(Boolean), caName: certCa };
  const vethRequest = { aEndpoint: vethA, bEndpoint: vethB, mtu: vethMtu };
  const vxlanRequest = { remote: vxlanRemote, link: vxlanLink, id: vxlanId };
  const netemRequest = { containerName: netemContainer, interface: netemInterface, delay: netemDelay, loss: netemLoss };

  return (
    <div className="view-stack">
      <section className="split-region">
        <Panel title="EdgeShark and UI assets" icon={<Wrench aria-hidden="true" />}>
          <div className="button-row">
            <button onClick={() => void runPanelAction(() => api.edgesharkStatus(), (value) => setToolOutput(formatPayload(value)))}>Status</button>
            <button onClick={() => void runAction('Install EdgeShark', () => api.edgeshark('install'), false)}><Upload aria-hidden="true" />Install</button>
            <button className="danger" onClick={() => guarded({ title: 'Uninstall EdgeShark', detail: 'This removes EdgeShark components.', action: () => runAction('Uninstall EdgeShark', () => api.edgeshark('uninstall'), false) })}><Trash2 aria-hidden="true" />Uninstall</button>
            <button onClick={() => void runPanelAction(() => api.customNodes(), (value) => setCustomNodesSummary(formatPayload(value)))}>Custom nodes</button>
            <button onClick={() => void runPanelAction(() => api.globalIcons(), (value) => setIconsSummary(formatPayload(value)))}>Global icons</button>
          </div>
          <pre className="log-output compact">{toolOutput || customNodesSummary || iconsSummary}</pre>
        </Panel>
        <Panel title="Host networking" icon={<Cable aria-hidden="true" />}>
          <div className="button-row">
            <button disabled={!container} onClick={() => void runAction('Disable TX offload', () => api.disableTxOffload(container), false)}>Disable TX offload</button>
            <button onClick={() => void runAction('Create veth', () => api.createVeth(vethRequest), false)}>Create veth</button>
            <button onClick={() => void runAction('Create VXLAN', () => api.vxlan('POST', vxlanRequest), false)}>Create VXLAN</button>
            <button className="danger" onClick={() => guarded({ title: 'Delete VXLAN', detail: `${vxlanLink} / ${vxlanId}`, payload: vxlanRequest, action: () => runAction('Delete VXLAN', () => api.vxlan('DELETE', vxlanRequest), false) })}>Delete VXLAN</button>
          </div>
          <div className="designer-grid">
            <label>Endpoint A<input value={vethA} onChange={(event) => setVethA(event.target.value)} /></label>
            <label>Endpoint B<input value={vethB} onChange={(event) => setVethB(event.target.value)} /></label>
            <label>MTU<input type="number" value={vethMtu} onChange={(event) => setVethMtu(Number(event.target.value))} /></label>
            <label>VXLAN remote<input value={vxlanRemote} onChange={(event) => setVxlanRemote(event.target.value)} /></label>
            <label>VXLAN link<input value={vxlanLink} onChange={(event) => setVxlanLink(event.target.value)} /></label>
            <label>VXLAN ID<input type="number" value={vxlanId} onChange={(event) => setVxlanId(Number(event.target.value))} /></label>
          </div>
        </Panel>
      </section>
      <section className="split-region">
        <Panel title="Certificates" icon={<KeyRound aria-hidden="true" />}>
          <div className="button-row">
            <button onClick={() => void runAction('Create CA', () => api.createCA(caRequest), false)}>Create CA</button>
            <button onClick={() => void runAction('Sign certificate', () => api.signCert(certRequest), false)}>Sign cert</button>
          </div>
          <div className="designer-grid">
            <label>CA name<input value={caName} onChange={(event) => setCaName(event.target.value)} /></label>
            <label>CA common name<input value={caCommonName} onChange={(event) => setCaCommonName(event.target.value)} /></label>
            <label>Certificate name<input value={certName} onChange={(event) => setCertName(event.target.value)} /></label>
            <label>SAN hosts<input value={certHosts} onChange={(event) => setCertHosts(event.target.value)} /></label>
            <label>Signing CA<input value={certCa} onChange={(event) => setCertCa(event.target.value)} /></label>
          </div>
        </Panel>
        <Panel title="Netem" icon={<Network aria-hidden="true" />}>
          <div className="button-row">
            <button onClick={() => void runPanelAction(() => api.setNetem(netemRequest), (value) => setToolOutput(formatPayload(value)))}>Set</button>
            <button onClick={() => void runPanelAction(() => api.showNetem(netemContainer), (value) => setToolOutput(formatPayload(value)))}>Show</button>
            <button className="danger" onClick={() => guarded({ title: 'Reset netem', detail: `${netemContainer} ${netemInterface}`, payload: netemRequest, action: () => runAction('Reset netem', () => api.resetNetem(netemRequest), false) })}>Reset</button>
          </div>
          <div className="designer-grid">
            <label>Container<input value={netemContainer} onChange={(event) => setNetemContainer(event.target.value)} /></label>
            <label>Interface<input value={netemInterface} onChange={(event) => setNetemInterface(event.target.value)} /></label>
            <label>Delay<input value={netemDelay} onChange={(event) => setNetemDelay(event.target.value)} /></label>
            <label>Loss %<input type="number" value={netemLoss} onChange={(event) => setNetemLoss(Number(event.target.value))} /></label>
          </div>
          <pre className="log-output compact">{toolOutput}</pre>
        </Panel>
      </section>
    </div>
  );
}

function UsersView({ api, users, runAction, guarded, currentUsername }: { api: ApiClient; users: UserInfo[]; runAction: (label: string, action: () => Promise<unknown>, refresh?: boolean) => Promise<void>; guarded: (confirm: ConfirmState) => void; currentUsername: string }) {
  const [selected, setSelected] = useState(currentUsername);
  const [newUsername, setNewUsername] = useState('operator');
  const [newPassword, setNewPassword] = useState('change-me');
  const [displayName, setDisplayName] = useState('');
  const [shell, setShell] = useState('/bin/bash');
  const [groups, setGroups] = useState('');
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('change-me');
  const selectedUser = users.find((user) => user.username === selected);

  useEffect(() => {
    if (selectedUser) {
      setDisplayName(selectedUser.displayName || '');
      setShell(selectedUser.shell || '/bin/bash');
      setGroups((selectedUser.groups || []).join(', '));
      setIsSuperuser(!!selectedUser.isSuperuser);
    }
  }, [selectedUser]);

  const createRequest = { username: newUsername, password: newPassword, displayName, shell, groups: splitList(groups), isSuperuser };
  const updateRequest = { displayName, shell, groups: splitList(groups), isSuperuser };
  const passwordRequest = { currentPassword, newPassword: nextPassword };

  return (
    <section className="split-region wide-left">
      <Panel title="Accounts" icon={<Users aria-hidden="true" />}>
        <div className="data-table">
          <div className="data-head"><span>User</span><span>Groups</span><span>Role</span><span>Home</span></div>
          {users.map((user) => (
            <button key={user.username} className={user.username === selected ? 'data-row button-row-select active' : 'data-row button-row-select'} onClick={() => setSelected(user.username)}>
              <span>{user.username}</span>
              <span>{(user.groups || []).join(', ') || '-'}</span>
              <StatusBadge label={user.isSuperuser ? 'superuser' : user.isApiUser ? 'api user' : 'standard'} />
              <span>{user.homeDir || '-'}</span>
            </button>
          ))}
        </div>
      </Panel>
      <Panel title="Manage user" icon={<ShieldAlert aria-hidden="true" />}>
        <div className="inline-form">
          <input value={selected} onChange={(event) => setSelected(event.target.value)} placeholder="username" />
          <button onClick={() => void runAction('Create user', () => api.createUser(createRequest))}>Create</button>
          <button disabled={!selected} onClick={() => void runAction('Update user', () => api.updateUser(selected, updateRequest))}>Update</button>
          <button disabled={!selected} onClick={() => void runAction('Change password', () => api.changePassword(selected, passwordRequest), false)}>Password</button>
          <button className="danger" disabled={!selected} onClick={() => guarded({ title: `Delete ${selected}`, detail: 'This removes the Linux account through the API server.', payload: { username: selected }, action: () => runAction('Delete user', () => api.deleteUser(selected)) })}><Trash2 aria-hidden="true" />Delete</button>
        </div>
        <div className="designer-grid">
          <label>New username<input value={newUsername} onChange={(event) => setNewUsername(event.target.value)} /></label>
          <label>New password<input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} type="password" /></label>
          <label>Display name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>
          <label>Shell<input value={shell} onChange={(event) => setShell(event.target.value)} /></label>
          <label>Groups<input value={groups} onChange={(event) => setGroups(event.target.value)} placeholder="comma-separated" /></label>
          <label className="check-label"><input type="checkbox" checked={isSuperuser} onChange={(event) => setIsSuperuser(event.target.checked)} />Superuser</label>
          <label>Current password<input value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} type="password" /></label>
          <label>Next password<input value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} type="password" /></label>
        </div>
      </Panel>
    </section>
  );
}

function ApiConsole({ api, activeLabName, activeNodeName, guarded }: { api: ApiClient; activeLabName: string | null; activeNodeName: string; guarded: (confirm: ConfirmState) => void }) {
  const [filter, setFilter] = useState('');
  const filtered = routeCatalog.filter((route) => `${route.group} ${route.method} ${route.path} ${route.label}`.toLowerCase().includes(filter.toLowerCase()));
  const [routeIndex, setRouteIndex] = useState(0);
  const route = filtered[Math.min(routeIndex, Math.max(filtered.length - 1, 0))] || routeCatalog[0];
  const [method, setMethod] = useState(route.method);
  const [path, setPath] = useState(route.path);
  const [queryText, setQueryText] = useState(formatPayload(route.query || {}));
  const [bodyText, setBodyText] = useState(route.body === undefined ? '' : formatPayload(route.body));
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const resolved = materializePath(route.path, activeLabName || 'demo-lab', activeNodeName || 'node1');
    setMethod(route.method);
    setPath(resolved);
    setQueryText(formatPayload(route.query || {}));
    setBodyText(route.body === undefined ? '' : formatPayload(route.body));
  }, [route, activeLabName, activeNodeName]);

  async function execute() {
    setLoading(true);
    setOutput('');
    try {
      const result = await api.callRoute(method, path, bodyText, parseJsonObject(queryText));
      setOutput(formatPayload(result));
    } catch (err) {
      setOutput(formatError(err));
    } finally {
      setLoading(false);
    }
  }

  const executeAction = () => void execute();
  const guardedExecute = () => guarded({ title: `${method} ${path}`, detail: route.label, payload: { query: parseJsonObject(queryText), body: bodyText.trim() ? parseJson(bodyText) : undefined }, action: execute });

  return (
    <section className="split-region wide-left">
      <Panel title="Route catalog" icon={<Code2 aria-hidden="true" />}>
        <div className="inline-form">
          <Search aria-hidden="true" />
          <input value={filter} onChange={(event) => { setFilter(event.target.value); setRouteIndex(0); }} placeholder="Filter routes" />
        </div>
        <div className="route-list">
          {filtered.map((item, index) => (
            <button key={`${item.method}-${item.path}-${item.label}`} className={item === route ? 'route-row active' : 'route-row'} onClick={() => setRouteIndex(index)}>
              <span className={`method method-${item.method.toLowerCase()}`}>{item.method}</span>
              <span>{item.path}</span>
              {item.destructive ? <ShieldAlert aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
            </button>
          ))}
        </div>
      </Panel>
      <Panel
        title={route.label}
        icon={<TerminalSquare aria-hidden="true" />}
        actions={<button className={route.destructive ? 'danger' : 'primary'} disabled={loading} onClick={route.destructive ? guardedExecute : executeAction}>{loading ? <Loader2 className="spin" aria-hidden="true" /> : <Play aria-hidden="true" />}Send</button>}
      >
        <div className="inline-form short">
          <select value={method} onChange={(event) => setMethod(event.target.value as typeof method)}>
            {['GET', 'POST', 'PUT', 'DELETE', 'HEAD'].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <input value={path} onChange={(event) => setPath(event.target.value)} />
        </div>
        <label>Query JSON<textarea value={queryText} onChange={(event) => setQueryText(event.target.value)} spellCheck={false} /></label>
        <label>Body<textarea value={bodyText} onChange={(event) => setBodyText(event.target.value)} spellCheck={false} /></label>
        <pre className="log-output">{output || 'Response appears here.'}</pre>
      </Panel>
    </section>
  );
}

function Panel({ title, icon, actions, children }: { title: string; icon?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="panel">
      <div className="section-heading">
        <h2>{icon}{title}</h2>
        {actions ? <div className="button-row">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function MetricTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="metric-tile">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function Notice({ tone, text, onDismiss }: { tone: 'error' | 'info'; text: string; onDismiss: () => void }) {
  return (
    <div className={`notice ${tone}`}>
      {tone === 'error' ? <CircleAlert aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
      <span>{text}</span>
      <button className="icon" onClick={onDismiss} aria-label="Dismiss"><X aria-hidden="true" /></button>
    </div>
  );
}

function EventList({ events }: { events: string[] }) {
  return <pre className="event-list">{events.length ? events.join('\n') : 'No events received yet.'}</pre>;
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
  const tone = normalized.includes('running') || normalized.includes('healthy') || normalized.includes('super') || normalized.includes('api') ? 'good' : normalized.includes('fail') || normalized.includes('exited') || normalized.includes('delete') ? 'bad' : 'idle';
  return <span className={`badge ${tone}`}>{label}</span>;
}

type ConfirmState = {
  title: string;
  detail: string;
  payload?: unknown;
  action: () => Promise<void>;
};

function ConfirmDialog({ confirm, setConfirm }: { confirm: ConfirmState | null; setConfirm: (confirm: ConfirmState | null) => void }) {
  const [busy, setBusy] = useState(false);
  if (!confirm) return null;

  async function execute() {
    if (!confirm) return;
    setBusy(true);
    try {
      await confirm.action();
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal" role="dialog" aria-modal="true" aria-label={confirm.title}>
        <div className="section-heading">
          <h2><ShieldAlert aria-hidden="true" />{confirm.title}</h2>
          <button className="icon" onClick={() => setConfirm(null)}><X aria-hidden="true" /></button>
        </div>
        <p>{confirm.detail}</p>
        {confirm.payload !== undefined ? <pre className="log-output compact">{formatPayload(confirm.payload)}</pre> : null}
        <div className="button-row end">
          <button onClick={() => setConfirm(null)}>Cancel</button>
          <button className="danger" disabled={busy} onClick={() => void execute()}>{busy ? <Loader2 className="spin" aria-hidden="true" /> : <ShieldAlert aria-hidden="true" />}Confirm</button>
        </div>
      </section>
    </div>
  );
}

async function runPanelAction<T>(action: () => Promise<T>, setter: (value: T) => void) {
  const value = await action();
  setter(value);
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

function parseJson(value: string): JsonValue {
  return JSON.parse(value) as JsonValue;
}

function parseJsonObject(value: string): Record<string, string> {
  const parsed = value.trim() ? JSON.parse(value) as Record<string, unknown> : {};
  return Object.fromEntries(Object.entries(parsed).map(([key, item]) => [key, String(item)]));
}

function materializePath(path: string, labName: string, nodeNameValue: string) {
  return path
    .replace(':labName', encodeURIComponent(labName))
    .replace(':nodeName', encodeURIComponent(nodeNameValue))
    .replace(':username', encodeURIComponent(loadAuth().username || 'admin'))
    .replace(':port', '2223')
    .replace(':sessionId', 'session-id')
    .replace(':action', 'start')
    .replace(':name', 'linux')
    .replace(':iconName', 'router.svg')
    .replace('*proxyPath', 'index.html');
}

function fieldFromJson(value: string, field: string) {
  const parsed = JSON.parse(value) as Record<string, unknown>;
  return String(parsed[field] || '');
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function splitList(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sanitizeName(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function buildClosRequest(clos: { name: string; spines: number; leaves: number; kind: string; type: string; image: string; deploy: boolean }): JsonValue {
  return {
    name: clos.name,
    tiers: [
      { count: clos.spines, kind: clos.kind, type: clos.type },
      { count: clos.leaves, kind: clos.kind, type: clos.type }
    ],
    defaultKind: clos.kind,
    images: { [clos.kind]: clos.image },
    deploy: clos.deploy
  };
}

function buildTopologyYaml(draft: TopologyDraft) {
  const lines: string[] = [];
  lines.push(`name: ${yamlScalar(draft.labName || 'lab')}`);
  if (draft.managementNetwork || draft.ipv4Subnet) {
    lines.push('mgmt:');
    if (draft.managementNetwork) lines.push(`  network: ${yamlScalar(draft.managementNetwork)}`);
    if (draft.ipv4Subnet) lines.push(`  ipv4-subnet: ${yamlScalar(draft.ipv4Subnet)}`);
  }
  lines.push('topology:');
  const kinds = collectKinds(draft.nodes);
  if (kinds.length > 0) {
    lines.push('  kinds:');
    kinds.forEach((kind) => {
      const node = draft.nodes.find((item) => item.kind === kind && item.image.trim());
      lines.push(`    ${yamlKey(kind)}:`);
      if (node?.image) lines.push(`      image: ${yamlScalar(node.image)}`);
      if (node?.type) lines.push(`      type: ${yamlScalar(node.type)}`);
    });
  }
  lines.push('  nodes:');
  draft.nodes.filter((node) => node.name.trim()).forEach((node) => {
    lines.push(`    ${yamlKey(node.name)}:`);
    lines.push(`      kind: ${yamlScalar(node.kind || 'linux')}`);
    if (node.image && !kinds.includes(node.kind)) lines.push(`      image: ${yamlScalar(node.image)}`);
    if (node.type) lines.push(`      type: ${yamlScalar(node.type)}`);
    if (node.group) lines.push(`      group: ${yamlScalar(node.group)}`);
    if (node.startupConfig) lines.push(`      startup-config: ${yamlScalar(node.startupConfig)}`);
  });
  if (draft.links.length > 0) {
    lines.push('  links:');
    draft.links.filter((link) => link.aNode && link.bNode && link.aInterface && link.bInterface).forEach((link) => {
      lines.push('    - endpoints:');
      lines.push(`        - ${yamlScalar(`${link.aNode}:${link.aInterface}`)}`);
      lines.push(`        - ${yamlScalar(`${link.bNode}:${link.bInterface}`)}`);
    });
  }
  return `${lines.join('\n')}\n`;
}

function collectKinds(nodes: TopologyNodeDraft[]) {
  const seen = new Set<string>();
  nodes.forEach((node) => {
    if (node.kind.trim() && node.image.trim()) seen.add(node.kind.trim());
  });
  return Array.from(seen).sort();
}

function yamlKey(value: string) {
  return /^[a-zA-Z0-9_-]+$/.test(value) ? value : yamlScalar(value);
}

function yamlScalar(value: string) {
  if (/^[a-zA-Z0-9_./:@-]+$/.test(value)) return value;
  return JSON.stringify(value);
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
