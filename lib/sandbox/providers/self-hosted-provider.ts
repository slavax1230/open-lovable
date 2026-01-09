import { SandboxProvider, SandboxInfo, CommandResult, SandboxProviderConfig } from '../types';

interface DockerConfig {
  socketPath?: string;
  host?: string;
  port?: number;
}

interface SelfHostedConfig {
  timeoutMinutes: number;
  timeoutMs: number;
  devPort: number;
  devServerStartupDelay: number;
  workingDirectory: string;
  docker: DockerConfig;
  resources: {
    memory: number;
    cpu: number;
    timeout: number;
  };
  network: {
    mode: string;
    allowedPorts: number[];
  };
  baseImage: string;
  volumes: string[];
}

class SimpleDockerClient {
  private config: DockerConfig;

  constructor(config: DockerConfig) {
    this.config = config;
  }

  async ping(): Promise<boolean> {
    try {
      // Simple check if Docker is available
      const response = await fetch('http://localhost/v1.25/_ping', {
        method: 'GET',
        headers: {
          'Host': 'localhost',
        },
      });
      return response.ok;
    } catch (error) {
      console.error('Docker ping failed:', error);
      return false;
    }
  }

  async pullImage(image: string): Promise<void> {
    console.log(`Pulling image: ${image}`);
    // In a real implementation, this would pull the Docker image
    // For now, we'll just log it
  }

