import { CheckCircle2 } from 'lucide-react';
import React from 'react';

interface CourseIncludesProps {
  learningObjectives: string[];
}

const CourseIncludes = React.memo<CourseIncludesProps>(
  ({ learningObjectives }: CourseIncludesProps) => {
    return (
      <div className="space-y-3">
        {learningObjectives.map((feature, index) => (
          <div key={index} className="flex items-start gap-3 text-sm">
            <CheckCircle2 className="text-primary mt-0.5 h-4 w-4 shrink-0" />
            <span className="text-muted-foreground font-medium">{feature}</span>
          </div>
        ))}
      </div>
    );
  }
);

CourseIncludes.displayName = 'CourseIncludes';
export default CourseIncludes;
