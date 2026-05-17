export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export type LoginResponse = { token: string };
export type MessageResponse = { message?: string; output?: string; success?: boolean; [key: string]: unknown };

export type HealthResponse = {
  status: string;
  uptime: string;
  startTime: string;
  version?: string;
};

export type MetricsResponse = {
  serverInfo: { version: string; uptime: string; startTime: string };
  metrics?: {
    cpu?: { usagePercent: number; numCPU: number; loadAvg1?: number; loadAvg5?: number; loadAvg15?: number };
    mem?: { totalMem: number; usedMem: number; availableMem: number; usagePercent: number };
    disk?: { path: string; totalDisk: number; usedDisk: number; freeDisk: number; usagePercent: number };
  };
};

export type RuntimeImageSummary = {
  id: string;
  shortId?: string;
  repoTags: string[];
  repoDigests: string[];
  createdAt?: string;
  size?: string;
  virtualSize?: string;
};

export type RuntimeImagesResponse = { runtime: string; images: RuntimeImageSummary[] };

export type LabNode = {
  name: string;
  container_id?: string;
  image?: string;
  kind?: string;
  state?: string;
  status?: string;
  ipv4_address?: string;
  ipv6_address?: string;
  lab_name?: string;
  nodeName?: string;
  labPath?: string;
  absLabPath?: string;
  group?: string;
  owner?: string;
};

export type LabMap = Record<string, LabNode[]>;

export type InterfaceInfo = {
  name: string;
  alias?: string;
  mac?: string;
  ifindex?: number;
  mtu?: number;
  type?: string;
  state?: string;
};

export type NodeInterfaces = { name: string; interfaces: InterfaceInfo[] };

export type TopologyEntry = {
  labName: string;
  yamlFileName: string;
  annotationsFileName: string;
  hasAnnotations: boolean;
  deploymentState: string;
};

export type VersionResponse = { versionInfo: string };
export type VersionCheckResponse = { checkResult: string };

export type UserInfo = {
  username: string;
  uid?: string;
  gid?: string;
  displayName?: string;
  homeDir?: string;
  shell?: string;
  groups?: string[];
  isSuperuser?: boolean;
  isApiUser?: boolean;
};

export type SSHSession = {
  port: number;
  labName: string;
  nodeName: string;
  username: string;
  expiration: string;
  created: string;
};

export type SSHAccessResponse = {
  port: number;
  host: string;
  username: string;
  expiration: string;
  command: string;
};

export type TerminalSession = {
  sessionId: string;
  username?: string;
  labName?: string;
  nodeName?: string;
  protocol: 'ssh' | 'shell' | 'telnet' | string;
  state: string;
  createdAt: string;
  expiresAt: string;
  lastActivity?: string;
  exitCode?: number;
  error?: string;
};

export type BrowserPortsResponse = {
  nodeName: string;
  containerName: string;
  ports: Array<{ hostIp?: string; hostPort: number; containerPort: number; protocol?: string; description?: string }>;
};

export type CustomNodeTemplate = Record<string, JsonValue>;
export type CustomNodesResponse = { customNodes: CustomNodeTemplate[]; defaultNode: string };
export type IconsResponse = { icons: Array<{ name: string; source?: string; dataUri?: string; format?: string }> };

export type CaptureTarget = { containerName: string; interfaceName: string };
export type WiresharkSession = {
  sessionId: string;
  labName: string;
  containerName: string;
  interfaceNames: string[];
  vncPath: string;
  showVolumeTip: boolean;
  createdAt: string;
  expiresAt: string;
};

export type RouteSpec = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD';
  path: string;
  group: string;
  label: string;
  body?: JsonValue;
  query?: Record<string, string>;
  destructive?: boolean;
};

