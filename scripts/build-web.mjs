import { createHash } from 'node:crypto';
import {
  cpSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';

const webDirectory = resolve('web');
const outputDirectory = resolve(webDirectory, 'dist');
const filesIn = (directory) =>
  readdirSync(resolve(webDirectory, directory), {
    withFileTypes: true,
  }).flatMap((entry) => {
    const filename = `${directory}/${entry.name}`;
    return entry.isDirectory() ? filesIn(filename) : [filename];
  });
const assets = ['styles.css', 'app.js', ...filesIn('assets')];

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
  const outputPath = resolve(outputDirectory, output);
  mkdirSync(dirname(outputPath), { recursive: true });
  cpSync(resolve(webDirectory, source), outputPath);
}
