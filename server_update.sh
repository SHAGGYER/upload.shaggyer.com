#!/bin/bash
git pull --no-edit
cd server && pm2 restart upload.shaggyer.com