export const routeCatalog: RouteSpec[] = [
  { group: 'Public', method: 'GET', path: '/health', label: 'Health check' },
  { group: 'Events', method: 'GET', path: '/api/v1/events', label: 'Stream events', query: { initialState: 'true', interfaceStats: 'false' } },
  { group: 'Images', method: 'GET', path: '/api/v1/images', label: 'List runtime images' },
  { group: 'Images', method: 'POST', path: '/api/v1/images/pull', label: 'Pull runtime image', body: { image: 'ghcr.io/srl-labs/network-multitool:latest' } },
  { group: 'Images', method: 'DELETE', path: '/api/v1/images', label: 'Remove runtime image', query: { reference: 'image:tag', force: 'false' }, destructive: true },
  { group: 'UI', method: 'GET', path: '/api/v1/ui/custom-nodes', label: 'List custom nodes' },
  { group: 'UI', method: 'PUT', path: '/api/v1/ui/custom-nodes', label: 'Replace custom nodes', body: { customNodes: [] } },
  { group: 'UI', method: 'POST', path: '/api/v1/ui/custom-nodes', label: 'Save custom node', body: { name: 'linux', kind: 'linux' } },
  { group: 'UI', method: 'DELETE', path: '/api/v1/ui/custom-nodes/:name', label: 'Delete custom node', destructive: true },
  { group: 'UI', method: 'POST', path: '/api/v1/ui/custom-nodes/default', label: 'Set default custom node', body: { name: 'linux' } },
  { group: 'UI', method: 'GET', path: '/api/v1/ui/icons', label: 'List global icons' },
  { group: 'UI', method: 'POST', path: '/api/v1/ui/icons', label: 'Upload global icon', body: { fileName: 'router.svg', contentType: 'image/svg+xml', dataBase64: '' } },
  { group: 'UI', method: 'DELETE', path: '/api/v1/ui/icons/:iconName', label: 'Delete global icon', destructive: true },
  { group: 'Labs', method: 'GET', path: '/api/v1/labs', label: 'List labs' },
  { group: 'Labs', method: 'POST', path: '/api/v1/labs', label: 'Deploy lab', body: { topologyContent: { name: 'demo-lab', topology: { nodes: {} } } } },
  { group: 'Labs', method: 'POST', path: '/api/v1/labs/archive', label: 'Deploy archive' },
  { group: 'Labs', method: 'GET', path: '/api/v1/labs/topology/files', label: 'List topology files' },
  { group: 'Labs', method: 'POST', path: '/api/v1/labs/topology/import-from-url', label: 'Import topology from URL', body: { topologySourceUrl: 'https://example.com/lab.clab.yml' } },
  { group: 'Lab', method: 'GET', path: '/api/v1/labs/:labName', label: 'Inspect lab' },
  { group: 'Lab', method: 'DELETE', path: '/api/v1/labs/:labName', label: 'Destroy lab', query: { cleanup: 'true' }, destructive: true },
  { group: 'Lab', method: 'PUT', path: '/api/v1/labs/:labName', label: 'Redeploy lab', body: { cleanup: true } },
  { group: 'Lab', method: 'POST', path: '/api/v1/labs/:labName/deploy', label: 'Deploy on-disk topology', body: { path: 'lab.clab.yml' } },
  { group: 'Lab', method: 'POST', path: '/api/v1/labs/:labName/start', label: 'Start lab nodes' },
  { group: 'Lab', method: 'POST', path: '/api/v1/labs/:labName/stop', label: 'Stop lab nodes' },
  { group: 'Lab', method: 'POST', path: '/api/v1/labs/:labName/restart', label: 'Restart lab nodes' },
  { group: 'Lab', method: 'GET', path: '/api/v1/labs/:labName/interfaces', label: 'Inspect interfaces' },
  { group: 'Lab', method: 'POST', path: '/api/v1/labs/:labName/save', label: 'Save lab config' },
  { group: 'Lab', method: 'POST', path: '/api/v1/labs/:labName/exec', label: 'Exec command', body: { command: 'show version' } },
  { group: 'Lab', method: 'POST', path: '/api/v1/labs/:labName/sshx/:action', label: 'Lab SSHX sharing action' },
  { group: 'Lab', method: 'POST', path: '/api/v1/labs/:labName/gotty/:action', label: 'Lab GoTTY sharing action' },
  { group: 'Lab', method: 'POST', path: '/api/v1/labs/:labName/fcli', label: 'Run fcli', body: { command: 'show system information' } },
  { group: 'Lab', method: 'POST', path: '/api/v1/labs/:labName/graph/drawio', label: 'Generate Draw.io graph', body: { layout: 'horizontal', theme: 'nokia_modern' } },
  { group: 'Topology', method: 'GET', path: '/api/v1/labs/:labName/topology/yaml', label: 'Get running YAML' },
  { group: 'Topology', method: 'PUT', path: '/api/v1/labs/:labName/topology/yaml', label: 'Save running YAML', body: 'name: lab' },
  { group: 'Topology', method: 'GET', path: '/api/v1/labs/:labName/topology/annotations', label: 'Get annotations' },
  { group: 'Topology', method: 'PUT', path: '/api/v1/labs/:labName/topology/annotations', label: 'Save annotations', body: {} },
  { group: 'Topology', method: 'GET', path: '/api/v1/labs/:labName/topology/events', label: 'Stream topology events', query: { path: 'lab.clab.yml' } },
  { group: 'Topology', method: 'GET', path: '/api/v1/labs/:labName/topology/file', label: 'Read topology file', query: { path: 'lab.clab.yml' } },
  { group: 'Topology', method: 'HEAD', path: '/api/v1/labs/:labName/topology/file', label: 'Head topology file', query: { path: 'lab.clab.yml' } },
  { group: 'Topology', method: 'PUT', path: '/api/v1/labs/:labName/topology/file', label: 'Write topology file', query: { path: 'lab.clab.yml' }, body: 'name: lab' },
  { group: 'Topology', method: 'DELETE', path: '/api/v1/labs/:labName/topology/file', label: 'Delete topology file', query: { path: 'lab.clab.yml' }, destructive: true },
  { group: 'Topology', method: 'POST', path: '/api/v1/labs/:labName/topology/file/rename', label: 'Rename topology file', body: { oldPath: 'old.clab.yml', newPath: 'new.clab.yml' } },
  { group: 'Topology', method: 'GET', path: '/api/v1/labs/:labName/ui/icons', label: 'List lab icons' },
  { group: 'Topology', method: 'POST', path: '/api/v1/labs/:labName/ui/icons/reconcile', label: 'Reconcile lab icons', body: { usedIcons: [] } },
  { group: 'Node', method: 'POST', path: '/api/v1/labs/:labName/nodes/:nodeName/ssh', label: 'Request SSH', body: { duration: '1h' } },
  { group: 'Node', method: 'POST', path: '/api/v1/labs/:labName/nodes/:nodeName/terminal-sessions', label: 'Create terminal session', body: { protocol: 'shell', cols: 120, rows: 32 } },
  { group: 'Node', method: 'GET', path: '/api/v1/labs/:labName/nodes/:nodeName/logs', label: 'Get node logs', query: { tail: '200' } },
  { group: 'Node', method: 'POST', path: '/api/v1/labs/:labName/nodes/:nodeName/start', label: 'Start node' },
  { group: 'Node', method: 'POST', path: '/api/v1/labs/:labName/nodes/:nodeName/stop', label: 'Stop node' },
  { group: 'Node', method: 'POST', path: '/api/v1/labs/:labName/nodes/:nodeName/restart', label: 'Restart node' },
  { group: 'Node', method: 'POST', path: '/api/v1/labs/:labName/nodes/:nodeName/pause', label: 'Pause node' },
  { group: 'Node', method: 'POST', path: '/api/v1/labs/:labName/nodes/:nodeName/unpause', label: 'Unpause node' },
  { group: 'Node', method: 'GET', path: '/api/v1/labs/:labName/nodes/:nodeName/browser-ports', label: 'Get browser ports' },
  { group: 'Sessions', method: 'GET', path: '/api/v1/ssh/sessions', label: 'List SSH sessions' },
  { group: 'Sessions', method: 'DELETE', path: '/api/v1/ssh/sessions/:port', label: 'Terminate SSH session', destructive: true },
  { group: 'Sessions', method: 'GET', path: '/api/v1/terminal-sessions/:sessionId', label: 'Get terminal session' },
  { group: 'Sessions', method: 'DELETE', path: '/api/v1/terminal-sessions/:sessionId', label: 'Terminate terminal session', destructive: true },
  { group: 'Sessions', method: 'GET', path: '/api/v1/terminal-sessions/:sessionId/stream', label: 'Terminal WebSocket stream' },
  { group: 'Capture', method: 'POST', path: '/api/v1/labs/:labName/capture/packetflix', label: 'Build Packetflix capture', body: { targets: [{ containerName: 'clab-demo-node', interfaceName: 'eth1' }] } },
  { group: 'Capture', method: 'POST', path: '/api/v1/labs/:labName/capture/wireshark-vnc-sessions', label: 'Create Wireshark VNC sessions', body: { targets: [{ containerName: 'clab-demo-node', interfaceName: 'eth1' }], theme: 'dark' } },
  { group: 'Capture', method: 'DELETE', path: '/api/v1/capture/wireshark-vnc-sessions', label: 'Delete all VNC sessions', destructive: true },
  { group: 'Capture', method: 'GET', path: '/api/v1/capture/wireshark-vnc-sessions/:sessionId/ready', label: 'Check VNC session ready' },
  { group: 'Capture', method: 'DELETE', path: '/api/v1/capture/wireshark-vnc-sessions/:sessionId', label: 'Delete VNC session', destructive: true },
  { group: 'Capture', method: 'GET', path: '/api/v1/capture/wireshark-vnc-sessions/:sessionId/vnc/*proxyPath', label: 'Proxy VNC session path' },
  { group: 'Generate', method: 'POST', path: '/api/v1/generate', label: 'Generate topology', body: { name: 'clos', tiers: [{ count: 2, kind: 'nokia_srlinux' }], images: { nokia_srlinux: 'ghcr.io/nokia/srlinux:latest' } } },
  { group: 'Tools', method: 'GET', path: '/api/v1/tools/edgeshark/status', label: 'EdgeShark status' },
  { group: 'Tools', method: 'POST', path: '/api/v1/tools/edgeshark/install', label: 'Install EdgeShark' },
  { group: 'Tools', method: 'POST', path: '/api/v1/tools/edgeshark/uninstall', label: 'Uninstall EdgeShark', destructive: true },
  { group: 'Tools', method: 'POST', path: '/api/v1/tools/disable-tx-offload', label: 'Disable TX offload', body: { containerName: 'clab-demo-node' } },
  { group: 'Tools', method: 'POST', path: '/api/v1/tools/certs/ca', label: 'Create CA', body: { name: 'ca', commonName: 'containerlab.dev' } },
  { group: 'Tools', method: 'POST', path: '/api/v1/tools/certs/sign', label: 'Sign certificate', body: { name: 'node1', hosts: ['node1.local'], caName: 'ca' } },
  { group: 'Tools', method: 'POST', path: '/api/v1/tools/veth', label: 'Create veth', body: { aEndpoint: 'clab-demo-a:eth1', bEndpoint: 'clab-demo-b:eth1', mtu: 1500 } },
  { group: 'Tools', method: 'POST', path: '/api/v1/tools/vxlan', label: 'Create VXLAN', body: { remote: '10.0.0.20', link: 'eth0', id: 100 } },
  { group: 'Tools', method: 'DELETE', path: '/api/v1/tools/vxlan', label: 'Delete VXLAN', body: { link: 'vxlan100' }, destructive: true },
  { group: 'Tools', method: 'POST', path: '/api/v1/tools/netem/set', label: 'Set netem', body: { containerName: 'clab-demo-node', interface: 'eth1', delay: '50ms' } },
  { group: 'Tools', method: 'GET', path: '/api/v1/tools/netem/show', label: 'Show netem', query: { containerName: 'clab-demo-node' } },
  { group: 'Tools', method: 'POST', path: '/api/v1/tools/netem/reset', label: 'Reset netem', body: { containerName: 'clab-demo-node', interface: 'eth1' }, destructive: true },
  { group: 'Version', method: 'GET', path: '/api/v1/version', label: 'Get containerlab version' },
  { group: 'Version', method: 'GET', path: '/api/v1/version/check', label: 'Check version updates' },
  { group: 'Users', method: 'GET', path: '/api/v1/users', label: 'List users' },
  { group: 'Users', method: 'POST', path: '/api/v1/users', label: 'Create user', body: { username: 'operator', password: 'change-me', shell: '/bin/bash', groups: [], isSuperuser: false } },
  { group: 'Users', method: 'GET', path: '/api/v1/users/:username', label: 'Get user details' },
  { group: 'Users', method: 'PUT', path: '/api/v1/users/:username', label: 'Update user', body: { displayName: 'Operator', shell: '/bin/bash', groups: [], isSuperuser: false } },
  { group: 'Users', method: 'DELETE', path: '/api/v1/users/:username', label: 'Delete user', destructive: true },
  { group: 'Users', method: 'PUT', path: '/api/v1/users/:username/password', label: 'Change password', body: { currentPassword: '', newPassword: 'change-me' } }
];

