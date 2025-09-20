#!/usr/bin/env python3
"""
SafeWork Docker API Client
Version-compatible Docker API client with automatic fallback
"""

import json
import time
import logging
import requests
from typing import Dict, Any, Optional, List, Union
from dataclasses import dataclass
from config_manager import load_config, ContainerConfig


@dataclass
class APIResponse:
    """Standardized API response"""
    success: bool
    data: Any = None
    error: Optional[str] = None
    status_code: Optional[int] = None


class DockerAPIClient:
    """Version-compatible Docker API client via Portainer"""
    
    def __init__(self, environment: str = "production"):
        self.config_manager = load_config(environment)
        self.infra_config = self.config_manager.get_infrastructure_config()
        
        self.base_url = self.infra_config['portainer_url']
        self.api_key = self.infra_config['portainer_api_key']
        self.endpoint_id = self.infra_config['portainer_endpoint_id']
        
        self.session = requests.Session()
        self.session.headers.update({
            'X-API-Key': self.api_key,
            'Content-Type': 'application/json'
        })
        
        self.logger = self._setup_logging()
        
        # API version compatibility
        self.api_versions = ['1.41', '1.40', '1.39', '1.38']
        self.current_api_version = None
        
    def _setup_logging(self) -> logging.Logger:
        """Setup logging for Docker API client"""
        logger = logging.getLogger("DockerAPIClient")
        logger.setLevel(logging.INFO)
        
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)
        
        return logger
    
    def _make_request(self, method: str, endpoint: str, **kwargs) -> APIResponse:
        """Make HTTP request with error handling"""
        url = f"{self.base_url}/api/endpoints/{self.endpoint_id}/docker{endpoint}"
        
        try:
            response = self.session.request(method, url, **kwargs)
            
            if response.status_code < 400:
                try:
                    data = response.json() if response.content else None
                except json.JSONDecodeError:
                    data = response.text
                
                return APIResponse(
                    success=True,
                    data=data,
                    status_code=response.status_code
                )
            else:
                error_msg = f"HTTP {response.status_code}: {response.text}"
                return APIResponse(
                    success=False,
                    error=error_msg,
                    status_code=response.status_code
                )
                
        except requests.RequestException as e:
            return APIResponse(
                success=False,
                error=f"Request failed: {str(e)}"
            )
    
    def _detect_api_version(self) -> Optional[str]:
        """Detect compatible Docker API version"""
        for version in self.api_versions:
            response = self._make_request('GET', f'/version')
            if response.success:
                self.current_api_version = version
                self.logger.info(f"Using Docker API version: {version}")
                return version
        
        self.logger.warning("Could not detect Docker API version, using default")
        return self.api_versions[0]
    
    def list_containers(self, all_containers: bool = False) -> APIResponse:
        """List containers with API version compatibility"""
        params = {'all': 'true' if all_containers else 'false'}
        return self._make_request('GET', '/containers/json', params=params)
    
    def get_container(self, container_id: str) -> APIResponse:
        """Get container details"""
        return self._make_request('GET', f'/containers/{container_id}/json')
    
    def create_container(self, config: Dict[str, Any], name: str = None) -> APIResponse:
        """Create container with API version compatibility"""
        params = {}
        if name:
            params['name'] = name
        
        # Ensure compatible configuration format
        compatible_config = self._make_config_compatible(config)
        
        return self._make_request(
            'POST', 
            '/containers/create',
            params=params,
            json=compatible_config
        )
    
    def start_container(self, container_id: str) -> APIResponse:
        """Start container with compatibility for different API versions"""
        # For newer API versions, use empty body
        return self._make_request('POST', f'/containers/{container_id}/start')
    
    def stop_container(self, container_id: str, timeout: int = 30) -> APIResponse:
        """Stop container"""
        params = {'t': timeout}
        return self._make_request('POST', f'/containers/{container_id}/stop', params=params)
    
    def restart_container(self, container_id: str, timeout: int = 30) -> APIResponse:
        """Restart container"""
        params = {'t': timeout}
        return self._make_request('POST', f'/containers/{container_id}/restart', params=params)
    
    def remove_container(self, container_id: str, force: bool = False) -> APIResponse:
        """Remove container"""
        params = {'force': 'true' if force else 'false'}
        return self._make_request('DELETE', f'/containers/{container_id}', params=params)
    
    def get_container_logs(self, container_id: str, lines: int = 100) -> APIResponse:
        """Get container logs"""
        params = {
            'stdout': 'true',
            'stderr': 'true',
            'tail': str(lines)
        }
        return self._make_request('GET', f'/containers/{container_id}/logs', params=params)
    
    def pull_image(self, image: str, auth_config: Dict[str, str] = None) -> APIResponse:
        """Pull Docker image"""
        params = {'fromImage': image}
        
        headers = {}
        if auth_config:
            auth_header = json.dumps(auth_config)
            headers['X-Registry-Auth'] = auth_header
        
        return self._make_request(
            'POST',
            '/images/create',
            params=params,
            headers=headers
        )
    
    def create_network(self, network_config: Dict[str, Any]) -> APIResponse:
        """Create Docker network"""
        return self._make_request('POST', '/networks/create', json=network_config)
    
    def remove_network(self, network_id: str) -> APIResponse:
        """Remove Docker network"""
        return self._make_request('DELETE', f'/networks/{network_id}')
    
    def _make_config_compatible(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Make container configuration compatible with API version"""
        compatible_config = config.copy()
        
        # Ensure required fields exist
        if 'Image' not in compatible_config:
            raise ValueError("Container configuration must include 'Image'")
        
        # Handle HostConfig properly
        if 'HostConfig' not in compatible_config:
            compatible_config['HostConfig'] = {}
        
        # Ensure NetworkingConfig is properly formatted
        if 'NetworkingConfig' in compatible_config:
            networking = compatible_config['NetworkingConfig']
            if 'EndpointsConfig' in networking:
                # Ensure each network endpoint has proper structure
                for network_name, endpoint_config in networking['EndpointsConfig'].items():
                    if endpoint_config is None or endpoint_config == {}:
                        networking['EndpointsConfig'][network_name] = {}
        
        return compatible_config
    
    def build_container_config(self, container_config: ContainerConfig) -> Dict[str, Any]:
        """Build Docker API container configuration from ContainerConfig"""
        config = {
            'Image': container_config.image,
            'Env': [f"{k}={v}" for k, v in container_config.environment.items() if v],
            'ExposedPorts': {},
            'HostConfig': {
                'RestartPolicy': {'Name': container_config.restart_policy},
                'PortBindings': {},
                'NetworkMode': container_config.network
            }
        }
        
        # Configure ports
        for container_port, host_port in container_config.ports.items():
            port_key = f"{container_port}/tcp"
            config['ExposedPorts'][port_key] = {}
            config['HostConfig']['PortBindings'][port_key] = [{'HostPort': str(host_port)}]
        
        # Configure volumes
        if container_config.volumes:
            config['HostConfig']['Binds'] = [
                f"{host_path}:{container_path}" 
                for container_path, host_path in container_config.volumes.items()
            ]
        
        return config


class ContainerManager:
    """High-level container management using Docker API client"""
    
    def __init__(self, environment: str = "production"):
        self.api_client = DockerAPIClient(environment)
        self.config_manager = load_config(environment)
        self.recovery_config = self.config_manager.get_recovery_config()
        self.logger = logging.getLogger("ContainerManager")
    
    def deploy_container(self, container_name: str, force_recreate: bool = False) -> APIResponse:
        """Deploy a single container with proper lifecycle management"""
        container_config = self.config_manager.get_container_config(container_name)
        if not container_config:
            return APIResponse(
                success=False,
                error=f"No configuration found for container: {container_name}"
            )
        
        self.logger.info(f"Deploying container: {container_config.name}")
        
        # Check if container exists
        existing = self._find_container(container_config.name)
        
        if existing and force_recreate:
            self.logger.info(f"Force recreating container: {container_config.name}")
            self._remove_container_safe(existing['Id'])
            existing = None
        
        if existing:
            # Container exists, check if it's running
            if existing['State'] == 'running':
                self.logger.info(f"Container {container_config.name} is already running")
                return APIResponse(success=True, data=existing)
            else:
                # Start existing container
                return self.api_client.start_container(existing['Id'])
        else:
            # Create and start new container
            return self._create_and_start_container(container_config)
    
    def _find_container(self, container_name: str) -> Optional[Dict[str, Any]]:
        """Find container by name"""
        response = self.api_client.list_containers(all_containers=True)
        if not response.success:
            return None
        
        for container in response.data:
            if f"/{container_name}" in container.get('Names', []):
                return container
        
        return None
    
    def _remove_container_safe(self, container_id: str) -> bool:
        """Safely remove container (stop first if running)"""
        try:
            # Stop container first
            stop_response = self.api_client.stop_container(container_id)
            if not stop_response.success:
                self.logger.warning(f"Could not stop container {container_id}: {stop_response.error}")
            
            # Wait a moment
            time.sleep(2)
            
            # Remove container
            remove_response = self.api_client.remove_container(container_id, force=True)
            if remove_response.success:
                self.logger.info(f"Container {container_id} removed successfully")
                return True
            else:
                self.logger.error(f"Failed to remove container {container_id}: {remove_response.error}")
                return False
                
        except Exception as e:
            self.logger.error(f"Error removing container {container_id}: {e}")
            return False
    
    def _create_and_start_container(self, container_config: ContainerConfig) -> APIResponse:
        """Create and start a new container"""
        # Build Docker API configuration
        docker_config = self.api_client.build_container_config(container_config)
        
        # Create container
        create_response = self.api_client.create_container(
            docker_config, 
            name=container_config.name
        )
        
        if not create_response.success:
            return create_response
        
        container_id = create_response.data.get('Id')
        self.logger.info(f"Container created: {container_id}")
        
        # Start container
        start_response = self.api_client.start_container(container_id)
        
        if start_response.success:
            self.logger.info(f"Container {container_config.name} started successfully")
        else:
            self.logger.error(f"Failed to start container {container_config.name}: {start_response.error}")
        
        return start_response
    
    def deploy_all_containers(self, force_recreate: bool = False) -> Dict[str, APIResponse]:
        """Deploy all SafeWork containers"""
        results = {}
        
        # Deploy in order: postgres -> redis -> app
        deploy_order = ['postgres', 'redis', 'app']
        
        for container_name in deploy_order:
            self.logger.info(f"Deploying {container_name} container...")
            
            result = self.deploy_container(container_name, force_recreate)
            results[container_name] = result
            
            if result.success:
                self.logger.info(f"✅ {container_name} deployed successfully")
                # Wait between container starts
                if container_name != 'app':  # Don't wait after the last container
                    time.sleep(self.recovery_config['container_restart_delay'])
            else:
                self.logger.error(f"❌ Failed to deploy {container_name}: {result.error}")
                break  # Stop on first failure
        
        return results
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get comprehensive system status"""
        status = {
            'containers': {},
            'overall_health': 'unknown',
            'timestamp': time.time()
        }
        
        # Check each container
        healthy_containers = 0
        total_containers = 0
        
        for container_name in ['postgres', 'redis', 'app']:
            container_config = self.config_manager.get_container_config(container_name)
            if not container_config:
                continue
            
            total_containers += 1
            container = self._find_container(container_config.name)
            
            if container:
                status['containers'][container_name] = {
                    'name': container_config.name,
                    'state': container.get('State', 'unknown'),
                    'status': container.get('Status', 'unknown'),
                    'id': container.get('Id', '')[:12]
                }
                
                if container.get('State') == 'running':
                    healthy_containers += 1
            else:
                status['containers'][container_name] = {
                    'name': container_config.name,
                    'state': 'missing',
                    'status': 'Container not found',
                    'id': ''
                }
        
        # Determine overall health
        if healthy_containers == total_containers:
            status['overall_health'] = 'healthy'
        elif healthy_containers > 0:
            status['overall_health'] = 'degraded'
        else:
            status['overall_health'] = 'unhealthy'
        
        return status


if __name__ == "__main__":
    import sys
    
    # Test the Docker API client
    environment = sys.argv[1] if len(sys.argv) > 1 else "production"
    
    try:
        manager = ContainerManager(environment)
        status = manager.get_system_status()
        
        print(f"🔍 SafeWork System Status ({environment})")
        print(f"📊 Overall Health: {status['overall_health']}")
        print(f"\n🐳 Containers:")
        
        for name, info in status['containers'].items():
            state_emoji = "🟢" if info['state'] == 'running' else "🔴"
            print(f"  {state_emoji} {name}: {info['state']} - {info['status']}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)