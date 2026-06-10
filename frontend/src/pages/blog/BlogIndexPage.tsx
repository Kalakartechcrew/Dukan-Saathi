import { PublicLayout } from '@/components/layout/PublicLayout'
import { SEO } from '@/components/seo/SEO'
import { blogPosts } from '@/data/blog-topics'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calendar, User, ArrowRight } from 'lucide-react'

export function BlogIndexPage() {
  return (
    <PublicLayout>
      <SEO 
        title="Blog - Retail Insights & Shop Management Tips" 
        description="Stay updated with the latest trends in retail, GST compliance, inventory management, and business growth strategies from Dukan Saathi."
      />
      
      <div className="bg-slate-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
            >
              The Dukan Saathi Blog
            </motion.h1>
            <p className="mt-2 text-lg leading-8 text-slate-600">
              Expert advice, industry news, and practical tips to help you run a better business.
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            {blogPosts.map((post) => (
              <article key={post.id} className="flex flex-col items-start justify-between bg-white p-8 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-x-4 text-xs">
                  <time dateTime={post.date} className="text-slate-500 flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {post.date}
                  </time>
                  <span className="relative z-10 rounded-full bg-emerald-50 px-3 py-1.5 font-medium text-emerald-600">
                    {post.category}
                  </span>
                </div>
                <div className="group relative">
                  <h3 className="mt-3 text-lg font-semibold leading-6 text-slate-900 group-hover:text-emerald-600">
                    <Link to={`/blog/${post.slug}`}>
                      <span className="absolute inset-0" />
                      {post.title}
                    </Link>
                  </h3>
                  <p className="mt-5 line-clamp-3 text-sm leading-6 text-slate-600">{post.description}</p>
                </div>
                <div className="relative mt-8 flex items-center gap-x-4">
                  <div className="text-sm leading-6">
                    <p className="font-semibold text-slate-900 flex items-center gap-1">
                      <User className="h-3 w-3 text-slate-400" /> {post.author}
                    </p>
                    <Link 
                      to={`/blog/${post.slug}`} 
                      className="mt-4 flex items-center gap-1 text-sm font-bold text-emerald-600 hover:text-emerald-500"
                    >
                      Read Article <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
