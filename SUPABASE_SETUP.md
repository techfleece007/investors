# Supabase Project Setup Guide

This guide will help you properly configure your Supabase project for production deployment.

## 🚨 Critical Configuration

### 1. **Project Status**
- Ensure your Supabase project is **active** and not paused
- Verify project is not deleted or moved
- Check that you haven't exceeded free tier limits

### 2. **Environment Variables**
Set these in both `.env.local` and Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important:** Replace `your-project-id` with your actual Supabase project ID.

### 3. **Vercel Environment Variables**
1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add both variables with the same values

## 🔧 Step-by-Step Fix

### Step 1: Verify Supabase Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Check the project status (should be "Active")
4. If paused, click "Resume" or "Unpause"

### Step 2: Get Correct API Keys
1. In your Supabase project dashboard
2. Go to **Settings** → **API**
3. Copy the **Project URL** (should look like `https://xyz.supabase.co`)
4. Copy the **anon public** key
5. Update your `.env.local` file with these values

### Step 3: Check Project Settings
1. Go to **Settings** → **General**
2. Verify your project is in the correct region
3. Check that the project hasn't been deleted or moved

### Step 4: Verify Authentication Settings
1. Go to **Authentication** → **Settings**
2. Check that email authentication is enabled
3. Verify your site URL is correct (should be your Vercel URL)
4. Check that redirect URLs are properly configured

### Step 5: Check Database Connection
1. Go to **Database** → **Tables**
2. Verify your tables exist and are accessible
3. Check that RLS (Row Level Security) policies are correct

### Step 6: Test the Connection
1. Use the built-in "Check Config" button on the login page
2. Run the diagnostic tools to verify connectivity
3. Test with different networks to ensure it works for all users

## 🚨 Common Issues and Solutions

### Issue: "Project not found" or "Invalid API key"
**Solution:**
- Verify your project URL and API key are correct
- Check that your project is active and not paused
- Ensure you're using the anon key, not the service role key

### Issue: "CORS error" or "Network error"
**Solution:**
- The application now includes proper CORS headers
- Check that your Vercel deployment is using the latest code
- Verify your Supabase project allows requests from your domain

### Issue: "Authentication failed" for all users
**Solution:**
- Check that email authentication is enabled in Supabase
- Verify your site URL is correct in Supabase settings
- Ensure your project hasn't exceeded free tier limits

### Issue: "Database connection failed"
**Solution:**
- Check that your database is not paused
- Verify your RLS policies allow the operations you're trying to perform
- Ensure your project is in the correct region

## 🔍 Verification Steps

### 1. Test Supabase Directly
Open this URL in your browser (replace with your project URL):
```
https://your-project-id.supabase.co/rest/v1/
```
You should see a JSON response. If you get an error, your project has issues.

### 2. Test Authentication Endpoint
Try this URL:
```
https://your-project-id.supabase.co/auth/v1/settings
```
This should return authentication settings.

### 3. Check Project Status
Go to your Supabase dashboard and verify:
- Project status is "Active"
- No error messages or warnings
- All services are running normally

## 📋 Checklist

- [ ] Supabase project is active and not paused
- [ ] Environment variables are correctly set in `.env.local`
- [ ] Environment variables are correctly set in Vercel
- [ ] Project URL is correct and accessible
- [ ] API key is correct and not expired
- [ ] Email authentication is enabled
- [ ] Site URL is correctly configured
- [ ] Database is accessible
- [ ] RLS policies are correct
- [ ] Project hasn't exceeded free tier limits

## 🆘 If Issues Persist

### 1. Check Supabase Status
Visit [Supabase Status Page](https://status.supabase.com/) to check for service outages.

### 2. Contact Supabase Support
If your project is configured correctly but still not working:
1. Go to [Supabase Support](https://supabase.com/dashboard/support/new)
2. Select "Login issues" as the category
3. Provide details about your project and the issues you're experiencing

### 3. Check Project Limits
- Free tier has limits on database size, bandwidth, and API calls
- If you've exceeded these limits, your project may be paused
- Consider upgrading to a paid plan if needed

### 4. Verify Region
- Ensure your Supabase project is in a region close to your users
- Some regions may have better connectivity than others

## 🔄 After Making Changes

1. **Redeploy your Vercel application** to ensure changes take effect
2. **Clear your browser cache** to avoid cached errors
3. **Test from different networks** to ensure it works for all users
4. **Use the built-in diagnostic tools** to verify everything is working

## 📞 Getting Help

If you need additional help:
1. Use the "Check Config" button on the login page
2. Run the diagnostic tools to identify specific issues
3. Check the troubleshooting guide in the application
4. Contact Supabase support with specific error messages

Remember: The goal is to ensure your application works for ALL users, not just those who can change their DNS settings or use VPNs.
