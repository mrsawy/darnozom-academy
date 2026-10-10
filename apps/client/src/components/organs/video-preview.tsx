import { Button } from '@/components/atoms/button';
import { Play } from 'lucide-react';
import React from 'react';

const VideoPreview = React.memo(() => {
  return (
    <div className="bg-muted flex aspect-video items-center justify-center rounded-t-lg">
      <Button size="lg" className="h-16 w-16 rounded-full">
        <Play className="ml-1 h-6 w-6" />
      </Button>
    </div>
  );
});

export default VideoPreview;
