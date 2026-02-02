"""
Dynamics 365 CRM API - POC Script (Using Microsoft's Public Client)
Uses a pre-approved Microsoft client ID - no admin consent needed
"""

import requests
import time

# Configuration
# This is Microsoft's official sample/public client ID for Power Platform
# It's pre-consented in most organizations
CLIENT_ID = "51f81489-12ee-4a9e-aaae-a2591f45987d"
TENANT_ID = "fa7b1b5a-7b34-4387-94ae-d2c178decee1"
ORG_URL = "https://adobe-ent.crm.dynamics.com"

def get_access_token_interactive():
    """Get access token using device code flow (interactive login)"""

    # Step 1: Request device code
    device_code_url = f"https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/devicecode"

    device_code_data = {
        "client_id": CLIENT_ID,
        "scope": f"{ORG_URL}/user_impersonation openid profile"
    }

    print("Requesting device code...")
    response = requests.post(device_code_url, data=device_code_data)

    if response.status_code != 200:
        print(f"Failed to get device code: {response.status_code}")
        print(response.json())
        return None

    device_code_response = response.json()
    device_code = device_code_response["device_code"]
    user_code = device_code_response["user_code"]
    verification_uri = device_code_response["verification_uri"]
    expires_in = device_code_response["expires_in"]
    interval = device_code_response.get("interval", 5)

    print("\n" + "=" * 50)
    print("ACTION REQUIRED:")
    print(f"1. Open: {verification_uri}")
    print(f"2. Enter code: {user_code}")
    print(f"3. Sign in with your company credentials")
    print("=" * 50 + "\n")
    print("Waiting for you to complete login...")

    # Step 2: Poll for token
    token_url = f"https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token"

    token_data = {
        "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
        "client_id": CLIENT_ID,
        "device_code": device_code
    }

    start_time = time.time()
    while time.time() - start_time < expires_in:
        time.sleep(interval)

        response = requests.post(token_url, data=token_data)
        result = response.json()

        if response.status_code == 200:
            print("Login successful! Access token obtained.")
            return result["access_token"]

        error = result.get("error")
        if error == "authorization_pending":
            continue
        elif error == "slow_down":
            interval += 5
            continue
        else:
            print(f"Authentication failed: {error}")
            print(result.get("error_description", ""))
            return None

    print("Login timed out. Please try again.")
    return None

def test_connection(access_token):
    """Test API connection by fetching WhoAmI"""
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0"
    }

    whoami_url = f"{ORG_URL}/api/data/v9.2/WhoAmI"
    print(f"\nTesting connection with WhoAmI...")

    response = requests.get(whoami_url, headers=headers)

    if response.status_code == 200:
        data = response.json()
        print("Connection successful!")
        print(f"  User ID: {data.get('UserId')}")
        print(f"  Organization ID: {data.get('OrganizationId')}")
        print(f"  Business Unit ID: {data.get('BusinessUnitId')}")
        return True
    else:
        print(f"Connection failed: {response.status_code}")
        print(response.text)
        return False

def fetch_cases(access_token, top=5):
    """Fetch recent cases from Dynamics CRM"""
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0"
    }

    cases_url = f"{ORG_URL}/api/data/v9.2/incidents?$select=title,ticketnumber,createdon,statecode&$top={top}&$orderby=createdon desc"
    print(f"\nFetching top {top} cases...")

    response = requests.get(cases_url, headers=headers)

    if response.status_code == 200:
        cases = response.json().get("value", [])
        if cases:
            print(f"Found {len(cases)} case(s):\n")
            for case in cases:
                status = "Active" if case.get("statecode") == 0 else "Resolved" if case.get("statecode") == 1 else "Cancelled"
                print(f"  Ticket: {case.get('ticketnumber')}")
                print(f"  Title: {case.get('title')}")
                print(f"  Status: {status}")
                print(f"  Created: {case.get('createdon')}")
                print("-" * 40)
        else:
            print("No cases found in the system.")
        return True
    else:
        print(f"Failed to fetch cases: {response.status_code}")
        print(response.text)
        return False

def main():
    print("=" * 50)
    print("Dynamics 365 CRM API - POC Test")
    print("(Using Microsoft's Pre-Approved Public Client)")
    print("=" * 50)
    print(f"\nOrg URL: {ORG_URL}")
    print(f"Tenant ID: {TENANT_ID}")
    print(f"Client ID: {CLIENT_ID} (Microsoft's public app)")
    print()

    # Step 1: Get access token via interactive login
    access_token = get_access_token_interactive()
    if not access_token:
        print("\nFailed to authenticate.")
        return

    # Step 2: Test connection
    if not test_connection(access_token):
        print("\nConnection test failed.")
        return

    # Step 3: Fetch cases
    fetch_cases(access_token)

    print("\n" + "=" * 50)
    print("POC Test Complete!")
    print("=" * 50)

if __name__ == "__main__":
    main()
