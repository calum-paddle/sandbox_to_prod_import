# Paddle Sandbox to Production Migration Tool

A modern web application that helps you easily migrate Paddle products and discounts from sandbox to production environment.

![Paddle Migration Tool](screenshot.png)

## Features

- Migrate products from sandbox to production
- Migrate discounts from sandbox to production
- Test mode for sandbox-to-sandbox migrations
- Modern, Paddle-styled interface
- Secure API key handling

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v14 or higher)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)

You'll also need:
- Paddle Sandbox API key
- Paddle Production API key (unless testing in sandbox mode)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/paddle-sandbox-to-prod-migrator.git
cd paddle-sandbox-to-prod-migrator
```

2. Install dependencies for both backend and frontend:
```bash
npm run install-all
```

## Running the Application

Start both the backend server and frontend application with a single command:

```bash
npm start
```

This will:
- Start the backend server on port 8080
- Launch the frontend development server on port 3000
- Open the application in your default browser

## Usage Instructions

1. **API Key Setup**
   - Enter your Sandbox API key in the first input field
   - Enter your Production API key in the second input field
   - For sandbox-to-sandbox testing, enable "Test Mode"

2. **Fetching Items**
   - Click "Get Sandbox Items" to fetch available products and discounts
   - The application will display all products and discounts from your sandbox environment

3. **Selecting Items**
   - Click on products or discounts to select them for migration
   - Selected items will be highlighted
   - You can select multiple items at once

4. **Migration**
   - Click "Migrate Selected Items" to start the migration process
   - The status of the migration will be displayed below
   - Wait for the confirmation message

## Test Mode

Test Mode allows you to:
- Test the migration process safely between sandbox environments
- Verify your migration setup without affecting production
- Practice the migration process

## Troubleshooting

Common issues and solutions:

1. **Connection Error**
   - Verify that both servers are running (check ports 3000 and 8080)
   - Check your API keys are correct
   - Ensure you have internet connectivity

2. **Migration Failures**
   - Verify API key permissions
   - Check that selected items don't already exist in the target environment
   - Ensure API keys are for different environments (unless in test mode)

## Security Notes

- API keys are never stored and are only held in memory during the session
- All API keys are transmitted securely
- It's recommended to create specific API keys for migration purposes

## Development

To modify the application:

1. Backend changes:
   - Edit `server.js` in the root directory
   - The server will automatically restart on changes

2. Frontend changes:
   - Navigate to the `frontend` directory
   - Edit files in `src` directory
   - Changes will hot-reload automatically

## License

[MIT License](LICENSE)

## Support

For issues and feature requests, please [open an issue](https://github.com/yourusername/paddle-sandbox-to-prod-migrator/issues) on GitHub. 