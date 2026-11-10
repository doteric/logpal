import { createHash } from 'node:crypto';
import {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';

const webDirectory = resolve('web');
const outputDirectory = resolve(webDirectory, 'dist');
const assets = ['styles.css', 'app.js'];

const filenameFor = (filename, content) => {
  const hash = createHash('sha256').update(content).digest('hex').slice(0, 12);
  const extensionIndex = filename.lastIndexOf('.');
  return `${filename.slice(0, extensionIndex)}.${hash}${filename.slice(extensionIndex)}`;
};

rmSync(outputDirectory, { recursive: true, force: true });
mkdirSync(outputDirectory, { recursive: true });

const filenames = Object.fromEntries(
  assets.map((filename) => {
    const content = readFileSync(resolve(webDirectory, filename));
    return [filename, filenameFor(filename, content)];
  }),
);
const sourceHtml = readFileSync(resolve(webDirectory, 'index.html'), 'utf8');
const outputHtml = Object.entries(filenames).reduce(
  (html, [source, output]) => html.replaceAll(`"${source}"`, `"${output}"`),
  sourceHtml,
);

writeFileSync(resolve(outputDirectory, 'index.html'), outputHtml);
for (const [source, output] of Object.entries(filenames)) {
  cpSync(resolve(webDirectory, source), resolve(outputDirectory, output));
}
