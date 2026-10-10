import { Model } from 'mongoose';
import { faker } from '@faker-js/faker';
import { Conversation } from '../entities/conversation.entity';
import { ChatMessage } from '../entities/chat-message.entity';
import { User } from '../../user/entities/user.entity';

const MESSAGES_AR = [
  'مرحباً، هل يمكنك مساعدتي في فهم الدرس؟',
  'شكراً جزيلاً على الشرح الوافي!',
  'متى موعد الجلسة القادمة؟',
  'هل يمكنك إرسال ملاحظات الدرس؟',
  'واجهت صعوبة في حل التمرين الثالث.',
  'الدرس كان ممتازاً اليوم، شكراً!',
  'هل هناك مصادر إضافية للمراجعة؟',
  'تم إرسال التكليف، أرجو المراجعة.',
  'بالتأكيد، سأرسل لك الملاحظات الآن.',
  'سنلتقي الخميس الساعة الثالثة عصراً.',
  'أداؤك في التكليف الأخير كان رائعاً!',
  'راجع الوحدة الثالثة قبل الاختبار.',
];

export class ChatSeeder {
  constructor(
    private readonly conversationModel: Model<Conversation>,
    private readonly chatMessageModel: Model<ChatMessage>
  ) {}

  async seedForOrganization(students: User[], instructors: User[]) {
    if (students.length === 0 || instructors.length === 0) return;

    for (const student of students) {
      const instructorCount = faker.number.int({ min: 1, max: Math.min(2, instructors.length) });
      const selectedInstructors = faker.helpers.arrayElements(instructors, instructorCount);

      for (const instructor of selectedInstructors) {
        // Sort IDs ascending to satisfy the unique constraint on participantIds
        const participantIds = [student._id, instructor._id].toSorted((a, b) => a.toString().localeCompare(b.toString()));

        const existing = await this.conversationModel.findOne({ participantIds: { $all: participantIds, $size: 2 } });
        if (existing) continue;

        const lastMsg = faker.helpers.arrayElement(MESSAGES_AR);
        const lastMessageAt = faker.date.recent({ days: 14 });

        const conversation = await this.conversationModel.create({
          participantIds,
          lastMessagePreview: lastMsg,
          lastMessageSenderId: faker.datatype.boolean() ? student._id : instructor._id,
          lastMessageAt,
          unreadCount: {
            [student._id.toString()]: faker.number.int({ min: 0, max: 5 }),
            [instructor._id.toString()]: faker.number.int({ min: 0, max: 3 }),
          },
        });

        const msgCount = faker.number.int({ min: 3, max: 10 });
        let msgTime = new Date(lastMessageAt.getTime() - msgCount * 3 * 60_000);

        const messageDocs = Array.from({ length: msgCount }, () => {
          const senderId = faker.datatype.boolean() ? student._id : instructor._id;
          const doc = {
            conversationId: conversation._id,
            senderId,
            content: faker.helpers.arrayElement(MESSAGES_AR),
            readAt: faker.datatype.boolean({ probability: 0.6 }) ? new Date(msgTime.getTime() + 60_000) : undefined,
            createdAt: msgTime,
            updatedAt: msgTime,
          };
          msgTime = new Date(msgTime.getTime() + faker.number.int({ min: 60_000, max: 300_000 }));
          return doc;
        });

        await this.chatMessageModel.insertMany(messageDocs);
      }
    }
  }
}
