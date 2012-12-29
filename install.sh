#!/bin/sh
##############################################################
#
# Benvenuto Node Install Script
# Author: Guilherme Rodrigues, email: gadr90@gmail.com
# Based on:
# Rock-Solid Node.js Platform on Ubuntu
# Auto-config by apptob.org
# Author: Ruslan Khissamov, email: rrkhissamov@gmail.com
# GitHub: https://github.com/rushis
#
##############################################################

# Update System
echo 'System Update'
apt-get -y update
echo 'Update completed'

# Install help app
apt-get -y install libssl-dev git-core pkg-config build-essential curl gcc g++ checkinstall

# Download & Unpack Node.js - v. 0.8.16
echo 'Download Node.js - v. 0.8.16'
mkdir /tmp/node-install
cd /tmp/node-install
wget http://nodejs.org/dist/v0.8.16/node-v0.8.16.tar.gz
tar -zxf node-v0.8.16.tar.gz
echo 'Node.js download & unpack completed'

# Install Node.js
echo 'Install Node.js'
cd node-v0.8.16
./configure && make && checkinstall --install=yes --pkgname=nodejs --pkgversion "0.8.16" --default
echo 'Node.js install completed'

# Install Redis
echo 'Install Redis'
cd /tmp
wget http://download.redis.io/redis-stable.tar.gz
tar xvzf redis-stable.tar.gz
cd redis-stable
make
cd src
sudo cp redis-server /usr/local/bin/
sudo cp redis-cli /usr/local/bin/
echo 'Redis install completed. '

# Install Benvenuto Node
echo 'Cloning Benvenuto Node repository'
cd ~
git clone https://gadr90@bitbucket.org/gadr90/benvenuto-node.git
cd benvenuto-node.git
npm install
echo 'Benvenuto Node install successful. Run start.sh to start the server'