  async createContainer(config: any): Promise<{ id: string }> {
    const containerId = `container-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log(`Creating container: ${containerId}`);
    // In a real implementation, this would create a Docker container
    return { id: containerId };
  }

  async startContainer(containerId: string): Promise<void> {
    console.log(`Starting container: ${containerId}`);
    // In a real implementation, this would start the Docker container
  }

  async execCommand(containerId: string, command: string[]): Promise<CommandResult> {
    console.log(`Executing command in ${containerId}:`, command.join(' '));
    
    // Simulate command execution
    const commandStr = command.join(' ');
    
    if (commandStr.includes('test -f')) {
      return {
        stdout: '',
        stderr: '',
        exitCode: 1,
        success: false,
      };
    }
    
    if (commandStr.includes('mkdir')) {
      return {
        stdout: '',
        stderr: '',
        exitCode: 0,
        success: true,
      };
    }
    
    // Default success response
    return {
      stdout: `Command executed: ${commandStr}`,
      stderr: '',
      exitCode: 0,
      success: true,
    };
  }

  async writeFile(containerId: string, path: string, content: string): Promise<void> {
    console.log(`Writing file to ${containerId}: ${path} (${content.length} bytes)`);
    // In a real implementation, this would write the file to the container
  }

  async readFile(containerId: string, path: string): Promise<string> {
    console.log(`Reading file from ${containerId}: ${path}`);
    // In a real implementation, this would read the file from the container
    return '{}'; // Return empty JSON for package.json
  }

  async listFiles(containerId: string, directory?: string): Promise<string[]> {
    console.log(`Listing files in ${containerId}: ${directory || '/'}`);
    return ['package.json', 'src/', 'index.html'];
  }

  async getContainerInfo(containerId: string): Promise<any> {
    console.log(`Getting container info: ${containerId}`);
    return {
      ports: {
        '3000/tcp': {
          HostPort: '3001'
        }
      }
    };
  }

  async isContainerRunning(containerId: string): Promise<boolean> {
    console.log(`Checking if container is running: ${containerId}`);
    return true;
  }

  async stopContainer(containerId: string): Promise<void> {
    console.log(`Stopping container: ${containerId}`);
  }

  async removeContainer(containerId: string): Promise<void> {
    console.log(`Removing container: ${containerId}`);
  }
}

export class SelfHostedProvider extends SandboxProvider {
  private dockerClient: SimpleDockerClient;
  private containerId: string | null = null;
  private selfHostedConfig: SelfHostedConfig;

  constructor(config: SandboxProviderConfig) {
    super(config);
    
    // Use default config or provided config
    this.selfHostedConfig = {
      timeoutMinutes: 30,
      timeoutMs: 30 * 60 * 1000,
      devPort: 3000,
      devServerStartupDelay: 7000,
      workingDirectory: '/app',
      docker: {
        socketPath: '/var/run/docker.sock',
        host: process.env.DOCKER_HOST,
        port: process.env.DOCKER_PORT ? parseInt(process.env.DOCKER_PORT) : undefined,
      },
      resources: {
        memory: 512 * 1024 * 1024, // 512MB
        cpu: 50000, // 50% CPU
        timeout: 30000, // 30 seconds
      },
      network: {
        mode: 'bridge',
        allowedPorts: [3000, 4000, 5000, 8000, 8080],
      },
      baseImage: 'node:18-alpine',
      volumes: [],
    };

    this.dockerClient = new SimpleDockerClient(this.selfHostedConfig.docker);
  }

  async createSandbox(): Promise<SandboxInfo> {
    // Verify Docker connection
    const isDockerAvailable = await this.dockerClient.ping();
    if (!isDockerAvailable) {
      throw new Error('Docker is not available or not running');
    }

    const sandboxId = `sandbox-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Create container
      const { id: containerId } = await this.dockerClient.createContainer({
        image: this.selfHostedConfig.baseImage,
        name: sandboxId,
        cmd: ['/bin/sh'],
        env: {
          NODE_ENV: 'development',
        },
        workingDir: this.selfHostedConfig.workingDirectory,
        hostConfig: {
          Memory: this.selfHostedConfig.resources.memory,
          CpuQuota: this.selfHostedConfig.resources.cpu,
          NetworkMode: this.selfHostedConfig.network.mode,
          AutoRemove: true,
          PortBindings: {
            '3000/tcp': [{ HostPort: '0' }], // Random host port
          },
        },
      });

      // Start container
      await this.dockerClient.startContainer(containerId);

      this.containerId = containerId;

      // Initialize Node.js environment
      await this.initializeNodeEnvironment(containerId);

      const sandboxInfo: SandboxInfo = {
        sandboxId,
        url: await this.getSandboxUrl() || '',
        provider: 'self-hosted',
        createdAt: new Date(),
      };

      this.sandboxInfo = sandboxInfo;
      return sandboxInfo;
    } catch (error) {
      console.error('Failed to create self-hosted sandbox:', error);
      throw new Error(`Failed to create self-hosted sandbox: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async initializeNodeEnvironment(containerId: string): Promise<void> {
    try {
      // Create app directory
      await this.dockerClient.execCommand(containerId, ['mkdir', '-p', this.selfHostedConfig.workingDirectory]);

      // Initialize package.json if it doesn't exist
      const packageJsonExists = await this.dockerClient.execCommand(containerId, ['test', '-f', `${this.selfHostedConfig.workingDirectory}/package.json`]);
      
      if (!packageJsonExists.success) {
        const defaultPackageJson = {
          name: 'sandbox-project',
          version: '1.0.0',
          scripts: {
            dev: 'vite',
            build: 'vite build',
            preview: 'vite preview',
          },
          dependencies: {},
        };

        await this.dockerClient.writeFile(
          containerId,
          `${this.selfHostedConfig.workingDirectory}/package.json`,
          JSON.stringify(defaultPackageJson, null, 2)
        );
      }
    } catch (error) {
      console.error('Failed to initialize Node.js environment:', error);
      throw error;
    }
  }

  async runCommand(command: string): Promise<CommandResult> {
    if (!this.containerId) {
      throw new Error('Sandbox not created. Call createSandbox() first.');
    }

    try {
      // Execute command with timeout
      const result = await Promise.race([
        this.dockerClient.execCommand(this.containerId, command.split(' ')),
        new Promise<CommandResult>((_, reject) =>
          setTimeout(() => reject(new Error('Command timeout')), this.selfHostedConfig.resources.timeout)
        ),
      ]) as CommandResult;

      return result;
    } catch (error) {
      console.error('Failed to execute command:', error);
      return {
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        exitCode: 1,
        success: false,
      };
    }
  }

  async writeFile(path: string, content: string): Promise<void> {
    if (!this.containerId) {
      throw new Error('Sandbox not created. Call createSandbox() first.');
    }

    try {
      await this.dockerClient.writeFile(this.containerId, `${this.selfHostedConfig.workingDirectory}/${path}`, content);
    } catch (error) {
      console.error('Failed to write file:', error);
      throw new Error(`Failed to write file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async readFile(path: string): Promise<string> {
    if (!this.containerId) {
      throw new Error('Sandbox not created. Call createSandbox() first.');
    }

    try {
      return await this.dockerClient.readFile(this.containerId, `${this.selfHostedConfig.workingDirectory}/${path}`);
    } catch (error) {
      console.error('Failed to read file:', error);
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async listFiles(directory?: string): Promise<string[]> {
    if (!this.containerId) {
      throw new Error('Sandbox not created. Call createSandbox() first.');
    }

    try {
      const fullPath = directory ? `${this.selfHostedConfig.workingDirectory}/${directory}` : this.selfHostedConfig.workingDirectory;
      return await this.dockerClient.listFiles(this.containerId, fullPath);
    } catch (error) {
      console.error('Failed to list files:', error);
      throw new Error(`Failed to list files: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async installPackages(packages: string[]): Promise<CommandResult> {
    if (!this.containerId) {
      throw new Error('Sandbox not created. Call createSandbox() first.');
    }

    try {
      const installCommand = `npm install ${packages.join(' ')}`;
      return await this.runCommand(installCommand);
    } catch (error) {
      console.error('Failed to install packages:', error);
      return {
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        exitCode: 1,
        success: false,
      };
    }
  }

  async getSandboxUrl(): string | null {
    if (!this.containerId) {
      return null;
    }

    try {
      const containerInfo = await this.dockerClient.getContainerInfo(this.containerId);
      const ports = containerInfo.ports;

      // Check if port 3000 is mapped
      const portKey = '3000/tcp';
      if (ports[portKey] && ports[portKey].HostPort) {
        return `http://localhost:${ports[portKey].HostPort}`;
      }

      return null;
    } catch (error) {
      console.error('Failed to get sandbox URL:', error);
      return null;
    }
  }

  async getSandboxInfo(): SandboxInfo | null {
    return this.sandboxInfo;
  }

  async terminate(): Promise<void> {
    if (!this.containerId) {
      return;
    }

    try {
      await this.dockerClient.stopContainer(this.containerId);
      await this.dockerClient.removeContainer(this.containerId);
    } catch (error) {
      console.error('Failed to terminate sandbox:', error);
    } finally {
      this.containerId = null;
      this.sandboxInfo = null;
    }
  }

  async isAlive(): boolean {
    if (!this.containerId) {
      return false;
    }

    try {
      return await this.dockerClient.isContainerRunning(this.containerId);
    } catch (error) {
      console.error('Failed to check sandbox status:', error);
      return false;
    }
  }

  async setupViteApp(): Promise<void> {
    if (!this.containerId) {
      throw new Error('Sandbox not created. Call createSandbox() first.');
    }

    try {
      // Install Vite and React dependencies
      await this.installPackages(['vite', '@vitejs/plugin-react', 'react', 'react-dom']);

      // Create basic Vite config
      const viteConfig = `
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000
  }
})`;

      await this.writeFile('vite.config.js', viteConfig);

      // Create basic React app structure
      await this.dockerClient.execCommand(this.containerId, ['mkdir', '-p', `${this.selfHostedConfig.workingDirectory}/src`]);

      // Create main.jsx
      const mainJsx = `
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`;

      await this.writeFile('src/main.jsx', mainJsx);

      // Create App.jsx
      const appJsx = `
import React from 'react'

function App() {
  return (
    <div className="App">
      <h1>Hello from Self-Hosted Sandbox!</h1>
      <p>This is running in a Docker container.</p>
    </div>
  )
}

export default App`;

      await this.writeFile('src/App.jsx', appJsx);

      // Create index.css
      const indexCss = `
:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
  color-scheme: light dark;
  color: rgba(255, 255, 255, 0.87);
  background-color: #242424;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  min-height: 100vh;
  display: flex;
  place-items: center;
}

.App {
  text-align: center;
  padding: 2rem;
}

h1 {
  font-size: 3.2em;
  line-height: 1.1;
  margin-bottom: 1rem;
}

p {
  font-size: 1.2em;
}`;

      await this.writeFile('src/index.css', indexCss);

      // Create index.html
      const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Self-Hosted Sandbox</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`;

      await this.writeFile('index.html', indexHtml);

      // Update package.json with Vite script
      const packageJson = await this.readFile('package.json');
      const packageObj = JSON.parse(packageJson);
      packageObj.scripts.dev = 'vite --host 0.0.0.0 --port 3000';
      await this.writeFile('package.json', JSON.stringify(packageObj, null, 2));
    } catch (error) {
      console.error('Failed to setup Vite app:', error);
      throw error;
    }
  }

  async restartViteServer(): Promise<void> {
    if (!this.containerId) {
      throw new Error('Sandbox not created. Call createSandbox() first.');
    }

    try {
      // Kill any existing Vite processes
      await this.dockerClient.execCommand(this.containerId, ['pkill', '-f', 'vite']);
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Start Vite again
      await this.runCommand('npm run dev &');
    } catch (error) {
      console.error('Failed to restart Vite server:', error);
      throw error;
    }
  }
}