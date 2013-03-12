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

benvenutodir=$PWD

# Update System
echo 'System Update'
apt-get -y update
echo 'Update completed'

# Install help app
apt-get -y install libssl-dev git-core pkg-config build-essential curl gcc g++ checkinstall

# Download & Unpack Node.js - v. 0.8.22 if not installed
which node
if [ $? -eq 1 ]; then
		echo 'Download Node.js - v. 0.8.22'
		mkdir /tmp/node-install
		cd /tmp/node-install
		wget http://nodejs.org/dist/v0.8.22/node-v0.8.22.tar.gz
		tar -zxf node-v0.8.22.tar.gz
		echo 'Node.js download & unpack completed'

		# Install Node.js
		echo 'Install Node.js'
		cd node-v0.8.22
		./configure && make && checkinstall --install=yes --pkgname=nodejs --pkgversion "0.8.22" --default
		echo 'Node.js install completed'
fi

# Install Redis, only if not installed
which redis-cli
if [ $? -eq 1 ]; then
		echo 'Installing Redis'
		cd /tmp
		wget http://download.redis.io/redis-stable.tar.gz
		tar xvzf redis-stable.tar.gz
		cd redis-stable
		make
		cd src
		sudo cp redis-server /usr/local/bin/
		sudo cp redis-cli /usr/local/bin/
		echo 'Redis install completed. '
fi

# Install Benvenuto Node
echo 'Installing Benvenuto Node dependencies'
cd "$benvenutodir"
npm install
npm install -g nodemon
npm install -g coffee-script
echo 'Benvenuto Node install successful. Run sudo benvenuto.sh to start the server'
