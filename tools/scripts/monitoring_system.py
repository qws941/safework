#!/usr/bin/env python3
"""
SafeWork Monitoring and Self-Healing System
Comprehensive monitoring with automated recovery
"""

import time
import json
import logging
import requests
import threading
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from container_lifecycle_manager import LifecycleManager
from config_manager import load_config


@dataclass
class AlertConfig:
    """Alert configuration"""
    name: str
    condition: Callable[[Dict[str, Any]], bool]
    severity: str = "warning"  # info, warning, error, critical
    cooldown_minutes: int = 15
    actions: List[str] = field(default_factory=list)


@dataclass
class MetricThreshold:
    """Metric threshold configuration"""
    metric_name: str
    warning_threshold: float
    critical_threshold: float
    unit: str = ""
    higher_is_worse: bool = True


class HealthMonitor:
    """Comprehensive health monitoring system"""
    
    def __init__(self, environment: str = "production"):
        self.environment = environment
        self.config_manager = load_config(environment)
        self.lifecycle_manager = LifecycleManager(environment)
        
        self.infra_config = self.config_manager.get_infrastructure_config()
        self.monitoring_config = self.config_manager.get_monitoring_config()
        
        self.logger = self._setup_logging()
        
        # Monitoring state
        self.metrics_history = {}
        self.alert_history = {}
        self.last_alerts = {}
        
        # Health check endpoints
        self.health_endpoints = self._setup_health_endpoints()
        
        # Alert configurations
        self.alerts = self._setup_alerts()
        
        # Metric thresholds
        self.thresholds = self._setup_thresholds()
        
        # Control flags
        self.monitoring_active = False
        self.self_healing_active = True
        
        # Threading
        self.monitor_thread = None
    
    def _setup_logging(self) -> logging.Logger:
        """Setup monitoring-specific logging"""
        logger = logging.getLogger("HealthMonitor")
        logger.setLevel(logging.INFO)
        
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)
        
        return logger
    
    def _setup_health_endpoints(self) -> Dict[str, str]:
        """Setup health check endpoints"""
        return {
            'production': self.infra_config.get('production_url', '') + '/health',
            'development': self.infra_config.get('development_url', '') + '/health',
            'portainer': self.infra_config.get('portainer_url', '') + '/api/system/status'
        }
    
    def _setup_alerts(self) -> List[AlertConfig]:
        """Setup alert configurations"""
        return [
            AlertConfig(
                name="application_down",
                condition=lambda metrics: not metrics.get('app_health', {}).get('healthy', False),
                severity="critical",
                cooldown_minutes=5,
                actions=["restart_app", "notify_admin"]
            ),
            AlertConfig(
                name="database_down",
                condition=lambda metrics: not metrics.get('database_health', {}).get('healthy', False),
                severity="critical",
                cooldown_minutes=10,
                actions=["restart_database", "notify_admin"]
            ),
            AlertConfig(
                name="high_response_time",
                condition=lambda metrics: metrics.get('response_time', 0) > 5000,
                severity="warning",
                cooldown_minutes=15,
                actions=["check_resources"]
            ),
            AlertConfig(
                name="container_restarts",
                condition=lambda metrics: metrics.get('container_restarts', 0) > 3,
                severity="error",
                cooldown_minutes=30,
                actions=["investigate_container", "notify_admin"]
            ),
            AlertConfig(
                name="low_disk_space",
                condition=lambda metrics: metrics.get('disk_usage', 0) > 85,
                severity="warning",
                cooldown_minutes=60,
                actions=["cleanup_logs", "notify_admin"]
            )
        ]
    
    def _setup_thresholds(self) -> List[MetricThreshold]:
        """Setup metric thresholds"""
        return [
            MetricThreshold("response_time", 2000, 5000, "ms"),
            MetricThreshold("error_rate", 5, 15, "%"),
            MetricThreshold("cpu_usage", 70, 90, "%"),
            MetricThreshold("memory_usage", 80, 95, "%"),
            MetricThreshold("disk_usage", 80, 90, "%"),
            MetricThreshold("container_restarts", 2, 5, "count"),
        ]
    
    def start_monitoring(self):
        """Start comprehensive monitoring"""
        if self.monitoring_active:
            self.logger.warning("Monitoring is already active")
            return
        
        self.monitoring_active = True
        self.monitor_thread = threading.Thread(target=self._monitoring_loop, daemon=True)
        self.monitor_thread.start()
        
        # Start lifecycle monitoring as well
        self.lifecycle_manager.start_monitoring()
        
        self.logger.info("🔍 Comprehensive monitoring started")
    
    def stop_monitoring(self):
        """Stop comprehensive monitoring"""
        self.monitoring_active = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=5)
        
        # Stop lifecycle monitoring
        self.lifecycle_manager.stop_monitoring()
        
        self.logger.info("🔍 Comprehensive monitoring stopped")
    
    def _monitoring_loop(self):
        """Main monitoring loop"""
        while self.monitoring_active:
            try:
                # Collect metrics
                metrics = self._collect_metrics()
                
                # Store metrics history
                timestamp = datetime.now()
                self.metrics_history[timestamp] = metrics
                
                # Clean old metrics (keep last 24 hours)
                cutoff = timestamp - timedelta(hours=24)
                self.metrics_history = {
                    ts: data for ts, data in self.metrics_history.items() 
                    if ts > cutoff
                }
                
                # Check alerts
                self._check_alerts(metrics)
                
                # Log metrics summary
                self._log_metrics_summary(metrics)
                
                # Wait for next cycle
                time.sleep(self.monitoring_config['health_check_interval'])
                
            except Exception as e:
                self.logger.error(f"Error in monitoring loop: {e}")
                time.sleep(30)  # Wait before retrying on error
    
    def _collect_metrics(self) -> Dict[str, Any]:
        """Collect comprehensive system metrics"""
        metrics = {
            'timestamp': datetime.now().isoformat(),
            'environment': self.environment
        }
        
        # Application health
        metrics['app_health'] = self._check_app_health()
        
        # Container status
        metrics['container_status'] = self._check_container_status()
        
        # Database health
        metrics['database_health'] = self._check_database_health()
        
        # Infrastructure health
        metrics['infrastructure_health'] = self._check_infrastructure_health()
        
        # Performance metrics
        metrics.update(self._collect_performance_metrics())
        
        # System resources (if available)
        metrics.update(self._collect_system_resources())
        
        return metrics
    
    def _check_app_health(self) -> Dict[str, Any]:
        """Check application health via health endpoint"""
        health_url = self.health_endpoints.get(self.environment)
        if not health_url:
            return {'healthy': False, 'error': 'No health endpoint configured'}
        
        try:
            start_time = time.time()
            response = requests.get(
                health_url, 
                timeout=self.monitoring_config['health_check_timeout']
            )
            response_time = (time.time() - start_time) * 1000  # Convert to ms
            
            if response.status_code == 200:
                try:
                    health_data = response.json()
                    return {
                        'healthy': True,
                        'response_time_ms': response_time,
                        'status': health_data.get('status', 'unknown'),
                        'service': health_data.get('service', 'unknown'),
                        'timestamp': health_data.get('timestamp')
                    }
                except json.JSONDecodeError:
                    return {
                        'healthy': True,
                        'response_time_ms': response_time,
                        'raw_response': response.text[:100]
                    }
            else:
                return {
                    'healthy': False,
                    'error': f'HTTP {response.status_code}',
                    'response_time_ms': response_time
                }
                
        except requests.RequestException as e:
            return {
                'healthy': False,
                'error': str(e),
                'response_time_ms': None
            }
    
    def _check_container_status(self) -> Dict[str, Any]:
        """Check container status via lifecycle manager"""
        try:
            status = self.lifecycle_manager.container_manager.get_system_status()
            
            container_details = {}
            running_count = 0
            total_count = 0
            
            for name, info in status['containers'].items():
                total_count += 1
                if info['state'] == 'running':
                    running_count += 1
                
                container_details[name] = {
                    'state': info['state'],
                    'status': info['status'],
                    'healthy': info['state'] == 'running'
                }
            
            return {
                'overall_health': status['overall_health'],
                'running_containers': running_count,
                'total_containers': total_count,
                'containers': container_details,
                'healthy': status['overall_health'] == 'healthy'
            }
            
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e)
            }
    
    def _check_database_health(self) -> Dict[str, Any]:
        """Check database health via container status"""
        try:
            container_status = self._check_container_status()
            postgres_info = container_status.get('containers', {}).get('postgres', {})
            
            return {
                'healthy': postgres_info.get('healthy', False),
                'state': postgres_info.get('state', 'unknown'),
                'status': postgres_info.get('status', 'unknown')
            }
            
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e)
            }
    
    def _check_infrastructure_health(self) -> Dict[str, Any]:
        """Check infrastructure components health"""
        health = {}
        
        # Check Portainer API
        try:
            portainer_url = self.infra_config.get('portainer_url')
            if portainer_url:
                response = requests.get(
                    f"{portainer_url}/api/system/status",
                    headers={'X-API-Key': self.infra_config.get('portainer_api_key')},
                    timeout=10
                )
                health['portainer'] = {
                    'healthy': response.status_code == 200,
                    'status_code': response.status_code
                }
            else:
                health['portainer'] = {'healthy': False, 'error': 'No URL configured'}
                
        except requests.RequestException as e:
            health['portainer'] = {'healthy': False, 'error': str(e)}
        
        return health
    
    def _collect_performance_metrics(self) -> Dict[str, Any]:
        """Collect performance metrics"""
        metrics = {}
        
        # Response time from app health check
        app_health = self._check_app_health()
        if app_health.get('response_time_ms'):
            metrics['response_time'] = app_health['response_time_ms']
        
        # Calculate error rate from recent health checks
        recent_checks = list(self.metrics_history.values())[-10:]  # Last 10 checks
        if recent_checks:
            failed_checks = sum(
                1 for check in recent_checks 
                if not check.get('app_health', {}).get('healthy', False)
            )
            metrics['error_rate'] = (failed_checks / len(recent_checks)) * 100
        
        return metrics
    
    def _collect_system_resources(self) -> Dict[str, Any]:
        """Collect system resource metrics (limited without direct access)"""
        metrics = {}
        
        # We can't directly access system resources from container,
        # but we can infer some information from container behavior
        
        # Count container restarts from recent history
        recent_containers = [
            check.get('container_status', {}) 
            for check in list(self.metrics_history.values())[-5:]
        ]
        
        if recent_containers:
            # This is a simplified metric - in a real system you'd track actual restarts
            unhealthy_counts = [
                len([c for c in check.get('containers', {}).values() if not c.get('healthy', True)])
                for check in recent_containers
            ]
            metrics['container_restarts'] = max(unhealthy_counts) if unhealthy_counts else 0
        
        return metrics
    
    def _check_alerts(self, metrics: Dict[str, Any]):
        """Check alert conditions and trigger actions"""
        current_time = datetime.now()
        
        for alert in self.alerts:
            try:
                # Check if alert condition is met
                if alert.condition(metrics):
                    # Check cooldown period
                    last_alert_time = self.last_alerts.get(alert.name)
                    cooldown_period = timedelta(minutes=alert.cooldown_minutes)
                    
                    if not last_alert_time or (current_time - last_alert_time) > cooldown_period:
                        self._trigger_alert(alert, metrics)
                        self.last_alerts[alert.name] = current_time
                        
            except Exception as e:
                self.logger.error(f"Error checking alert {alert.name}: {e}")
    
    def _trigger_alert(self, alert: AlertConfig, metrics: Dict[str, Any]):
        """Trigger alert and execute actions"""
        alert_data = {
            'name': alert.name,
            'severity': alert.severity,
            'timestamp': datetime.now().isoformat(),
            'metrics': metrics,
            'environment': self.environment
        }
        
        # Log alert
        severity_emoji = {
            'info': 'ℹ️',
            'warning': '⚠️',
            'error': '❌',
            'critical': '🚨'
        }
        
        emoji = severity_emoji.get(alert.severity, '❗')
        self.logger.warning(f"{emoji} ALERT: {alert.name} ({alert.severity})")
        
        # Store alert history
        self.alert_history[datetime.now()] = alert_data
        
        # Execute actions if self-healing is active
        if self.self_healing_active:
            self._execute_alert_actions(alert, metrics)
    
    def _execute_alert_actions(self, alert: AlertConfig, metrics: Dict[str, Any]):
        """Execute alert actions"""
        for action_name in alert.actions:
            try:
                self.logger.info(f"🔧 Executing action: {action_name}")
                
                if action_name == "restart_app":
                    self._action_restart_app()
                elif action_name == "restart_database":
                    self._action_restart_database()
                elif action_name == "check_resources":
                    self._action_check_resources()
                elif action_name == "investigate_container":
                    self._action_investigate_container()
                elif action_name == "cleanup_logs":
                    self._action_cleanup_logs()
                elif action_name == "notify_admin":
                    self._action_notify_admin(alert, metrics)
                else:
                    self.logger.warning(f"Unknown action: {action_name}")
                    
            except Exception as e:
                self.logger.error(f"Error executing action {action_name}: {e}")
    
    def _action_restart_app(self):
        """Restart application container"""
        result = self.lifecycle_manager._restart_container('app')
        if result and result.success:
            self.logger.info("✅ Application restarted successfully")
        else:
            self.logger.error(f"❌ Failed to restart application: {result.error if result else 'Unknown error'}")
    
    def _action_restart_database(self):
        """Restart database container"""
        result = self.lifecycle_manager._restart_container('postgres')
        if result and result.success:
            self.logger.info("✅ Database restarted successfully")
        else:
            self.logger.error(f"❌ Failed to restart database: {result.error if result else 'Unknown error'}")
    
    def _action_check_resources(self):
        """Check system resources"""
        self.logger.info("📊 Checking system resources...")
        # This would typically involve checking CPU, memory, disk usage
        # For now, we'll just log the current metrics
        status = self.lifecycle_manager.container_manager.get_system_status()
        self.logger.info(f"Container status: {status['overall_health']}")
    
    def _action_investigate_container(self):
        """Investigate container issues"""
        self.logger.info("🔍 Investigating container issues...")
        # This would typically involve checking logs, resource usage, etc.
        for container_name in ['app', 'postgres', 'redis']:
            container = self.lifecycle_manager.container_manager._find_container(
                self.config_manager.get_container_config(container_name).name
            )
            if container:
                self.logger.info(f"{container_name}: {container.get('State')} - {container.get('Status')}")
    
    def _action_cleanup_logs(self):
        """Cleanup old logs"""
        self.logger.info("🧹 Cleaning up old logs...")
        # This would typically involve log rotation or cleanup
        # For now, we'll clean our own metrics history
        cutoff = datetime.now() - timedelta(hours=6)
        old_count = len(self.metrics_history)
        self.metrics_history = {
            ts: data for ts, data in self.metrics_history.items() 
            if ts > cutoff
        }
        cleaned_count = old_count - len(self.metrics_history)
        self.logger.info(f"Cleaned {cleaned_count} old metric entries")
    
    def _action_notify_admin(self, alert: AlertConfig, metrics: Dict[str, Any]):
        """Notify admin about alert"""
        self.logger.info(f"📧 Notifying admin about {alert.name}")
        # This would typically send email, Slack message, etc.
        # For now, we'll just log detailed information
        self.logger.warning(
            f"ADMIN NOTIFICATION: {alert.name} ({alert.severity}) - "
            f"Environment: {self.environment} - "
            f"Time: {datetime.now().isoformat()}"
        )
    
    def _log_metrics_summary(self, metrics: Dict[str, Any]):
        """Log a summary of current metrics"""
        app_health = metrics.get('app_health', {})
        container_status = metrics.get('container_status', {})
        
        if app_health.get('healthy') and container_status.get('healthy'):
            level = logging.INFO
            status = "✅ HEALTHY"
        else:
            level = logging.WARNING
            status = "⚠️ ISSUES DETECTED"
        
        response_time = app_health.get('response_time_ms', 'N/A')
        running_containers = container_status.get('running_containers', 0)
        total_containers = container_status.get('total_containers', 0)
        
        self.logger.log(
            level,
            f"{status} - Response: {response_time}ms - "
            f"Containers: {running_containers}/{total_containers}"
        )
    
    def get_monitoring_report(self) -> Dict[str, Any]:
        """Get comprehensive monitoring report"""
        # Calculate uptime
        total_checks = len(self.metrics_history)
        healthy_checks = sum(
            1 for metrics in self.metrics_history.values()
            if metrics.get('app_health', {}).get('healthy', False)
        )
        uptime_percentage = (healthy_checks / total_checks * 100) if total_checks > 0 else 0
        
        # Recent alerts
        recent_alerts = [
            alert for timestamp, alert in self.alert_history.items()
            if timestamp > datetime.now() - timedelta(hours=24)
        ]
        
        # Current metrics
        latest_metrics = list(self.metrics_history.values())[-1] if self.metrics_history else {}
        
        return {
            'timestamp': datetime.now().isoformat(),
            'environment': self.environment,
            'monitoring_active': self.monitoring_active,
            'self_healing_active': self.self_healing_active,
            'uptime_percentage': round(uptime_percentage, 2),
            'total_health_checks': total_checks,
            'alerts_last_24h': len(recent_alerts),
            'current_status': latest_metrics,
            'recent_alerts': recent_alerts[-5:],  # Last 5 alerts
            'metric_history_count': len(self.metrics_history),
            'alert_cooldowns': {
                name: (datetime.now() - timestamp).total_seconds() / 60
                for name, timestamp in self.last_alerts.items()
            }
        }


