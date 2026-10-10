export enum SessionType {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
}

export enum BookingStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
  REFUNDED = 'REFUNDED',
}

export enum RescheduleStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum RefundRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface ISessionPricing {
  price: number;
  currency: string;
  priceUSD?: number;
}

export interface IAvailableSlot {
  _id?: string;
  /** Absolute UTC start instant (ISO string). */
  startsAt: string;
  /** Absolute UTC end instant (ISO string). */
  endsAt: string;
  /** IANA timezone the slot was authored in, e.g. "Africa/Cairo". */
  timezone: string;
  /** How participants join. Defaults to 'EXTERNAL_URL'. */
  provider?: 'EXTERNAL_URL' | 'AGORA';
  meetingUrl?: string;
  maxBookings: number;
}

export interface ISlotAvailability {
  slotId: string;
  /** Absolute UTC start instant (ISO string). */
  startsAt: string;
  /** Absolute UTC end instant (ISO string). */
  endsAt: string;
  /** IANA timezone the slot was authored in. */
  timezone: string;
  maxBookings: number;
  currentBookings: number;
  isAvailable: boolean;
}

export interface IRescheduleRequest {
  requestedBy: string;
  requestedByRole: string;
  /** The real, future slot this request resolved to. */
  newSlotId: string;
  newStartsAt: string;
  newEndsAt: string;
  newTimezone: string;
  reason: string;
  status: RescheduleStatus;
  respondedAt?: string;
  rejectionReason?: string;
}

export interface IRefundRequest {
  requestedBy: string;
  reason: string;
  status: RefundRequestStatus;
  respondedAt?: string;
  rejectionReason?: string;
  refundedAmount?: number;
  refundedCurrency?: string;
}

export interface IPaymentDetails {
  transactionId?: string;
  paidAmount: number;
  currency: string;
  paidAt: string;
  netAmount?: number;
}

export interface IPrivateSession {
  _id: string;
  instructorId: string;
  organizationId: string;
  title: string;
  description?: string;
  duration: number;
  pricing: ISessionPricing;
  availableSlots: IAvailableSlot[];
  location?: string;
  sessionType: SessionType;
  isActive: boolean;
  status: string;
  thumbnailKey?: string;
  createdAt: string;
  updatedAt: string;
  instructor?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    profile?: { avatar?: string };
  };
}

export interface ISessionBooking {
  _id: string;
  sessionId: string;
  studentId: string;
  parentId?: string;
  instructorId: string;
  organizationId: string;
  /** Absolute UTC start instant (ISO string). */
  startsAt: string;
  /** Absolute UTC end instant (ISO string). */
  endsAt: string;
  /** IANA timezone copied from the slot at booking time. */
  timezone: string;
  status: BookingStatus;
  paymentMethod?: string;
  paymentDetails?: IPaymentDetails;
  provider?: 'EXTERNAL_URL' | 'AGORA';
  meetingLink?: string;
  agoraChannelName?: string;
  notes?: string;
  cancellationReason?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  rescheduleRequest?: IRescheduleRequest;
  refundRequest?: IRefundRequest;
  createdAt: string;
  updatedAt: string;
  session?: Pick<IPrivateSession, '_id' | 'title' | 'duration' | 'sessionType' | 'location'>;
  instructor?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    profile?: { avatar?: string };
  };
  student?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    profile?: { avatar?: string };
  };
}

export interface IBookSessionForm {
  sessionId: string;
  slotId: string;
  paymentMethod: string;
  provider?: string;
  currency?: string;
  notes?: string;
  childId?: string;
}

export interface IRescheduleForm {
  bookingId: string;
  /** The slot the student picked to move to. */
  newSlotId: string;
  reason: string;
}

export interface IRefundRequestForm {
  bookingId: string;
  reason: string;
}
