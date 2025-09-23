# SafeWork Gunicorn Production Configuration
import os
import multiprocessing

# Basic server configuration
bind = f"0.0.0.0:{os.environ.get('APP_PORT', '4545')}"
workers = int(os.environ.get('GUNICORN_WORKERS', min(multiprocessing.cpu_count() * 2 + 1, 4)))
worker_class = "sync"
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 100

# Timeout settings
timeout = 120
keepalive = 2

# Performance tuning
preload_app = True
max_worker_memory = 1024

# Security
user = "appuser"
group = "appuser"

# Logging
loglevel = "info"
accesslog = "-"  # stdout
errorlog = "-"   # stderr
access_log_format = '[%(t)s] [safework-gunicorn-log] %(h)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = "safework-gunicorn"

# Graceful restart
graceful_timeout = 30

# Stats
statsd_host = None
statsd_prefix = "safework"

# Environment-specific overrides
if os.environ.get('FLASK_CONFIG') == 'development':
    reload = True
    workers = 1
    loglevel = "debug"
else:
    reload = False

# Worker recycling for memory management
max_requests = 1000
max_requests_jitter = 50

# Preload application for better performance
preload_app = True

# Connection settings
backlog = 2048

# SSL settings (if needed behind reverse proxy)
forwarded_allow_ips = "*"
secure_scheme_headers = {
    'X-FORWARDED-PROTOCOL': 'ssl',
    'X-FORWARDED-PROTO': 'https',
    'X-FORWARDED-SSL': 'on'
}

# Application module
wsgi_module = "app:app"

def when_ready(server):
    server.log.info("SafeWork Gunicorn server is ready. Listening on %s", bind)

def worker_int(worker):
    worker.log.info("Worker received INT or QUIT signal")

def pre_fork(server, worker):
    server.log.info("Worker spawned (pid: %s)", worker.pid)

def post_fork(server, worker):
    server.log.info("Worker spawned (pid: %s)", worker.pid)

def post_worker_init(worker):
    worker.log.info("Worker initialized (pid: %s)", worker.pid)

def worker_abort(worker):
    worker.log.info("Worker received SIGABRT signal")