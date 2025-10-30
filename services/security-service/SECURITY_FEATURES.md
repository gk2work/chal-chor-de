# Security and Compliance Features

This document describes the security and compliance features implemented for the OfficeShare platform.

## Overview

The Security Service provides comprehensive security, audit logging, encryption, GDPR compliance, and security monitoring capabilities for the entire OfficeShare platform.

## Features Implemented

### 1. Advanced Audit Logging (`audit-logger.js`)

Comprehensive audit trail for all platform activities using Winston logging framework with MongoDB persistence.

#### Event Categories

- **AUTHENTICATION**: Login attempts, SSO events, session management
- **DATA_ACCESS**: Resource access, API calls, data retrieval
- **DATA_MODIFICATION**: Create, update, delete operations
- **SECURITY**: Security incidents, threats, violations
- **PRIVACY**: GDPR-related events, consent management
- **ADMIN_ACTION**: Administrative operations, user management
- **TRANSACTION**: Financial and resource transactions
- **SYSTEM**: System events, errors, performance issues

#### Key Features

- Automatic sensitive data sanitization
- Severity-based logging (INFO, WARNING, ERROR, CRITICAL)
- Audit report generation
- Suspicious activity detection
- MongoDB persistence with structured metadata

### 2. Data Encryption (`encryption-service.js`)

Enterprise-grade encryption for data at rest and in transit using AES-256-GCM.

#### Encryption Capabilities

- **Field-level encryption**: Encrypt specific database fields
- **Object encryption**: Encrypt multiple fields in objects
- **Envelope encryption**: Two-layer encryption for enhanced security
- **One-way hashing**: Secure password and sensitive data hashing
- **Token generation**: Secure random token creation

#### Security Features

- AES-256-GCM algorithm with authentication tags
- PBKDF2 key derivation (100,000 iterations)
- Random IV and salt generation per encryption
- Additional Authenticated Data (AAD) support
- Sensitive data masking for logging

### 3. GDPR Compliance (`gdpr-compliance.js`)

Complete GDPR compliance implementation covering all user rights.

#### GDPR Rights Implemented

**Right to Access (Article 15)**

- Export all user personal data
- Structured JSON format
- Includes all modules (carpooling, bikes, books, chat, ratings)

**Right to Erasure / Right to be Forgotten (Article 17)**

- Complete data deletion or anonymization
- Maintains system integrity while removing personal data
- Audit trail of deletion requests

**Right to Rectification (Article 16)**

- User data updates and corrections
- Audit logging of all modifications

**Right to Data Portability (Article 20)**

- Export data in JSON, CSV, or XML formats
- Machine-readable format for data transfer

**Right to Restrict Processing (Article 18)**

- Processing restriction management
- Granular control over data usage

**Consent Management (Article 7)**

- Explicit consent recording
- Consent verification
- Consent withdrawal support
- Version tracking

#### Additional Features

- Data retention policy enforcement
- Privacy impact assessments
- Automated data anonymization
- Legal basis documentation

### 4. Security Monitoring (`security-monitor.js`)

Real-time security threat detection and alerting system.

#### Threat Detection

**Authentication Threats**

- Brute force attack detection
- Failed login monitoring
- Automatic IP blocking

**API Security**

- Rate limiting enforcement
- API abuse detection
- Throttling mechanisms

**Data Security**

- Suspicious data access patterns
- Mass data export detection
- Unauthorized access attempts
- Data exfiltration monitoring

**Injection Attacks**

- SQL injection detection
- XSS (Cross-Site Scripting) detection
- Input validation and sanitization

**Privilege Escalation**

- Unauthorized action attempts
- Role violation detection

#### Alert Management

- Severity-based alerts (INFO, MEDIUM, HIGH, CRITICAL)
- Alert acknowledgment workflow
- Active alert tracking
- Security report generation

#### Pattern Detection

- Mass profile access
- Automated scraping
- Off-hours access
- Rapid sequential access

## API Endpoints

### Audit Logging

#### POST `/api/security/audit/authentication`

Log authentication events.

**Request:**

```json
{
  "action": "LOGIN",
  "success": true,
  "metadata": {
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/5.0...",
    "session_id": "session_123"
  }
}
```

#### POST `/api/security/audit/data-access`

Log data access events.

**Request:**

```json
{
  "resource": {
    "type": "USER_PROFILE",
    "id": "user_123"
  },
  "action": "READ",
  "metadata": {
    "classification": "INTERNAL"
  }
}
```

#### POST `/api/security/audit/security-event`

Log security events.

**Request:**

```json
{
  "event_type": "UNAUTHORIZED_ACCESS",
  "severity": "HIGH",
  "details": {
    "resource": "admin_panel",
    "attempted_action": "DELETE_USER"
  }
}
```

### Encryption

#### POST `/api/security/encrypt`

Encrypt sensitive data.

**Request:**

```json
{
  "data": "sensitive information",
  "additional_data": "context"
}
```

**Response:**

```json
{
  "encrypted": "{\"encrypted\":\"...\",\"iv\":\"...\",\"salt\":\"...\",\"tag\":\"...\"}"
}
```

#### POST `/api/security/decrypt`

Decrypt encrypted data.

**Request:**

```json
{
  "encrypted_data": "{\"encrypted\":\"...\"}",
  "additional_data": "context"
}
```

### GDPR Compliance

#### GET `/api/security/gdpr/export-data`

Export all user personal data (Right to Access).

**Response:**

