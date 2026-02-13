import { Hero } from '@/components/hero';
import { QuickStart } from '@/components/quick-start';
import { Playground } from '@/components/playground';
import { HostYourOwn } from '@/components/host-your-own';

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'usedby.dev',
  url: 'https://usedby.dev',
  description:
    'A free service that lets open-source maintainers showcase which projects depend on their library via a single embeddable image.',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Any',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero />
      <div className="mx-auto max-w-5xl px-6">
        <hr className="border-border" />
      </div>
      <QuickStart />
      <div className="mx-auto max-w-5xl px-6">
        <hr className="border-border" />
      </div>
      <Playground />
      <div className="mx-auto max-w-5xl px-6">
        <hr className="border-border" />
      </div>
      <HostYourOwn />
    </>
  );
}
