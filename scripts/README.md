# Cron Job Setup for URL Shortener

This directory contains scripts and documentation for setting up automated cron jobs for the URL shortener application.

## Overview

The URL shortener application includes two automated scripts that should run on a schedule:

1. **Daily Statistics Report** (`src/scripts/daily-stats.ts`)
   - Runs daily at 2:00 AM
   - Generates daily statistics and analytics reports
   - Logs output to `/var/log/url-shortener-stats.log`

2. **Cleanup Expired URLs** (`src/scripts/cleanup-expired.ts`)
   - Runs daily at 3:00 AM  
   - Removes URLs that are inactive and older than 30 days
   - Logs output to `/var/log/url-shortener-cleanup.log`

## Quick Setup

### Option 1: Manual Setup

1. Run the setup script:

   ```bash
   ./scripts/setup-cron.sh
   ```

2. Follow the instructions to add cron jobs to your crontab

### Option 2: Direct Cron Job Installation

Add these lines to your crontab (`crontab -e`):

```bash
# URL Shortener Automated Tasks
# Daily Statistics Report (Every day at 2:00 AM)
0 2 * * * cd /home/ayaz/url-shortner && npm run stats:daily >> /var/log/url-shortener-stats.log 2>&1

# Cleanup Expired URLs (Every day at 3:00 AM)
0 3 * * * cd /home/ayaz/url-shortner && npm run cleanup:expired >> /var/log/url-shortener-cleanup.log 2>&1
```

## Files

- `cron-jobs.txt` - Detailed cron job configuration and documentation
- `setup-cron.sh` - Automated setup script for cron jobs
- `README.md` - This documentation file

## Monitoring

### Check Cron Job Status

```bash
# List current cron jobs
crontab -l

# Check system cron logs
sudo tail -f /var/log/cron

# Check application logs
tail -f /var/log/url-shortener-*.log
```

### Test Scripts Manually

```bash
cd /home/ayaz/url-shortner
npm run stats:daily
npm run cleanup:expired
```

## Log Rotation

To prevent log files from growing too large, set up log rotation by creating `/etc/logrotate.d/url-shortener`:

```bash
/var/log/url-shortener-*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
}
```

## Troubleshooting

### Common Issues

1. **Permission Denied**
   - Ensure the log directory `/var/log` is writable
   - Check that the project directory has proper permissions

2. **Scripts Not Found**
   - Verify the project path is correct
   - Ensure `package.json` exists and contains the npm scripts

3. **Node.js Not Found**
   - Use full path to Node.js in cron jobs if needed
   - Example: `/usr/bin/node` instead of just `node`

### Debugging

1. Test the npm scripts manually first
2. Check cron job syntax with online validators
3. Monitor system cron logs for execution attempts
4. Check application logs for script output and errors

## Environment Variables

Ensure that any required environment variables (like database connection strings) are available to the cron jobs. You may need to:

1. Set them in the crontab file:

   ```bash
   PATH=/usr/local/bin:/usr/bin:/bin
   DATABASE_URL=your_database_url_here
   ```

2. Or source an environment file in the cron job:

   ```bash
   0 2 * * * cd /home/ayaz/url-shortner && source .env && npm run stats:daily
