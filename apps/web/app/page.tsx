import { Hero } from '@/components/hero';
import { QuickStart } from '@/components/quick-start';
import { Playground } from '@/components/playground';
import { HostYourOwn } from '@/components/host-your-own';
import { Footer } from '@/components/footer';

export default function Page() {
  return (
    <main className="min-h-screen">
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
      <Footer />
    </main>
  );
}
