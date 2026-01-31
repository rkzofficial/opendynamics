# Microsoft Dynamics 365 CRM - Complete API Reference

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Structure](#api-structure)
4. [CRUD Operations](#crud-operations)
5. [Query Options (OData)](#query-options-odata)
6. [Filter Operators](#filter-operators)
7. [Functions & Actions](#functions--actions)
8. [Incident (Case) Entity Reference](#incident-case-entity-reference)
9. [Common Entities](#common-entities)
10. [Error Handling](#error-handling)
11. [Best Practices](#best-practices)

---

## Overview

The **Dataverse Web API** (used by Dynamics 365 CRM) is a RESTful API based on **OData v4.0** protocol.

### Key Features
- **Open Standards**: Implements OData (Open Data Protocol) v4.0, an OASIS standard
- **Cross-Platform**: Works across multiple programming languages, platforms, and devices
- **RESTful Architecture**: Uses standard HTTP methods (GET, POST, PATCH, DELETE)
- **No Language-Specific Libraries**: Uses standard HTTP - works with any language

### Base URL Format
```
https://<organization>.crm.dynamics.com/api/data/v9.2/
```

### Supported HTTP Methods
| Method | Operation |
|--------|-----------|
| `GET` | Retrieve/Query data |
| `POST` | Create records |
| `PATCH` | Update records |
| `DELETE` | Delete records |

---

## Authentication

### Method 1: Interactive Login (Device Code Flow)
Best for testing and user-context applications.

```python
# Configuration
CLIENT_ID = "51f81489-12ee-4a9e-aaae-a2591f45987d"  # Microsoft's public client
TENANT_ID = "your-tenant-id"
ORG_URL = "https://your-org.crm.dynamics.com"

# Step 1: Request device code
POST https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/devicecode
Content-Type: application/x-www-form-urlencoded

client_id={CLIENT_ID}
scope={ORG_URL}/user_impersonation openid profile
```

```python
# Step 2: Poll for token after user signs in
POST https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token

grant_type=urn:ietf:params:oauth:grant-type:device_code
client_id={CLIENT_ID}
device_code={DEVICE_CODE}
```

### Method 2: Client Credentials Flow (App-Only)
For background services and automation. Requires Application User setup in Power Platform.

```http
POST https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token

grant_type=client_credentials
client_id={CLIENT_ID}
client_secret={CLIENT_SECRET}
scope={ORG_URL}/.default
```

### Required Headers for API Calls
```http
Authorization: Bearer {access_token}
Accept: application/json
OData-MaxVersion: 4.0
OData-Version: 4.0
Content-Type: application/json  (for POST/PATCH)
```

---

## API Structure

### Entity Set Names
Dynamics 365 uses pluralized entity names for API endpoints:

| Entity | API Endpoint |
|--------|--------------|
| Account | `/accounts` |
| Contact | `/contacts` |
| Incident (Case) | `/incidents` |
| Opportunity | `/opportunities` |
| Lead | `/leads` |
| Task | `/tasks` |
| Email | `/emails` |
| Annotation (Note) | `/annotations` |

### URL Construction
```
GET [Organization URI]/api/data/v9.2/[EntitySet]?[query options]
```

Example:
```
GET https://org.crm.dynamics.com/api/data/v9.2/incidents?$select=title,ticketnumber&$top=10
```

---

## CRUD Operations

### CREATE (POST)

#### Basic Create
```http
POST /api/data/v9.2/incidents
Content-Type: application/json

{
  "title": "New Support Case",
  "description": "Customer reported an issue",
  "prioritycode": 1
}
```

**Response:** `204 No Content` with `OData-EntityId` header

#### Create with Data Returned
```http
POST /api/data/v9.2/incidents?$select=title,ticketnumber,incidentid
Prefer: return=representation

{
  "title": "New Support Case"
}
```

**Response:** `201 Created` with entity data

#### Associate with Existing Record on Create
```http
POST /api/data/v9.2/incidents

{
  "title": "New Case",
  "customerid_contact@odata.bind": "/contacts(00000000-0000-0000-0000-000000000001)"
}
```

#### Deep Insert (Create Related Records)
```http
POST /api/data/v9.2/accounts

{
  "name": "Sample Account",
  "primarycontactid": {
    "firstname": "John",
    "lastname": "Smith"
  },
  "Account_Tasks": [
    { "subject": "Task 1" },
    { "subject": "Task 2" }
  ]
}
```

### READ (GET)

#### Get Single Record
```http
GET /api/data/v9.2/incidents({incidentid})?$select=title,ticketnumber,statecode
```

#### Get Multiple Records
```http
GET /api/data/v9.2/incidents?$select=title,ticketnumber&$top=50&$orderby=createdon desc
```

#### WhoAmI (Test Connection)
```http
GET /api/data/v9.2/WhoAmI
```

### UPDATE (PATCH)

#### Basic Update
```http
PATCH /api/data/v9.2/incidents({incidentid})
If-Match: *

{
  "title": "Updated Title",
  "prioritycode": 2
}
```

**Response:** `204 No Content`

#### Update with Data Returned
```http
PATCH /api/data/v9.2/incidents({incidentid})?$select=title,modifiedon
Prefer: return=representation
If-Match: *

{
  "title": "Updated Title"
}
```

**Response:** `200 OK` with updated entity

#### Update Single Property
```http
PUT /api/data/v9.2/incidents({incidentid})/title

{
  "value": "New Title"
}
```

### DELETE

#### Delete Record
```http
DELETE /api/data/v9.2/incidents({incidentid})
```

**Response:** `204 No Content`

#### Delete Single Property Value
```http
DELETE /api/data/v9.2/incidents({incidentid})/description
```

### UPSERT (Update or Insert)
```http
PATCH /api/data/v9.2/incidents({incidentid})

{
  "title": "Case Title"
}
```
- Creates if doesn't exist
- Updates if exists

---

## Query Options (OData)

### Supported Query Options

| Option | Purpose | Example |
|--------|---------|---------|
| `$select` | Choose columns to return | `$select=title,ticketnumber` |
| `$filter` | Filter results | `$filter=statecode eq 0` |
| `$orderby` | Sort results | `$orderby=createdon desc` |
| `$top` | Limit number of results | `$top=50` |
| `$expand` | Include related entities | `$expand=customerid_contact` |
| `$count` | Include total count | `$count=true` |
| `$apply` | Aggregate data | `$apply=aggregate(revenue with sum as total)` |

### Pagination
Default limit: **5,000 rows** per request

For large datasets, use the `@odata.nextLink` URL from the response:
```json
{
  "@odata.context": "...",
  "@odata.nextLink": "https://org.crm.dynamics.com/api/data/v9.2/incidents?$skiptoken=...",
  "value": [...]
}
```

### Parameter Aliases
Use `@p1`, `@p2` etc. for complex filters:
```
GET /api/data/v9.2/incidents?$filter=@p1&@p1=statecode eq 0 and prioritycode eq 1
```

### $expand Examples

#### Single Related Entity
```
GET /api/data/v9.2/incidents?$expand=customerid_contact($select=fullname,emailaddress1)
```

#### Multiple Related Entities
```
GET /api/data/v9.2/incidents?$expand=customerid_contact,ownerid
```

#### Nested Expansion
```
GET /api/data/v9.2/accounts?$expand=primarycontactid($expand=contact_customer_accounts)
```

---

## Filter Operators

### Comparison Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `eq` | Equal | `$filter=statecode eq 0` |
| `ne` | Not equal | `$filter=statecode ne 2` |
| `gt` | Greater than | `$filter=revenue gt 100000` |
| `ge` | Greater than or equal | `$filter=createdon ge 2024-01-01` |
| `lt` | Less than | `$filter=prioritycode lt 2` |
| `le` | Less than or equal | `$filter=revenue le 500000` |

### Logical Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `and` | Logical AND | `$filter=statecode eq 0 and prioritycode eq 1` |
| `or` | Logical OR | `$filter=prioritycode eq 1 or prioritycode eq 2` |
| `not` | Logical NOT | `$filter=not contains(title,'test')` |

### Grouping with Parentheses
```
$filter=(statecode eq 0 or statecode eq 1) and prioritycode eq 1
```

### String Functions

| Function | Example |
|----------|---------|
| `contains` | `$filter=contains(title,'issue')` |
| `startswith` | `$filter=startswith(title,'Critical')` |
| `endswith` | `$filter=endswith(emailaddress1,'.com')` |

### Wildcard Characters

| Character | Description | Example |
|-----------|-------------|---------|
| `%` | Any string (0+ chars) | `name eq '%Corp%'` |
| `_` | Any single character | `name eq 'Test_'` |
| `[]` | Character range | `name eq '[A-C]%'` |

### Dataverse Query Functions

#### Date Functions
```
$filter=Microsoft.Dynamics.CRM.Today(PropertyName='createdon')
$filter=Microsoft.Dynamics.CRM.Last7Days(PropertyName='createdon')
$filter=Microsoft.Dynamics.CRM.LastXDays(PropertyName='createdon',PropertyValue=30)
$filter=Microsoft.Dynamics.CRM.ThisMonth(PropertyName='createdon')
$filter=Microsoft.Dynamics.CRM.ThisYear(PropertyName='createdon')
```

**Available Date Functions:**
- Today, Tomorrow, Yesterday
- Last7Days, Next7Days
- LastWeek, ThisWeek, NextWeek
- LastMonth, ThisMonth, NextMonth
- LastYear, ThisYear, NextYear
- LastXDays, NextXDays, LastXMonths, NextXMonths
- InFiscalPeriod, InFiscalYear

#### Between Function
```
$filter=Microsoft.Dynamics.CRM.Between(PropertyName='revenue',PropertyValues=["10000","50000"])
```

#### In Function
```
$filter=Microsoft.Dynamics.CRM.In(PropertyName='statecode',PropertyValues=[0,1])
```

#### User/Team Functions
```
$filter=Microsoft.Dynamics.CRM.EqualUserId(PropertyName='ownerid')
$filter=Microsoft.Dynamics.CRM.EqualUserTeams(PropertyName='ownerid')
```

### Lambda Operators (Collection Filtering)

#### Any (at least one matches)
```
$filter=incident_activity_parties/any(a:a/participationtypemask eq 2)
```

#### All (all must match)
```
$filter=Account_Tasks/all(t:t/statecode eq 1)
```

### Filter on Lookup Values
```
$filter=_ownerid_value eq {systemuserid}
$filter=_customerid_value eq {contactid}
```

### Filter on Navigation Properties
```
$filter=customerid_contact/fullname eq 'John Smith'
$filter=primarycontactid/emailaddress1 eq 'john@example.com'
```

---

## Functions & Actions

### Functions (GET - Read-only operations)

#### Unbound Functions
Called directly without entity context.

**WhoAmI**
```http
GET /api/data/v9.2/WhoAmI
```
Response:
```json
{
  "BusinessUnitId": "...",
  "UserId": "...",
  "OrganizationId": "..."
}
```

**RetrieveVersion**
```http
GET /api/data/v9.2/RetrieveVersion
```

**GetTimeZoneCodeByLocalizedName**
```http
GET /api/data/v9.2/GetTimeZoneCodeByLocalizedName(LocalizedStandardName=@p1,LocaleId=@p2)?@p1='Pacific Standard Time'&@p2=1033
```

#### Bound Functions
Called on specific entity instances. Require full namespace.

```http
GET /api/data/v9.2/systemusers({id})/Microsoft.Dynamics.CRM.RetrieveUserPrivileges
```

### Actions (POST - May have side effects)

#### Unbound Actions

**Merge**
```http
POST /api/data/v9.2/Merge
Content-Type: application/json

{
  "Target": {
    "@odata.type": "Microsoft.Dynamics.CRM.incident",
    "incidentid": "target-id"
  },
  "Subordinate": {
    "@odata.type": "Microsoft.Dynamics.CRM.incident",
    "incidentid": "subordinate-id"
  },
  "PerformParentingChecks": false
}
```

**CreateMultiple**
```http
POST /api/data/v9.2/incidents/Microsoft.Dynamics.CRM.CreateMultiple
Content-Type: application/json

{
  "Targets": [
    { "title": "Case 1" },
    { "title": "Case 2" }
  ]
}
```

#### Bound Actions

**CloseIncident (Resolve Case)**
```http
POST /api/data/v9.2/CloseIncident
Content-Type: application/json

{
  "IncidentResolution": {
    "@odata.type": "Microsoft.Dynamics.CRM.incidentresolution",
    "subject": "Case Resolved",
    "incidentid@odata.bind": "/incidents({incidentid})"
  },
  "Status": 5
}
```

**AddToQueue**
```http
POST /api/data/v9.2/queues({queueid})/Microsoft.Dynamics.CRM.AddToQueue
Content-Type: application/json

{
  "Target": {
    "incidentid": "{incidentid}",
    "@odata.type": "Microsoft.Dynamics.CRM.incident"
  }
}
```

**SetState (Change Status)**
```http
PATCH /api/data/v9.2/incidents({incidentid})

{
  "statecode": 1,
  "statuscode": 5
}
```

---

## Incident (Case) Entity Reference

### Entity Information
| Property | Value |
|----------|-------|
| **Entity Name** | Incident |
| **Logical Name** | `incident` |
| **Entity Set** | `incidents` |
| **Primary ID** | `incidentid` |
| **Primary Name** | `title` |
| **Ownership** | User/Team |

### Key Writable Fields

| Field | Schema Name | Type | Description |
|-------|-------------|------|-------------|
| Title | `title` | String (200) | Case subject **(Required)** |
| Description | `description` | Memo (2000) | Additional information |
| Ticket Number | `ticketnumber` | String (100) | Auto-generated case number |
| Case Origin | `caseorigincode` | OptionSet | Phone, Email, Web, Facebook, Twitter, IoT |
| Case Type | `casetypecode` | OptionSet | Question, Problem, Request |
| Priority | `prioritycode` | OptionSet | 1=High, 2=Normal, 3=Low |
| Severity | `severitycode` | OptionSet | Impact level |
| Status | `statecode` | State | 0=Active, 1=Resolved, 2=Cancelled |
| Status Reason | `statuscode` | Status | Detailed status |
| Customer | `customerid` | Lookup | Account or Contact |
| Contact | `primarycontactid` | Lookup | Primary contact |
| Owner | `ownerid` | Owner | User or Team |
| Product | `productid` | Lookup | Associated product |
| Serial Number | `productserialnumber` | String (100) | Product serial |
| Contract | `contractid` | Lookup | Service contract |
| Entitlement | `entitlementid` | Lookup | Applicable entitlement |
| Subject | `subjectid` | Lookup | Case subject/category |
| Is Escalated | `isescalated` | Boolean | Whether escalated |
| Follow Up By | `followupby` | DateTime | Follow-up date |
| Resolve By | `resolveby` | DateTime | Resolution deadline |
| First Response By | `responseby` | DateTime | Response deadline |
| SLA | `slaid` | Lookup | Applied SLA |
| Parent Case | `parentcaseid` | Lookup | Parent case |
| Email Address | `emailaddress` | String (100) | Primary email |
| Satisfaction | `customersatisfactioncode` | OptionSet | Customer satisfaction |
| Service Stage | `servicestage` | OptionSet | Identify, Research, Resolve |
| Blocked Profile | `blockedprofile` | Boolean | Profile blocked |

### Read-Only Fields

| Field | Schema Name | Type |
|-------|-------------|------|
| Account | `accountid` | Lookup |
| Contact | `contactid` | Lookup |
| Created On | `createdon` | DateTime |
| Created By | `createdby` | Lookup |
| Modified On | `modifiedon` | DateTime |
| Modified By | `modifiedby` | Lookup |
| Case Age | `caseage` | String |
| Escalated On | `escalatedon` | DateTime |
| Merged | `merged` | Boolean |
| Child Cases | `numberofchildincidents` | Integer |
| On Hold Time | `onholdtime` | Integer (minutes) |

### Status Codes

#### statecode (State)
| Value | Label |
|-------|-------|
| 0 | Active |
| 1 | Resolved |
| 2 | Cancelled |

#### statuscode (Status Reason)
| Value | Label | State |
|-------|-------|-------|
| 1 | In Progress | Active |
| 2 | On Hold | Active |
| 3 | Waiting for Details | Active |
| 4 | Researching | Active |
| 5 | Problem Solved | Resolved |
| 6 | Cancelled | Cancelled |
| 1000 | Information Provided | Resolved |
| 2000 | Merged | Cancelled |

#### caseorigincode (Case Origin)
| Value | Label |
|-------|-------|
| 1 | Phone |
| 2 | Email |
| 3 | Web |
| 2483 | Facebook |
| 3986 | Twitter |
| 700610000 | IoT |

#### prioritycode (Priority)
| Value | Label |
|-------|-------|
| 1 | High |
| 2 | Normal |
| 3 | Low |

#### casetypecode (Case Type)
| Value | Label |
|-------|-------|
| 1 | Question |
| 2 | Problem |
| 3 | Request |

### Common Case Operations

#### Create a Case
```http
POST /api/data/v9.2/incidents
Content-Type: application/json

{
  "title": "Product not working",
  "description": "Customer reports the product stopped functioning",
  "caseorigincode": 2,
  "casetypecode": 2,
  "prioritycode": 1,
  "customerid_contact@odata.bind": "/contacts({contactid})"
}
```

#### Get Active Cases
```http
GET /api/data/v9.2/incidents?$select=title,ticketnumber,prioritycode,createdon&$filter=statecode eq 0&$orderby=createdon desc
```

#### Get Case with Customer Details
```http
GET /api/data/v9.2/incidents({incidentid})?$select=title,ticketnumber,statecode&$expand=customerid_contact($select=fullname,emailaddress1)
```

#### Update Case Priority
```http
PATCH /api/data/v9.2/incidents({incidentid})

{
  "prioritycode": 1
}
```

#### Escalate a Case
```http
PATCH /api/data/v9.2/incidents({incidentid})

{
  "isescalated": true
}
```

#### Close/Resolve a Case
```http
POST /api/data/v9.2/CloseIncident
Content-Type: application/json

{
  "IncidentResolution": {
    "@odata.type": "Microsoft.Dynamics.CRM.incidentresolution",
    "subject": "Problem Resolved",
    "description": "Issue was resolved by updating the configuration",
    "incidentid@odata.bind": "/incidents({incidentid})",
    "timespent": 60
  },
  "Status": 5
}
```

#### Cancel a Case
```http
PATCH /api/data/v9.2/incidents({incidentid})

{
  "statecode": 2,
  "statuscode": 6
}
```

#### Assign to User
```http
PATCH /api/data/v9.2/incidents({incidentid})

{
  "ownerid@odata.bind": "/systemusers({userid})"
}
```

#### Assign to Team
```http
PATCH /api/data/v9.2/incidents({incidentid})

{
  "ownerid@odata.bind": "/teams({teamid})"
}
```

#### Add Note to Case
```http
POST /api/data/v9.2/annotations
Content-Type: application/json

{
  "subject": "Note Subject",
  "notetext": "This is the note content",
  "objectid_incident@odata.bind": "/incidents({incidentid})"
}
```

#### Get Case Notes
```http
GET /api/data/v9.2/annotations?$filter=_objectid_value eq {incidentid}&$select=subject,notetext,createdon&$orderby=createdon desc
```

---

## Common Entities

### Account
- **Endpoint**: `/accounts`
- **Primary Key**: `accountid`
- **Primary Name**: `name`

### Contact
- **Endpoint**: `/contacts`
- **Primary Key**: `contactid`
- **Primary Name**: `fullname`

### Lead
- **Endpoint**: `/leads`
- **Primary Key**: `leadid`
- **Primary Name**: `fullname`

### Opportunity
- **Endpoint**: `/opportunities`
- **Primary Key**: `opportunityid`
- **Primary Name**: `name`

### Task
- **Endpoint**: `/tasks`
- **Primary Key**: `activityid`
- **Primary Name**: `subject`

### Email
- **Endpoint**: `/emails`
- **Primary Key**: `activityid`
- **Primary Name**: `subject`

### Phone Call
- **Endpoint**: `/phonecalls`
- **Primary Key**: `activityid`
- **Primary Name**: `subject`

### Appointment
- **Endpoint**: `/appointments`
- **Primary Key**: `activityid`
- **Primary Name**: `subject`

### Annotation (Note)
- **Endpoint**: `/annotations`
- **Primary Key**: `annotationid`
- **Primary Name**: `subject`

### Queue
- **Endpoint**: `/queues`
- **Primary Key**: `queueid`
- **Primary Name**: `name`

### System User
- **Endpoint**: `/systemusers`
- **Primary Key**: `systemuserid`
- **Primary Name**: `fullname`

### Team
- **Endpoint**: `/teams`
- **Primary Key**: `teamid`
- **Primary Name**: `name`

---

## Error Handling

### Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK (with response body) |
| 201 | Created |
| 204 | No Content (success) |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 412 | Precondition Failed (ETag mismatch) |
| 500 | Internal Server Error |

### Error Response Format
```json
{
  "error": {
    "code": "0x80040217",
    "message": "Entity 'incident' With Id = ... Does Not Exist"
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `0x80040217` | Record not found |
| `0x8004430C` | Too many conditions (>500) |
| `0x80048306` | Privilege denied |
| `0x80072560` | User not member of organization |
| `0x80040237` | Duplicate record detected |

---

## Best Practices

### Performance
1. **Use `$select`** - Only request needed columns
2. **Use `$top`** - Limit results when possible
3. **Use `$filter`** - Filter on server, not client
4. **Avoid `$expand` loops** - Can cause performance issues
5. **Use batch requests** - For multiple operations

### Security
1. Store credentials securely (never in code)
2. Use minimum required permissions
3. Validate all user input
4. Use HTTPS only

### Reliability
1. Handle pagination with `@odata.nextLink`
2. Implement retry logic for transient errors
3. Use `If-Match: *` to prevent unintended upserts
4. Check `ETag` for optimistic concurrency

### URL Length Limits
- GET requests: **32 KB**
- Batch POST requests: **64 KB**
- Use parameter aliases for long filters

---

## Useful Links

- [Web API Overview](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/overview)
- [Query Data](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-data-web-api)
- [Filter Rows](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query/filter-rows)
- [Create Records](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/create-entity-web-api)
- [Update/Delete Records](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/update-delete-entities-using-web-api)
- [Functions](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/use-web-api-functions)
- [Actions](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/use-web-api-actions)
- [Incident Entity Reference](https://learn.microsoft.com/en-us/dynamics365/customerengagement/on-premises/developer/entities/incident)

---

## Quick Reference Card

### Authentication (Device Code)
```python
CLIENT_ID = "51f81489-12ee-4a9e-aaae-a2591f45987d"
SCOPE = "{ORG_URL}/user_impersonation"
```

### Headers
```
Authorization: Bearer {token}
Accept: application/json
OData-MaxVersion: 4.0
OData-Version: 4.0
```

### Common Operations
```
# Get cases
GET /incidents?$select=title,ticketnumber&$filter=statecode eq 0

# Create case
POST /incidents
{"title": "Case Title", "prioritycode": 1}

# Update case
PATCH /incidents({id})
{"prioritycode": 2}

# Delete case
DELETE /incidents({id})

# Resolve case
POST /CloseIncident
{"IncidentResolution": {...}, "Status": 5}
```
