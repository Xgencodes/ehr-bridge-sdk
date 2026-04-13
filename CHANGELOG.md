# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-04-13

### Added

#### Converters (4 FHIR Resource Types)
- `PatientConverter` - Patient demographics, identifiers, contact info
- `AppointmentConverter` - Appointment scheduling and management
- `ObservationConverter` - Vitals and measurements with LOINC codes
- `MedicationConverter` - Prescriptions and medication requests

#### Database Support (4 Backends)
- **MySQL** (✅ Stable) - Relational database with snake_case fields
- **MongoDB** (✅ Stable) - Document database with camelCase fields
- **PostgreSQL** (✅ Stable) - Relational database with snake_case fields
- **Firestore** (✅ Stable) - Google Cloud NoSQL with camelCase fields

#### Client & Utilities
- `EHRBridgeClient` - Type-safe API client for Bridge operations
- `ConverterRegistry` - Dynamic converter lookup by FHIR resource type
- `HMACUtil` - HMAC-SHA256 signing for authentication
- `BaseConverter` - Abstract base class with utilities (date conversion, phone normalization, gender mapping)

#### Field Mapping & Customization
- Default field mappings for each database type
- Custom field mapping support (override defaults without code changes)
- Bidirectional conversion support (database ↔ FHIR)

#### Documentation
- Comprehensive README.md with quick start and examples
- `docs/DATABASE_SUPPORT.md` - Database roadmap and configuration
- `docs/CUSTOM_CONVERTERS.md` - Detailed guide for implementing custom converters
- Multiple integration examples for each supported database

#### Integration Examples
- `examples/mysql-integration.ts` - MySQL to FHIR workflow
- `examples/mongodb-integration.ts` - MongoDB to FHIR workflow
- `examples/postgresql-integration.ts` - PostgreSQL to FHIR workflow
- `examples/firestore-integration.ts` - Firestore to FHIR workflow
- `examples/full-connection-flow.ts` - Complete connection lifecycle (Flow A & B)

#### Type Safety
- Full TypeScript support with strict mode
- Type definitions for all converters and database interfaces
- Re-exports of FHIR R4 types from @medplum/fhirtypes

### Planned (Future Releases)

#### Database Support
- MariaDB
- SQL Server
- Oracle Database
- Amazon DynamoDB
- Apache CouchDB

#### FHIR Resources (Phase 2+)
- Encounter
- Condition / AllergyIntolerance
- DiagnosticReport
- DocumentReference

#### Features
- Connection management helpers
- Webhook signature verification utilities
- Batch import/export utilities
- Conflict resolution support
- Custom validator plugins

## [Unreleased]

- Initial development phase complete
- Ready for beta testing

---

## Release Notes

### v0.1.0
- Initial release with 4 converters and 4 database backends
- Full FHIR R4 compatibility
- Production-ready for MySQL, MongoDB, PostgreSQL, and Firestore
- Comprehensive documentation and examples
- Type-safe TypeScript implementation
