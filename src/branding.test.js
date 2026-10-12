import manifest from '../public/manifest.json';

test('install metadata uses RampReady branding', () => {
  expect(manifest.short_name).toBe('RampReady');
  expect(manifest.name).toBe('RampReady — 2T0X1 Training Portal');
  expect(manifest.theme_color).toBe('#0f1a28');
  expect(manifest.background_color).toBe('#0b131e');
  expect(manifest.icons.map(icon => icon.src)).toEqual(expect.arrayContaining([
    'favicon.svg',
    'rampready-mark.svg',
  ]));
});
