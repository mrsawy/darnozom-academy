import { Types } from 'mongoose';
import { familyIdOf } from './family';

describe('familyIdOf', () => {
  it('is the parent when the student has one', () => {
    const parent = new Types.ObjectId();
    const student = { _id: new Types.ObjectId(), parentUserId: parent };
    expect(familyIdOf(student)).toBe(String(parent));
  });

  it('is the student themselves when no parent is linked', () => {
    const student = { _id: new Types.ObjectId() };
    expect(familyIdOf(student)).toBe(String(student._id));
  });

  it('treats an explicitly null parent the same as a missing one', () => {
    const student = { _id: new Types.ObjectId(), parentUserId: null };
    expect(familyIdOf(student)).toBe(String(student._id));
  });
});
