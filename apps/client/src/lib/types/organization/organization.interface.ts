import { Document, Types } from 'mongoose';
import { SubscriptionTypeDef } from '../subscription/subscription.interface';
import { IUser } from '../user/user.interface';

export interface Organization extends Document {
  name: string;
  superAdminId: Types.ObjectId;
  slug: string;
  domain?: string;
  planName: string;
  subscription?: SubscriptionTypeDef;
  settings: {
    branding: {
      logo?: string;
      primaryColor: string;
      secondaryColor: string;
    };
    notifications: {
      emailEnabled: boolean;
      smsEnabled: boolean;
    };
  };
  // Virtuals
  plan?: unknown; // Plan type from server entity
  superAdmin?: IUser;
}
