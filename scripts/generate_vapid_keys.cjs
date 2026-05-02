#!/usr/bin/env node
const webpush = require('web-push');

const keys = webpush.generateVAPIDKeys();

console.log('VAPID keys generated successfully');
console.log('VAPID_PUBLIC_KEY=' + keys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + keys.privateKey);
console.log('VAPID_SUBJECT=mailto:admin@classify.app');
