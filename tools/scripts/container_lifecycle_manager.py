#!/usr/bin/env python3
"""
SafeWork Container Lifecycle Manager
Automated container deployment, monitoring, and recovery
"""

import time
import logging
import threading
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass
from datetime import datetime, timedelta
from docker_api_client import ContainerManager, APIResponse
from config_manager import load_config


@dataclass
class HealthCheck:
    """Health check configuration"""
    endpoint: str
    interval: int = 30
    timeout: int = 10
    retries: int = 3
    expected_status: int = 200


@dataclass
class RecoveryAction:
    """Recovery action configuration"""
    name: str
    action: Callable
    priority: int = 1
    max_attempts: int = 3
    backoff_multiplier: float = 2.0


class LifecycleManager:
    """Automated container lifecycle management"""
    
    def __init__(self, environment: str = "production"):
        self.environment = environment
        self.config_manager = load_config(environment)
        self.container_manager = ContainerManager(environment)
        
        self.monitoring_config = self.config_manager.get_monitoring_config()
        self.recovery_config = self.config_manager.get_recovery_config()
        self.infra_config = self.config_manager.get_infrastructure_config()
        
        self.logger = self._setup_logging()
        
        # State tracking
        self.container_states = {}
        self.recovery_attempts = {}
        self.health_history = {}
        
        # Control flags
        self.monitoring_active = False
        self.recovery_active = True
        
        # Threading
        self.monitor_thread = None
        self.recovery_thread = None
        
        # Recovery actions
        self.recovery_actions = self._setup_recovery_actions()
    
    def _setup_logging(self) -> logging.Logger:
        """Setup comprehensive logging"""
        logger = logging.getLogger("LifecycleManager")
        logger.setLevel(logging.INFO)
        
        if not logger.handlers:
            # Console handler
            console_handler = logging.StreamHandler()
            console_formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            console_handler.setFormatter(console_formatter)
            logger.addHandler(console_handler)
            
            # File handler for persistent logging
            try:
                file_handler = logging.FileHandler('/tmp/safework_lifecycle.log')
                file_formatter = logging.Formatter(
                    '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s - %(message)s'
                )
                file_handler.setFormatter(file_formatter)
                logger.addHandler(file_handler)
            except Exception as e:
                logger.warning(f"Could not setup file logging: {e}")
        
        return logger
    
    def _setup_recovery_actions(self) -> List[RecoveryAction]:
        """Setup recovery actions in priority order"""
        return [
            RecoveryAction(
                name="restart_container",
                action=self._restart_container,
                priority=1,
                max_attempts=2
            ),
            RecoveryAction(
                name="recreate_container",
                action=self._recreate_container,
                priority=2,
                max_attempts=1
            ),
            RecoveryAction(
                name="full_system_recovery",
                action=self._full_system_recovery,
                priority=3,
                max_attempts=1
            )
        ]
    
    def start_monitoring(self):
        """Start automated monitoring"""
        if self.monitoring_active:
            self.logger.warning("Monitoring is already active")
            return
        
        self.monitoring_active = True
        self.monitor_thread = threading.Thread(target=self._monitoring_loop, daemon=True)
        self.monitor_thread.start()
        
        self.logger.info("🔍 Container monitoring started")
    
    def stop_monitoring(self):
        """Stop automated monitoring"""
        self.monitoring_active = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=5)
        
        self.logger.info("🔍 Container monitoring stopped")
    
    def _monitoring_loop(self):
        """Main monitoring loop"""
        while self.monitoring_active:
            try:
                self._check_system_health()
                time.sleep(self.monitoring_config['health_check_interval'])
            except Exception as e:
                self.logger.error(f"Error in monitoring loop: {e}")
                time.sleep(30)  # Wait before retrying on error
    
    def _check_system_health(self):
        """Comprehensive system health check"""
        status = self.container_manager.get_system_status()
        
        # Update container states
        for container_name, info in status['containers'].items():
            previous_state = self.container_states.get(container_name, {}).get('state')
            current_state = info['state']
            
            # Log state changes
            if previous_state and previous_state != current_state:
                self.logger.info(f"🔄 {container_name}: {previous_state} → {current_state}")
            
            self.container_states[container_name] = {
                'state': current_state,
                'status': info['status'],
                'last_check': datetime.now(),
                'healthy': current_state == 'running'
            }
        
        # Update health history
        self.health_history[datetime.now()] = status['overall_health']
        
        # Trigger recovery if needed
        if status['overall_health'] != 'healthy' and self.recovery_active:
            self._trigger_recovery(status)
    
    def _trigger_recovery(self, system_status: Dict[str, Any]):
        """Trigger automated recovery based on system status"""
        unhealthy_containers = []
        
        for container_name, info in system_status['containers'].items():
            if info['state'] != 'running':
                unhealthy_containers.append(container_name)
        
        if unhealthy_containers:
            self.logger.warning(f"🚨 Unhealthy containers detected: {unhealthy_containers}")
            
            # Start recovery in separate thread to avoid blocking monitoring
            recovery_thread = threading.Thread(
                target=self._execute_recovery,
                args=(unhealthy_containers,),
                daemon=True
            )
            recovery_thread.start()
    
    def _execute_recovery(self, unhealthy_containers: List[str]):
        """Execute recovery actions for unhealthy containers"""
        for container_name in unhealthy_containers:
            self.logger.info(f"🔧 Starting recovery for: {container_name}")
            
            # Check if we've exceeded max recovery attempts
            attempts_key = f"{container_name}_{datetime.now().date()}"
            current_attempts = self.recovery_attempts.get(attempts_key, 0)
            
            if current_attempts >= self.recovery_config['max_attempts']:
                self.logger.error(
                    f"❌ Max recovery attempts ({self.recovery_config['max_attempts']}) "
                    f"exceeded for {container_name} today"
                )
                continue
            
            # Try recovery actions in priority order
            recovery_successful = False
            
            for action in self.recovery_actions:
                self.logger.info(f"🔧 Attempting {action.name} for {container_name}")
                
                try:
                    result = action.action(container_name)
                    
                    if result and result.success:
                        self.logger.info(f"✅ {action.name} successful for {container_name}")
                        recovery_successful = True
                        break
                    else:
                        error_msg = result.error if result else "Unknown error"
                        self.logger.warning(f"⚠️ {action.name} failed for {container_name}: {error_msg}")
                        
                except Exception as e:
                    self.logger.error(f"❌ {action.name} exception for {container_name}: {e}")
                
                # Wait before next action
                time.sleep(self.recovery_config['retry_delay'])
            
            # Update recovery attempts
            self.recovery_attempts[attempts_key] = current_attempts + 1
            
            if recovery_successful:
                self.logger.info(f"✅ Recovery completed for {container_name}")
            else:
                self.logger.error(f"❌ All recovery actions failed for {container_name}")
    
    def _restart_container(self, container_name: str) -> Optional[APIResponse]:
        """Restart container recovery action"""
        container_config = self.config_manager.get_container_config(container_name)
        if not container_config:
            return APIResponse(success=False, error=f"No config for {container_name}")
        
        # Find container
        container = self.container_manager._find_container(container_config.name)
        if not container:
            return APIResponse(success=False, error=f"Container {container_config.name} not found")
        
        # Restart container
        return self.container_manager.api_client.restart_container(container['Id'])
    
    def _recreate_container(self, container_name: str) -> Optional[APIResponse]:
        """Recreate container recovery action"""
        return self.container_manager.deploy_container(container_name, force_recreate=True)
    
    def _full_system_recovery(self, container_name: str) -> Optional[APIResponse]:
        """Full system recovery - recreate all containers"""
        self.logger.info("🚨 Initiating full system recovery")
        
        results = self.container_manager.deploy_all_containers(force_recreate=True)
        
        # Return success if at least the target container was recovered
        target_result = results.get(container_name)
        if target_result and target_result.success:
            return target_result
        
        return APIResponse(success=False, error="Full system recovery failed")
    
    def deploy_system(self, force_recreate: bool = False) -> Dict[str, APIResponse]:
        """Deploy entire SafeWork system"""
        self.logger.info(f"🚀 Deploying SafeWork system (force_recreate={force_recreate})")
        
        # Stop monitoring during deployment
        was_monitoring = self.monitoring_active
        if was_monitoring:
            self.stop_monitoring()
        
        try:
            results = self.container_manager.deploy_all_containers(force_recreate)
            
            # Wait for containers to stabilize
            self.logger.info("⏳ Waiting for containers to stabilize...")
            time.sleep(30)
            
            # Restart monitoring if it was active
            if was_monitoring:
                self.start_monitoring()
            
            return results
            
        except Exception as e:
            self.logger.error(f"❌ Deployment failed: {e}")
            
            # Restart monitoring even on failure
            if was_monitoring:
                self.start_monitoring()
            
            return {'error': APIResponse(success=False, error=str(e))}
    
    def get_health_report(self) -> Dict[str, Any]:
        """Get comprehensive health report"""
        system_status = self.container_manager.get_system_status()
        
        # Calculate uptime statistics
        uptime_stats = self._calculate_uptime_stats()
        
        # Recent health history
        recent_history = {
            timestamp.isoformat(): health 
            for timestamp, health in list(self.health_history.items())[-10:]
        }
        
        return {
            'timestamp': datetime.now().isoformat(),
            'environment': self.environment,
            'overall_health': system_status['overall_health'],
            'containers': system_status['containers'],
            'uptime_stats': uptime_stats,
            'recent_history': recent_history,
            'monitoring_active': self.monitoring_active,
            'recovery_active': self.recovery_active,
            'recovery_attempts_today': len([
                k for k in self.recovery_attempts.keys() 
                if str(datetime.now().date()) in k
            ])
        }
    
    def _calculate_uptime_stats(self) -> Dict[str, Any]:
        """Calculate container uptime statistics"""
        stats = {}
        
        for container_name, state_info in self.container_states.items():
            last_check = state_info.get('last_check', datetime.now())
            is_healthy = state_info.get('healthy', False)
            
            stats[container_name] = {
                'currently_healthy': is_healthy,
                'last_check': last_check.isoformat(),
                'minutes_since_check': (datetime.now() - last_check).total_seconds() / 60
            }
        
        return stats
    
    def emergency_recovery(self) -> Dict[str, Any]:
        """Emergency recovery procedure"""
        self.logger.info("🚨 EMERGENCY RECOVERY INITIATED")
        
        # Stop monitoring
        self.stop_monitoring()
        
        try:
            # Force recreate all containers
            results = self.deploy_system(force_recreate=True)
            
            # Verify health
            time.sleep(60)  # Wait longer for emergency recovery
            health_report = self.get_health_report()
            
            # Restart monitoring
            self.start_monitoring()
            
            emergency_result = {
                'emergency_recovery_completed': True,
                'deployment_results': results,
                'final_health': health_report,
                'timestamp': datetime.now().isoformat()
            }
            
            if health_report['overall_health'] == 'healthy':
                self.logger.info("✅ Emergency recovery successful")
            else:
                self.logger.error("❌ Emergency recovery completed but system still unhealthy")
            
            return emergency_result
            
        except Exception as e:
            self.logger.error(f"❌ Emergency recovery failed: {e}")
            return {
                'emergency_recovery_completed': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }


