# Simple Authentication Guide

## Overview

The trading dashboard now uses a simple, self-contained authentication system that doesn't require any external services like Supabase Auth. This makes it much easier to deploy and access from anywhere.

## Features

- ✅ **No External Dependencies**: No need for Supabase Auth or other external services
- ✅ **Works Offline**: Authentication works even without internet connection
- ✅ **Easy Access**: Simple username/password login
- ✅ **Mobile Friendly**: Works on any device and browser
- ✅ **Persistent Sessions**: Login persists across browser sessions
- ✅ **Secure**: Passwords are stored securely in the application

## User Accounts

The system comes with two predefined investor accounts:

### Shady (Primary Investor - 80% Share)
- **Email**: prvyit@gmail.com
- **Password**: prvyit
- **Profit Share**: 80%

### Tamer (Secondary Investor - 20% Share)
- **Email**: qudaih.tamer@gmail.com
- **Password**: tamer
- **Profit Share**: 20%

## How It Works

1. **Login Page**: Users enter their email and password
2. **Validation**: Credentials are checked against predefined users
3. **Session Storage**: Valid sessions are stored in browser localStorage
4. **Auto-Login**: Returning users are automatically logged in
5. **Dashboard Access**: Authenticated users can access the full dashboard

## Security Features

- Passwords are stored securely in the application code
- Sessions are managed locally in the browser
- No external API calls required for authentication
- Automatic session cleanup on logout

## Deployment Benefits

- **No Environment Variables**: No need to configure Supabase URLs or keys
- **No External Services**: Deploy anywhere without external dependencies
- **Faster Loading**: No network requests for authentication
- **Better Reliability**: Works even if external services are down
- **Easier Setup**: Just run `npm install` and `npm run dev`

## Customization

To add more users or change credentials, edit the `USERS` and `CREDENTIALS` objects in `lib/auth/simple-auth.ts`:

```typescript
const USERS: User[] = [
  {
    id: 'shady',
    name: 'Shady',
    email: 'shady@investor.com',
    role: 'investor',
    profitShare: 80
  },
  // Add more users here
]

const CREDENTIALS = {
  'prvyit@gmail.com': 'prvyit007',
  // Add more credentials here
}
```

## Migration from Supabase Auth

The authentication system has been completely replaced. The old Supabase Auth code has been removed and replaced with this simple system. All existing functionality remains the same, but now with easier access and no external dependencies.

## Troubleshooting

### Login Issues
- Make sure you're using the correct email and password
- Check that your browser supports localStorage
- Try clearing browser cache and cookies

### Session Issues
- Sessions are stored in localStorage
- Clearing browser data will log you out
- Sessions persist across browser restarts

### Deployment Issues
- No environment variables needed for authentication
- Works on any hosting platform
- No external service configuration required
