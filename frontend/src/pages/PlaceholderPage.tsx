import { Card } from '@/components/ui/Card'

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <Card className="py-16 text-center">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-slate-500">Coming soon in the next release</p>
    </Card>
  )
}
