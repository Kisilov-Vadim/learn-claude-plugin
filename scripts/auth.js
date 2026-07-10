#!/usr/bin/env node
// Supabase auth helper for the learn plugin
// Usage: node auth.js <web-login|signup|login|token>

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { exec } = require('child_process');

const SUPABASE_URL = 'wmbtdzlcqgdfqdxvaqeb.supabase.co';
const ANON_KEY = 'sb_publishable_soBWDz8wvsusMhEdVLm-LA_gp6IQWhK';
const DASHBOARD_URL = 'https://kisilov-vadim.github.io/learn-dashboard/';
const AUTH_FILE = path.join(__dirname, '..', '.auth.json');
const CLI_PORT = 3333;

function request(method, host, urlPath, headers, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: host,
      path: urlPath,
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
        ...headers,
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = https.request(opts, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function loadAuth() {
  try { return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8')); }
  catch { return null; }
}

function saveAuth(data) {
  fs.writeFileSync(AUTH_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans); }));
}

function openBrowser(url) {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${cmd} "${url}"`);
}

async function webLogin() {
  const server = http.createServer((req, res) => {
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === 'POST' && req.url === '/token') {
      let body = '';
      req.on('data', chunk => (body += chunk));
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          saveAuth(data);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
          console.error('✓ Logged in. You can close the browser tab.');
          server.close();
        } catch {
          res.writeHead(400);
          res.end('Bad request');
        }
      });
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(CLI_PORT, () => {
    console.error(`Waiting for login… Opening dashboard.`);
    openBrowser(DASHBOARD_URL);
  });

  // Timeout after 5 minutes
  const timeout = setTimeout(() => {
    console.error('Login timed out. Run again to retry.');
    server.close();
    process.exit(1);
  }, 5 * 60 * 1000);

  server.on('close', () => clearTimeout(timeout));
}

async function signup() {
  const email = await prompt('Email: ');
  const password = await prompt('Password: ');
  const res = await request('POST', SUPABASE_URL, '/auth/v1/signup', {}, { email, password });
  if (res.status >= 400) {
    console.error('Signup failed:', res.body.msg || res.body.error_description || JSON.stringify(res.body));
    process.exit(1);
  }
  console.error('Signup successful. Check your email for confirmation if required.');
}

async function login() {
  const email = await prompt('Email: ');
  const password = await prompt('Password: ');
  const res = await request('POST', SUPABASE_URL, '/auth/v1/token?grant_type=password', {}, { email, password });
  if (res.status >= 400 || !res.body.access_token) {
    console.error('Login failed:', res.body.error_description || res.body.msg || JSON.stringify(res.body));
    process.exit(1);
  }
  saveAuth({
    access_token: res.body.access_token,
    refresh_token: res.body.refresh_token,
    expires_at: Date.now() + (res.body.expires_in * 1000),
  });
  console.error('Login successful.');
}

async function token() {
  const auth = loadAuth();
  if (!auth) {
    console.error('Not logged in. Run: node auth.js web-login');
    process.exit(1);
  }
  // Refresh if expiring within 60 seconds
  if (auth.expires_at - Date.now() > 60000) {
    process.stdout.write(auth.access_token);
    return;
  }
  const res = await request('POST', SUPABASE_URL, '/auth/v1/token?grant_type=refresh_token', {}, { refresh_token: auth.refresh_token });
  if (res.status >= 400 || !res.body.access_token) {
    console.error('Token refresh failed. Run: node auth.js web-login');
    process.exit(1);
  }
  saveAuth({
    access_token: res.body.access_token,
    refresh_token: res.body.refresh_token,
    expires_at: Date.now() + (res.body.expires_in * 1000),
  });
  process.stdout.write(res.body.access_token);
}

const cmd = process.argv[2];
if (cmd === 'web-login') webLogin().catch(console.error);
else if (cmd === 'signup') signup().catch(console.error);
else if (cmd === 'login') login().catch(console.error);
else if (cmd === 'token') token().catch(console.error);
else { console.error('Usage: node auth.js <web-login|signup|login|token>'); process.exit(1); }
