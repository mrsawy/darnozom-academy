import { Types } from 'mongoose';
import { CertificateCounterService } from './certificate-counter.service';

describe('CertificateCounterService', () => {
  const orgId = new Types.ObjectId('64b0000000000000000000bb');

  it('increments sequence atomically using findOneAndUpdate with upsert', async () => {
    const counterModel = {
      findOneAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ sequence: 42 }),
      }),
    };

    const service = new CertificateCounterService(counterModel as never);
    const seq = await service.getNextSequence(orgId, 2026);

    expect(seq).toBe(42);
    expect(counterModel.findOneAndUpdate).toHaveBeenCalledWith(
      { organizationId: orgId, key: 'certificate-2026' },
      { $inc: { sequence: 1 } },
      { new: true, upsert: true },
    );
  });
});
