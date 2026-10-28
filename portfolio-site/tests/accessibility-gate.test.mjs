import { test } from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
const audit=read('portfolio-site/qa/accessibility-audit.mjs');
const workflow=read('.github/workflows/portfolio-full-qa.yml');

test('accessibility scans every public page and fails on defects or audit errors',()=>{
 for(const label of ["'home'","'checkout'","'editor'","'studio'"]) assert.ok(audit.includes(label),label);
 assert.match(audit,/if\(findings\.length\)\{/);
 assert.match(audit,/process\.exitCode=1;/);
 assert.match(audit,/findings\.push\(\{page:label,id:'audit-runner-error'/);
});
test('third-party YouTube player exclusion is narrowly scoped, not a blanket iframe bypass',()=>{
 assert.match(audit,/\.exclude\('\.creative-opening-media iframe\[src\^="https:\/\/www\.youtube-nocookie\.com\/"\]'\)/);
 assert.doesNotMatch(audit,/\.exclude\('iframe'\)/);
 assert.match(audit,/excludedThirdParty/);
});
test('GitHub workflow treats WCAG as blocking release gate',()=>{
 assert.match(workflow,/- name: WCAG 2\.1 AA first-party accessibility release gate\n\s+run: node portfolio-site\/qa\/accessibility-audit\.mjs/);
 assert.doesNotMatch(workflow,/- name: WCAG[^\n]*\n\s+continue-on-error: true/);
});
