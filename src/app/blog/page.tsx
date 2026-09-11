import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import BlogLibrary from '@/components/BlogLibrary';
import { getAllPosts } from '@/lib/posts';
import { readBlogQuery } from '@/lib/blog-library';

export const metadata = {
  title: 'Dance Tutorials, Wellbeing & Stories | DanceWithCeech Blog',
  description: 'Explore dance tutorials, practice tips, wellbeing, and stories from the dance community with Ceech.',
  alternates: { canonical: 'https://dancewithceech.com/blog' },
  openGraph: {
    title: 'The Dance With Ceech Blog',
    description: 'Learn new moves. Feel better. Connect through dance.',
    url: 'https://dancewithceech.com/blog', siteName: 'DanceWithCeech', type: 'website',
    images: [{ url: 'https://dancewithceech.com/images/ceech/ceech-teaching-private-student-neck-control.jpg', width: 1200, height: 630, alt: 'Ceech teaching hip-hop dance' }],
  },
  twitter: {
    card: 'summary_large_image', title: 'The Dance With Ceech Blog',
    description: 'Learn new moves. Feel better. Connect through dance.',
    images: ['https://dancewithceech.com/images/ceech/ceech-teaching-private-student-neck-control.jpg'],
  },
};

export default async function BlogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const query = readBlogQuery(params);
  const overview = !params.view && !query.q && query.topic === 'all' && query.page === 1;
  return <><Nav /><main><BlogLibrary posts={getAllPosts()} query={query} overview={overview} /></main><Footer /></>;
}
