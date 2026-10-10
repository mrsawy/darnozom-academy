'use client';

import { FileText, Video, HelpCircle, FileCheck, Calendar, Paperclip } from 'lucide-react';
import { CourseContentType } from '@/lib/types/course/enum/CourseContentType.enum';

export function getContentTypeIcon(type: CourseContentType) {
  switch (type) {
    case CourseContentType.ARTICLE: {
      return <FileText className="h-4 w-4" />;
    }
    case CourseContentType.VIDEO: {
      return <Video className="h-4 w-4" />;
    }
    case CourseContentType.QUIZ: {
      return <HelpCircle className="h-4 w-4" />;
    }
    case CourseContentType.ASSIGNMENT: {
      return <FileCheck className="h-4 w-4" />;
    }
    case CourseContentType.LIVE_SESSION: {
      return <Calendar className="h-4 w-4" />;
    }
    case CourseContentType.ATTACHMENT: {
      return <Paperclip className="h-4 w-4" />;
    }
    default: {
      return <FileText className="h-4 w-4" />;
    }
  }
}

export function getContentTypeColor(type: CourseContentType): string {
  switch (type) {
    case CourseContentType.ARTICLE: {
      return 'bg-green-50 text-green-700 border-green-200';
    }
    case CourseContentType.VIDEO: {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    case CourseContentType.QUIZ: {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    case CourseContentType.ASSIGNMENT: {
      return 'bg-orange-50 text-orange-700 border-orange-200';
    }
    case CourseContentType.LIVE_SESSION: {
      return 'bg-violet-50 text-violet-700 border-violet-200';
    }
    case CourseContentType.ATTACHMENT: {
      return 'bg-gray-50 text-gray-700 border-gray-200';
    }
    default: {
      return 'bg-green-50 text-green-700 border-green-200';
    }
  }
}

export const CONTENT_TYPE_OPTIONS = [
  { value: CourseContentType.ARTICLE, icon: FileText },
  { value: CourseContentType.VIDEO, icon: Video },
  { value: CourseContentType.QUIZ, icon: HelpCircle },
  { value: CourseContentType.ASSIGNMENT, icon: FileCheck },
  { value: CourseContentType.LIVE_SESSION, icon: Calendar },
  { value: CourseContentType.ATTACHMENT, icon: Paperclip },
] as const;
