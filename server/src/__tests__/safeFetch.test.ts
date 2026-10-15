import { assertPublicUrl, isPrivateAddress, UnsafeUrlError } from '../lib/safeFetch';

describe('SSRF guard', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.10',
    '169.254.169.254', // cloud metadata endpoint
    '100.64.0.1',
    '0.0.0.0',
    '::1',
    'fd00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
  ])('treats %s as private', (ip) => {
    expect(isPrivateAddress(ip)).toBe(true);
  });

  it.each(['8.8.8.8', '93.184.215.14', '172.32.0.1', '2606:4700::1111'])('treats %s as public', (ip) => {
    expect(isPrivateAddress(ip)).toBe(false);
  });

  it.each([
    'file:///etc/passwd',
    'ftp://example.com/file',
    'http://127.0.0.1:6379/',
    'http://169.254.169.254/latest/meta-data/',
    'http://[::1]/',
    'http://localhost:5432/',
    'not a url',
  ])('refuses %s', async (url) => {
    await expect(assertPublicUrl(url)).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it('accepts a public IP literal without a DNS lookup', async () => {
    await expect(assertPublicUrl('https://8.8.8.8/')).resolves.toBeInstanceOf(URL);
  });
});
