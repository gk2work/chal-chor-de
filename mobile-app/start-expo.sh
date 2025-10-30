#!/bin/bash

# Increase file descriptor limit for this session
ulimit -n 10240

# Start Expo
npx expo start --clear
