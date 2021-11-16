#!/bin/bash
git pull --no-edit
cd server && yarn build
pm2 restart upload.shaggyer.com