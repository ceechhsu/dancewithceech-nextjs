'use client';

import { Stories, StoriesContent, Story, StoryImage, StoryAuthor, StoryAuthorName, StoryOverlay } from "@/components/ui/stories-carousel";

const testimonials = [
  { videoId: "I68OCXhkaEo", name: "Dax" },
  { videoId: "0DKQ1PPW7Ag", name: "Anabelle" },
  { videoId: "h32DyBzyi4Q", name: "Campbell" },
];

export default function TestimonialsCarousel() {
  return (
    <Stories>
      <StoriesContent>
        {testimonials.map((t) => (
          <Story
            key={t.videoId}
            className="aspect-[3/4] w-[220px]"
            onClick={() => window.open(`https://www.youtube.com/watch?v=${t.videoId}`, '_blank')}
          >
            <StoryImage
              src={`https://img.youtube.com/vi/${t.videoId}/hqdefault.jpg`}
              alt={`${t.name} testimonial`}
            />
            <StoryOverlay />
            <StoryAuthor>
              <StoryAuthorName>{t.name}</StoryAuthorName>
            </StoryAuthor>
          </Story>
        ))}
      </StoriesContent>
    </Stories>
  );
}
