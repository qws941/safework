#!/usr/bin/env python3
"""
SafeWork Root Solution Manager
Comprehensive solution to eliminate hardcoding and provide robust deployment
"""

import os
import sys
import json
import time
import logging
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional

# Import our custom modules
from config_manager import ConfigManager, load_config
from docker_api_client import ContainerManager
from container_lifecycle_manager import LifecycleManager
from monitoring_system import HealthMonitor


class SafeWorkSolution:
    """Complete SafeWork deployment and management solution"""
    
    def __init__(self, environment: str = "production", config_path: Optional[str] = None):
        self.environment = environment
        self.config_path = config_path
        
        # Initialize components
        self.config_manager = self._initialize_config()
        self.container_manager = ContainerManager(environment)
        self.lifecycle_manager = LifecycleManager(environment)
        self.health_monitor = HealthMonitor(environment)
        
        self.logger = self._setup_logging()
        
        # Solution metadata
        self.solution_info = {
            'name': 'SafeWork Root Solution',
            'version': '1.0.0',
            'environment': environment,
            'created': datetime.now().isoformat(),
            'features': [
                'Environment-based configuration',
                'Docker API compatibility',
                'Automated container lifecycle',
                'Self-healing monitoring',
                'Emergency recovery'
            ]
        }
    
    def _initialize_config(self) -> ConfigManager:
        """Initialize configuration manager with validation"""
        if self.config_path:
            # Custom config path
            os.environ['SAFEWORK_CONFIG_PATH'] = self.config_path
        
        config_manager = load_config(self.environment)
        
        if not config_manager.validate_configuration():
            raise ValueError(f"Invalid configuration for environment: {self.environment}")
        
        return config_manager
    
    def _setup_logging(self) -> logging.Logger:
        """Setup comprehensive logging"""
        logger = logging.getLogger("SafeWorkSolution")
        logger.setLevel(logging.INFO)
        
        if not logger.handlers:
            # Console handler with colors
            console_handler = logging.StreamHandler()
            console_formatter = logging.Formatter(
                '%(asctime)s - 🔧 %(name)s - %(levelname)s - %(message)s'
            )
            console_handler.setFormatter(console_formatter)
            logger.addHandler(console_handler)
            
            # File handler for persistent logging
            try:
                log_dir = Path('/tmp/safework_logs')
                log_dir.mkdir(exist_ok=True)
                
                file_handler = logging.FileHandler(
                    log_dir / f'safework_solution_{self.environment}.log'
                )
                file_formatter = logging.Formatter(
                    '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s'
                )
                file_handler.setFormatter(file_formatter)
                logger.addHandler(file_handler)
                
            except Exception as e:
                logger.warning(f"Could not setup file logging: {e}")
        
        return logger
    
    def validate_environment(self) -> Dict[str, Any]:
        """Validate complete environment setup"""
        self.logger.info(f"🔍 Validating {self.environment} environment...")
        
        validation_results = {
            'environment': self.environment,
            'timestamp': datetime.now().isoformat(),
            'validations': {},
            'overall_status': 'unknown'
        }
        
        # Configuration validation
        config_valid = self.config_manager.validate_configuration()
        validation_results['validations']['configuration'] = {
            'status': 'pass' if config_valid else 'fail',
            'message': 'Configuration loaded and validated' if config_valid else 'Configuration validation failed'
        }
        
        # Infrastructure connectivity
        try:
            infra_config = self.config_manager.get_infrastructure_config()
            portainer_url = infra_config.get('portainer_url')
            
            if portainer_url:
                # Test Portainer API connectivity
                response = self.container_manager.api_client.list_containers()
                validation_results['validations']['portainer_api'] = {
                    'status': 'pass' if response.success else 'fail',
                    'message': 'Portainer API accessible' if response.success else f'Portainer API error: {response.error}'
                }
            else:
                validation_results['validations']['portainer_api'] = {
                    'status': 'fail',
                    'message': 'No Portainer URL configured'
                }
                
        except Exception as e:
            validation_results['validations']['portainer_api'] = {
                'status': 'fail',
                'message': f'Portainer validation error: {e}'
            }
        
        # Container images validation
        try:
            containers_config = self.config_manager.config.containers
            image_validation = {}
            
            for container_name, container_config in containers_config.items():
                # We can't easily validate image existence without pulling,
                # but we can validate the configuration
                image_validation[container_name] = {
                    'image': container_config.image,
                    'ports_configured': len(container_config.ports) > 0,
                    'environment_configured': len(container_config.environment) > 0
                }
            
            validation_results['validations']['container_config'] = {
                'status': 'pass',
                'message': f'Container configurations validated for {len(image_validation)} containers',
                'details': image_validation
            }
            
        except Exception as e:
            validation_results['validations']['container_config'] = {
                'status': 'fail',
                'message': f'Container configuration error: {e}'
            }
        
        # Determine overall status
        all_validations = validation_results['validations'].values()
        failed_validations = [v for v in all_validations if v['status'] == 'fail']
        
        if not failed_validations:
            validation_results['overall_status'] = 'pass'
            self.logger.info("✅ All environment validations passed")
        else:
            validation_results['overall_status'] = 'fail'
            self.logger.error(f"❌ {len(failed_validations)} validation(s) failed")
            for validation in failed_validations:
                self.logger.error(f"  - {validation['message']}")
        
        return validation_results
    
    def deploy_complete_system(self, force_recreate: bool = False, start_monitoring: bool = True) -> Dict[str, Any]:
        """Deploy complete SafeWork system with monitoring"""
        self.logger.info(f"🚀 Deploying complete SafeWork system (environment: {self.environment})")
        
        deployment_results = {
            'environment': self.environment,
            'timestamp': datetime.now().isoformat(),
            'force_recreate': force_recreate,
            'phases': {},
            'overall_status': 'unknown'
        }
        
        try:
            # Phase 1: Validation
            self.logger.info("📋 Phase 1: Environment validation")
            validation_results = self.validate_environment()
            deployment_results['phases']['validation'] = validation_results
            
            if validation_results['overall_status'] != 'pass':
                deployment_results['overall_status'] = 'failed'
                deployment_results['error'] = 'Environment validation failed'
                return deployment_results
            
            # Phase 2: Container deployment
            self.logger.info("🐳 Phase 2: Container deployment")
            container_results = self.lifecycle_manager.deploy_system(force_recreate=force_recreate)
            
            deployment_success = all(result.success for result in container_results.values())
            deployment_results['phases']['container_deployment'] = {
                'status': 'pass' if deployment_success else 'fail',
                'results': {
                    name: {'success': result.success, 'error': result.error}
                    for name, result in container_results.items()
                }
            }
            
            if not deployment_success:
                deployment_results['overall_status'] = 'failed'
                deployment_results['error'] = 'Container deployment failed'
                return deployment_results
            
            # Phase 3: Health verification
            self.logger.info("🏥 Phase 3: Health verification")
            time.sleep(30)  # Wait for containers to stabilize
            
            health_status = self.container_manager.get_system_status()
            deployment_results['phases']['health_verification'] = {
                'status': 'pass' if health_status['overall_health'] == 'healthy' else 'fail',
                'health_status': health_status
            }
            
            # Phase 4: Start monitoring (if requested)
            if start_monitoring:
                self.logger.info("🔍 Phase 4: Starting monitoring")
                self.health_monitor.start_monitoring()
                
                # Wait a moment and get initial monitoring report
                time.sleep(10)
                monitoring_report = self.health_monitor.get_monitoring_report()
                
                deployment_results['phases']['monitoring'] = {
                    'status': 'pass',
                    'monitoring_active': monitoring_report['monitoring_active'],
                    'initial_report': monitoring_report
                }
            
            # Final status
            if health_status['overall_health'] == 'healthy':
                deployment_results['overall_status'] = 'success'
                self.logger.info("✅ Complete system deployment successful")
            else:
                deployment_results['overall_status'] = 'degraded'
                self.logger.warning("⚠️ System deployed but health check shows issues")
            
        except Exception as e:
            self.logger.error(f"❌ Deployment failed: {e}")
            deployment_results['overall_status'] = 'failed'
            deployment_results['error'] = str(e)
        
        return deployment_results
    
    def emergency_recovery(self) -> Dict[str, Any]:
        """Execute emergency recovery procedure"""
        self.logger.info("🚨 EMERGENCY RECOVERY INITIATED")
        
        recovery_results = {
            'environment': self.environment,
            'timestamp': datetime.now().isoformat(),
            'recovery_type': 'emergency',
            'phases': {},
            'overall_status': 'unknown'
        }
        
        try:
            # Stop any existing monitoring
            if self.health_monitor.monitoring_active:
                self.health_monitor.stop_monitoring()
            
            # Execute emergency recovery
            emergency_result = self.lifecycle_manager.emergency_recovery()
            recovery_results['phases']['emergency_recovery'] = emergency_result
            
            # Restart monitoring
            self.health_monitor.start_monitoring()
            
            # Verify recovery
            time.sleep(60)  # Wait longer for emergency recovery
            final_health = self.container_manager.get_system_status()
            recovery_results['phases']['final_verification'] = {
                'health_status': final_health,
                'recovery_successful': final_health['overall_health'] == 'healthy'
            }
            
            if final_health['overall_health'] == 'healthy':
                recovery_results['overall_status'] = 'success'
                self.logger.info("✅ Emergency recovery successful")
            else:
                recovery_results['overall_status'] = 'failed'
                self.logger.error("❌ Emergency recovery completed but system still unhealthy")
            
        except Exception as e:
            self.logger.error(f"❌ Emergency recovery failed: {e}")
            recovery_results['overall_status'] = 'failed'
            recovery_results['error'] = str(e)
        
        return recovery_results
    
    def get_comprehensive_status(self) -> Dict[str, Any]:
        """Get comprehensive system status"""
        return {
            'solution_info': self.solution_info,
            'environment': self.environment,
            'timestamp': datetime.now().isoformat(),
            'configuration': {
                'valid': self.config_manager.validate_configuration(),
                'containers': list(self.config_manager.config.containers.keys()),
                'infrastructure': {
                    k: v for k, v in self.config_manager.get_infrastructure_config().items()
                    if k not in ['portainer_api_key', 'registry_password']  # Hide sensitive data
                }
            },
            'container_status': self.container_manager.get_system_status(),
            'lifecycle_status': self.lifecycle_manager.get_health_report(),
            'monitoring_status': self.health_monitor.get_monitoring_report()
        }
    
    def cleanup_resources(self):
        """Cleanup resources and stop monitoring"""
        self.logger.info("🧹 Cleaning up resources...")
        
        try:
            if self.health_monitor.monitoring_active:
                self.health_monitor.stop_monitoring()
            
            self.logger.info("✅ Cleanup completed")
            
        except Exception as e:
            self.logger.error(f"❌ Cleanup error: {e}")


