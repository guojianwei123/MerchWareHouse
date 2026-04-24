export class SpatialService {
  async checkCollision(itemId: string, spaceId: string): Promise<boolean> {
    return false;
  }

  async validateCabinetCapacity(cabinetId: string): Promise<boolean> {
    return true;
  }
}
