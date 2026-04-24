export class AccessoryService {
  async recommendSleeveForCard(cardId: string): Promise<any> {
    return { sleeveId: 'sleeve-123' };
  }

  async recommendBoxForBadge(badgeId: string): Promise<any> {
    return { boxId: 'box-123' };
  }
}
