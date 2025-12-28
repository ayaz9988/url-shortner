#!/bin/bash

# URL Shortener Cron Job Setup Script
# This script helps set up automated cron jobs for the URL shortener application

set -e

PROJECT_DIR="/home/ayaz/url-shortner"
LOG_DIR="/var/log"
CRON_USER="ayaz"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}URL Shortener Cron Job Setup${NC}"
echo "================================"

# Check if we're running as root for log directory creation
if [ "$EUID" -eq 0 ]; then
    echo -e "${YELLOW}Running as root - will create log directories if needed${NC}"
else
    echo -e "${YELLOW}Not running as root - log directories must exist and be writable${NC}"
fi

# Create log directory if it doesn't exist
if [ ! -d "$LOG_DIR" ]; then
    echo -e "${YELLOW}Creating log directory: $LOG_DIR${NC}"
    mkdir -p "$LOG_DIR"
fi

# Set up log files with proper permissions
LOG_FILES=("$LOG_DIR/url-shortener-stats.log" "$LOG_DIR/url-shortener-cleanup.log")

for log_file in "${LOG_FILES[@]}"; do
    if [ ! -f "$log_file" ]; then
        echo -e "${YELLOW}Creating log file: $log_file${NC}"
        touch "$log_file"
        chmod 644 "$log_file"
    fi
done

# Check if project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}Error: Project directory $PROJECT_DIR does not exist${NC}"
    exit 1
fi

# Check if package.json exists
if [ ! -f "$PROJECT_DIR/package.json" ]; then
    echo -e "${RED}Error: package.json not found in $PROJECT_DIR${NC}"
    exit 1
fi

# Check if scripts exist
if [ ! -f "$PROJECT_DIR/src/scripts/daily-stats.ts" ]; then
    echo -e "${RED}Error: daily-stats.ts script not found${NC}"
    exit 1
fi

if [ ! -f "$PROJECT_DIR/src/scripts/cleanup-expired.ts" ]; then
    echo -e "${RED}Error: cleanup-expired.ts script not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Project structure verified${NC}"

# Generate cron job entries
CRON_ENTRIES="
# URL Shortener Automated Tasks
# Daily Statistics Report (Every day at 2:00 AM)
0 2 * * * cd $PROJECT_DIR && npm run stats:daily >> $LOG_DIR/url-shortener-stats.log 2>&1

# Cleanup Expired URLs (Every day at 3:00 AM)
0 3 * * * cd $PROJECT_DIR && npm run cleanup:expired >> $LOG_DIR/url-shortener-cleanup.log 2>&1
"

echo ""
echo -e "${GREEN}Cron job entries to add:${NC}"
echo "$CRON_ENTRIES"

echo ""
echo -e "${YELLOW}To install these cron jobs, run:${NC}"
echo "crontab -e"
echo ""
echo -e "${YELLOW}Then add the above entries to your crontab file.${NC}"
echo ""
echo -e "${YELLOW}Alternative: Use the following command to append to crontab:${NC}"
echo "(crontab -l 2>/dev/null; echo '$CRON_ENTRIES') | crontab -"

echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Run 'crontab -e' to edit your crontab"
echo "2. Add the cron job entries shown above"
echo "3. Verify with 'crontab -l'"
echo "4. Monitor logs in $LOG_DIR/url-shortener-*.log"
echo ""
echo -e "${YELLOW}To test the scripts manually:${NC}"
echo "cd $PROJECT_DIR"
echo "npm run stats:daily"
echo "npm run cleanup:expired"