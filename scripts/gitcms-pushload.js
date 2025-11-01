#!/usr/bin/env node
/*
  Pushes local data/products.json to GitHub via Contents API and verifies by loading it back.
  Env vars:
    GITHUB_TOKEN   (required)
    GITHUB_REPO    (default: 'SashaSerh/Progect-shop')
    GITHUB_BRANCH  (default: 'main')
    GITHUB_PATH    (default: 'data/products.json')
*/
import { readFileSync, existsSync } from 'fs';
import { join } from 'node:path';
import process from 'process';

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO || 'SashaSerh/Progect-shop';
  const branch = process.env.GITHUB_BRANCH || 'main';
  const path = process.env.GITHUB_PATH || 'data/products.json';
  if (!token) {
    console.error('GITHUB_TOKEN is required');
    process.exit(1);
  }
  const localPath = join(process.cwd(), 'data', 'products.json');
  if (!existsSync(localPath)) {
    console.error('Local file not found:', localPath);
    process.exit(1);
  }
  const content = readFileSync(localPath, 'utf8');
  const base = `https://api.github.com/repos/${repo}/contents/${encodeURI(path)}`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'Content-Type': 'application/json'
  };
  async function getMeta() {
    const url = `${base}?ref=${encodeURIComponent(branch)}`;
    const res = await fetch(url, { headers });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Meta fetch failed: ${res.status}`);
    return res.json();
  }
  async function putFile(sha) {
    const body = {
      message: 'chore: bootstrap products.json via GitCMS script',
      content: Buffer.from(content, 'utf8').toString('base64'),
      branch,
      sha
    };
    const res = await fetch(base, { method: 'PUT', headers, body: JSON.stringify(body) });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`PUT failed: ${res.status} ${t}`);
    }
    return res.json();
  }
  async function getFile() {
    const url = `${base}?ref=${encodeURIComponent(branch)}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Verify fetch failed: ${res.status}`);
    const json = await res.json();
    if (!json.content) throw new Error('No content in verify response');
    const back = Buffer.from(String(json.content).replace(/\n/g, ''), 'base64').toString('utf8');
    return back;
  }

  console.log('GitCMS Push: repo=%s branch=%s path=%s', repo, branch, path);
  const meta = await getMeta();
  const sha = meta?.sha;
  const put = await putFile(sha);
  console.log('Committed SHA:', put?.commit?.sha || 'unknown');
  const verify = await getFile();
  const same = verify.trim() === content.trim();
  console.log('Verify read-back matches local file:', same ? 'YES' : 'NO');
  if (!same) process.exit(2);
}

main().catch(err => {
  console.error('GitCMS push/load error:', err?.message || err);
  process.exit(1);
});
