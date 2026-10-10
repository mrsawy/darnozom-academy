export interface Course {
  id: string;
  title: string;
  instructor: string;
  description: string;
  image: string;
  category: string;
  price: number;
  originalPrice?: number;
  rating: number;
  studentsCount: number;
  duration: string;
  lessonsCount: number;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  isEnrolled: boolean;
  progress?: number; // 0-100
  tags: string[];
}

export interface CourseCategory {
  id: string;
  name: string;
  count: number;
}