def main():
    """Main monitoring system CLI"""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: monitoring_system.py <command> [environment]")
        print("Commands: monitor, report, status, emergency")
        sys.exit(1)
    
    command = sys.argv[1]
    environment = sys.argv[2] if len(sys.argv) > 2 else "production"
    
    monitor = HealthMonitor(environment)
    
    if command == "monitor":
        print("🔍 Starting comprehensive monitoring... (Ctrl+C to stop)")
        monitor.start_monitoring()
        try:
            while True:
                time.sleep(30)
                report = monitor.get_monitoring_report()
                print(f"[{datetime.now().strftime('%H:%M:%S')}] "
                      f"Uptime: {report['uptime_percentage']}% - "
                      f"Alerts: {report['alerts_last_24h']}")
        except KeyboardInterrupt:
            monitor.stop_monitoring()
            print("\n🔍 Monitoring stopped")
    
    elif command == "report":
        report = monitor.get_monitoring_report()
        print(json.dumps(report, indent=2))
    
    elif command == "status":
        metrics = monitor._collect_metrics()
        print(json.dumps(metrics, indent=2))
    
    elif command == "emergency":
        print("🚨 Starting emergency recovery...")
        result = monitor.lifecycle_manager.emergency_recovery()
        print(json.dumps(result, indent=2))
    
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)


if __name__ == "__main__":
    main()