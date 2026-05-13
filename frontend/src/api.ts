export type LoginResponse = {
  token: string;
};

export type HealthResponse = {
  status: string;
  uptime: string;
  startTime: string;
  version?: string;
};

export type MetricsResponse = {
  serverInfo: {
    version: string;
    uptime: string;
    startTime: string;
  };
  metrics?: {
    cpu?: { usagePercent: number; numCPU: number; loadAvg1?: number };
    mem?: { totalMem: number; usedMem: number; availableMem: number; usagePercent: number };
    disk?: { path: string; totalDisk: number; usedDisk: number; freeDisk: number; usagePercent: number };
  };
};

export type RuntimeImagesResponse = {
  runtime: string;
  images: RuntimeImageSummary[];
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
  owner?: string;
};

export type LabMap = Record<string, LabNode[]>;

export type VersionResponse = {
  versionInfo: string;
};

export type TopologyEntry = {
  labName: string;
  yamlFileName: string;
  annotationsFileName: string;
  hasAnnotations: boolean;
  deploymentState: string;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
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

  async login(username: string, password: string, sessionDuration?: string): Promise<LoginResponse> {
    return this.request<LoginResponse>('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password, sessionDuration: sessionDuration || undefined })
    }, false);
  }

  health() {
    return this.request<HealthResponse>('/health', undefined, false);
  }

  labs() {
    return this.request<LabMap>('/api/v1/labs');
  }

  lab(name: string) {
    return this.request<LabMap>(`/api/v1/labs/${encodeURIComponent(name)}`);
  }

  deploy(topologyContent: string) {
    return this.request<{ message?: string }>('/api/v1/labs', {
      method: 'POST',
      body: JSON.stringify({ topologyContent: JSON.parse(topologyContent) })
    });
  }

  destroyLab(name: string, cleanup = true) {
    return this.request<{ message?: string }>(`/api/v1/labs/${encodeURIComponent(name)}?cleanup=${cleanup}`, {
      method: 'DELETE'
    });
  }

  redeployLab(name: string) {
    return this.request<{ message?: string }>(`/api/v1/labs/${encodeURIComponent(name)}`, {
      method: 'PUT',
      body: JSON.stringify({ cleanup: true })
    });
  }

  saveLabConfig(name: string) {
    return this.request<{ message?: string }>(`/api/v1/labs/${encodeURIComponent(name)}/save`, {
      method: 'POST'
    });
  }

  nodeAction(labName: string, nodeName: string, action: 'start' | 'stop' | 'restart' | 'pause' | 'unpause') {
    return this.request<{ message?: string }>(
      `/api/v1/labs/${encodeURIComponent(labName)}/nodes/${encodeURIComponent(nodeName)}/${action}`,
      { method: 'POST' }
    );
  }

  nodeLogs(labName: string, nodeName: string, tail = 200) {
    return this.request<unknown>(`/api/v1/labs/${encodeURIComponent(labName)}/nodes/${encodeURIComponent(nodeName)}/logs?tail=${tail}`);
  }

  topologyFiles() {
    return this.request<TopologyEntry[]>('/api/v1/labs/topology/files');
  }

  topologyFile(labName: string, fileName: string) {
    return this.request<string>(`/api/v1/labs/${encodeURIComponent(labName)}/topology/file?path=${encodeURIComponent(fileName)}`);
  }

  saveTopologyFile(labName: string, fileName: string, content: string) {
    return this.request<unknown>(`/api/v1/labs/${encodeURIComponent(labName)}/topology/file?path=${encodeURIComponent(fileName)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: content
    });
  }

  metrics() {
    return this.request<MetricsResponse>('/api/v1/health/metrics');
  }

  images() {
    return this.request<RuntimeImagesResponse>('/api/v1/images');
  }

  version() {
    return this.request<VersionResponse>('/api/v1/version');
  }

  private async request<T>(path: string, init: RequestInit = {}, withAuth = true): Promise<T> {
    const headers = new Headers(init.headers);
    if (init.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if (withAuth && this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    const response = await fetch(path, {
      ...init,
      headers,
      credentials: 'same-origin'
    });

    if (!response.ok) {
      let message = `${response.status} ${response.statusText}`;
      try {
        const body = await response.json() as { error?: string; message?: string };
        message = body.error || body.message || message;
      } catch {
        // Preserve status text when the response is not JSON.
      }
      throw new ApiError(response.status, message);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
      return response.json() as Promise<T>;
    }

    return response.text() as Promise<T>;
  }
}
