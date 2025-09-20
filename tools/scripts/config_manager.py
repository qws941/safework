#!/usr/bin/env python3
"""
SafeWork Configuration Manager
Dynamic configuration loading without hardcoding
"""

import os
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from dataclasses import dataclass, field


@dataclass
class ContainerConfig:
    """Container-specific configuration"""
    name: str
    image: str
    ports: Dict[str, str] = field(default_factory=dict)
    environment: Dict[str, str] = field(default_factory=dict)
    volumes: Dict[str, str] = field(default_factory=dict)
    restart_policy: str = "unless-stopped"
    network: str = "watchtower_default"
    health_check: Optional[Dict[str, Any]] = None


@dataclass
class DeploymentConfig:
    """Complete deployment configuration"""
    environment: str
    containers: Dict[str, ContainerConfig] = field(default_factory=dict)
    infrastructure: Dict[str, str] = field(default_factory=dict)
    monitoring: Dict[str, Any] = field(default_factory=dict)
    recovery: Dict[str, Any] = field(default_factory=dict)


class ConfigManager:
    """Central configuration manager for SafeWork deployment"""
    
    def __init__(self, environment: str = "production"):
        self.environment = environment
        self.project_root = Path(__file__).parent.parent
        self.config_dir = self.project_root / "config"
        self.logger = self._setup_logging()
        
        # Load configuration
        self.config = self._load_configuration()
    
    def _setup_logging(self) -> logging.Logger:
        """Setup logging for configuration manager"""
        logger = logging.getLogger("SafeWorkConfig")
        logger.setLevel(logging.INFO)
        
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)
        
        return logger
    
    def _load_env_file(self, file_path: Path) -> Dict[str, str]:
        """Load environment variables from .env file"""
        env_vars = {}
        
        if not file_path.exists():
            self.logger.warning(f"Configuration file not found: {file_path}")
            return env_vars
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                for line_num, line in enumerate(f, 1):
                    line = line.strip()
                    
                    # Skip comments and empty lines
                    if not line or line.startswith('#'):
                        continue
                    
                    # Parse key=value pairs
                    if '=' in line:
                        key, value = line.split('=', 1)
                        key = key.strip()
                        value = value.strip()
                        
                        # Handle environment variable substitution
                        if value.startswith('${') and value.endswith('}'):
                            env_key = value[2:-1]
                            value = os.environ.get(env_key, value)
                        
                        env_vars[key] = value
                    else:
                        self.logger.warning(
                            f"Invalid line in {file_path}:{line_num}: {line}"
                        )
            
            self.logger.info(f"Loaded {len(env_vars)} variables from {file_path}")
            
        except Exception as e:
            self.logger.error(f"Error loading {file_path}: {e}")
        
        return env_vars
    
    def _load_configuration(self) -> DeploymentConfig:
        """Load complete configuration for environment"""
        self.logger.info(f"Loading configuration for environment: {self.environment}")
        
        # Load base configuration
        base_config = self._load_env_file(self.config_dir / "deployment.env")
        
        # Load environment-specific configuration
        env_config_path = self.config_dir / "environments" / f"{self.environment}.env"
        env_config = self._load_env_file(env_config_path)
        
        # Merge configurations (environment-specific overrides base)
        merged_config = {**base_config, **env_config}
        
        # Override with actual environment variables
        for key in merged_config:
            if key in os.environ:
                merged_config[key] = os.environ[key]
        
        # Build deployment configuration
        config = DeploymentConfig(environment=self.environment)
        
        # Infrastructure configuration
        config.infrastructure = {
            'portainer_url': merged_config.get('PORTAINER_URL'),
            'portainer_api_key': merged_config.get('PORTAINER_API_KEY'),
            'portainer_endpoint_id': merged_config.get('PORTAINER_ENDPOINT_ID'),
            'registry_host': merged_config.get('REGISTRY_HOST'),
            'registry_user': merged_config.get('REGISTRY_USER'),
            'registry_password': merged_config.get('REGISTRY_PASSWORD'),
            'production_url': merged_config.get('PRODUCTION_URL'),
            'development_url': merged_config.get('DEVELOPMENT_URL'),
        }
        
        # Container configurations
        config.containers = self._build_container_configs(merged_config)
        
        # Monitoring configuration
        config.monitoring = {
            'health_check_interval': int(merged_config.get('HEALTH_CHECK_INTERVAL', 30)),
            'health_check_timeout': int(merged_config.get('HEALTH_CHECK_TIMEOUT', 10)),
            'health_check_retries': int(merged_config.get('HEALTH_CHECK_RETRIES', 15)),
            'log_retention_days': int(merged_config.get('LOG_RETENTION_DAYS', 7)),
        }
        
        # Recovery configuration
        config.recovery = {
            'max_attempts': int(merged_config.get('RECOVERY_MAX_ATTEMPTS', 3)),
            'retry_delay': int(merged_config.get('RECOVERY_RETRY_DELAY', 30)),
            'container_restart_delay': int(merged_config.get('CONTAINER_RESTART_DELAY', 10)),
            'network_recreation_timeout': int(merged_config.get('NETWORK_RECREATION_TIMEOUT', 60)),
        }
        
        self.logger.info("Configuration loaded successfully")
        return config
    
    def _build_container_configs(self, config: Dict[str, str]) -> Dict[str, ContainerConfig]:
        """Build container configurations from merged config"""
        containers = {}
        
        # PostgreSQL Container
        containers['postgres'] = ContainerConfig(
            name=config.get('POSTGRES_CONTAINER', 'safework-postgres'),
            image=config.get('POSTGRES_IMAGE', 'registry.jclee.me/safework/postgres:latest'),
            ports={},  # 외부 포트 제거 - 내부 통신만 사용
            environment={
                'TZ': config.get('TZ', 'Asia/Seoul'),
                'POSTGRES_PASSWORD': config.get('DB_PASSWORD'),
                'POSTGRES_DB': config.get('DB_NAME', 'safework_db'),
                'POSTGRES_USER': config.get('DB_USER', 'safework'),
            },
            network=config.get('NETWORK_NAME', 'watchtower_default'),
            restart_policy=config.get('CONTAINER_RESTART_POLICY', 'unless-stopped')
        )
        
        # Redis Container
        containers['redis'] = ContainerConfig(
            name=config.get('REDIS_CONTAINER', 'safework-redis'),
            image=config.get('REDIS_IMAGE', 'registry.jclee.me/safework/redis:latest'),
            ports={},  # 외부 포트 제거 - 내부 통신만 사용
            environment={
                'TZ': config.get('TZ', 'Asia/Seoul'),
            },
            network=config.get('NETWORK_NAME', 'watchtower_default'),
            restart_policy=config.get('CONTAINER_RESTART_POLICY', 'unless-stopped')
        )
        
        # Application Container
        containers['app'] = ContainerConfig(
            name=config.get('APP_CONTAINER', 'safework-app'),
            image=config.get('APP_IMAGE', 'registry.jclee.me/safework/app:latest'),
            ports={config.get('APP_PORT', '4545'): config.get('APP_PORT', '4545')},
            environment={
                'TZ': config.get('TZ', 'Asia/Seoul'),
                'DB_HOST': config.get('DB_HOST', 'safework-postgres'),
                'DB_NAME': config.get('DB_NAME', 'safework_db'),
                'DB_USER': config.get('DB_USER', 'safework'),
                'DB_PASSWORD': config.get('DB_PASSWORD'),
                'REDIS_HOST': config.get('REDIS_HOST', 'safework-redis'),
                'FLASK_CONFIG': config.get('FLASK_CONFIG', 'production'),
                'SECRET_KEY': config.get('SECRET_KEY'),
                'WTF_CSRF_ENABLED': config.get('WTF_CSRF_ENABLED', 'false'),
            },
            network=config.get('NETWORK_NAME', 'watchtower_default'),
            restart_policy=config.get('CONTAINER_RESTART_POLICY', 'unless-stopped')
        )
        
        return containers
    
    def get_container_config(self, container_name: str) -> Optional[ContainerConfig]:
        """Get configuration for specific container"""
        return self.config.containers.get(container_name)
    
    def get_infrastructure_config(self) -> Dict[str, str]:
        """Get infrastructure configuration"""
        return self.config.infrastructure
    
    def get_monitoring_config(self) -> Dict[str, Any]:
        """Get monitoring configuration"""
        return self.config.monitoring
    
    def get_recovery_config(self) -> Dict[str, Any]:
        """Get recovery configuration"""
        return self.config.recovery
    
    def validate_configuration(self) -> bool:
        """Validate that all required configuration is present"""
        required_keys = [
            'portainer_url', 'portainer_api_key', 'portainer_endpoint_id',
            'registry_host', 'production_url'
        ]
        
        missing_keys = []
        for key in required_keys:
            if not self.config.infrastructure.get(key):
                missing_keys.append(key)
        
        if missing_keys:
            self.logger.error(f"Missing required configuration: {missing_keys}")
            return False
        
        self.logger.info("Configuration validation passed")
        return True
    
    def export_env_vars(self) -> Dict[str, str]:
        """Export configuration as environment variables"""
        env_vars = {}
        
        # Infrastructure
        for key, value in self.config.infrastructure.items():
            if value:
                env_vars[key.upper()] = str(value)
        
        # Container environment variables
        for container in self.config.containers.values():
            for key, value in container.environment.items():
                if value:
                    env_vars[key] = str(value)
        
        return env_vars


def load_config(environment: str = None) -> ConfigManager:
    """Load configuration for specified environment"""
    if not environment:
        environment = os.environ.get('ENVIRONMENT', 'production')
    
    return ConfigManager(environment)


if __name__ == "__main__":
    import sys
    
    env = sys.argv[1] if len(sys.argv) > 1 else "production"
    config_manager = load_config(env)
    
    if config_manager.validate_configuration():
        print(f"✅ Configuration for '{env}' environment is valid")
        
        # Print summary
        infra = config_manager.get_infrastructure_config()
        print(f"\n📊 Infrastructure:")
        print(f"  - Portainer: {infra.get('portainer_url')}")
        print(f"  - Registry: {infra.get('registry_host')}")
        print(f"  - Production: {infra.get('production_url')}")
        
        print(f"\n🐳 Containers:")
        for name, container in config_manager.config.containers.items():
            print(f"  - {name}: {container.name} ({container.image})")
    else:
        print(f"❌ Configuration for '{env}' environment is invalid")
        sys.exit(1)