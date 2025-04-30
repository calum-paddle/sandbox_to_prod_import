# Paddle Product Migration Tool

A simple tool to migrate products and discounts from Paddle Sandbox to Production environment.

## Quick Start

1. Install dependencies and start the app:
   ```bash
   npm run install-all
   npm start
   ```
   This will start both the backend and frontend servers.

2. Open your browser to http://localhost:3000 (should open automatically)

## How to Use

1. **Enter API Keys**
   - Enter your Sandbox API key in the first input field
   - Enter your Production API key in the second input field
   - Use the 👁️ icon to show/hide the API keys

2. **Test Mode (Optional)**
   - Enable "Test Mode" if you want to test the migration between sandbox environments
   - In test mode, both API keys should be sandbox keys

3. **Select Items to Migrate**
   - Click "Get Sandbox Items" to fetch available products and discounts
   - Click on any products or discounts you want to migrate
   - Selected items will be highlighted in yellow

4. **Start Migration**
   - Click "Migrate Selected Items" to begin the migration
   - Wait for the confirmation message
   - The status of the migration will be displayed below

## Need Help?

If you encounter any issues:
- Make sure both API keys are valid
- Check that the items you're trying to migrate don't already exist in the target environment
- Ensure you have an active internet connection 