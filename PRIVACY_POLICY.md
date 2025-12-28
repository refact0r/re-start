# Privacy Policy for re-start

**Last Updated: December 28, 2025**

## Introduction

re-start ("we", "our", or "the extension") is a browser extension that replaces the browser new tab page. This privacy policy explains how we handle your information.

## Information We Collect

- **Task Data**: Task names, project/list names, due dates, and completion status you create within the extension
- **Settings and Preferences**: Your theme preferences, display settings, and configuration choices
- **API Credentials**: OAuth 2.0 access tokens and refresh tokens for third-party services you choose to connect (Todoist). For Google Tasks in Chrome, authentication tokens are managed by Chrome's identity API
- **Location Data**: If you enable weather features, you may provide location information manually or allow access to your device's location

## How We Use Your Information

We use the information to:

- Display and manage your tasks within the extension interface
- Sync with third-party services (Google Tasks, Todoist) when you authorize such connections
- Provide weather information based on your location
- Save your preferences and settings across browser sessions

## Data Storage and Security

We implement the following security measures to protect your data:

- **Local Storage**: All data is stored locally in your browser using the browser's encrypted storage APIs
- **Encryption in Transit**: All communications with third-party APIs (Google Tasks, Todoist, Open-Meteo) use HTTPS/TLS encryption to protect data during transmission
- **Token Security**: OAuth 2.0 access tokens and refresh tokens are:
  - For Google Tasks (Chrome only): Managed entirely by Chrome's identity API with automatic token caching and refresh
  - For Todoist: Stored securely in browser storage with built-in encryption
  - Never logged, exposed, or transmitted to any third parties except the authorizing service
  - Automatically refreshed using secure OAuth 2.0 flows
- **Access Control**: Only you have access to your data through your local browser session - data is isolated per browser profile
- **No Backend Servers**: We do not operate backend servers that collect, process, or store your personal data
- **Password Protection**: We never request, collect, or store your passwords
- **Minimal Permissions**: The extension only requests the minimum necessary browser permissions to function (identity permission in Chrome for Google Tasks OAuth)

## Third-Party Services

This extension may integrate with:

- **Google Tasks**: For task synchronization in Chrome only (requires your authorization via Chrome's identity API)
- **Todoist**: For task synchronization (requires your authorization)
- **Open-Meteo**: For weather information display (requires location data)

These services have their own privacy policies:

- Google: <https://policies.google.com/privacy>
- Todoist: <https://todoist.com/privacy>
- Open-Meteo: <https://open-meteo.com/en/terms#privacy>

When you authorize connections to these services, their respective privacy policies apply to data shared with them. We only access the data necessary to provide the task management and weather features.

## Data Sharing

We do not sell, trade, rent, or share your personal information with third parties except:

- When you explicitly authorize connections to services like Google Tasks or Todoist through OAuth 2.0
- As required by applicable law, regulation, or legal process

## Your Rights

You have the right to:

- Access all data stored by the extension through the extension's interface
- Delete your data at any time by:
  - Uninstalling the extension (removes all local data)
  - Clearing the extension's storage through browser settings
  - Revoking OAuth access through your Google or Todoist account settings
- Disconnect third-party service integrations at any time through the extension settings

## Data Retention

- **Local Data**: Retained in your browser until you uninstall the extension or clear its storage
- **OAuth Tokens**: Retained until you disconnect the service or revoke access through your account settings
- **Third-Party Data**: Subject to the retention policies of Google Tasks and Todoist

## Children's Privacy

This extension is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.

## Changes to This Policy

We may update this privacy policy to reflect changes in our practices or for legal or regulatory reasons. Changes will be reflected in the "Last Updated" date above. Continued use of the extension after changes constitutes acceptance of the updated policy.

## Contact Us

If you have questions about this privacy policy, please contact us at: <refact0r.contact@gmail.com>
