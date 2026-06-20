import { mkdir, writeFile } from 'fs/promises';
import { dirname, join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Served statically at /icons by app.js.
export const ICONS_DIR = join(__dirname, '../../public/icons');

const slug = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'team';

// Downloads an image from `url` into the local icons dir and returns its public
// path ("/icons/<file>"), or null on failure (the caller still saves the team).
// `nameHint` seeds the filename when the URL has no usable basename. (US-114)
export const downloadIcon = async (url, nameHint = 'team') => {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());

    let ext = extname(new URL(url).pathname).toLowerCase();
    if (!/^\.(png|jpg|jpeg|svg|webp|gif)$/.test(ext)) {
      const ct = res.headers.get('content-type') || '';
      ext = ct.includes('svg') ? '.svg' : ct.includes('jpeg') ? '.jpg' : ct.includes('webp') ? '.webp' : '.png';
    }
    const filename = `${slug(nameHint)}${ext}`;

    await mkdir(ICONS_DIR, { recursive: true });
    await writeFile(join(ICONS_DIR, filename), buf);
    return `/icons/${filename}`;
  } catch {
    return null;
  }
};
