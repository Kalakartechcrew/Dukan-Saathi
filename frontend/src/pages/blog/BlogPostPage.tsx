import { PublicLayout } from '@/components/layout/PublicLayout'
import { SEO } from '@/components/seo/SEO'
import { blogPosts } from '@/data/blog-topics'
import { useParams, Link, Navigate } from 'react-router-dom'
import { Calendar, User, ChevronLeft, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>()
  const post = blogPosts.find((p) => p.slug === slug)

  if (!post) {
    return <Navigate to="/blog" replace />
  }

  return (
    <PublicLayout>
      <SEO 
        title={post.title} 
        description={post.description}
        ogType="article"
      />
      
      <article className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-3xl px-6 lg:px-8">
          <Link to="/blog" className="flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-500 mb-8">
            <ChevronLeft className="h-4 w-4" /> Back to Blog
          </Link>

          <div className="flex items-center gap-x-4 text-xs mb-6">
            <time dateTime={post.date} className="text-slate-500 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> {post.date}
            </time>
            <span className="relative z-10 rounded-full bg-emerald-50 px-3 py-1.5 font-medium text-emerald-600">
              {post.category}
            </span>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-5xl mb-8">
            {post.title}
          </h1>

          <div className="flex items-center justify-between border-y border-slate-100 py-6 mb-12">
            <div className="flex items-center gap-x-3">
              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                <User className="h-6 w-6 text-slate-400" />
              </div>
              <div className="text-sm">
                <p className="font-bold text-slate-900">{post.author}</p>
                <p className="text-slate-500">Retail Expert</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="gap-2">
              <Share2 className="h-4 w-4" /> Share
            </Button>
          </div>

          <div className="prose prose-emerald lg:prose-xl max-w-none text-slate-600">
            <p className="text-xl leading-8 text-slate-900 font-medium mb-12">
              {post.description}
            </p>

            {post.content ? (
              <div className="space-y-6" dangerouslySetInnerHTML={{ __html: post.content }} />
            ) : (
              <>
                <h2 className="text-2xl font-bold text-slate-900 mt-12 mb-6">What we'll cover in this article:</h2>
                <ul className="list-disc pl-5 space-y-2 mb-12">
                  {post.contentOutline.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>

                <div className="space-y-8">
                  <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                  </p>
                  <h3 className="text-xl font-bold text-slate-900">The Importance of Modern Systems</h3>
                  <p>
                    Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                  </p>
                  <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 my-12">
                    <h4 className="font-bold text-slate-900 mb-4">Key Takeaway</h4>
                    <p className="text-sm italic">
                      "Success in modern retail isn't just about selling products; it's about managing your data effectively to make informed decisions."
                    </p>
                  </div>
                  <p>
                    Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* CTA */}
          <div className="mt-24 rounded-3xl bg-emerald-600 p-8 sm:p-12 text-center text-white">
            <h2 className="text-2xl font-bold sm:text-3xl">Streamline your shop today</h2>
            <p className="mt-4 text-emerald-100 max-w-md mx-auto">
              Join 10,000+ shopkeepers using Dukan Saathi to grow their business.
            </p>
            <div className="mt-8">
              <Link to="/signup">
                <Button size="lg" className="bg-white text-emerald-600 hover:bg-emerald-50">
                  Get Started for Free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </article>
    </PublicLayout>
  )
}
