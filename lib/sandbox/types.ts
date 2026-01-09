export interface SandboxFile {
  path: string;
  content: string;
  lastModified?: number;
}

export interface SandboxInfo {
  sandboxId: string;
  url: string;
  provider: 'e2b' | 'vercel' | 'self-hosted';
  createdAt: Date;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
}

export interface SandboxEnvironment {
  id: string;
  status: 'ready' | 'busy' | 'error' | 'stopped';
  config: SandboxConfig;
  createdAt: Date;
}

export interface SandboxConfig {
  timeout?: number;
  memory?: string;
  cpu?: string;
  environment?: Record<string, string>;
}

export interface SandboxProviderConfig {
  e2b?: {
    apiKey: string;
    timeoutMs?: number;
    template?: string;
  };
  vercel?: {
    teamId?: string;
    projectId?: string;
    token?: string;
    authMethod?: 'oidc' | 'pat';
  };
  selfHosted?: {
    docker?: {
      socketPath?: string;
      host?: string;
      port?: number;
    };
    resources?: {
      memory?: number;
      cpu?: number;
      timeout?: number;
    };
    network?: {
      mode?: string;
      allowedPorts?: number[];
    };
    volumes?: string[];
    baseImage?: string;
  };
}

export abstract class SandboxProvider {
  protected config: SandboxProviderConfig;
  protected sandbox: any;
  protected sandboxInfo: SandboxInfo | null = null;

  constructor(config: SandboxProviderConfig) {
    this.config = config;
  }

  abstract createSandbox(): Promise<SandboxInfo>;
  abstract runCommand(command: string): Promise<CommandResult>;
  abstract writeFile(path: string, content: string): Promise<void>;
  abstract readFile(path: string): Promise<string>;
  abstract listFiles(directory?: string): Promise<string[]>;
  abstract installPackages(packages: string[]): Promise<CommandResult>;
  abstract getSandboxUrl(): string | null;
  abstract getSandboxInfo(): SandboxInfo | null;
  abstract terminate(): Promise<void>;
  abstract isAlive(): boolean;
  
  // Optional methods that providers can override
  async setupViteApp(): Promise<void> {
    // Default implementation for setting up a Vite React app
    throw new Error('setupViteApp not implemented for this provider');
  }
  
  async restartViteServer(): Promise<void> {
    // Default implementation for restarting Vite
    throw new Error('restartViteServer not implemented for this provider');
  }
}