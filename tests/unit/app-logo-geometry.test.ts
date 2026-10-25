import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

type Wedge = { d: string; fill: string; transform?: string };

// The four coloured wedges carry a path, a fill, and sometimes the pink wedge's
// offset. The seam paths in the masks have a stroke and no fill, so they are not
// part of this comparison.
function wedges(source: string): Wedge[] {
  const found: Wedge[] = [];

  for (const [, attributes = ''] of source.matchAll(/<path\b([^>]*?)\/?>/g)) {
    const d = attributes.match(/\bd="([^"]+)"/)?.[1];
    const fill = attributes.match(/\bfill="(#[0-9A-Fa-f]{6})"/)?.[1];
    if (d === undefined || fill === undefined) continue;

    const transform = attributes.match(/\btransform="([^"]+)"/)?.[1];
    found.push(transform === undefined ? { d, fill } : { d, fill, transform });
  }

  return found;
}

const componentSource = await readFile('app/components/AppLogo.vue', 'utf8');
const iconSource = await readFile('public/icon.svg', 'utf8');

describe('logo geometry', () => {
  it('draws the same four wedges in the component and the installable icon', () => {
    const componentWedges = wedges(componentSource);
    const iconWedges = wedges(iconSource);

    expect(componentWedges).toHaveLength(4);
    expect(iconWedges).toEqual(componentWedges);
    expect(componentWedges.map(({ fill }) => fill)).toEqual([
      '#FF8A3D',
      '#9B7BFF',
      '#2DD4BF',
      '#FF5FA8',
    ]);
  });

  it('detects a wedge changed in only one copy', () => {
    const alteredComponent = componentSource.replace('#FF8A3D', '#FF8A3E');

    expect(wedges(alteredComponent)).not.toEqual(wedges(iconSource));
  });
});
