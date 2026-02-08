import type { AvatarData } from '@svg/types';

const REPOS: { fullName: string; stars?: number }[] = [
  { fullName: 'vercel/next.js', stars: 131000 },
  { fullName: 'facebook/react', stars: 234000 },
  { fullName: 'vuejs/vue', stars: 208000 },
  { fullName: 'sveltejs/svelte', stars: 81000 },
  { fullName: 'angular/angular', stars: 97000 },
  { fullName: 'remix-run/remix', stars: 31000 },
  { fullName: 'withastro/astro', stars: 49000 },
  { fullName: 'nuxt/nuxt', stars: 56000 },
  { fullName: 'tailwindlabs/tailwindcss', stars: 86000 },
  { fullName: 'prisma/prisma', stars: 41000 },
  { fullName: 'trpc/trpc', stars: 36000 },
  { fullName: 'drizzle-team/drizzle-orm', stars: 26000 },
  { fullName: 'tanstack/query', stars: 44000 },
  { fullName: 'shadcn-ui/ui', stars: 82000 },
  { fullName: 'vitejs/vite', stars: 72000 },
  { fullName: 'biomejs/biome', stars: 17000 },
  { fullName: 'oven-sh/bun', stars: 76000 },
  { fullName: 'denoland/deno', stars: 101000 },
  { fullName: 'supabase/supabase', stars: 78000 },
  { fullName: 'storybookjs/storybook', stars: 85000 },
  { fullName: 'jestjs/jest', stars: 44000 },
  { fullName: 'webpack/webpack', stars: 65000 },
  { fullName: 'expressjs/express', stars: 66000 },
  { fullName: 'nestjs/nest', stars: 70000 },
  { fullName: 'strapi/strapi', stars: 65000 },
  { fullName: 'grafana/grafana', stars: 66000 },
  { fullName: 'elastic/elasticsearch', stars: 71000 },
  { fullName: 'docker/compose', stars: 34000 },
  { fullName: 'kubernetes/kubernetes', stars: 113000 },
  { fullName: 'golang/go', stars: 126000 },
  { fullName: 'lukeed/clsx' },
];

export function createMockAvatars(count: number): AvatarData[] {
  const avatars: AvatarData[] = [];

  for (let i = 0; i < count; i++) {
    const repo = REPOS[i % REPOS.length]!;

    avatars.push({
      dataUri: avatarUrl(repo.fullName),
      fullName: repo.fullName,
      stars: repo.stars,
    });
  }

  return avatars;
}

function avatarUrl(fullName: string): string {
  const org = fullName.split('/')[0]!;

  return `https://github.com/${org}.png?size=128`;
}
