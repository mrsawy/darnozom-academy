export interface QuizQuestion {
  questionText: string;
  options: string[];
  correctOption: number;
}

export interface QuizContent {
  questions: QuizQuestion[];
}

export interface QuizFormData {
  type: 'QUIZ';
  title: string;
  description?: string;
  content: QuizContent;
}
