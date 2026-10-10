export interface CourseBreadcrumbItem {
  label: string;
  href?: string;
}

export interface CourseBreadcrumbProps {
  items: CourseBreadcrumbItem[];
  className?: string;
}
