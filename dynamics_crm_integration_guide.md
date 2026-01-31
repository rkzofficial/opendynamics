# Dynamics 365 CRM API Integration Guide

## Overview
This guide covers integrating with Microsoft Dynamics 365 CRM via the Web API to work with cases (incidents).

## Authentication Approach

**Method:** Interactive Login with Microsoft's Public Client (Device Code Flow)

This approach:
- Uses Microsoft's pre-approved public client ID (no admin consent needed)
- Authenticates with your company credentials
- Acts on behalf of your user account

### Configuration
```python
CLIENT_ID = "51f81489-12ee-4a9e-aaae-a2591f45987d"  # Microsoft's public client
TENANT_ID = "fa7b1b5a-7b34-4387-94ae-d2c178decee1"  # Your tenant
ORG_URL = "https://adobe-ent.crm.dynamics.com"       # Your Dynamics org
```

---

## Authentication Flow

### Step 1: Request Device Code
```http
POST https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/devicecode

client_id={CLIENT_ID}
scope={ORG_URL}/user_impersonation openid profile
```

### Step 2: User Signs In
- User opens the verification URL
- Enters the provided code
- Signs in with company credentials

### Step 3: Poll for Token
```http
POST https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token

grant_type=urn:ietf:params:oauth:grant-type:device_code
client_id={CLIENT_ID}
device_code={DEVICE_CODE}
```

### Step 4: Use Access Token
```http
GET {ORG_URL}/api/data/v9.2/incidents
Authorization: Bearer {ACCESS_TOKEN}
```

---

## API Endpoints

**Base URL:** `https://adobe-ent.crm.dynamics.com/api/data/v9.2/`

### Common Headers
```
Authorization: Bearer {access_token}
Accept: application/json
OData-MaxVersion: 4.0
OData-Version: 4.0
Content-Type: application/json  (for POST/PATCH)
```

---

## Working with Cases (Incidents)

### Get Cases
```http
GET /api/data/v9.2/incidents?$select=title,ticketnumber,statecode&$top=10&$orderby=createdon desc
```

### Get Single Case
```http
GET /api/data/v9.2/incidents({incident_id})?$select=title,ticketnumber,description,statecode
```

### Create Case
```http
POST /api/data/v9.2/incidents
Content-Type: application/json

{
  "title": "Case Title",
  "description": "Case description",
  "prioritycode": 2,
  "customerid_contact@odata.bind": "/contacts({contact_id})"
}
```

### Update Case
```http
PATCH /api/data/v9.2/incidents({incident_id})
Content-Type: application/json

{
  "title": "Updated Title",
  "prioritycode": 1
}
```

### Close/Resolve Case
```http
POST /api/data/v9.2/CloseIncident

{
  "IncidentResolution": {
    "subject": "Resolved",
    "incidentid@odata.bind": "/incidents({incident_id})"
  },
  "Status": 5
}
```

### Delete Case
```http
DELETE /api/data/v9.2/incidents({incident_id})
```

---

## Query Options (OData)

| Option | Example | Description |
|--------|---------|-------------|
| `$select` | `$select=title,ticketnumber` | Choose fields to return |
| `$filter` | `$filter=statecode eq 0` | Filter results |
| `$orderby` | `$orderby=createdon desc` | Sort results |
| `$top` | `$top=10` | Limit number of results |
| `$expand` | `$expand=customerid_contact` | Include related entities |

### Filter Examples
```
# Active cases only
$filter=statecode eq 0

# Cases created today
$filter=createdon ge 2024-01-15

# Cases by priority
$filter=prioritycode eq 1

# Combined filters
$filter=statecode eq 0 and prioritycode eq 1
```

---

## Case Status Codes

### statecode (State)
| Value | Label |
|-------|-------|
| 0 | Active |
| 1 | Resolved |
| 2 | Cancelled |

### prioritycode (Priority)
| Value | Label |
|-------|-------|
| 1 | High |
| 2 | Normal |
| 3 | Low |

---

## Python Code Reference

### Working POC Script
File: `dynamics_crm_poc_public.py`

### Key Functions

```python
import requests
import time

CLIENT_ID = "51f81489-12ee-4a9e-aaae-a2591f45987d"
TENANT_ID = "fa7b1b5a-7b34-4387-94ae-d2c178decee1"
ORG_URL = "https://adobe-ent.crm.dynamics.com"

def get_access_token_interactive():
    """Get token via device code flow"""
    # Request device code
    device_code_url = f"https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/devicecode"
    response = requests.post(device_code_url, data={
        "client_id": CLIENT_ID,
        "scope": f"{ORG_URL}/user_impersonation openid profile"
    })

    device_info = response.json()
    print(f"Open: {device_info['verification_uri']}")
    print(f"Enter code: {device_info['user_code']}")

    # Poll for token
    token_url = f"https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token"
    while True:
        time.sleep(device_info.get('interval', 5))
        response = requests.post(token_url, data={
            "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
            "client_id": CLIENT_ID,
            "device_code": device_info['device_code']
        })
        if response.status_code == 200:
            return response.json()['access_token']

def make_api_call(access_token, endpoint, method="GET", data=None):
    """Generic API call helper"""
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0"
    }
    if data:
        headers["Content-Type"] = "application/json"

    url = f"{ORG_URL}/api/data/v9.2/{endpoint}"
    response = requests.request(method, url, headers=headers, json=data)
    return response
```

---

## Files Created

| File | Description |
|------|-------------|
| `dynamics_crm_poc.py` | Client credentials flow (requires Application User) |
| `dynamics_crm_poc_interactive.py` | Interactive login with your app (requires admin consent) |
| `dynamics_crm_poc_public.py` | **Working** - Interactive login with public client |

---

## Useful Links

- [Dynamics 365 Web API Reference](https://docs.microsoft.com/en-us/power-apps/developer/data-platform/webapi/overview)
- [OData Query Options](https://docs.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-data-web-api)
- [Incident (Case) Entity Reference](https://docs.microsoft.com/en-us/power-apps/developer/data-platform/webapi/reference/incident)

---

## Next Steps

1. Extend the POC with specific case operations you need
2. Add token caching/refresh for longer sessions
3. Build error handling and retry logic
4. Create specific functions for your workflow (create, update, close cases)
