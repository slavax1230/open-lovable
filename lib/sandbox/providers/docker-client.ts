import Docker from 'dockerode';
import { CommandResult } from '../types';

export interface DockerClientConfig {
  socketPath?: string;
  host?: string;
  port?: number;
}

export class DockerClient {
  private docker: Docker;

  constructor(config: DockerClientConfig = {}) {
    // Use Docker socket by default, fallback to TCP
    const socketPath = config.socketPath || process.env.DOCKER_SOCKET_PATH || '/var/run/docker.sock';
    
    if (config.host || config.port) {
      // Use TCP connection if host/port specified
      this.docker = new Docker({
        host: config.host || 'localhost',
        port: config.port || 2376,
      });
    } else {
      // Use Unix socket by default
      this.docker = new Docker({
        socketPath,
      });
    }
  }

  async ping(): Promise<boolean> {
    try {
      await this.docker.ping();
      return true;
    } catch (error) {
      console.error('Docker connection failed:', error);
      return false;
    }
  }

  async createContainer(options: {
    image: string;
    name?: string;
    cmd?: string[];
    env?: Record<string, string>;
    workingDir?: string;
    volumes?: string[];
    ports?: Record<string, any>;
    hostConfig?: {
      Memory?: number;
      CpuQuota?: number;
      CpuShares?: number;
      NetworkMode?: string;
      AutoRemove?: boolean;
    };
  }): Promise<{ id: string; container: any }> {
    try {
      const container = await this.docker.createContainer({
        Image: options.image,
        name: options.name,
        Cmd: options.cmd,
        Env: options.env ? Object.entries(options.env).map(([k, v]) => `${k}=${v}`) : undefined,
        WorkingDir: options.workingDir,
        HostConfig: {
          Binds: options.volumes,
          PortBindings: options.ports,
          Memory: options.hostConfig?.Memory,
          CpuQuota: options.hostConfig?.CpuQuota,
          CpuShares: options.hostConfig?.CpuShares,
          NetworkMode: options.hostConfig?.NetworkMode,
          AutoRemove: options.hostConfig?.AutoRemove ?? true,
        },
      });

      return {
        id: container.id,
        container,
      };
    } catch (error) {
      console.error('Failed to create container:', error);
      throw error;
    }
  }

  async startContainer(containerId: string): Promise<void> {
    try {
      await this.docker.getContainer(containerId).start();
    } catch (error) {
      console.error('Failed to start container:', error);
      throw error;
    }
  }

  async stopContainer(containerId: string): Promise<void> {
    try {
      await this.docker.getContainer(containerId).stop();
    } catch (error) {
      console.error('Failed to stop container:', error);
      throw error;
    }
  }

  async removeContainer(containerId: string): Promise<void> {
    try {
      await this.docker.getContainer(containerId).remove({ force: true });
    } catch (error) {
      console.error('Failed to remove container:', error);
      throw error;
    }
  }

  async execCommand(containerId: string, command: string[]): Promise<CommandResult> {
    try {
      const exec = await this.docker.getContainer(containerId).exec({
        Cmd: command,
        AttachStdout: true,
        AttachStderr: true,
      });

      const stream = await exec.start({ hijack: false, stdin: false });
      
      let stdout = '';
      let stderr = '';

      // Wait for the command to complete
      const data = await this.docker.modem.followExec(exec.id, containerId, {
        hijack: false,
        stdin: false,
      });

      if (data && data.output) {
        // Parse the output
        for (const chunk of data.output) {
          if (chunk.stdout) {
            stdout += Buffer.from(chunk.stdout).toString();
          }
          if (chunk.stderr) {
            stderr += Buffer.from(chunk.stderr).toString();
          }
        }
      }

      // Get exit code
      const inspect = await this.docker.getContainer(containerId).inspect();
      const exitCode = inspect.State.ExitCode || 0;

      return {
        stdout,
        stderr,
        exitCode,
        success: exitCode === 0,
      };
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

  async writeFile(containerId: string, path: string, content: string): Promise<void> {
    try {
      // Create a temporary container with the file mounted
      const tempContainer = await this.docker.createContainer({
        Image: 'alpine:latest',
        Cmd: ['sh', '-c', `echo '${content.replace(/'/g, "'\\''")}' > ${path}`],
        HostConfig: {
          AutoRemove: true,
          VolumesFrom: [containerId],
        },
      });

      await tempContainer.start();
      await tempContainer.wait();
    } catch (error) {
      console.error('Failed to write file:', error);
      throw error;
    }
  }

  async readFile(containerId: string, path: string): Promise<string> {
    try {
      const result = await this.execCommand(containerId, ['cat', path]);
      if (!result.success) {
        throw new Error(`Failed to read file: ${result.stderr}`);
      }
      return result.stdout;
    } catch (error) {
      console.error('Failed to read file:', error);
      throw error;
    }
  }

  async listFiles(containerId: string, directory: string = '/'): Promise<string[]> {
    try {
      const result = await this.execCommand(containerId, ['ls', '-la', directory]);
      if (!result.success) {
        throw new Error(`Failed to list files: ${result.stderr}`);
      }
      
      // Parse ls output to get file names
      const lines = result.stdout.split('\n').filter(line => line.trim());
      const files: string[] = [];
      
      for (const line of lines) {
        // Skip total line and directory entries
        if (line.startsWith('total') || line.includes('<DIR>')) {
          continue;
        }
        
        // Extract filename from ls output
        const parts = line.trim().split(/\s+/);
        if (parts.length > 0) {
          const filename = parts[parts.length - 1];
          if (filename !== '.' && filename !== '..') {
            files.push(filename);
          }
        }
      }
      
      return files;
    } catch (error) {
      console.error('Failed to list files:', error);
      throw error;
    }
  }

  async getContainerInfo(containerId: string): Promise<{
    id: string;
    status: string;
    ports: Record<string, any>;
    networkSettings?: any;
  }> {
    try {
      const inspect = await this.docker.getContainer(containerId).inspect();
      
      const ports: Record<string, any> = {};
      if (inspect.NetworkSettings && inspect.NetworkSettings.Ports) {
        for (const [containerPort, hostBindings] of Object.entries(inspect.NetworkSettings.Ports)) {
          if (hostBindings && hostBindings.length > 0) {
            ports[containerPort] = hostBindings[0];
          }
        }
      }

      return {
        id: inspect.Id,
        status: inspect.State.Status,
        ports,
        networkSettings: inspect.NetworkSettings,
      };
    } catch (error) {
      console.error('Failed to get container info:', error);
      throw error;
    }
  }

  async isContainerRunning(containerId: string): Promise<boolean> {
    try {
      const info = await this.getContainerInfo(containerId);
      return info.status === 'running';
    } catch (error) {
      return false;
    }
  }

  async pullImage(imageName: string): Promise<void> {
    try {
      await new Promise((resolve, reject) => {
        this.docker.pull(imageName, (err, stream) => {
          if (err) {
            reject(err);
            return;
          }
          
          if (stream) {
            this.docker.modem.followProgress(stream, (event, progress) => {
              if (event === 'end') {
                resolve();
              }
            });
          } else {
            resolve();
          }
        });
      });
    } catch (error) {
      console.error('Failed to pull image:', error);
      throw error;
    }
  }

  async listImages(): Promise<any[]> {
    try {
      const images = await this.docker.listImages();
      return images;
    } catch (error) {
      console.error('Failed to list images:', error);
      throw error;
    }
  }
}