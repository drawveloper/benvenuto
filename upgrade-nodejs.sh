#!/bin/sh
echo 'Uninstalling earlier NodeJS version'
rm -rf /usr/local/bin/node /usr/local/bin/node-waf /usr/local/include/node /usr/local/lib/node /usr/local/lib/pkgconfig/nodejs.pc /usr/local/share/man/man1/node.1.gz
tar -zxf node-v0.8.21.tar.gz
echo 'Node.js unpack completed'
# Install Node.js
echo 'Install Node.js'
cd node-v0.8.21
./configure && make && checkinstall --install=yes --pkgname=nodejs --pkgversion "0.8.21" --default
echo 'Node.js 0.8.21 install completed'
