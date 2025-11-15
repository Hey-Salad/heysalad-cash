#!/bin/bash

# This script helps prepare environment variables for Vercel
# Run: bash scripts/prepare-vercel-env.sh

echo "📋 Environment Variables for Vercel Deployment"
echo "=============================================="
echo ""
echo "Copy these to Vercel → Project Settings → Environment Variables"
echo ""

# Read from .env and format for Vercel
while IFS= read -r line; do
  # Skip comments and empty lines
  if [[ $line =~ ^#.*$ ]] || [[ -z $line ]]; then
    continue
  fi
  
  # Print the variable
  echo "$line"
done < .env

echo ""
echo "=============================================="
echo "✅ Copy all variables above to Vercel"
echo "⚠️  Make sure to select: Production, Preview, and Development"