export class ApiError extends Error {
  status: number;
  payload?: unknown;

  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

export class ApiClient {
  private token: string | null;

  constructor(token: string | null) {
    this.token = token;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  login(username: string, password: string, sessionDuration?: string) {
    return this.request<LoginResponse>('/login', { method: 'POST', body: compactObject({ username, password, sessionDuration }) }, false);
  }

  health() {
    return this.request<HealthResponse>('/health', undefined, false);
  }

  metrics() {
    return this.request<MetricsResponse>('/api/v1/health/metrics');
  }

  eventsUrl(params: Record<string, string>) {
    return this.withQuery('/api/v1/events', params);
  }

  labs() {
    return this.request<LabMap>('/api/v1/labs');
  }

  lab(name: string) {
    return this.request<LabMap>(`/api/v1/labs/${encodeURIComponent(name)}`);
  }

  deploy(topologyContent: string) {
    return this.request<MessageResponse>('/api/v1/labs', { method: 'POST', body: { topologyContent: JSON.parse(topologyContent) as JsonValue } });
  }

  deployFromUrl(topologySourceUrl: string) {
    return this.request<MessageResponse>('/api/v1/labs', { method: 'POST', body: { topologySourceUrl } });
  }

  importTopologyFromUrl(topologySourceUrl: string) {
    return this.request<MessageResponse>('/api/v1/labs/topology/import-from-url', { method: 'POST', body: { topologySourceUrl } });
  }

  destroyLab(name: string, cleanup = true, purge = false) {
    return this.request<MessageResponse>(this.withQuery(`/api/v1/labs/${encodeURIComponent(name)}`, { cleanup: String(cleanup), purge: String(purge) }), { method: 'DELETE' });
  }

  redeployLab(name: string, body: JsonValue = { cleanup: true }) {
    return this.request<MessageResponse>(`/api/v1/labs/${encodeURIComponent(name)}`, { method: 'PUT', body });
  }

  labAction(name: string, action: 'deploy' | 'start' | 'stop' | 'restart') {
    return this.request<MessageResponse>(`/api/v1/labs/${encodeURIComponent(name)}/${action}`, { method: 'POST' });
  }

  deployTopologyFile(name: string, path: string, options: Record<string, string> = {}) {
    return this.request<MessageResponse>(this.withQuery(`/api/v1/labs/${encodeURIComponent(name)}/deploy`, { path, ...options }), { method: 'POST' });
  }

  saveLabConfig(name: string) {
    return this.request<MessageResponse>(`/api/v1/labs/${encodeURIComponent(name)}/save`, { method: 'POST' });
  }

  labInterfaces(name: string) {
    return this.request<NodeInterfaces[]>(`/api/v1/labs/${encodeURIComponent(name)}/interfaces`);
  }

  execLab(name: string, command: string) {
    return this.request<MessageResponse>(`/api/v1/labs/${encodeURIComponent(name)}/exec`, { method: 'POST', body: { command } });
  }

  runFcli(name: string, command: string) {
    return this.request<MessageResponse>(`/api/v1/labs/${encodeURIComponent(name)}/fcli`, { method: 'POST', body: { command } });
  }

  labShare(name: string, tool: 'sshx' | 'gotty', action: string) {
    return this.request<MessageResponse>(`/api/v1/labs/${encodeURIComponent(name)}/${tool}/${encodeURIComponent(action)}`, { method: 'POST' });
  }

  drawio(name: string, layout: string, theme: string) {
    return this.request<MessageResponse>(`/api/v1/labs/${encodeURIComponent(name)}/graph/drawio`, { method: 'POST', body: { layout, theme } });
  }

  nodeAction(labName: string, nodeName: string, action: 'start' | 'stop' | 'restart' | 'pause' | 'unpause') {
    return this.request<MessageResponse>(`/api/v1/labs/${encodeURIComponent(labName)}/nodes/${encodeURIComponent(nodeName)}/${action}`, { method: 'POST' });
  }

  nodeLogs(labName: string, nodeName: string, tail = 200) {
    return this.request<unknown>(this.withQuery(`/api/v1/labs/${encodeURIComponent(labName)}/nodes/${encodeURIComponent(nodeName)}/logs`, { tail: String(tail) }));
  }

  browserPorts(labName: string, nodeName: string) {
    return this.request<BrowserPortsResponse>(`/api/v1/labs/${encodeURIComponent(labName)}/nodes/${encodeURIComponent(nodeName)}/browser-ports`);
  }

  requestSsh(labName: string, nodeName: string, body: JsonValue) {
    return this.request<SSHAccessResponse>(`/api/v1/labs/${encodeURIComponent(labName)}/nodes/${encodeURIComponent(nodeName)}/ssh`, { method: 'POST', body });
  }

  createTerminal(labName: string, nodeName: string, body: JsonValue) {
    return this.request<TerminalSession>(`/api/v1/labs/${encodeURIComponent(labName)}/nodes/${encodeURIComponent(nodeName)}/terminal-sessions`, { method: 'POST', body });
  }

  topologyFiles() {
    return this.request<TopologyEntry[]>('/api/v1/labs/topology/files');
  }

  runningYaml(labName: string) {
    return this.request<string>(`/api/v1/labs/${encodeURIComponent(labName)}/topology/yaml`);
  }

  saveRunningYaml(labName: string, content: string) {
    return this.request<unknown>(`/api/v1/labs/${encodeURIComponent(labName)}/topology/yaml`, { method: 'PUT', body: content, contentType: 'text/plain; charset=utf-8' });
  }

  annotations(labName: string) {
    return this.request<unknown>(`/api/v1/labs/${encodeURIComponent(labName)}/topology/annotations`);
  }

  saveAnnotations(labName: string, body: JsonValue) {
    return this.request<unknown>(`/api/v1/labs/${encodeURIComponent(labName)}/topology/annotations`, { method: 'PUT', body });
  }

  topologyFile(labName: string, fileName: string, method: 'GET' | 'HEAD' = 'GET') {
    return this.request<string>(this.withQuery(`/api/v1/labs/${encodeURIComponent(labName)}/topology/file`, { path: fileName }), { method });
  }

  saveTopologyFile(labName: string, fileName: string, content: string) {
    return this.request<unknown>(this.withQuery(`/api/v1/labs/${encodeURIComponent(labName)}/topology/file`, { path: fileName }), {
      method: 'PUT',
      body: content,
      contentType: 'text/plain; charset=utf-8'
    });
  }

  deleteTopologyFile(labName: string, fileName: string) {
    return this.request<unknown>(this.withQuery(`/api/v1/labs/${encodeURIComponent(labName)}/topology/file`, { path: fileName }), { method: 'DELETE' });
  }

  renameTopologyFile(labName: string, oldPath: string, newPath: string) {
    return this.request<unknown>(`/api/v1/labs/${encodeURIComponent(labName)}/topology/file/rename`, { method: 'POST', body: { oldPath, newPath } });
  }

  labIcons(labName: string) {
    return this.request<IconsResponse>(`/api/v1/labs/${encodeURIComponent(labName)}/ui/icons`);
  }

  reconcileLabIcons(labName: string, usedIcons: string[]) {
    return this.request<MessageResponse>(`/api/v1/labs/${encodeURIComponent(labName)}/ui/icons/reconcile`, { method: 'POST', body: { usedIcons } });
  }

  images() {
    return this.request<RuntimeImagesResponse>('/api/v1/images');
  }

  pullImage(image: string) {
    return this.request<MessageResponse>('/api/v1/images/pull', { method: 'POST', body: { image } });
  }

  deleteImage(reference: string, force = false) {
    return this.request<MessageResponse>(this.withQuery('/api/v1/images', { reference, force: String(force) }), { method: 'DELETE' });
  }

  customNodes() {
    return this.request<CustomNodesResponse>('/api/v1/ui/custom-nodes');
  }

  replaceCustomNodes(customNodes: CustomNodeTemplate[]) {
    return this.request<MessageResponse>('/api/v1/ui/custom-nodes', { method: 'PUT', body: { customNodes } });
  }

  saveCustomNode(node: JsonValue) {
    return this.request<MessageResponse>('/api/v1/ui/custom-nodes', { method: 'POST', body: node });
  }

  deleteCustomNode(name: string) {
    return this.request<MessageResponse>(`/api/v1/ui/custom-nodes/${encodeURIComponent(name)}`, { method: 'DELETE' });
  }

  setDefaultCustomNode(name: string) {
    return this.request<MessageResponse>('/api/v1/ui/custom-nodes/default', { method: 'POST', body: { name } });
  }

  globalIcons() {
    return this.request<IconsResponse>('/api/v1/ui/icons');
  }

  uploadGlobalIcon(body: JsonValue) {
    return this.request<MessageResponse>('/api/v1/ui/icons', { method: 'POST', body });
  }

  deleteGlobalIcon(iconName: string) {
    return this.request<MessageResponse>(`/api/v1/ui/icons/${encodeURIComponent(iconName)}`, { method: 'DELETE' });
  }

  packetflix(labName: string, targets: CaptureTarget[], remoteHostname?: string) {
    return this.request<MessageResponse>(`/api/v1/labs/${encodeURIComponent(labName)}/capture/packetflix`, { method: 'POST', body: compactObject({ targets, remoteHostname }) });
  }

  wiresharkSessions(labName: string, targets: CaptureTarget[], theme = 'dark') {
    return this.request<{ sessions: WiresharkSession[] }>(`/api/v1/labs/${encodeURIComponent(labName)}/capture/wireshark-vnc-sessions`, { method: 'POST', body: { targets, theme } });
  }

  deleteAllWiresharkSessions() {
    return this.request<MessageResponse>('/api/v1/capture/wireshark-vnc-sessions', { method: 'DELETE' });
  }

  wiresharkReady(sessionId: string) {
    return this.request<{ ready: boolean; url?: string }>(`/api/v1/capture/wireshark-vnc-sessions/${encodeURIComponent(sessionId)}/ready`);
  }

  deleteWiresharkSession(sessionId: string) {
    return this.request<MessageResponse>(`/api/v1/capture/wireshark-vnc-sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
  }

  sshSessions() {
    return this.request<SSHSession[]>('/api/v1/ssh/sessions');
  }

  terminateSshSession(port: number) {
    return this.request<MessageResponse>(`/api/v1/ssh/sessions/${port}`, { method: 'DELETE' });
  }

  terminalSession(sessionId: string) {
    return this.request<TerminalSession>(`/api/v1/terminal-sessions/${encodeURIComponent(sessionId)}`);
  }

  terminateTerminalSession(sessionId: string) {
    return this.request<MessageResponse>(`/api/v1/terminal-sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
  }

  generateTopology(body: JsonValue) {
    return this.request<MessageResponse>('/api/v1/generate', { method: 'POST', body });
  }

  edgesharkStatus() {
    return this.request<MessageResponse>('/api/v1/tools/edgeshark/status');
  }

  edgeshark(action: 'install' | 'uninstall') {
    return this.request<MessageResponse>(`/api/v1/tools/edgeshark/${action}`, { method: 'POST' });
  }

  disableTxOffload(containerName: string) {
    return this.request<MessageResponse>('/api/v1/tools/disable-tx-offload', { method: 'POST', body: { containerName } });
  }

  createCA(body: JsonValue) {
    return this.request<MessageResponse>('/api/v1/tools/certs/ca', { method: 'POST', body });
  }

  signCert(body: JsonValue) {
    return this.request<MessageResponse>('/api/v1/tools/certs/sign', { method: 'POST', body });
  }

  createVeth(body: JsonValue) {
    return this.request<MessageResponse>('/api/v1/tools/veth', { method: 'POST', body });
  }

  vxlan(method: 'POST' | 'DELETE', body: JsonValue) {
    return this.request<MessageResponse>('/api/v1/tools/vxlan', { method, body });
  }

  setNetem(body: JsonValue) {
    return this.request<MessageResponse>('/api/v1/tools/netem/set', { method: 'POST', body });
  }

  showNetem(containerName: string) {
    return this.request<unknown>(this.withQuery('/api/v1/tools/netem/show', { containerName }));
  }

  resetNetem(body: JsonValue) {
    return this.request<MessageResponse>('/api/v1/tools/netem/reset', { method: 'POST', body });
  }

  version() {
    return this.request<VersionResponse>('/api/v1/version');
  }

  versionCheck() {
    return this.request<VersionCheckResponse>('/api/v1/version/check');
  }

  users() {
    return this.request<UserInfo[]>('/api/v1/users');
  }

  user(username: string) {
    return this.request<UserInfo>(`/api/v1/users/${encodeURIComponent(username)}`);
  }

  createUser(body: JsonValue) {
    return this.request<MessageResponse>('/api/v1/users', { method: 'POST', body });
  }

  updateUser(username: string, body: JsonValue) {
    return this.request<MessageResponse>(`/api/v1/users/${encodeURIComponent(username)}`, { method: 'PUT', body });
  }

  deleteUser(username: string) {
    return this.request<MessageResponse>(`/api/v1/users/${encodeURIComponent(username)}`, { method: 'DELETE' });
  }

  changePassword(username: string, body: JsonValue) {
    return this.request<MessageResponse>(`/api/v1/users/${encodeURIComponent(username)}/password`, { method: 'PUT', body });
  }

  callRoute<T = unknown>(method: string, rawPath: string, bodyText: string, query: Record<string, string> = {}) {
    const body = bodyText.trim() ? parseBody(bodyText) : undefined;
    return this.request<T>(this.withQuery(rawPath, query), { method, body });
  }

  streamUrl(path: string, query: Record<string, string> = {}) {
    return this.withQuery(path, query);
  }

  private withQuery(path: string, query: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params.set(key, value);
    });
    const suffix = params.toString();
    return suffix ? `${path}?${suffix}` : path;
  }