```json
{
  "export_date": "2025-10-30T12:00:00Z",
  "user_id": "user_123",
  "office_id": "office_001",
  "data": {
    "user_profile": {...},
    "carpool_trips": [...],
    "bike_bookings": [...],
    "book_loans": [...],
    "chat_messages": [...],
    "ratings": [...],
    "transactions": [...]
  }
}
```

#### POST `/api/security/gdpr/delete-data`

Delete all user data (Right to be Forgotten).

**Request:**

```json
{
  "reason": "USER_REQUEST"
}
```

**Response:**

```json
{
  "deletion_date": "2025-10-30T12:00:00Z",
  "status": "COMPLETED",
  "results": {
    "user_profile": { "anonymized": true },
    "carpool_trips": { "anonymized": 15 },
    "bike_bookings": { "anonymized": 3 }
  }
}
```

#### POST `/api/security/gdpr/consent`

Record user consent.

**Request:**

```json
{
  "consent_type": "DATA_PROCESSING",
  "granted": true,
  "metadata": {
    "ip_address": "192.168.1.1",
    "consent_text": "I agree to...",
    "version": "1.0"
  }
}
```

#### GET `/api/security/gdpr/consent/:consent_type`

Verify user consent.

**Response:**

```json
{
  "has_consent": true,
  "consent_date": "2025-10-30T12:00:00Z",
  "version": "1.0"
}
```

### Security Monitoring

#### POST `/api/security/monitor/failed-login`

Monitor failed login attempts.

**Request:**

```json
{
  "user_id": "user_123",
  "office_id": "office_001",
  "ip_address": "192.168.1.1"
}
```

**Response:**

```json
{
  "blocked": false
}
```

#### POST `/api/security/monitor/rate-limit`

Check API rate limits.

**Request:**

```json
{
  "endpoint": "/api/users/profile"
}
```

**Response:**

```json
{
  "rate_limited": false
}
```

#### GET `/api/security/monitor/alerts`

Get active security alerts.

**Query Parameters:**

- `severity`: Filter by severity (CRITICAL, HIGH, MEDIUM, INFO)

**Response:**

```json
{
  "alerts": [
    {
      "alert_id": "alert_123",
      "type": "BRUTE_FORCE_ATTEMPT",
      "severity": "HIGH",
      "user_id": "user_123",
      "details": {...},
      "recommended_action": "BLOCK_IP_TEMPORARY"
    }
  ],
  "count": 1
}
```

#### POST `/api/security/monitor/acknowledge-alert`

Acknowledge a security alert.

**Request:**

```json
{
  "alert_id": "alert_123"
}
```

#### GET `/api/security/monitor/report`

Generate security report.

**Query Parameters:**

- `start_date`: Report start date
- `end_date`: Report end date

**Response:**

```json
{
  "period": {
    "start": "2025-10-01T00:00:00Z",
    "end": "2025-10-30T23:59:59Z"
  },
  "summary": {
    "total_alerts": 25,
    "critical_alerts": 3,
    "high_alerts": 8,
    "total_security_events": 150
  },
  "alerts_by_type": {
    "BRUTE_FORCE_ATTEMPT": 5,
    "RATE_LIMIT_EXCEEDED": 10
  },
  "top_affected_users": [...],
  "recommendations": [...]
}
```

## Configuration

### Environment Variables

```bash
# Security Service
SECURITY_SERVICE_PORT=3008

# Encryption
ENCRYPTION_MASTER_KEY=your-256-bit-encryption-master-key
ENCRYPTION_ALGORITHM=aes-256-gcm

# Data Retention (days)
AUDIT_LOG_RETENTION=730
CHAT_MESSAGE_RETENTION=365
LOCATION_DATA_RETENTION=90
TRANSACTION_RETENTION=2555

# Security Thresholds
MAX_FAILED_LOGIN_ATTEMPTS=5
API_RATE_LIMIT=100
RATE_LIMIT_WINDOW=300
```

## Security Best Practices

### Encryption Key Management

- Store master encryption key in secure key management service (AWS KMS, Azure Key Vault)
- Rotate encryption keys regularly
- Never commit keys to version control

### Audit Logging

- Review audit logs regularly
- Set up automated alerts for critical events
- Maintain logs for required retention period

### GDPR Compliance

- Respond to data subject requests within 30 days
- Maintain consent records
- Conduct regular privacy impact assessments
- Enforce data retention policies

### Security Monitoring

- Review security alerts daily
- Investigate all critical and high severity alerts
- Update threat detection patterns regularly
- Conduct regular security audits

## Integration with Other Services

The Security Service integrates with all platform services:

1. **User Service**: Authentication audit logging
2. **Carpooling Service**: Transaction logging, data encryption
3. **Bike Sharing Service**: Booking audit, GDPR compliance
4. **Library Service**: Loan tracking, privacy compliance
5. **Chat Service**: Message encryption, retention policies
6. **Admin Dashboard**: Security reports, alert management

## Compliance Standards

- **GDPR**: Full compliance with EU General Data Protection Regulation
- **ISO 27001**: Information security management best practices
- **SOC 2**: Security, availability, and confidentiality controls
- **OWASP Top 10**: Protection against common web vulnerabilities

## Future Enhancements

- Integration with SIEM (Security Information and Event Management) systems
- Advanced machine learning for anomaly detection
- Automated incident response workflows
- Blockchain-based audit trail for immutability
- Multi-factor authentication (MFA) support
- Biometric authentication integration
