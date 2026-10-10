'use client';

import { cn } from '@/lib/utils';
import classes from './styles.module.css';
import useGeneralStore from '@/lib/store/generalStore';

export default function Spinner({ loading = false }: { loading?: boolean }) {
  const { generalIsLoading } = useGeneralStore();
  return generalIsLoading || loading ? (
    <div className="fixed top-0 left-0 z-[999999] flex h-full w-full items-center justify-center bg-black/80">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        height="200px"
        width="200px"
        viewBox="0 0 200 200"
        className={cn(classes.pencil, 'h-full')}>
        <defs>
          <clipPath id="pencil-eraser">
            <rect height="30" width="30" ry="5" rx="5" />
          </clipPath>
        </defs>
        <circle
          transform="rotate(-113,100,100)"
          strokeLinecap="round"
          strokeDashoffset="439.82"
          strokeDasharray="439.82 439.82"
          strokeWidth="2"
          stroke="currentColor"
          fill="none"
          r="70"
          className={classes.pencil__stroke}
        />
        <g transform="translate(100,100)" className={classes.pencil__rotate}>
          <g fill="none">
            <circle
              transform="rotate(-90)"
              strokeDashoffset="402"
              strokeDasharray="402.12 402.12"
              strokeWidth="30"
              stroke="hsl(223,90%,50%)"
              r="64"
              className={classes.pencil__body1}
            />
            <circle
              transform="rotate(-90)"
              strokeDashoffset="465"
              strokeDasharray="464.96 464.96"
              strokeWidth="10"
              stroke="hsl(223,90%,60%)"
              r="74"
              className={classes.pencil__body2}
            />
            <circle
              transform="rotate(-90)"
              strokeDashoffset="339"
              strokeDasharray="339.29 339.29"
              strokeWidth="10"
              stroke="hsl(223,90%,40%)"
              r="54"
              className={classes.pencil__body3}
            />
          </g>
          <g transform="rotate(-90) translate(49,0)" className={classes.pencil__eraser}>
            <g className={classes['pencil__eraser-skew']}>
              <rect height="30" width="30" ry="5" rx="5" fill="hsl(223,90%,70%)" />
              <rect clipPath="url(#pencil-eraser)" height="30" width="5" fill="hsl(223,90%,60%)" />
              <rect height="20" width="30" fill="hsl(223,10%,90%)" />
              <rect height="20" width="15" fill="hsl(223,10%,70%)" />
              <rect height="20" width="5" fill="hsl(223,10%,80%)" />
              <rect height="2" width="30" y="6" fill="hsla(223,10%,10%,0.2)" />
              <rect height="2" width="30" y="13" fill="hsla(223,10%,10%,0.2)" />
            </g>
          </g>
          <g transform="rotate(-90) translate(49,-30)" className={classes.pencil__point}>
            <polygon points="15 0,30 30,0 30" fill="hsl(33,90%,70%)" />
            <polygon points="15 0,6 30,0 30" fill="hsl(33,90%,50%)" />
            <polygon points="15 0,20 10,10 10" fill="hsl(223,10%,10%)" />
          </g>
        </g>
      </svg>
    </div>
  ) : null;
}
