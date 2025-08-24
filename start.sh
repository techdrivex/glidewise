#!/bin/bash

# GlideWise Startup Script
# This script helps you get the GlideWise project up and running quickly

echo "🚗 Welcome to GlideWise - AI Driving Coach for Fuel & Energy Efficiency!"
echo "=================================================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    echo "   Please upgrade Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"
echo ""

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm $(npm -v) detected"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "mobile" ] || [ ! -d "server" ]; then
    echo "❌ Please run this script from the GlideWise project root directory."
    echo "   Make sure you're in the folder containing mobile/ and server/ directories."
    exit 1
fi

echo "✅ GlideWise project structure detected"
echo ""

# Install dependencies
echo "📦 Installing project dependencies..."
echo "   This may take a few minutes on first run..."
echo ""

npm run install:all

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies. Please check the error messages above."
    exit 1
fi

echo "✅ Dependencies installed successfully"
echo ""

# Check if .env file exists
if [ ! -f "server/.env" ]; then
    echo "🔧 Setting up environment configuration..."
    
    if [ -f "server/.env.development" ]; then
        cp server/.env.development server/.env
        echo "✅ Environment file created from .env.development"
        echo "   You may want to edit server/.env with your specific configuration"
    else
        echo "⚠️  No .env.development file found. Creating basic .env file..."
        cat > server/.env << EOF
NODE_ENV=development
PORT=3000
DB_CLIENT=sqlite3
DB_FILE=./glidewise.db
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRES_IN=7d
EOF
        echo "✅ Basic .env file created"
        echo "   Please edit server/.env with your database and security settings"
    fi
    echo ""
fi

# Setup database
echo "🗄️  Setting up database..."
cd server

# Check if database file exists (for SQLite)
if [ "$DB_CLIENT" = "sqlite3" ] || [ -z "$DB_CLIENT" ]; then
    if [ -f "glidewise.db" ]; then
        echo "✅ Database file already exists"
    else
        echo "   Creating new database..."
        npm run migrate
        if [ $? -eq 0 ]; then
            echo "✅ Database created and migrated successfully"
        else
            echo "❌ Database migration failed"
            cd ..
            exit 1
        fi
    fi
else
    echo "   Running database migrations..."
    npm run migrate
    if [ $? -eq 0 ]; then
        echo "✅ Database migrations completed successfully"
    else
        echo "❌ Database migration failed"
        cd ..
        exit 1
    fi
fi

# Seed database with sample data
echo "🌱 Seeding database with sample data..."
npm run seed
if [ $? -eq 0 ]; then
    echo "✅ Database seeded successfully"
else
    echo "⚠️  Database seeding failed (this is optional)"
fi

cd ..

echo ""
echo "🎉 GlideWise is ready to start!"
echo ""

# Show available commands
echo "📋 Available commands:"
echo "   npm run dev          - Start both mobile and server"
echo "   npm run start:server - Start backend server only"
echo "   npm run start:mobile - Start React Native app only"
echo ""

# Ask user what they want to do
echo "What would you like to do next?"
echo "1) Start both mobile and server (recommended for development)"
echo "2) Start backend server only"
echo "3) Start mobile app only"
echo "4) Exit"
echo ""
read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo "🚀 Starting both mobile and server..."
        npm run dev
        ;;
    2)
        echo "🖥️  Starting backend server..."
        npm run start:server
        ;;
    3)
        echo "📱 Starting mobile app..."
        npm run start:mobile
        ;;
    4)
        echo "👋 Goodbye! Run this script again when you're ready to start."
        exit 0
        ;;
    *)
        echo "❌ Invalid choice. Exiting."
        exit 1
        ;;
esac
