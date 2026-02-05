# MCP (Model Context Protocol) Setup Guide

OpenDynamics provides a Model Context Protocol (MCP) server that allows AI assistants like Claude and ChatGPT to interact with your Dynamics 365 CRM data.

## Overview

The MCP server is available at: `https://your-domain.com/api/mcp`

It uses OAuth 2.1 with PKCE for authentication, following RFC 9728 for protected resource metadata.

## Supported MCP Clients

- **Claude Desktop** (via Anthropic)
- **Cursor IDE** (via Anysphere)
- **ChatGPT** (via OpenAI)
- Any MCP-compliant client

## Quick Setup for Cursor IDE

1. **Register OAuth Client**

   First, you need to register your Cursor client with OpenDynamics:

   ```bash
   curl -X POST https://your-domain.com/api/oauth/register \
     -H "Content-Type: application/json" \
     -d '{
       "client_name": "Cursor IDE",
       "redirect_uris": ["cursor://anysphere.cursor-mcp/oauth/callback"]
     }'
   ```

   Save the `client_id` returned in the response.

2. **Configure Cursor**

   In Cursor, add the following to your MCP settings (usually in `~/.cursor/mcp.json` or Settings → MCP):

   ```json
   {
     "mcpServers": {
       "opendynamics": {
         "type": "streamableHttp",
         "url": "https://your-domain.com/api/mcp",
         "oauth": {
           "authorizationUrl": "https://your-domain.com/oauth/authorize",
           "tokenUrl": "https://your-domain.com/api/oauth/token",
           "clientId": "YOUR_CLIENT_ID_FROM_STEP_1",
           "scopes": ["openid", "profile", "mcp"]
         }
       }
     }
   }
   ```

3. **Authorize Connection**

   When you first connect, Cursor will:
   - Open a browser to the authorization page
   - Prompt you to log in with your OpenDynamics credentials
   - Ask you to authorize access
   - Complete the OAuth flow and establish the connection

## Quick Setup for Claude Desktop

1. **Register OAuth Client**

   ```bash
   curl -X POST https://your-domain.com/api/oauth/register \
     -H "Content-Type: application/json" \
     -d '{
       "client_name": "Claude Desktop",
       "redirect_uris": ["claude://oauth/callback"]
     }'
   ```

2. **Configure Claude Desktop**

   Add to your Claude Desktop MCP configuration:

   ```json
   {
     "mcpServers": {
       "opendynamics": {
         "type": "streamableHttp",
         "url": "https://your-domain.com/api/mcp",
         "oauth": {
           "authorizationUrl": "https://your-domain.com/oauth/authorize",
           "tokenUrl": "https://your-domain.com/api/oauth/token",
           "clientId": "YOUR_CLIENT_ID",
           "scopes": ["openid", "profile", "mcp"]
         }
       }
     }
   }
   ```

## Alternative: Using API Keys

For simpler setups or automated clients, you can use API keys instead of OAuth:

1. **Generate API Key**

   Log in to OpenDynamics → Settings → API Keys → Create New Key

2. **Configure MCP Client**

   Use the API key directly in the Authorization header:

   ```json
   {
     "mcpServers": {
       "opendynamics": {
         "type": "streamableHttp",
         "url": "https://your-domain.com/api/mcp",
         "headers": {
           "Authorization": "Bearer odk_your_api_key_here"
         }
       }
     }
   }
   ```

## Available MCP Tools

Once connected, you'll have access to:

### Case Management
- `list_cases` - List and filter CRM cases
- `get_case` - Get detailed case information
- `create_case` - Create a new case
- `update_case` - Update case details
- `add_case_note` - Add notes to cases

### Dashboard & Analytics
- `get_dashboard_stats` - Get overview statistics
- `get_case_metrics` - Get case analytics

### Connection Management
- `test_connection` - Test Dynamics 365 connectivity
- `get_connection_status` - Check connection health

### Share Management
- `list_shares` - List shared resources
- `get_share` - Get share details

## Troubleshooting

### "Unauthorized" Error

If you see `Unauthorized` errors in logs:
- Ensure you've completed the OAuth flow or provided a valid API key
- Check that your token hasn't expired
- Verify the `Authorization` header format: `Bearer <token>`

### "0 tools, 0 prompts, 0 resources"

This typically means:
- The OAuth flow was interrupted
- Try disconnecting and reconnecting in your MCP client
- Check browser console for errors during OAuth redirect
- Ensure redirect URIs match exactly what's registered

### OAuth Flow Not Triggered

If Cursor/Claude doesn't open the authorization page:
- Ensure you're using the latest version of the client
- Check that the server is accessible and returning proper headers
- Verify the `/.well-known/oauth-protected-resource` endpoint is accessible

### Connection Timeout

- Check firewall rules allow connections to your OpenDynamics instance
- Verify CORS headers are properly configured
- Ensure SSL/TLS certificates are valid (if using HTTPS)

## Security Notes

- OAuth tokens expire after 1 hour by default
- Refresh tokens are valid for 30 days
- API keys can be set to never expire or have custom expiration
- All tokens are encrypted at rest in the database
- Use HTTPS in production to protect tokens in transit

## RFC Compliance

This implementation follows:
- **OAuth 2.1** (RFC drafts) - Modern OAuth best practices
- **PKCE** (RFC 7636) - Protection against authorization code interception
- **RFC 9728** - OAuth 2.0 Protected Resource Metadata
- **RFC 8414** - OAuth 2.0 Authorization Server Metadata

## Support

For issues or questions:
1. Check the logs at `~/.cursor/logs` or Claude Desktop logs
2. Review the OAuth consent page for error messages
3. Verify your credentials and client registration
4. Open an issue on GitHub with relevant log snippets
