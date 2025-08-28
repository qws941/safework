# SafeWork Tech Stack

## Backend Framework
- **Flask 3.0.0**: Core web framework
- **Python 3.11**: Programming language
- **Gunicorn 21.2.0**: WSGI HTTP Server for production

## Database & Caching
- **MySQL 8.0**: Primary database for persistent data
- **Redis**: Caching and session storage
- **SQLAlchemy 2.0.23**: ORM for database operations
- **Flask-SQLAlchemy 3.1.1**: Flask integration for SQLAlchemy
- **PyMySQL 1.1.0**: MySQL client library

## Authentication & Security
- **Flask-Login 0.6.3**: User session management
- **Flask-WTF 1.2.1**: CSRF protection and form handling
- **bcrypt 4.1.2**: Password hashing
- **cryptography 41.0.7**: Encryption utilities
- **JWT**: Token-based authentication (implied from admin panel)

## Data Processing & Export
- **openpyxl 3.1.2**: Excel file generation
- **pandas 2.1.4**: Data manipulation and analysis
- **PyPDF2 3.0.1**: PDF form processing
- **python-multipart 0.0.6**: File upload handling

## Development Tools
- **pytest 7.4.3**: Testing framework
- **pytest-flask 1.3.0**: Flask-specific testing utilities
- **black 23.12.1**: Code formatting
- **flake8 7.0.0**: Code linting
- **Flask-Migrate 4.0.5**: Database migrations

## Infrastructure & Deployment
- **Docker**: Containerization
- **Docker Compose**: Multi-container orchestration
- **Watchtower**: Automatic container updates
- **GitHub Actions**: CI/CD pipeline
- **Private Registry**: registry.jclee.me for custom images

## Frontend
- **Bootstrap/CSS**: Responsive UI framework
- **Jinja2 Templates**: Server-side templating
- **HTML5 Forms**: Survey form implementation

## Configuration Management
- **python-dotenv 1.0.0**: Environment variable management
- **Multi-environment configs**: Development, Production, Testing