  private async request<T>(path: string, init: ApiRequestInit = {}, withAuth = true): Promise<T> {
    const headers = new Headers(init.headers);
    let body: BodyInit | undefined;

    if (init.body !== undefined) {
      if (typeof init.body === 'string') {
        body = init.body;
        headers.set('Content-Type', init.contentType || headers.get('Content-Type') || 'text/plain; charset=utf-8');
      } else {
        body = JSON.stringify(init.body);
        headers.set('Content-Type', init.contentType || headers.get('Content-Type') || 'application/json');
      }
    }

    if (withAuth && this.token) headers.set('Authorization', `Bearer ${this.token}`);

    const response = await fetch(path, {
      method: init.method || 'GET',
      headers,
      body,
      credentials: 'same-origin'
    });

    if (!response.ok) {
      let message = `${response.status} ${response.statusText}`;
      let payload: unknown;
      try {
        payload = await response.json();
        if (isRecord(payload)) message = String(payload.error || payload.message || message);
      } catch {
        try {
          payload = await response.text();
          if (payload) message = String(payload);
        } catch {
          // Keep status text.
        }
      }
      throw new ApiError(response.status, message, payload);
    }

    if (response.status === 204 || init.method === 'HEAD') return undefined as T;
    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) return response.json() as Promise<T>;
    return response.text() as Promise<T>;
  }
}

type ApiRequestInit = {
  method?: string;
  headers?: HeadersInit;
  body?: JsonValue | string;
  contentType?: string;
};

function parseBody(value: string): JsonValue | string {
  try {
    return JSON.parse(value) as JsonValue;
  } catch {
    return value;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function compactObject(value: Record<string, unknown>): JsonValue {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as JsonValue;
}
