# 🌐 API Server

This document provides a detailed explanation of the API server used in Calendifier's Home Assistant integration, including its architecture, endpoints, authentication, and data models.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Data Models](#data-models)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Logging](#logging)
- [Performance Considerations](#performance-considerations)
- [Security Considerations](#security-considerations)

## Overview

The Calendifier API server is a FastAPI-based RESTful API that provides access to calendar data for the Home Assistant integration. It serves as the backend for the web components used in the Home Assistant Lovelace dashboard.

The API server is designed to be:
- **Fast**: Built with FastAPI for high performance
- **Secure**: Implements proper authentication and authorization
- **Reliable**: Includes error handling and logging
- **Scalable**: Designed to handle multiple concurrent requests
- **Compatible**: Follows RESTful API best practices

## Architecture

The API server follows a layered architecture:

```
┌─────────────────┐
│   API Routes    │
├─────────────────┤
│   Controllers   │
├─────────────────┤
│    Services     │
├─────────────────┤
│  Data Access    │
├─────────────────┤
│    Database     │
└─────────────────┘
```

### Components

1. **API Routes**: Define the HTTP endpoints and handle request/response formatting
2. **Controllers**: Implement the business logic for each endpoint
3. **Services**: Provide reusable functionality across controllers
4. **Data Access**: Handle database operations
5. **Database**: SQLite database for storing calendar data

### Implementation

The API server is implemented using FastAPI, a modern Python web framework:

```python
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from typing import List, Optional
from datetime import datetime, timedelta
import sqlite3
import uuid
import logging

# Create FastAPI app
app = FastAPI(
    title="Calendifier API",
    description="API for Calendifier Home Assistant integration",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("api_server")

# Database connection
def get_db():
    conn = sqlite3.connect("calendar.db")
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

# API key authentication
API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=True)

def get_api_key(api_key: str = Depends(api_key_header)):
    # In a real application, this would validate against a stored key
    if api_key != "YOUR_API_KEY":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API Key",
        )
    return api_key

# Routes
@app.get("/")
async def root():
    return {"message": "Welcome to Calendifier API"}

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

## Authentication

The API server uses API key authentication to secure endpoints. Each request must include a valid API key in the `X-API-Key` header.

### API Key Generation

API keys are generated during the initial setup of the Home Assistant integration. The key is stored in the Home Assistant configuration and used for all API requests.

```python
def generate_api_key():
    """Generate a random API key."""
    return str(uuid.uuid4())

@app.post("/setup")
async def setup(db: sqlite3.Connection = Depends(get_db)):
    """Initial setup endpoint."""
    # Generate API key
    api_key = generate_api_key()
    
    # Store API key in database
    cursor = db.cursor()
    cursor.execute("INSERT INTO api_keys (key) VALUES (?)", (api_key,))
    db.commit()
    
    return {"api_key": api_key}
```

### API Key Validation

Each protected endpoint validates the API key before processing the request:

```python
def validate_api_key(api_key: str, db: sqlite3.Connection):
    """Validate API key against database."""
    cursor = db.cursor()
    result = cursor.execute("SELECT id FROM api_keys WHERE key = ?", (api_key,))
    key_exists = result.fetchone() is not None
    return key_exists

@app.get("/events", dependencies=[Depends(get_api_key)])
async def get_events(
    start_date: str,
    end_date: str,
    db: sqlite3.Connection = Depends(get_db)
):
    """Get events in date range."""
    # Implementation details...
```

## API Endpoints

The API server provides the following endpoints:

### Events

#### Get Events

```
GET /api/v1/events
```

Get events within a date range.

**Parameters:**
- `start_date` (required): Start date in ISO format (YYYY-MM-DD)
- `end_date` (required): End date in ISO format (YYYY-MM-DD)
- `category` (optional): Filter by category

**Response:**
```json
{
  "events": [
    {
      "id": "1234567890",
      "title": "Meeting with Team",
      "description": "Weekly team meeting",
      "start_date": "2025-07-08T10:00:00",
      "end_date": "2025-07-08T11:00:00",
      "is_all_day": false,
      "category": "work",
      "is_recurring": true,
      "rrule": "FREQ=WEEKLY;BYDAY=TU"
    },
    {
      "id": "0987654321",
      "title": "Dentist Appointment",
      "description": "Regular checkup",
      "start_date": "2025-07-10T14:00:00",
      "end_date": "2025-07-10T15:00:00",
      "is_all_day": false,
      "category": "personal"
    }
  ]
}
```

#### Get Event

```
GET /api/v1/events/{event_id}
```

Get a specific event by ID.

**Parameters:**
- `event_id` (required): ID of the event

**Response:**
```json
{
  "id": "1234567890",
  "title": "Meeting with Team",
  "description": "Weekly team meeting",
  "start_date": "2025-07-08T10:00:00",
  "end_date": "2025-07-08T11:00:00",
  "is_all_day": false,
  "category": "work",
  "is_recurring": true,
  "rrule": "FREQ=WEEKLY;BYDAY=TU"
}
```

#### Create Event

```
POST /api/v1/events
```

Create a new event.

**Request Body:**
```json
{
  "title": "Meeting with Team",
  "description": "Weekly team meeting",
  "start_date": "2025-07-08T10:00:00",
  "end_date": "2025-07-08T11:00:00",
  "is_all_day": false,
  "category": "work",
  "is_recurring": true,
  "rrule": "FREQ=WEEKLY;BYDAY=TU"
}
```

**Response:**
```json
{
  "id": "1234567890",
  "title": "Meeting with Team",
  "description": "Weekly team meeting",
  "start_date": "2025-07-08T10:00:00",
  "end_date": "2025-07-08T11:00:00",
  "is_all_day": false,
  "category": "work",
  "is_recurring": true,
  "rrule": "FREQ=WEEKLY;BYDAY=TU"
}
```

#### Update Event

```
PUT /api/v1/events/{event_id}
```

Update an existing event.

**Parameters:**
- `event_id` (required): ID of the event

**Request Body:**
```json
{
  "title": "Updated Meeting with Team",
  "description": "Weekly team meeting",
  "start_date": "2025-07-08T10:00:00",
  "end_date": "2025-07-08T11:00:00",
  "is_all_day": false,
  "category": "work",
  "is_recurring": true,
  "rrule": "FREQ=WEEKLY;BYDAY=TU"
}
```

**Response:**
```json
{
  "id": "1234567890",
  "title": "Updated Meeting with Team",
  "description": "Weekly team meeting",
  "start_date": "2025-07-08T10:00:00",
  "end_date": "2025-07-08T11:00:00",
  "is_all_day": false,
  "category": "work",
  "is_recurring": true,
  "rrule": "FREQ=WEEKLY;BYDAY=TU"
}
```

#### Delete Event

```
DELETE /api/v1/events/{event_id}
```

Delete an event.

**Parameters:**
- `event_id` (required): ID of the event

**Response:**
```json
{
  "success": true
}
```

### Categories

#### Get Categories

```
GET /api/v1/categories
```

Get all event categories.

**Response:**
```json
{
  "categories": [
    {
      "id": "work",
      "name": "Work",
      "color": "#4285F4"
    },
    {
      "id": "personal",
      "name": "Personal",
      "color": "#EA4335"
    },
    {
      "id": "family",
      "name": "Family",
      "color": "#FBBC05"
    },
    {
      "id": "holiday",
      "name": "Holiday",
      "color": "#34A853"
    }
  ]
}
```

### Holidays

#### Get Holidays

```
GET /api/v1/holidays
```

Get holidays within a date range.

**Parameters:**
- `start_date` (required): Start date in ISO format (YYYY-MM-DD)
- `end_date` (required): End date in ISO format (YYYY-MM-DD)
- `country` (optional): Country code (default: from settings)

**Response:**
```json
{
  "holidays": [
    {
      "id": "christmas_2025",
      "name": "Christmas Day",
      "date": "2025-12-25",
      "country": "US"
    },
    {
      "id": "new_year_2026",
      "name": "New Year's Day",
      "date": "2026-01-01",
      "country": "US"
    }
  ]
}
```

### Settings

#### Get Settings

```
GET /api/v1/settings
```

Get application settings.

**Response:**
```json
{
  "locale": "en_US",
  "theme": "light",
  "first_day_of_week": 0,
  "date_format": "MM/dd/yyyy",
  "time_format": "h:mm a",
  "holiday_country": "US"
}
```

#### Update Settings

```
PUT /api/v1/settings
```

Update application settings.

**Request Body:**
```json
{
  "locale": "fr_FR",
  "theme": "dark",
  "first_day_of_week": 1,
  "date_format": "dd/MM/yyyy",
  "time_format": "HH:mm",
  "holiday_country": "FR"
}
```

**Response:**
```json
{
  "locale": "fr_FR",
  "theme": "dark",
  "first_day_of_week": 1,
  "date_format": "dd/MM/yyyy",
  "time_format": "HH:mm",
  "holiday_country": "FR"
}
```

## Data Models

The API server uses the following data models:

### Event

```python
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class EventBase(BaseModel):
    """Base model for events."""
    title: str
    description: Optional[str] = None
    start_date: datetime
    end_date: datetime
    is_all_day: bool = False
    category: Optional[str] = None
    is_recurring: bool = False
    rrule: Optional[str] = None

class EventCreate(EventBase):
    """Model for creating events."""
    pass

class EventUpdate(EventBase):
    """Model for updating events."""
    pass

class Event(EventBase):
    """Model for event responses."""
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
```

### Category

```python
from pydantic import BaseModel

class Category(BaseModel):
    """Model for categories."""
    id: str
    name: str
    color: str

    class Config:
        orm_mode = True
```

### Holiday

```python
from pydantic import BaseModel
from datetime import date

class Holiday(BaseModel):
    """Model for holidays."""
    id: str
    name: str
    date: date
    country: str

    class Config:
        orm_mode = True
```

### Settings

```python
from pydantic import BaseModel
from typing import Optional

class Settings(BaseModel):
    """Model for settings."""
    locale: str
    theme: str
    first_day_of_week: int
    date_format: str
    time_format: str
    holiday_country: str

    class Config:
        orm_mode = True
```

## Error Handling

The API server implements comprehensive error handling to provide clear error messages and appropriate HTTP status codes.

### Error Response Format

All error responses follow a consistent format:

```json
{
  "detail": "Error message"
}
```

### HTTP Status Codes

The API server uses the following HTTP status codes:

- `200 OK`: Request succeeded
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Missing or invalid API key
- `404 Not Found`: Resource not found
- `422 Unprocessable Entity`: Validation error
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### Exception Handling

The API server uses FastAPI's exception handling to catch and process errors:

```python
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors."""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": str(exc)},
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions."""
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )
```

## Rate Limiting

The API server implements rate limiting to prevent abuse and ensure fair usage.

### Rate Limit Configuration

Rate limits are configured based on the endpoint:

- `GET` endpoints: 100 requests per minute
- `POST`, `PUT`, `DELETE` endpoints: 20 requests per minute

### Implementation

Rate limiting is implemented using the `slowapi` library:

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.get("/api/v1/events")
@limiter.limit("100/minute")
async def get_events(
    request: Request,
    start_date: str,
    end_date: str,
    category: Optional[str] = None,
    api_key: str = Depends(get_api_key),
    db: sqlite3.Connection = Depends(get_db)
):
    """Get events in date range."""
    # Implementation details...

@app.post("/api/v1/events")
@limiter.limit("20/minute")
async def create_event(
    request: Request,
    event: EventCreate,
    api_key: str = Depends(get_api_key),
    db: sqlite3.Connection = Depends(get_db)
):
    """Create a new event."""
    # Implementation details...
```

## Logging

The API server implements comprehensive logging to track requests, errors, and performance metrics.

### Log Levels

The API server uses the following log levels:

- `DEBUG`: Detailed debugging information
- `INFO`: General information about request processing
- `WARNING`: Potential issues that don't prevent operation
- `ERROR`: Errors that prevent an operation from completing
- `CRITICAL`: Critical errors that may cause the application to crash

### Log Format

Logs include the following information:

- Timestamp
- Log level
- Module/component name
- Message
- Additional context (e.g., request ID, user ID)

### Request Logging

All requests are logged with relevant information:

```python
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all requests."""
    request_id = str(uuid.uuid4())
    logger.info(f"Request {request_id}: {request.method} {request.url.path}")
    
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    logger.info(f"Request {request_id} completed in {process_time:.4f}s with status {response.status_code}")
    
    return response
```

## Performance Considerations

The API server is designed for high performance and scalability:

### Database Optimization

1. **Indexes**: The database includes indexes on frequently queried fields
2. **Connection Pooling**: Database connections are pooled for efficiency
3. **Query Optimization**: Queries are optimized for performance

### Caching

The API server implements caching to reduce database load:

1. **In-Memory Cache**: Frequently accessed data is cached in memory
2. **Cache Invalidation**: Cache is invalidated when data changes
3. **Conditional Responses**: ETag and Last-Modified headers for client-side caching

### Asynchronous Processing

The API server uses FastAPI's asynchronous capabilities for non-blocking I/O:

1. **Async Endpoints**: API endpoints are implemented as async functions
2. **Background Tasks**: Long-running operations are executed as background tasks
3. **Connection Pooling**: Database and HTTP connections are pooled

## Security Considerations

The API server implements several security measures:

### API Key Authentication

As described in the [Authentication](#authentication) section, the API server uses API key authentication to secure endpoints.

### HTTPS

The API server should be deployed behind a reverse proxy that terminates HTTPS connections, ensuring that all API traffic is encrypted.

### Input Validation

All request parameters and body data are validated using Pydantic models to prevent injection attacks and ensure data integrity.

### CORS

The API server implements Cross-Origin Resource Sharing (CORS) to control which domains can access the API:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-home-assistant-instance.local"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["X-API-Key", "Content-Type"],
)
```

### SQL Injection Prevention

The API server uses parameterized queries to prevent SQL injection attacks:

```python
def get_events_in_range(db, start_date, end_date, category=None):
    """Get events in date range."""
    query = """
        SELECT * FROM events
        WHERE start_date <= ? AND end_date >= ?
    """
    params = [end_date, start_date]
    
    if category:
        query += " AND category = ?"
        params.append(category)
    
    cursor = db.cursor()
    result = cursor.execute(query, params)
    return result.fetchall()
```

### Rate Limiting

As described in the [Rate Limiting](#rate-limiting) section, the API server implements rate limiting to prevent abuse.

### Logging and Monitoring

The API server logs all requests and errors for security monitoring and auditing purposes.