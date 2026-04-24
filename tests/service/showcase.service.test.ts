import { describe, expect, it } from 'vitest';
import { ShowcaseRepository } from '../../src/repo/showcase.repo';
import { ShowcaseService } from '../../src/service/showcase.service';
import type { GuziItem } from '../../src/types/models/guzi.schema';
import type { Showcase } from '../../src/types/models/spatial.schema';

const publicShowcase: Showcase = {
  id: 'showcase-1',
  title: 'Public Shelf',
  ownerId: 'user-1',
  isPublic: true,
  nodes: [
    {
      id: 'room-1',
      nodeType: 'room',
      x: 0,
      y: 0,
      width: 300,
      height: 200,
    },
    {
      id: 'item-1',
      nodeType: 'item',
      parentId: 'room-1',
      guziId: 'guzi-1',
      x: 10,
      y: 10,
      width: 80,
      height: 80,
    },
  ],
};

const guziItem: GuziItem = {
  id: 'guzi-1',
  name: 'Badge One',
  type: 'badge',
  ip: 'Haikyu',
  character: 'Hinata',
  series: 'Birthday',
  imageUrl: 'https://example.com/badge.jpg',
  officialPrice: 30,
  purchasePrice: 58,
  marketPrice: 80,
  diameter: 58,
  shape: 'round',
};

describe('ShowcaseService', () => {
  it('saves and reads showcase layouts', async () => {
    const service = new ShowcaseService(new ShowcaseRepository());

    await service.saveShowcase(publicShowcase);

    expect(await service.getShowcase('showcase-1')).toEqual(publicShowcase);
  });

  it('returns public views with only safe item fields', async () => {
    const service = new ShowcaseService(new ShowcaseRepository());
    await service.saveShowcase(publicShowcase);

    const view = await service.getPublicView('showcase-1', [guziItem]);
    const serialized = JSON.stringify(view);

    expect(view?.items[0]).toEqual({
      guziId: 'guzi-1',
      name: 'Badge One',
      ip: 'Haikyu',
      character: 'Hinata',
      series: 'Birthday',
      type: 'badge',
      imageUrl: 'https://example.com/badge.jpg',
    });
    expect(serialized).not.toContain('purchasePrice');
    expect(serialized).not.toContain('marketPrice');
    expect(serialized).not.toContain('officialPrice');
  });

  it('blocks private showcases from public views', async () => {
    const service = new ShowcaseService(new ShowcaseRepository());
    await service.saveShowcase({
      ...publicShowcase,
      id: 'private-showcase',
      isPublic: false,
    });

    await expect(service.getPublicView('private-showcase', [guziItem])).resolves.toBeNull();
  });
});
