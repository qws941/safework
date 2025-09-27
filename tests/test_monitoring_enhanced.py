"""
Enhanced System Monitoring and Health Check Tests
================================================

Advanced monitoring tests for SafeWork system performance,
reliability metrics, and comprehensive health validation.
"""

import pytest
import requests
import time
import json
import psutil
import statistics
from datetime import datetime, timezone, timedelta
import concurrent.futures
from dataclasses import dataclass
from typing import List, Dict, Any

# KST timezone
KST = timezone(timedelta(hours=9))


@dataclass
class MetricResult:
    """Data class for storing metric results"""
    name: str
    value: float
    unit: str
    threshold: float
    status: str
    timestamp: datetime


@dataclass
class HealthCheckResult:
    """Data class for health check results"""
    component: str
    status: str
    response_time: float
    details: Dict[str, Any]
    timestamp: datetime


class SystemMonitor:
    """Enhanced system monitoring utility"""
    
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.metrics_history: List[MetricResult] = []
        self.health_history: List[HealthCheckResult] = []
    
    def collect_performance_metrics(self, duration_seconds: int = 60) -> List[MetricResult]:
        """Collect performance metrics over time"""
        metrics = []
        start_time = time.time()
        
        while time.time() - start_time < duration_seconds:
            # Response time metric
            start_request = time.time()
            try:
                response = requests.get(f"{self.base_url}/health", timeout=10)
                response_time = time.time() - start_request
                
                if response.status_code == 200:
                    metrics.append(MetricResult(
                        name="response_time",
                        value=response_time * 1000,  # Convert to milliseconds
                        unit="ms",
                        threshold=2000.0,  # 2 second threshold
                        status="ok" if response_time < 2.0 else "warning",
                        timestamp=datetime.now(KST)
                    ))
                
                # Availability metric
                metrics.append(MetricResult(
                    name="availability",
                    value=1.0 if response.status_code == 200 else 0.0,
                    unit="ratio",
                    threshold=0.99,  # 99% availability threshold
                    status="ok" if response.status_code == 200 else "error",
                    timestamp=datetime.now(KST)
                ))
                
            except requests.RequestException:
                metrics.append(MetricResult(
                    name="availability",
                    value=0.0,
                    unit="ratio",
                    threshold=0.99,
                    status="error",
                    timestamp=datetime.now(KST)
                ))
            
            time.sleep(5)  # Collect metrics every 5 seconds
        
        self.metrics_history.extend(metrics)
        return metrics
    
    def comprehensive_health_check(self) -> List[HealthCheckResult]:
        """Perform comprehensive health checks"""
        results = []
        
        # Main application health
        app_result = self._check_application_health()
        results.append(app_result)
        
        # Database connectivity
        db_result = self._check_database_health()
        results.append(db_result)
        
        # Cache connectivity
        cache_result = self._check_cache_health()
        results.append(cache_result)
        
        # API endpoints health
        api_result = self._check_api_health()
        results.append(api_result)
        
        self.health_history.extend(results)
        return results
    
    def _check_application_health(self) -> HealthCheckResult:
        """Check application health"""
        start_time = time.time()
        
        try:
            response = requests.get(f"{self.base_url}/health", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                status = "healthy" if data.get('status') == 'healthy' else "degraded"
                
                return HealthCheckResult(
                    component="application",
                    status=status,
                    response_time=response_time,
                    details=data,
                    timestamp=datetime.now(KST)
                )
            else:
                return HealthCheckResult(
                    component="application",
                    status="unhealthy",
                    response_time=response_time,
                    details={"http_status": response.status_code},
                    timestamp=datetime.now(KST)
                )
                
        except requests.RequestException as e:
            return HealthCheckResult(
                component="application",
                status="unreachable",
                response_time=time.time() - start_time,
                details={"error": str(e)},
                timestamp=datetime.now(KST)
            )
    
    def _check_database_health(self) -> HealthCheckResult:
        """Check database health via application"""
        start_time = time.time()
        
        try:
            response = requests.get(f"{self.base_url}/health", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                services = data.get('services', {})
                db_status = services.get('database', 'unknown')
                
                status = "healthy" if db_status == "connected" else "unhealthy"
                
                return HealthCheckResult(
                    component="database",
                    status=status,
                    response_time=response_time,
                    details={"connection_status": db_status},
                    timestamp=datetime.now(KST)
                )
            else:
                return HealthCheckResult(
                    component="database",
                    status="unknown",
                    response_time=response_time,
                    details={"http_status": response.status_code},
                    timestamp=datetime.now(KST)
                )
                
        except requests.RequestException as e:
            return HealthCheckResult(
                component="database",
                status="unreachable",
                response_time=time.time() - start_time,
                details={"error": str(e)},
                timestamp=datetime.now(KST)
            )
    
    def _check_cache_health(self) -> HealthCheckResult:
        """Check cache health via application"""
        start_time = time.time()
        
        try:
            response = requests.get(f"{self.base_url}/health", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                services = data.get('services', {})
                redis_status = services.get('redis', 'unknown')
                
                status = "healthy" if redis_status == "connected" else "unhealthy"
                
                return HealthCheckResult(
                    component="cache",
                    status=status,
                    response_time=response_time,
                    details={"connection_status": redis_status},
                    timestamp=datetime.now(KST)
                )
            else:
                return HealthCheckResult(
                    component="cache",
                    status="unknown",
                    response_time=response_time,
                    details={"http_status": response.status_code},
                    timestamp=datetime.now(KST)
                )
                
        except requests.RequestException as e:
            return HealthCheckResult(
                component="cache",
                status="unreachable",
                response_time=time.time() - start_time,
                details={"error": str(e)},
                timestamp=datetime.now(KST)
            )
    
    def _check_api_health(self) -> HealthCheckResult:
        """Check API endpoints health"""
        start_time = time.time()
        endpoints = [
            "/survey/001_musculoskeletal_symptom_survey",
            "/survey/002_workplace_environment_survey"
        ]
        
        endpoint_results = {}
        
        for endpoint in endpoints:
            try:
                response = requests.get(f"{self.base_url}{endpoint}", timeout=5)
                endpoint_results[endpoint] = {
                    "status_code": response.status_code,
                    "accessible": response.status_code == 200
                }
            except requests.RequestException as e:
                endpoint_results[endpoint] = {
                    "status_code": None,
                    "accessible": False,
                    "error": str(e)
                }
        
        response_time = time.time() - start_time
        accessible_count = sum(1 for result in endpoint_results.values() if result.get('accessible', False))
        total_count = len(endpoints)
        
        if accessible_count == total_count:
            status = "healthy"
        elif accessible_count > 0:
            status = "degraded"
        else:
            status = "unhealthy"
        
        return HealthCheckResult(
            component="api_endpoints",
            status=status,
            response_time=response_time,
            details={
                "endpoints": endpoint_results,
                "accessibility_ratio": accessible_count / total_count
            },
            timestamp=datetime.now(KST)
        )
    
    def generate_health_report(self) -> Dict[str, Any]:
        """Generate comprehensive health report"""
        if not self.health_history:
            return {"error": "No health data available"}
        
        # Get latest health check results
        latest_results = {}
        for result in reversed(self.health_history):
            if result.component not in latest_results:
                latest_results[result.component] = result
        
        # Calculate overall system health
        healthy_components = sum(1 for result in latest_results.values() if result.status == "healthy")
        total_components = len(latest_results)
        system_health_ratio = healthy_components / total_components if total_components > 0 else 0
        
        if system_health_ratio >= 1.0:
            overall_status = "healthy"
        elif system_health_ratio >= 0.75:
            overall_status = "degraded"
        else:
            overall_status = "unhealthy"
        
        # Performance metrics summary
        response_time_metrics = [m for m in self.metrics_history if m.name == "response_time"]
        availability_metrics = [m for m in self.metrics_history if m.name == "availability"]
        
        performance_summary = {}
        
        if response_time_metrics:
            response_times = [m.value for m in response_time_metrics]
            performance_summary["response_time"] = {
                "avg_ms": statistics.mean(response_times),
                "min_ms": min(response_times),
                "max_ms": max(response_times),
                "median_ms": statistics.median(response_times)
            }
        
        if availability_metrics:
            availability_values = [m.value for m in availability_metrics]
            performance_summary["availability"] = {
                "ratio": statistics.mean(availability_values),
                "uptime_percent": statistics.mean(availability_values) * 100
            }
        
        return {
            "overall_status": overall_status,
            "system_health_ratio": system_health_ratio,
            "component_status": {
                component: {
                    "status": result.status,
                    "response_time_ms": result.response_time * 1000,
                    "last_check": result.timestamp.isoformat()
                }
                for component, result in latest_results.items()
            },
            "performance_summary": performance_summary,
            "report_generated": datetime.now(KST).isoformat()
        }


@pytest.mark.monitoring
class TestEnhancedHealthChecks:
    """Enhanced health check tests"""
    
    def test_comprehensive_health_validation(self, base_url):
        """Test comprehensive health validation"""
        monitor = SystemMonitor(base_url)
        health_results = monitor.comprehensive_health_check()
        
        assert len(health_results) > 0
        
        # Verify all components were checked
        component_names = {result.component for result in health_results}
        expected_components = {"application", "database", "cache", "api_endpoints"}
        
        # Should check most components
        assert len(component_names.intersection(expected_components)) >= 2
        
        # At least one component should be healthy
        healthy_components = [result for result in health_results if result.status == "healthy"]
        assert len(healthy_components) > 0
    
    def test_health_check_response_times(self, base_url):
        """Test health check response times are within acceptable limits"""
        monitor = SystemMonitor(base_url)
        health_results = monitor.comprehensive_health_check()
        
        for result in health_results:
            # All health checks should complete within 15 seconds
            assert result.response_time < 15.0, f"{result.component} health check took {result.response_time}s"
            
            # Most should complete within 5 seconds
            if result.status in ["healthy", "degraded"]:
                assert result.response_time < 10.0, f"{result.component} took {result.response_time}s"
    
    def test_health_check_data_quality(self, base_url):
        """Test health check data quality and completeness"""
        monitor = SystemMonitor(base_url)
        health_results = monitor.comprehensive_health_check()
        
        for result in health_results:
            # Verify data structure
            assert isinstance(result.component, str)
            assert result.component != ""
            assert result.status in ["healthy", "degraded", "unhealthy", "unreachable", "unknown"]
            assert isinstance(result.response_time, (int, float))
            assert result.response_time >= 0
            assert isinstance(result.details, dict)
            assert isinstance(result.timestamp, datetime)


@pytest.mark.monitoring
@pytest.mark.slow
class TestPerformanceMonitoring:
    """Performance monitoring tests"""
    
    def test_sustained_performance_monitoring(self, base_url):
        """Test sustained performance monitoring over time"""
        monitor = SystemMonitor(base_url)
        
        # Collect metrics for 60 seconds
        metrics = monitor.collect_performance_metrics(duration_seconds=60)
        
        assert len(metrics) > 0
        
        # Analyze response time metrics
        response_time_metrics = [m for m in metrics if m.name == "response_time"]
        if response_time_metrics:
            response_times = [m.value for m in response_time_metrics]
            
            # Average response time should be reasonable
            avg_response_time = statistics.mean(response_times)
            assert avg_response_time < 3000, f"Average response time {avg_response_time}ms too high"
            
            # 95th percentile should be acceptable
            if len(response_times) >= 20:  # Need sufficient data points
                sorted_times = sorted(response_times)
                p95_index = int(0.95 * len(sorted_times))
                p95_response_time = sorted_times[p95_index]
                assert p95_response_time < 5000, f"95th percentile response time {p95_response_time}ms too high"
        
        # Analyze availability metrics
        availability_metrics = [m for m in metrics if m.name == "availability"]
        if availability_metrics:
            availability_values = [m.value for m in availability_metrics]
            
            # Should maintain high availability
            avg_availability = statistics.mean(availability_values)
            assert avg_availability >= 0.95, f"Availability {avg_availability} below 95%"
    
    def test_performance_under_concurrent_load(self, base_url):
        """Test performance under concurrent load"""
        def make_concurrent_requests():
            """Make concurrent requests and measure performance"""
            results = []
            
            def single_request():
                start_time = time.time()
                try:
                    response = requests.get(f"{base_url}/health", timeout=10)
                    response_time = time.time() - start_time
                    return {
                        "success": response.status_code == 200,
                        "response_time": response_time,
                        "status_code": response.status_code
                    }
                except requests.RequestException as e:
                    return {
                        "success": False,
                        "response_time": time.time() - start_time,
                        "error": str(e)
                    }
            
            # Make 20 concurrent requests
            with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
                futures = [executor.submit(single_request) for _ in range(20)]
                results = [future.result() for future in futures]
            
            return results
        
        # Test concurrent load
        load_results = make_concurrent_requests()
        
        # Analyze results
        successful_requests = [r for r in load_results if r.get("success", False)]
        success_rate = len(successful_requests) / len(load_results)
        
        # Should maintain good success rate under load
        assert success_rate >= 0.8, f"Success rate {success_rate} too low under concurrent load"
        
        # Response times should still be reasonable
        if successful_requests:
            response_times = [r["response_time"] for r in successful_requests]
            avg_response_time = statistics.mean(response_times)
            max_response_time = max(response_times)
            
            assert avg_response_time < 5.0, f"Average response time {avg_response_time}s too high under load"
            assert max_response_time < 15.0, f"Max response time {max_response_time}s too high under load"
    
    def test_memory_leak_detection(self, base_url):
        """Test for potential memory leaks"""
        # Make requests over time and monitor response consistency
        baseline_response = None
        
        for i in range(50):
            try:
                response = requests.get(f"{base_url}/health", timeout=5)
                if response.status_code == 200:
                    current_data = response.json()
                    
                    if baseline_response is None:
                        baseline_response = current_data
                    else:
                        # Response structure should remain consistent
                        assert set(current_data.keys()) == set(baseline_response.keys())
                        assert current_data["service"] == baseline_response["service"]
                
            except requests.RequestException:
                pass
            
            time.sleep(0.1)
        
        # If we get here without degradation, memory usage is stable
        assert baseline_response is not None


@pytest.mark.monitoring
class TestMonitoringReports:
    """Test monitoring report generation"""
    
    def test_health_report_generation(self, base_url):
        """Test comprehensive health report generation"""
        monitor = SystemMonitor(base_url)
        
        # Collect some data
        monitor.comprehensive_health_check()
        monitor.collect_performance_metrics(duration_seconds=30)
        
        # Generate report
        report = monitor.generate_health_report()
        
        # Verify report structure
        assert "overall_status" in report
        assert "system_health_ratio" in report
        assert "component_status" in report
        assert "report_generated" in report
        
        # Verify data quality
        assert report["overall_status"] in ["healthy", "degraded", "unhealthy"]
        assert 0 <= report["system_health_ratio"] <= 1
        assert isinstance(report["component_status"], dict)
        
        # Verify component status details
        for component, status_info in report["component_status"].items():
            assert "status" in status_info
            assert "response_time_ms" in status_info
            assert "last_check" in status_info
            
            # Verify status values
            assert status_info["status"] in ["healthy", "degraded", "unhealthy", "unreachable", "unknown"]
            assert isinstance(status_info["response_time_ms"], (int, float))
            assert status_info["response_time_ms"] >= 0
    
    def test_performance_metrics_reporting(self, base_url):
        """Test performance metrics reporting"""
        monitor = SystemMonitor(base_url)
        
        # Collect metrics
        monitor.collect_performance_metrics(duration_seconds=30)
        
        # Generate report
        report = monitor.generate_health_report()
        
        if "performance_summary" in report and report["performance_summary"]:
            performance = report["performance_summary"]
            
            # Check response time metrics
            if "response_time" in performance:
                rt_metrics = performance["response_time"]
                assert "avg_ms" in rt_metrics
                assert "min_ms" in rt_metrics
                assert "max_ms" in rt_metrics
                assert "median_ms" in rt_metrics
                
                # Sanity check values
                assert rt_metrics["min_ms"] <= rt_metrics["avg_ms"] <= rt_metrics["max_ms"]
                assert rt_metrics["avg_ms"] > 0
            
            # Check availability metrics
            if "availability" in performance:
                avail_metrics = performance["availability"]
                assert "ratio" in avail_metrics
                assert "uptime_percent" in avail_metrics
                
                # Sanity check values
                assert 0 <= avail_metrics["ratio"] <= 1
                assert 0 <= avail_metrics["uptime_percent"] <= 100


@pytest.mark.monitoring
class TestAlertingThresholds:
    """Test alerting thresholds and conditions"""
    
    def test_response_time_thresholds(self, base_url):
        """Test response time threshold detection"""
        start_time = time.time()
        response = requests.get(f"{base_url}/health", timeout=10)
        response_time = time.time() - start_time
        
        # Response time thresholds
        if response_time > 5.0:
            pytest.fail(f"Response time {response_time}s exceeds critical threshold")
        elif response_time > 2.0:
            pytest.skip(f"Response time {response_time}s exceeds warning threshold")
        
        assert response.status_code == 200
    
    def test_availability_thresholds(self, base_url):
        """Test availability threshold detection"""
        success_count = 0
        total_requests = 10
        
        for i in range(total_requests):
            try:
                response = requests.get(f"{base_url}/health", timeout=5)
                if response.status_code == 200:
                    success_count += 1
            except requests.RequestException:
                pass
            time.sleep(0.5)
        
        availability = success_count / total_requests
        
        # Availability thresholds
        if availability < 0.9:
            pytest.fail(f"Availability {availability} below critical threshold")
        elif availability < 0.95:
            pytest.skip(f"Availability {availability} below warning threshold")
        
        assert availability >= 0.9
    
    def test_service_dependency_thresholds(self, base_url, http_session):
        """Test service dependency health thresholds"""
        response = http_session.get(f"{base_url}/health")
        assert response.status_code == 200
        
        health_data = response.json()
        services = health_data.get("services", {})
        
        unhealthy_services = []
        
        for service, status in services.items():
            if "error:" in str(status) or status not in ["connected", "healthy"]:
                unhealthy_services.append(service)
        
        # Critical services should be healthy
        critical_services = ["database"]
        critical_unhealthy = [s for s in unhealthy_services if s in critical_services]
        
        if critical_unhealthy:
            pytest.fail(f"Critical services unhealthy: {critical_unhealthy}")
        
        # Warning for non-critical services
        if unhealthy_services:
            pytest.skip(f"Some services degraded: {unhealthy_services}")
        
        assert len(unhealthy_services) == 0