def main():
    """Main lifecycle manager CLI"""
    import sys
    import json
    
    if len(sys.argv) < 2:
        print("Usage: container_lifecycle_manager.py <command> [environment]")
        print("Commands: status, deploy, monitor, emergency, health")
        sys.exit(1)
    
    command = sys.argv[1]
    environment = sys.argv[2] if len(sys.argv) > 2 else "production"
    
    manager = LifecycleManager(environment)
    
    if command == "status":
        status = manager.container_manager.get_system_status()
        print(json.dumps(status, indent=2))
        
    elif command == "deploy":
        force = "--force" in sys.argv
        results = manager.deploy_system(force_recreate=force)
        
        print(f"🚀 Deployment Results:")
        for container, result in results.items():
            status = "✅" if result.success else "❌"
            print(f"  {status} {container}: {result.error or 'Success'}")
    
    elif command == "monitor":
        print("🔍 Starting monitoring... (Ctrl+C to stop)")
        manager.start_monitoring()
        try:
            while True:
                time.sleep(10)
                health = manager.get_health_report()
                print(f"Health: {health['overall_health']} - {datetime.now().strftime('%H:%M:%S')}")
        except KeyboardInterrupt:
            manager.stop_monitoring()
            print("\n🔍 Monitoring stopped")
    
    elif command == "emergency":
        result = manager.emergency_recovery()
        print(json.dumps(result, indent=2))
    
    elif command == "health":
        health = manager.get_health_report()
        print(json.dumps(health, indent=2))
    
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)


if __name__ == "__main__":
    main()