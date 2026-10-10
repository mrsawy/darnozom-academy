import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { IInstructor } from '@/lib/types/user/user.interface';
import { User } from 'lucide-react';
import { Typography } from '@/components/atoms/typography';
import { useTranslations } from 'next-intl';

interface Props {
  instructor: IInstructor;
}

function InstructorBio({ instructor }: Props) {
  const t = useTranslations('Instructors');
  return (
    <Card className="shadow-sm transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2 text-2xl font-bold">
          <User className="text-primary h-6 w-6" />
          <Typography variant="h3" weight="bold">
            {t('about')}
          </Typography>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm max-w-none">
          <Typography variant="p" color="muted" className="leading-relaxed whitespace-pre-line">
            {instructor.profile?.bio ?? t('noBiography')}
          </Typography>
        </div>
      </CardContent>
    </Card>
  );
}

export default InstructorBio;