def create_cli_parser() -> argparse.ArgumentParser:
    """Create CLI argument parser"""
    parser = argparse.ArgumentParser(
        description='SafeWork Root Solution - Comprehensive deployment and management',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s deploy --environment production
  %(prog)s status --environment development
  %(prog)s monitor --environment production
  %(prog)s emergency --environment production
  %(prog)s validate --environment production
        """
    )
    
    parser.add_argument(
        'command',
        choices=['deploy', 'status', 'monitor', 'emergency', 'validate'],
        help='Command to execute'
    )
    
    parser.add_argument(
        '--environment', '-e',
        default='production',
        help='Environment to operate on (default: production)'
    )
    
    parser.add_argument(
        '--config-path', '-c',
        help='Custom configuration path'
    )
    
    parser.add_argument(
        '--force', '-f',
        action='store_true',
        help='Force recreate containers during deployment'
    )
    
    parser.add_argument(
        '--no-monitoring',
        action='store_true',
        help='Skip starting monitoring after deployment'
    )
    
    parser.add_argument(
        '--output', '-o',
        choices=['json', 'text'],
        default='text',
        help='Output format (default: text)'
    )
    
    return parser


def main():
    """Main CLI entry point"""
    parser = create_cli_parser()
    args = parser.parse_args()
    
    try:
        # Initialize solution
        solution = SafeWorkSolution(
            environment=args.environment,
            config_path=args.config_path
        )
        
        # Execute command
        if args.command == 'deploy':
            result = solution.deploy_complete_system(
                force_recreate=args.force,
                start_monitoring=not args.no_monitoring
            )
            
        elif args.command == 'status':
            result = solution.get_comprehensive_status()
            
        elif args.command == 'monitor':
            print(f"🔍 Starting monitoring for {args.environment} environment... (Ctrl+C to stop)")
            solution.health_monitor.start_monitoring()
            try:
                while True:
                    time.sleep(30)
                    report = solution.health_monitor.get_monitoring_report()
                    status_emoji = "✅" if report.get('current_status', {}).get('app_health', {}).get('healthy') else "❌"
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] {status_emoji} "
                          f"Uptime: {report['uptime_percentage']}% - "
                          f"Alerts: {report['alerts_last_24h']}")
            except KeyboardInterrupt:
                solution.cleanup_resources()
                print("\n🔍 Monitoring stopped")
                return
            
        elif args.command == 'emergency':
            result = solution.emergency_recovery()
            
        elif args.command == 'validate':
            result = solution.validate_environment()
        
        # Output results
        if args.output == 'json':
            print(json.dumps(result, indent=2))
        else:
            # Text output
            print(f"\n🔧 SafeWork Solution - {args.command.title()} Results")
            print(f"Environment: {args.environment}")
            print(f"Timestamp: {result.get('timestamp', 'N/A')}")
            
            if 'overall_status' in result:
                status_emoji = {
                    'success': '✅',
                    'pass': '✅',
                    'failed': '❌',
                    'fail': '❌',
                    'degraded': '⚠️',
                    'unknown': '❓'
                }.get(result['overall_status'], '❓')
                
                print(f"Status: {status_emoji} {result['overall_status'].upper()}")
                
                if 'error' in result:
                    print(f"Error: {result['error']}")
        
        # Cleanup
        solution.cleanup_resources()
        
        # Exit with appropriate code
        if result.get('overall_status') in ['success', 'pass']:
            sys.exit(0)
        else:
            sys.exit(1)
            
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()