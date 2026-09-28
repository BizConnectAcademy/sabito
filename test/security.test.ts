import assert from 'node:assert/strict';
import test from 'node:test';
import {
  hashClientSecret,
  issueCredentials,
  safeEqual,
  verifyClientSecret,
} from '../src/security/credentials.js';

const pepper = 'test-pepper-that-is-longer-than-thirty-two-characters';

test('issued credentials have distinct public and private values', () => {
  const first = issueCredentials(pepper);
  const second = issueCredentials(pepper);
  assert.match(first.clientId, /^sab_[a-f0-9]{24}$/);
  assert.match(first.clientSecret, /^sbs_[A-Za-z0-9_-]+$/);
  assert.notEqual(first.clientId, second.clientId);
  assert.notEqual(first.clientSecret, second.clientSecret);
  assert.equal(first.secretHash, hashClientSecret(first.clientSecret, pepper));
});

test('client secret verification is exact', () => {
  const credentials = issueCredentials(pepper);
  assert.equal(verifyClientSecret(credentials.clientSecret, credentials.secretHash, pepper), true);
  assert.equal(verifyClientSecret(`${credentials.clientSecret}x`, credentials.secretHash, pepper), false);
  assert.equal(safeEqual('same', 'same'), true);
  assert.equal(safeEqual('short', 'longer'), false);
});
