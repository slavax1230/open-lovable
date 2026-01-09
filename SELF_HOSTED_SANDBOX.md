# Self-Hosted Docker Sandbox

This document describes the self-hosted Docker sandbox implementation for Open Lovable, which provides an alternative to Vercel and E2B sandboxes.

## Overview

The self-hosted sandbox provider allows you to run development environments in local Docker containers, giving you full control over the sandbox environment and eliminating dependency on external services.

## Features

- **Local Docker Integration**: Uses your local Docker daemon to create isolated development environments
- **Resource Limits**: Configurable memory, CPU, and timeout limits for containers
- **Port Mapping**: Automatic port mapping for development servers (default: 3000)
- **File Management**: Read/write files within the sandbox
- **Command Execution**: Run commands within the container
- **Vite Support**: Built-in support for Vite development servers
- **Security**: Non-root user execution and isolated containers

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Enable self-hosted sandbox
SANDBOX_PROVIDER=self-hosted

# Docker Configuration (optional)
DOCKER_SOCKET_PATH=/var/run/docker.sock  # Default Docker socket path
DOCKER_HOST=localhost                    # Docker host (for TCP connection)
DOCKER_PORT=2376                         # Docker port (for TCP connection)
```

### App Configuration

The self-hosted sandbox can be configured in `config/app.config.ts`:

```typescript
selfHosted: {
  timeoutMinutes: 30,                    // Sandbox timeout
  devPort: 3000,                         // Development server port
  workingDirectory: '/app',              // Working directory in container
  baseImage: 'node:18-alpine',           // Base Docker image
  
  docker: {
    socketPath: '/var/run/docker.sock',  // Docker socket path
    host: process.env.DOCKER_HOST,       // Docker host
    port: process.env.DOCKER_PORT,       // Docker port
  },
  
  resources: {
    memory: 512 * 1024 * 1024,          // Memory limit (512MB)
    cpu: 50000,                          // CPU quota (50%)
    timeout: 30000,                      // Command timeout (30s)
  },
  
  network: {
    mode: 'bridge',                      // Network mode
    allowedPorts: [3000, 4000, 5000, 8000, 8080],
  },
}
```

## Usage

### Basic Usage

```typescript
import { createSandboxProvider } from './lib/sandbox/factory';

// Create self-hosted provider
const provider = createSandboxProvider('self-hosted', {
  apiKey: 'your-api-key',
  timeoutMs: 30000,
});

// Create sandbox
const sandbox = await provider.createSandbox();
console.log('Sandbox URL:', sandbox.url);

// Write files
await provider.writeFile('index.html', '<h1>Hello World</h1>');

// Run commands
const result = await provider.runCommand('ls -la');
console.log(result.stdout);

// Clean up
await provider.terminate();
```

### Vite Application Setup

The provider includes a built-in method to set up Vite applications:

```typescript
// Setup a complete Vite + React app
await provider.setupViteApp();

// Restart the development server
await provider.restartViteServer();
```

## Docker Image

The implementation includes a custom Dockerfile (`Dockerfile.sandbox`) that:

- Uses Node.js 18 Alpine for smaller size
- Includes necessary development tools (git, curl, bash)
- Creates a non-root user for security
- Exposes common development ports
- Configures npm for global packages

### Building the Custom Image

```bash
# Build the sandbox image
docker build -f Dockerfile.sandbox -t open-lovable-sandbox .

# Update the config to use the custom image
baseImage: 'open-lovable-sandbox'
```

## Testing

Run the included test script to verify the implementation:

```bash
# Make the test script executable
chmod +x test-self-hosted.js

# Run the test
node test-self-hosted.js
```

The test will:
1. Create a sandbox
2. Test file operations
3. Run commands
4. Set up a Vite application
5. Clean up resources

## Requirements

- Docker Desktop or Docker Engine running locally
- Node.js 18+
- Sufficient system resources (memory, CPU)

## Security Considerations

- Containers run as non-root user
- Resource limits prevent resource exhaustion
- Network isolation via bridge mode
- Automatic container cleanup
- Configurable timeout limits

## Troubleshooting

### Docker Connection Issues

1. **Docker not running**: Start Docker Desktop/Engine
2. **Permission denied**: Add user to docker group or use sudo
3. **Socket not found**: Check `DOCKER_SOCKET_PATH` environment variable

### Container Issues

1. **Image pull failures**: Check internet connection and image name
2. **Port conflicts**: Ensure configured ports are available
3. **Memory limits**: Adjust `resources.memory` in config

### Performance Issues

1. **Slow startup**: Use local Docker registry or smaller base image
2. **Resource limits**: Increase `resources.memory` and `resources.cpu`
3. **Network latency**: Use `bridge` mode for better performance

## Comparison with Other Providers

| Feature | Self-Hosted | Vercel | E2B |
|---------|-------------|--------|-----|
| Cost | Free | Pay-per-use | Pay-per-use |
| Setup | Docker required | Vercel account | E2B account |
| Performance | Local (fast) | Cloud (variable) | Cloud (variable) |
| Control | Full | Limited | Limited |
| Security | Self-managed | Vercel-managed | E2B-managed |
| Persistence | Configurable | Ephemeral | Ephemeral |

## Development

To extend or modify the self-hosted provider:

1. **Docker Client**: Modify `SimpleDockerClient` in `self-hosted-provider.ts`
2. **Configuration**: Update `selfHosted` section in `app.config.ts`
3. **Container Setup**: Modify `initializeNodeEnvironment` method
4. **Vite Setup**: Update `setupViteApp` method

## Contributing

When contributing to the self-hosted sandbox:

1. Test changes with the included test script
2. Update documentation for new features
3. Consider security implications
4. Maintain compatibility with existing providers