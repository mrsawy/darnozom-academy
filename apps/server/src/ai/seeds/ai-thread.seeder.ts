import { Model, Types } from 'mongoose';
import { faker } from '@faker-js/faker';
import { AiThread } from '../entities/ai-thread.entity';
import { User } from '../../user/entities/user.entity';

interface SeedMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

const THREAD_TOPICS = [
  {
    title: 'مساعدة في حل مسألة رياضية',
    userMsg: 'كيف أحل معادلة من الدرجة الثانية؟',
    assistantMsg: 'معادلة الدرجة الثانية تُحل باستخدام المحايل: x = (-b ± √(b²-4ac)) / 2a',
  },
  { title: 'شرح مفهوم في الفيزياء', userMsg: 'ما هو قانون نيوتن الثاني؟', assistantMsg: 'قانون نيوتن الثاني: القوة = الكتلة × التسارع (F = m × a)' },
  {
    title: 'مساعدة في كتابة مقال',
    userMsg: 'كيف أبدأ كتابة مقال أكاديمي؟',
    assistantMsg: 'ابدأ بمقدمة واضحة تحدد الموضوع، ثم ضع الأطروحة الرئيسية.',
  },
  {
    title: 'أسئلة عن الكيمياء',
    userMsg: 'ما الفرق بين الرابطة الأيونية والتساهمية؟',
    assistantMsg: 'الرابطة الأيونية تنتج عن نقل الإلكترونات، أما التساهمية فهي مشاركة الإلكترونات.',
  },
  {
    title: 'استفسار عن البرمجة',
    userMsg: 'ما الفرق بين const و let في JavaScript؟',
    assistantMsg: 'const للقيم الثابتة التي لا تُعاد تعيينها، let للقيم المتغيرة.',
  },
];

export class AiThreadSeeder {
  constructor(private readonly aiThreadModel: Model<AiThread>) {}

  async seedForUsers(users: User[]) {
    if (users.length === 0) return;

    const docs: {
      userId: Types.ObjectId;
      title: string;
      status: 'regular' | 'archived';
      messages: SeedMessage[];
    }[] = [];

    for (const user of users) {
      const threadCount = faker.number.int({ min: 1, max: 3 });
      const topics = faker.helpers.arrayElements(THREAD_TOPICS, threadCount);

      for (const topic of topics) {
        const exchangeCount = faker.number.int({ min: 1, max: 3 });
        const messages: SeedMessage[] = [];
        let msgTime = faker.date.recent({ days: 14 });

        for (let i = 0; i < exchangeCount; i++) {
          messages.push({ role: 'user', content: i === 0 ? topic.userMsg : faker.lorem.sentence(), createdAt: msgTime });
          msgTime = new Date(msgTime.getTime() + faker.number.int({ min: 5000, max: 60_000 }));
          messages.push({ role: 'assistant', content: i === 0 ? topic.assistantMsg : faker.lorem.paragraph(), createdAt: msgTime });
          msgTime = new Date(msgTime.getTime() + faker.number.int({ min: 5000, max: 30_000 }));
        }

        docs.push({
          userId: user._id,
          title: topic.title,
          status: faker.datatype.boolean({ probability: 0.15 }) ? 'archived' : 'regular',
          messages,
        });
      }
    }

    if (docs.length > 0) {
      await this.aiThreadModel.insertMany(docs);
    }
  }
}
