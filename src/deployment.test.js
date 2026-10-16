import fs from 'fs';
import path from 'path';
import packageJson from '../package.json';

test('GitHub Pages builds and deploys Transit IQ at its repository path', () => {
  expect(packageJson.homepage).toBe('https://michaelm9267.github.io/2T0X1-Training-App');
  const workflow = fs.readFileSync(path.join(process.cwd(), '.github/workflows/deploy-pages.yml'), 'utf8');
  expect(workflow).toContain('npm ci');
  expect(workflow).toContain('npm run build');
  expect(workflow).toContain('actions/upload-pages-artifact@v3');
  expect(workflow).toContain('actions/deploy-pages@v4');
  expect(workflow).toContain('path: ./build');
});
