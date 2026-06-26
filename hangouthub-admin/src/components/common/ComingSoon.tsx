import { Construction } from 'lucide-react';

import { Card, CardContent, PageHeader } from '@/components/ui';

interface ComingSoonProps {
  title: string;
  description?: string;
  note?: string;
}

export function ComingSoon({ title, description, note }: ComingSoonProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Construction className="h-6 w-6" />
          </div>
          <p className="font-medium">Module en préparation</p>
          {note && (
            <p className="max-w-md text-sm text-muted-foreground">{note}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
